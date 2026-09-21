import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMovieDetails } from "@/lib/tmdb";
import type { MediaDetails } from "@/types";

const SNAPSHOT_CACHE_LIMIT = 512;
const SNAPSHOT_CACHE_TTL_MS = 30 * 60 * 1000;
const snapshots = new Map<
  string,
  { details: MediaDetails; expiresAt: number }
>();
const pendingSnapshots = new Map<string, Promise<MediaDetails>>();

export async function getMovieSnapshot(
  dateKey: string,
  tmdbId: number,
  locale = "en",
): Promise<MediaDetails> {
  const cacheKey = JSON.stringify([dateKey, tmdbId, locale]);
  const cached = snapshots.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    snapshots.delete(cacheKey);
    snapshots.set(cacheKey, cached);
    return structuredClone(cached.details);
  }
  snapshots.delete(cacheKey);

  let pending = pendingSnapshots.get(cacheKey);
  if (!pending) {
    pending = readMovieSnapshot(dateKey, tmdbId, locale)
      .then((details) => {
        // Only the persisted value is reusable: another instance may win the insert.
        snapshots.set(cacheKey, {
          details,
          expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS,
        });
        if (snapshots.size > SNAPSHOT_CACHE_LIMIT)
          snapshots.delete(snapshots.keys().next().value!);
        return details;
      })
      .finally(() => {
        if (pendingSnapshots.get(cacheKey) === pending)
          pendingSnapshots.delete(cacheKey);
      });
    pendingSnapshots.set(cacheKey, pending);
    if (pendingSnapshots.size > SNAPSHOT_CACHE_LIMIT)
      pendingSnapshots.delete(pendingSnapshots.keys().next().value!);
  }
  // Callers cannot alter the daily snapshot held for other players or requests.
  return structuredClone(await pending);
}

async function readMovieSnapshot(
  dateKey: string,
  tmdbId: number,
  locale: string,
): Promise<MediaDetails> {
  const key = { dateKey, tmdbId, locale };
  const existing = await prisma.dailyMovieSnapshot.findUnique({
    where: { dateKey_tmdbId_locale: key },
  });
  if (existing) return existing.details as unknown as MediaDetails;

  const [base, translated] = await Promise.all([
    locale === "en"
      ? getMovieDetails(tmdbId)
      : getMovieSnapshot(dateKey, tmdbId, "en"),
    locale === "pl" ? getMovieDetails(tmdbId, "pl-PL") : null,
  ]);
  if (!base) throw new Error("movie_unavailable");
  // Only editorial text changes with language. Game parameters always use the daily snapshot.
  const details: MediaDetails = translated
    ? {
        ...base,
        title: translated.title,
        overview: translated.overview,
        tagline: translated.tagline,
        posterPath: translated.posterPath || base.posterPath,
      }
    : base;
  await prisma.dailyMovieSnapshot.createMany({
    data: [{ ...key, details: details as unknown as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
  const saved = await prisma.dailyMovieSnapshot.findUniqueOrThrow({
    where: { dateKey_tmdbId_locale: key },
  });
  return saved.details as unknown as MediaDetails;
}
