import type { MovieChoiceRoom } from "@prisma/client";
import type { MediaDetails } from "@/types";
import type { MovieChoicePreferences, MovieChoiceRequest, MovieChoiceRole, MovieChoiceRoomView, MovieChoiceVote } from "@/types/movie-choice";
import { MovieChoiceError } from "@/lib/movie-choice-input";

export const MOVIE_CHOICE_GENERATION_LEASE_MS = 45_000;
export const MOVIE_CHOICE_MAX_GENERATIONS = 30;

export type MovieChoiceState = Omit<MovieChoiceRoom, "hostPreferences" | "guestPreferences" | "hostVotes" | "guestVotes" | "movies"> & {
  hostPreferences: MovieChoicePreferences | null;
  guestPreferences: MovieChoicePreferences | null;
  hostVotes: MovieChoiceVote[];
  guestVotes: MovieChoiceVote[];
  movies: MediaDetails[];
};

export function decodeMovieChoiceRoom(room: MovieChoiceRoom): MovieChoiceState {
  return room as unknown as MovieChoiceState;
}

export function movieChoiceRole(room: MovieChoiceState, identity: string): MovieChoiceRole | null {
  return room.hostId === identity ? "host" : room.guestId === identity ? "guest" : null;
}

export function assertActiveMovieChoiceRoom(room: MovieChoiceState | null, now = Date.now()): asserts room is MovieChoiceState {
  if (!room || room.expiresAt.getTime() <= now) throw new MovieChoiceError("room_not_found", 404);
}

/** Pure transitions, committed by the repository while holding a per-room DB lock. */
export function transitionMovieChoiceRoom(
  room: MovieChoiceState,
  identity: string,
  action: Exclude<MovieChoiceRequest, { action: "create" }>,
  now = Date.now(),
): MovieChoiceState {
  assertActiveMovieChoiceRoom(room, now);
  const role = movieChoiceRole(room, identity);
  if (action.action === "join") {
    if (role) return room;
    if (room.guestId || room.status !== "waiting") throw new MovieChoiceError("room_full", 409);
    return { ...room, guestId: identity, guestName: action.name, status: "preferences", revision: room.revision + 1 };
  }
  if (!role) throw new MovieChoiceError("room_not_found", 404);
  if (action.batch !== room.batch) throw new MovieChoiceError("batch_changed", 409);
  if (action.action === "reset") {
    if (role !== "host") throw new MovieChoiceError("host_only", 403);
    if (room.status !== "matched" && room.status !== "exhausted") throw new MovieChoiceError("not_ready", 409);
    if (room.generationAttempts >= MOVIE_CHOICE_MAX_GENERATIONS) throw new MovieChoiceError("room_limit_reached", 429);
    return {
      ...room, status: "preferences", batch: room.batch + 1, revision: room.revision + 1,
      hostPreferences: null, guestPreferences: null, hostVotes: [], guestVotes: [], movies: [],
      matchMovieId: null, generationToken: null, generationStartedAt: null, generationError: null,
      excludedMovieIds: [...new Set([...room.excludedMovieIds, ...room.movies.map((movie) => movie.id)])].slice(-400),
    };
  }
  if (action.action === "preferences") {
    if (room.status !== "waiting" && room.status !== "preferences") throw new MovieChoiceError("not_ready", 409);
    if (room.generationToken && room.generationStartedAt && now - room.generationStartedAt.getTime() < MOVIE_CHOICE_GENERATION_LEASE_MS) {
      throw new MovieChoiceError("preparing", 409);
    }
    if (room.generationAttempts >= MOVIE_CHOICE_MAX_GENERATIONS) throw new MovieChoiceError("room_limit_reached", 429);
    return {
      ...room, [`${role}Preferences`]: action.preferences, revision: room.revision + 1,
      generationToken: null, generationStartedAt: null, generationError: null,
    };
  }
  const ownVotes = role === "host" ? room.hostVotes : room.guestVotes;
  const existing = ownVotes.find((vote) => vote.movieId === action.movieId);
  // Retries after a lost response are harmless, including the vote that matched.
  if (existing) {
    if (existing.liked !== action.liked) throw new MovieChoiceError("already_voted", 409);
    return room;
  }
  if (room.status !== "voting") throw new MovieChoiceError("not_ready", 409);
  const next = room.movies[ownVotes.length];
  if (!next || next.id !== action.movieId) throw new MovieChoiceError("invalid_vote");
  const nextVotes = [...ownVotes, { movieId: action.movieId, liked: action.liked }];
  const nextRoom = { ...room, [`${role}Votes`]: nextVotes, revision: room.revision + 1 };
  const otherVotes = role === "host" ? room.guestVotes : room.hostVotes;
  if (action.liked && otherVotes.some((vote) => vote.movieId === action.movieId && vote.liked)) {
    nextRoom.status = "matched";
    nextRoom.matchMovieId = action.movieId;
  } else if (nextVotes.length === room.movies.length && otherVotes.length === room.movies.length) {
    nextRoom.status = "exhausted";
  }
  return nextRoom;
}

export function serializeMovieChoiceRoom(room: MovieChoiceState, identity: string, now = Date.now()): MovieChoiceRoomView {
  assertActiveMovieChoiceRoom(room, now);
  const role = movieChoiceRole(room, identity);
  if (!role) throw new MovieChoiceError("room_not_found", 404);
  const preparing = Boolean(room.generationToken && room.generationStartedAt && now - room.generationStartedAt.getTime() < MOVIE_CHOICE_GENERATION_LEASE_MS);
  return {
    code: room.code, status: room.status as MovieChoiceRoomView["status"], you: role,
    players: [
      { role: "host", name: room.hostName, ready: room.hostPreferences !== null, votedCount: room.hostVotes.length },
      ...(room.guestId ? [{ role: "guest" as const, name: room.guestName ?? "", ready: room.guestPreferences !== null, votedCount: room.guestVotes.length }] : []),
    ],
    preferences: role === "host" ? room.hostPreferences : room.guestPreferences,
    votes: role === "host" ? room.hostVotes : room.guestVotes,
    movies: room.movies,
    match: room.status === "matched" ? room.movies.find((movie) => movie.id === room.matchMovieId) ?? null : null,
    batch: room.batch, revision: room.revision, preparing,
    generationError: room.generationError === "no_results" ? "no_results" : room.generationError === "service_unavailable" || (room.generationToken && !preparing) ? "service_unavailable" : null,
    expiresAt: room.expiresAt.toISOString(),
  };
}
