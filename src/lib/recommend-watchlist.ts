import { prisma } from "@/lib/prisma";
import { validMovieId } from "@/lib/recommend-input";
import { fetchCatalogMetadata } from "@/lib/recommend-catalog-metadata";
import { checkRateLimit } from "@/lib/rate-limit";

export async function getRecommendationWatchlist(userId: string): Promise<number[]> {
  const saved = await prisma.savedMovie.findMany({
    where: { userId, category: "watchlist" }, select: { tmdbId: true }, orderBy: { createdAt: "desc" },
  });
  return [...new Set(saved.map((movie) => movie.tmdbId).filter(validMovieId))];
}

export async function prepareWatchlistCatalog(ids: number[], options?: { budgetKey: string }): Promise<number> {
  if (!ids.length) return 0;
  const existing = await prisma.recommendationMovie.findMany({ where: { tmdbId: { in: ids } }, select: { tmdbId: true } });
  const known = new Set(existing.map((movie) => movie.tmdbId));
  const missing = ids.filter((id) => !known.has(id));
  if (!missing.length) return 0;
  // Bound cold-list work. Later requests fill more entries without an unbounded TMDB fan-out.
  const pending = missing.slice(0, 12);
  const cost = pending.length;
  if (!(await checkRateLimit(`catalog-import:${options?.budgetKey ?? "unattributed"}`, { limit: 12, windowMs: 300000, cost })).success
    || !(await checkRateLimit("catalog-import:global", { limit: 120, windowMs: 60000, cost })).success) return missing.length;
  const signal = AbortSignal.timeout(5000);
  let imported = 0;
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, async () => {
    while (index < pending.length && !signal.aborted) {
      const id = pending[index++];
      const metadata = await fetchCatalogMetadata(id, signal);
      if (!metadata) continue;
      try {
        await prisma.recommendationMovie.upsert({ where: { tmdbId: id }, create: metadata, update: {} });
        imported++;
      } catch { /* Existing catalog entries remain usable if one import fails. */ }
    }
  }));
  return missing.length - imported;
}
