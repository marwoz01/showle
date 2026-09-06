import { isRecord } from "@/lib/request-body";

export const MAX_RANKING_ADD_BATCH = 50;
export const MAX_RANKING_REORDER_BATCH = 500;
export const MAX_RANKING_ITEMS = 500;
export const MAX_RANKING_OPERATIONS = 1000;
export const MAX_RANKING_BODY_BYTES = 512 * 1024;
export interface RankingMovieInput {
  tmdbId: number; title: string; year: number; posterPath: string;
  genres: string[]; director: string; overview: string;
}
export interface RankingPositionInput { id: string; position: number }
const positiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 2147483647;

export function parseRankingMove(body: unknown): RankingPositionInput | null {
  if (!isRecord(body) || !isRecord(body.move) || Object.hasOwn(body, "items")) return null;
  const { id, position } = body.move;
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id) && positiveInt(position)
    ? { id, position } : null;
}

export function parseRankingMovies(body: unknown): RankingMovieInput[] | null {
  if (!isRecord(body)) return null;
  const values = Object.hasOwn(body, "items") ? body.items : [body];
  if (!Array.isArray(values) || !values.length || values.length > MAX_RANKING_ADD_BATCH) return null;
  const result: RankingMovieInput[] = [];
  const ids = new Set<number>();
  for (const value of values) {
    if (!isRecord(value)) return null;
    const { tmdbId, title, year = 0, genres = [] } = value;
    const posterPath = value.posterPath ?? "";
    const director = value.director ?? "";
    const overview = value.overview ?? "";
    if (!positiveInt(tmdbId) || ids.has(tmdbId) || typeof title !== "string" || !title.trim() || title.length > 500 ||
      typeof year !== "number" || !Number.isInteger(year) || year < 0 || year > 9999 ||
      typeof posterPath !== "string" || posterPath.length > 500 ||
      typeof director !== "string" || director.length > 500 ||
      typeof overview !== "string" || overview.length > 10000 ||
      !Array.isArray(genres) || genres.length > 30 || genres.some((genre) => typeof genre !== "string" || genre.length > 80)
    ) return null;
    ids.add(tmdbId);
    result.push({ tmdbId, title, year, posterPath, genres, director, overview });
  }
  return result;
}

export function parseRankingPositions(body: unknown): RankingPositionInput[] | null {
  if (!isRecord(body) || !Array.isArray(body.items) || !body.items.length || body.items.length > MAX_RANKING_REORDER_BATCH) return null;
  const ids = new Set<string>();
  const positions = new Set<number>();
  const result: RankingPositionInput[] = [];
  for (const item of body.items) {
    if (!isRecord(item) || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.id) ||
      !positiveInt(item.position) || ids.has(item.id) || positions.has(item.position)) return null;
    ids.add(item.id);
    positions.add(item.position);
    result.push({ id: item.id, position: item.position });
  }
  return result;
}
