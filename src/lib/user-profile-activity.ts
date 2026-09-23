import { prisma } from "@/lib/prisma";
import type { ProfileActivity } from "@/types/profile";

export async function getProfileActivity(userId: string): Promise<ProfileActivity[]> {
  const movies = await prisma.savedMovie.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12,
    select: { id: true, title: true, posterPath: true, updatedAt: true, category: true, rating: true } });
  return movies.map((movie): ProfileActivity => ({
    kind: movie.category === "watchlist" ? "watchlist" : movie.rating !== null ? "rating" : "watched",
    id: movie.id, title: movie.title, posterPath: movie.posterPath,
    date: movie.updatedAt.toISOString(), rating: movie.rating,
  }));
}
