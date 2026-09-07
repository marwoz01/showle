import "server-only";
import { createHash } from "node:crypto";
import catalog from "@/data/higher-lower-catalog.json";
import { HigherLowerError } from "@/lib/higher-lower";
import type { HigherLowerCatalogMovie } from "@/types/higher-lower";

let snapshot: { movies: readonly HigherLowerCatalogMovie[]; version: string } | undefined;

export function getHigherLowerCatalog() {
  if (snapshot) return snapshot;
  const movies: HigherLowerCatalogMovie[] = catalog.movies;
  const unique = new Set<number>();
  const valid = catalog.version === 1 && movies.length >= 2 && movies.length <= 2000
    && movies.every((movie) => {
      if (!Number.isSafeInteger(movie.id) || movie.id < 1 || unique.has(movie.id)
        || !Number.isInteger(movie.runtime) || movie.runtime < 40 || movie.runtime > 400
        || !Number.isInteger(movie.year) || movie.year < 1888 || movie.year > new Date().getUTCFullYear()
        || !movie.titles.pl.trim() || !movie.titles.en.trim()
        || !/^\/[A-Za-z0-9]+\.(jpg|png|webp)$/.test(movie.backdropPath)) return false;
      unique.add(movie.id);
      return true;
    });
  if (!valid) throw new HigherLowerError("game_unavailable");
  snapshot = {
    movies,
    // Changed runtimes or membership invalidate old sessions rather than change an answer mid-run.
    version: createHash("sha256").update(JSON.stringify(movies.map(({ id, runtime }) => [id, runtime]))).digest("hex").slice(0, 24),
  };
  return snapshot;
}
