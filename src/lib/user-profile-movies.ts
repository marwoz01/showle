import { prisma } from "@/lib/prisma";
import { getMovieDetails } from "@/lib/tmdb";
import { ProfileError } from "@/lib/user-profile-input";
import type { ProfileMovie } from "@/types/profile";

export async function resolveProfileMovies(ids: number[], locale: string): Promise<ProfileMovie[]> {
  if (!ids.length) return [];
  const catalog = await prisma.recommendationMovie.findMany({
    where: { tmdbId: { in: ids } }, select: { tmdbId: true, title: true, titlePl: true, year: true, posterPath: true },
  });
  return Promise.all(ids.map(async (id) => {
    const stored = catalog.find((movie) => movie.tmdbId === id);
    if (stored) return { id, title: locale === "pl" && stored.titlePl ? stored.titlePl : stored.title, year: stored.year, posterPath: stored.posterPath };
    const movie = await getMovieDetails(id, locale === "pl" ? "pl-PL" : "en-US");
    if (!movie) throw new ProfileError("movie_not_found", 404);
    return { id, title: movie.title, year: movie.year, posterPath: movie.posterPath };
  }));
}
