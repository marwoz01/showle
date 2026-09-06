import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMovieDetails } from "@/lib/tmdb";
import type { MediaDetails } from "@/types";

export async function getMovieSnapshot(dateKey: string, tmdbId: number, locale = "en"): Promise<MediaDetails> {
  const key = { dateKey, tmdbId, locale };
  const existing = await prisma.dailyMovieSnapshot.findUnique({ where: { dateKey_tmdbId_locale: key } });
  if (existing) return existing.details as unknown as MediaDetails;

  const base = locale === "en"
    ? await getMovieDetails(tmdbId)
    : await getMovieSnapshot(dateKey, tmdbId, "en");
  if (!base) throw new Error("movie_unavailable");
  const translated = locale === "pl" ? await getMovieDetails(tmdbId, "pl-PL") : null;
  // Only editorial text changes with language. Game parameters always use the daily snapshot.
  const details: MediaDetails = translated ? {
    ...base,
    title: translated.title,
    overview: translated.overview,
    tagline: translated.tagline,
    posterPath: translated.posterPath || base.posterPath,
  } : base;
  await prisma.dailyMovieSnapshot.createMany({
    data: [{ ...key, details: details as unknown as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
  const saved = await prisma.dailyMovieSnapshot.findUniqueOrThrow({ where: { dateKey_tmdbId_locale: key } });
  return saved.details as unknown as MediaDetails;
}
