import type { SavedMovie } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function exportProfileData(userId: string) {
  return prisma.$transaction(async (tx) => {
    const [profile, collection, rankings, history, stats, feedback, wallet, transactions, higherLowerRecord, usage] = await Promise.all([
      tx.userProfile.findUnique({ where: { userId } }),
      tx.savedMovie.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      tx.rankedList.findMany({ where: { userId }, include: { items: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } }),
      tx.gameResult.findMany({ where: { userId }, orderBy: { completedAt: "asc" } }),
      tx.userStats.findUnique({ where: { userId } }),
      tx.recommendationFeedback.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      tx.userWallet.findUnique({ where: { userId } }),
      tx.coinTransaction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      tx.higherLowerRecord.findUnique({ where: { userId } }),
      tx.dailyUsage.findMany({ where: { key: { startsWith: `recommend:${userId}:` } }, orderBy: { date: "asc" } }),
    ]);
    // A running game's solution is server state, not a revealed user result.
    const exportedHistory = history.map((game) => game.status === "playing"
      ? { ...game, targetMovieId: null, targetTitle: "", targetYear: null, targetPoster: "" }
      : game);
    return { version: 1, exportedAt: new Date().toISOString(), profile, collection, rankings, history: exportedHistory, stats, feedback, wallet, transactions, higherLowerRecord, usage };
  }, { isolationLevel: "RepeatableRead", timeout: 20_000 });
}

export function collectionCsv(movies: Pick<SavedMovie, "tmdbId" | "title" | "year" | "category" | "genres" | "director" | "runtime" | "rating" | "review" | "watchedAt" | "createdAt">[]): string {
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    // Quoting alone does not stop spreadsheet formulas. Also guard leading whitespace.
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const headers = ["tmdbId", "title", "year", "category", "genres", "director", "runtimeMinutes", "rating", "review", "watchedAt", "createdAt"];
  const rows = movies.map((movie) => [movie.tmdbId, movie.title, movie.year, movie.category, movie.genres.join(" | "), movie.director, movie.runtime, movie.rating, movie.review, movie.watchedAt?.toISOString(), movie.createdAt.toISOString()]);
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export async function deleteProfileData(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"profile:" + userId}))`;
    // Ranking items are removed by the existing ON DELETE CASCADE relation.
    await tx.rankedList.deleteMany({ where: { userId } });
    await tx.savedMovie.deleteMany({ where: { userId } });
    await tx.gameResult.deleteMany({ where: { userId } });
    await tx.userStats.deleteMany({ where: { userId } });
    await tx.recommendationFeedback.deleteMany({ where: { userId } });
    await tx.coinTransaction.deleteMany({ where: { userId } });
    await tx.userWallet.deleteMany({ where: { userId } });
    await tx.higherLowerRecord.deleteMany({ where: { userId } });
    await tx.dailyUsage.deleteMany({ where: { key: { startsWith: `recommend:${userId}:` } } });
    await tx.userProfile.deleteMany({ where: { userId } });
  }, { timeout: 20_000 });
}
