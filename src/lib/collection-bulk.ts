import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

type Category = "watched" | "watchlist";
type MovieInput = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  genres: string[];
  director: string;
  overview: string;
  runtime: number;
  tmdbRating: number;
};
type UndoChange = {
  id: string;
  updatedAt: string;
  category: Category;
  previous: { category: Category; watchedAt: string | null } | null;
};
type UndoReceipt = {
  userId: string;
  expiresAt: number;
  count: number;
  changes: UndoChange[];
};

export class CollectionBulkError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function invalid(): never {
  throw new CollectionBulkError("Invalid collection request");
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function category(value: unknown): Category {
  if (value !== "watched" && value !== "watchlist") invalid();
  return value;
}

function text(value: unknown, max: number, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || value.length > max) invalid();
  return value.trim();
}

function number(value: unknown, max: number, integer = true): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) invalid();
  return value;
}

export function parseCollectionBulkInput(value: unknown): { category: Category; movies: MovieInput[] } {
  const body = object(value);
  const target = category(body.category);
  if (!Array.isArray(body.movies) || body.movies.length < 1 || body.movies.length > 50) invalid();
  const ids = new Set<number>();
  const movies = body.movies.map((value) => {
    const movie = object(value);
    const tmdbId = number(movie.tmdbId, 2_147_483_647);
    const title = text(movie.title, 500);
    if (!tmdbId || !title || ids.has(tmdbId)) invalid();
    ids.add(tmdbId);
    const genres = movie.genres ?? [];
    if (!Array.isArray(genres) || genres.length > 30 || genres.some((genre) => typeof genre !== "string" || genre.length > 100)) invalid();
    return {
      tmdbId, title,
      year: number(movie.year, 9999),
      posterPath: text(movie.posterPath, 2048),
      genres: genres as string[],
      director: text(movie.director, 500),
      overview: text(movie.overview, 20_000),
      runtime: number(movie.runtime, 100_000),
      tmdbRating: number(movie.tmdbRating, 10, false),
    };
  });
  return { category: target, movies };
}

function signature(payload: string): Buffer {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Collection undo signing is not configured");
  return createHmac("sha256", secret).update("showle:collection-undo:v1\n").update(payload).digest();
}

function sign(receipt: UndoReceipt): string {
  const payload = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

function readReceipt(token: unknown, userId: string): UndoReceipt {
  if (typeof token !== "string" || token.length > 40_000) invalid();
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) invalid();
  const expected = signature(parts[0]);
  const received = Buffer.from(parts[1], "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) invalid();
  let receipt: UndoReceipt;
  try {
    receipt = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    invalid();
  }
  if (!receipt || receipt.userId !== userId || !Number.isFinite(receipt.expiresAt) || receipt.expiresAt <= Date.now() || !Number.isInteger(receipt.count) || receipt.count < 1 || receipt.count > 50 || !Array.isArray(receipt.changes) || receipt.changes.length > receipt.count) invalid();
  for (const change of receipt.changes) {
    if (!change || typeof change.id !== "string" || !change.id || !Number.isFinite(Date.parse(change.updatedAt))) invalid();
    category(change.category);
    if (change.previous !== null) {
      if (!change.previous) invalid();
      category(change.previous.category);
      if (change.previous.watchedAt !== null && !Number.isFinite(Date.parse(change.previous.watchedAt))) invalid();
    }
  }
  return receipt;
}

export async function addCollectionMovies(userId: string, input: ReturnType<typeof parseCollectionBulkInput>) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.savedMovie.findMany({
      where: { userId, tmdbId: { in: input.movies.map((movie) => movie.tmdbId) } },
    });
    const byTmdbId = new Map(existing.map((movie) => [movie.tmdbId, movie]));
    const changes: UndoChange[] = [];
    const newMovies = input.movies.filter((movie) => !byTmdbId.has(movie.tmdbId));
    if (newMovies.length) {
      const added = await tx.savedMovie.createManyAndReturn({
        data: newMovies.map((movie) => ({ ...movie, userId, category: input.category, watchedAt: input.category === "watched" ? new Date() : null })),
      });
      changes.push(...added.map((movie) => ({ id: movie.id, updatedAt: movie.updatedAt.toISOString(), category: input.category, previous: null })));
    }
    for (const movie of existing) {
      if (movie.category === input.category) continue;
      const updatedAt = new Date(Math.max(Date.now(), movie.updatedAt.getTime() + 1));
      const result = await tx.savedMovie.updateMany({
        where: { id: movie.id, userId, updatedAt: movie.updatedAt },
        data: {
          category: input.category,
          ...(input.category === "watched" && !movie.watchedAt ? { watchedAt: new Date() } : {}),
          updatedAt,
        },
      });
      if (result.count !== 1) throw new CollectionBulkError("Collection changed. Try again.", 409);
      changes.push({ id: movie.id, updatedAt: updatedAt.toISOString(), category: input.category, previous: { category: category(movie.category), watchedAt: movie.watchedAt?.toISOString() ?? null } });
    }
    const count = input.movies.length;
    const undoToken = sign({ userId, expiresAt: Date.now() + 10 * 60_000, count, changes });
    return { count, category: input.category, undoToken };
  }, { isolationLevel: "Serializable", timeout: 20_000 });
}

export async function undoCollectionMovies(userId: string, body: unknown) {
  const receipt = readReceipt(object(body).undoToken, userId);
  await prisma.$transaction(async (tx) => {
    for (const change of receipt.changes) {
      const where = { id: change.id, userId, category: change.category, updatedAt: new Date(change.updatedAt) };
      const result = change.previous === null
        ? await tx.savedMovie.deleteMany({ where })
        : await tx.savedMovie.updateMany({
          where,
          data: {
            category: change.previous.category,
            watchedAt: change.previous.watchedAt ? new Date(change.previous.watchedAt) : null,
            updatedAt: new Date(Math.max(Date.now(), Date.parse(change.updatedAt) + 1)),
          },
        });
      if (result.count !== 1) throw new CollectionBulkError("Collection changed. Undo is no longer available.", 409);
    }
  }, { isolationLevel: "Serializable", timeout: 20_000 });
  return { count: receipt.count };
}
