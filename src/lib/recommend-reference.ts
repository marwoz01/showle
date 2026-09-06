import { prisma } from "@/lib/prisma";
import type { ReferenceMovie } from "@/lib/recommend-ranking";

export async function getRecommendationReference(id: number | null): Promise<ReferenceMovie | null> {
  if (!id) return null;
  const cached = await prisma.recommendationMovie.findUnique({ where: { tmdbId: id },
    select: { tmdbId: true, title: true, overview: true, genres: true, director: true, keywords: true } });
  if (cached) return { ...cached, id: cached.tmdbId };
  try {
    const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
    url.searchParams.set("api_key", process.env.TMDB_API_KEY ?? "");
    url.searchParams.set("language", "en-US");
    url.searchParams.set("append_to_response", "credits,keywords");
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.adult || typeof data.title !== "string" || typeof data.overview !== "string") return null;
    return { id, title: data.title, overview: data.overview,
      genres: (data.genres ?? []).map((genre: { name: string }) => genre.name),
      director: data.credits?.crew?.find((person: { job: string; name: string }) => person.job === "Director")?.name ?? "",
      keywords: (data.keywords?.keywords ?? []).map((keyword: { name: string }) => keyword.name) };
  } catch { return null; }
}
