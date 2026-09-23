import { getMovieDetails } from "@/lib/tmdb";
import { knownCastNames } from "@/lib/cast-comparison";
import type { MediaDetails } from "@/types";

const CACHE_LIMIT = 64;
const castCache = new Map<string, { names: string[] | undefined; expiresAt: number }>();
const pending = new Map<string, Promise<string[] | undefined>>();

export async function getAnswerCastNames(dateKey: string, answer: MediaDetails): Promise<string[] | undefined> {
  const snapshotNames = knownCastNames(answer.castNames);
  if (snapshotNames.length) return snapshotNames;
  const key = `${dateKey}:${answer.id}`;
  const cached = castCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.names;
  let request = pending.get(key);
  if (!request) {
    request = getMovieDetails(answer.id)
      .then((movie) => {
        const names = knownCastNames(movie?.castNames);
        return names.length ? names : undefined;
      })
      .catch(() => undefined)
      .then((names) => {
        castCache.set(key, { names, expiresAt: Date.now() + (names ? 30 * 60_000 : 60_000) });
        if (castCache.size > CACHE_LIMIT) castCache.delete(castCache.keys().next().value!);
        return names;
      })
      .finally(() => { if (pending.get(key) === request) pending.delete(key); });
    pending.set(key, request);
    if (pending.size > CACHE_LIMIT) pending.delete(pending.keys().next().value!);
  }
  return request;
}
