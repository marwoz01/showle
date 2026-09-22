import { prisma } from "@/lib/prisma";
import type { ProfileActivity } from "@/types/profile";

export async function getProfileActivity(userId: string): Promise<ProfileActivity[]> {
  const [movies, games] = await Promise.all([
    prisma.savedMovie.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12,
      select: { id: true, title: true, posterPath: true, updatedAt: true, category: true, rating: true } }),
    prisma.gameResult.findMany({ where: { userId, status: { in: ["won", "lost"] } }, orderBy: { completedAt: "desc" }, take: 12,
      select: { id: true, targetTitle: true, targetPoster: true, completedAt: true, status: true } }),
  ]);
  const activity: ProfileActivity[] = [
    ...movies.map((movie): ProfileActivity => ({ kind: movie.category === "watchlist" ? "watchlist" : movie.rating !== null ? "rating" : "watched", id: movie.id, title: movie.title, posterPath: movie.posterPath, date: movie.updatedAt.toISOString(), rating: movie.rating })),
    ...games.map((game): ProfileActivity => ({ kind: "game", id: game.id, title: game.targetTitle, posterPath: game.targetPoster, date: game.completedAt.toISOString(), won: game.status === "won" })),
  ];
  return activity.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
}
