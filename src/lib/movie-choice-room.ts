import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMovieChoiceCandidates } from "@/lib/movie-choice-candidates";
import { MovieChoiceError } from "@/lib/movie-choice-input";
import {
  assertActiveMovieChoiceRoom, decodeMovieChoiceRoom, serializeMovieChoiceRoom, transitionMovieChoiceRoom,
  type MovieChoiceState,
} from "@/lib/movie-choice-engine";
import type { MovieChoiceRequest, MovieChoiceRoomView } from "@/types/movie-choice";
import type { MediaDetails } from "@/types";

const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;
const CANDIDATE_TIMEOUT_MS = 20_000;
let lastCleanupAt = 0;
type RoomMutation = Exclude<MovieChoiceRequest, { action: "create" }>;

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // A 32-character alphabet divides the byte range evenly.
  return Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join("");
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function stateData(room: MovieChoiceState): Prisma.MovieChoiceRoomUpdateInput {
  return {
    status: room.status, guestId: room.guestId, guestName: room.guestName,
    hostPreferences: room.hostPreferences ? json(room.hostPreferences) : Prisma.JsonNull,
    guestPreferences: room.guestPreferences ? json(room.guestPreferences) : Prisma.JsonNull,
    hostVotes: json(room.hostVotes), guestVotes: json(room.guestVotes), movies: json(room.movies),
    excludedMovieIds: room.excludedMovieIds, matchMovieId: room.matchMovieId,
    batch: room.batch, revision: room.revision, generationToken: room.generationToken,
    generationStartedAt: room.generationStartedAt, generationError: room.generationError,
    generationAttempts: room.generationAttempts,
  };
}

async function locked<T>(code: string, change: (room: MovieChoiceState) => { room: MovieChoiceState; result: T }): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"movie-choice:" + code}))`;
    const saved = await tx.movieChoiceRoom.findUnique({ where: { code } });
    const room = saved ? decodeMovieChoiceRoom(saved) : null;
    assertActiveMovieChoiceRoom(room);
    const changed = change(room);
    if (changed.room !== room) await tx.movieChoiceRoom.update({ where: { code }, data: stateData(changed.room) });
    return changed.result;
  }, { timeout: 10_000 });
}

export async function createMovieChoiceRoom(identity: string, name: string, locale: "pl" | "en"): Promise<MovieChoiceRoomView> {
  const now = Date.now();
  if (now - lastCleanupAt > 5 * 60_000) {
    lastCleanupAt = now;
    try {
      await prisma.movieChoiceRoom.deleteMany({ where: { expiresAt: { lte: new Date(now) } } });
    } catch {
      // Cleanup must not stop new rooms if this best-effort operation fails.
    }
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const room = await prisma.movieChoiceRoom.create({ data: {
        code: makeCode(), hostId: identity, hostName: name, locale, expiresAt: new Date(Date.now() + ROOM_LIFETIME_MS),
      } });
      return serializeMovieChoiceRoom(decodeMovieChoiceRoom(room), identity);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  throw new MovieChoiceError("service_unavailable", 503);
}

export async function getMovieChoiceRoom(code: string, identity: string): Promise<MovieChoiceRoomView> {
  const room = await prisma.movieChoiceRoom.findFirst({ where: {
    code, expiresAt: { gt: new Date() }, OR: [{ hostId: identity }, { guestId: identity }],
  } });
  if (!room) throw new MovieChoiceError("room_not_found", 404);
  return serializeMovieChoiceRoom(decodeMovieChoiceRoom(room), identity);
}

async function candidatesWithDeadline(room: MovieChoiceState): Promise<MediaDetails[]> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      generateMovieChoiceCandidates([room.hostPreferences!, room.guestPreferences!], room.locale === "en" ? "en" : "pl", room.excludedMovieIds),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new MovieChoiceError("service_unavailable", 503)), CANDIDATE_TIMEOUT_MS); }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function mutateMovieChoiceRoom(action: RoomMutation, identity: string): Promise<MovieChoiceRoomView> {
  // Outsiders cannot use arbitrary mutations to queue for a room's lock.
  if (action.action !== "join") {
    const member = await prisma.movieChoiceRoom.findFirst({ where: {
      code: action.code, expiresAt: { gt: new Date() }, OR: [{ hostId: identity }, { guestId: identity }],
    }, select: { code: true } });
    if (!member) throw new MovieChoiceError("room_not_found", 404);
  }
  const claim = await locked(action.code, (room) => {
    let next = transitionMovieChoiceRoom(room, identity, action);
    let generation: MovieChoiceState | null = null;
    if (action.action === "preferences" && next.guestId && next.hostPreferences && next.guestPreferences) {
      next = {
        ...next, generationToken: randomBytes(24).toString("hex"), generationStartedAt: new Date(),
        generationAttempts: next.generationAttempts + 1,
      };
      generation = next;
    }
    return { room: next, result: { view: serializeMovieChoiceRoom(next, identity), generation } };
  });
  if (!claim.generation) return claim.view;

  // Catalogue work is intentionally outside the room transaction and lock.
  let movies: MediaDetails[] = [];
  let generationError: "no_results" | "service_unavailable" | null = null;
  try {
    const candidates = await candidatesWithDeadline(claim.generation);
    const ids = new Set<number>();
    movies = candidates.filter((movie) => {
      if (!Number.isSafeInteger(movie.id) || movie.id < 1 || ids.has(movie.id)) return false;
      ids.add(movie.id);
      return true;
    }).slice(0, 20);
    if (!movies.length) generationError = "no_results";
  } catch {
    generationError = "service_unavailable";
  }
  const outcome = await locked(action.code, (room) => {
    // A timed-out/stale worker must never overwrite a later generation or batch.
    if (room.generationToken !== claim.generation!.generationToken || room.batch !== claim.generation!.batch) {
      return { room, result: { view: serializeMovieChoiceRoom(room, identity), owned: false } };
    }
    const next: MovieChoiceState = {
      ...room, status: generationError ? "preferences" : "voting", movies,
      generationToken: null, generationStartedAt: null, generationError, revision: room.revision + 1,
    };
    return { room: next, result: { view: serializeMovieChoiceRoom(next, identity), owned: true } };
  });
  if (outcome.owned && generationError) throw new MovieChoiceError(generationError, generationError === "no_results" ? 422 : 503);
  return outcome.view;
}
