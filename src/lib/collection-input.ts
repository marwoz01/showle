import { isRecord } from "@/lib/request-body";
import type { CollectionCategory, CollectionSort } from "@/types/collection";

export const MAX_COLLECTION_BODY_BYTES = 16 * 1024;
export const MAX_REVIEW_LENGTH = 1000;
export class CollectionInputError extends Error {}
const invalid = (): never => { throw new CollectionInputError("invalid_collection_input"); };
function text(value: unknown, max: number, fallback = ""): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.length > max) return invalid();
  return value.trim();
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) return invalid();
  return value;
}
function score(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0.5 || value > 10 || value * 2 % 1 !== 0) return invalid();
  return value;
}
function category(value: unknown): CollectionCategory {
  return value === "watched" || value === "watchlist" ? value : invalid();
}
function watchedDate(value: unknown): Date | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) return invalid();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.slice(0, 10)) return invalid();
  return date;
}
export function parseCollectionPatch(body: unknown) {
  if (!isRecord(body)) return invalid();
  const result: { category?: CollectionCategory; rating?: number | null; review?: string | null; watchedAt?: Date | null } = {};
  if (body.category !== undefined) result.category = category(body.category);
  if (body.rating !== undefined) result.rating = score(body.rating);
  if (body.review !== undefined) result.review = body.review === null ? null : text(body.review, MAX_REVIEW_LENGTH) || null;
  if (body.watchedAt !== undefined) result.watchedAt = watchedDate(body.watchedAt);
  if (!Object.keys(result).length) return invalid();
  return result;
}
export function parseCollectionCreate(body: unknown) {
  if (!isRecord(body)) return invalid();
  const tmdbId = integer(body.tmdbId, 1, 2147483647);
  const title = text(body.title, 300);
  if (!title) return invalid();
  const posterPath = text(body.posterPath, 300);
  if (posterPath && (!/^\/[\w/.-]+$/.test(posterPath) || posterPath.includes("..") || posterPath.startsWith("//"))) return invalid();
  const genres = body.genres === undefined ? [] : body.genres;
  if (!Array.isArray(genres) || genres.length > 32) return invalid();
  const tmdbRating = body.tmdbRating === undefined ? 0 : body.tmdbRating;
  if (typeof tmdbRating !== "number" || !Number.isFinite(tmdbRating) || tmdbRating < 0 || tmdbRating > 10) return invalid();
  return {
    tmdbId, title, posterPath, category: category(body.category),
    year: integer(body.year === undefined ? 0 : body.year, 0, new Date().getFullYear() + 10),
    genres: [...new Set(genres.map((genre) => { const name = text(genre, 80); return name || invalid(); }))],
    director: text(body.director, 300), overview: text(body.overview, 4000),
    runtime: integer(body.runtime === undefined ? 0 : body.runtime, 0, 10080), tmdbRating,
    ...(body.rating !== undefined ? { rating: score(body.rating) } : {}),
    ...(body.review !== undefined ? { review: body.review === null ? null : text(body.review, MAX_REVIEW_LENGTH) || null } : {}),
  };
}
export function parseCollectionQuery(params: URLSearchParams) {
  const selectedCategory = category(params.get("category") ?? "watched");
  const sort = params.get("sort") ?? "date";
  if (!["date", "rating", "title", "year"].includes(sort)) return invalid();
  const order = params.get("order") ?? (sort === "title" ? "asc" : "desc");
  if (order !== "asc" && order !== "desc") return invalid();
  const rawPage = params.get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(rawPage)) return invalid();
  return { category: selectedCategory, sort: sort as CollectionSort, order: order as "asc" | "desc",
    page: integer(Number(rawPage), 1, 100000) };
}
export function parseCollectionIds(params: URLSearchParams): number[] {
  const ids = (params.get("ids") ?? "").split(",");
  if (!ids.length || ids.length > 50 || ids.some((id) => !/^[1-9]\d*$/.test(id))) return invalid();
  return [...new Set(ids.map((id) => integer(Number(id), 1, 2147483647)))];
}
