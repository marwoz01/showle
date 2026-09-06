import catalog from "@/data/frame-catalog.json";
import overrides from "@/data/frame-catalog-overrides.json";
import type {
  DuelMovieCandidate,
  FrameMovie,
  FrameMovieOverride,
} from "@/types/frame-catalog";

const edits: Record<string, FrameMovieOverride> = overrides;
const movies: FrameMovie[] = catalog.movies;
const pools = new Map<string, DuelMovieCandidate[]>();

/** Server-side, versioned snapshot; no popular/trending API calls during a game. */
export function getFrameMoviePool(language = "en-US"): DuelMovieCandidate[] {
  const locale = language.startsWith("pl") ? "pl" : "en";
  const cached = pools.get(locale);
  if (cached) return cached;
  const pool = movies.flatMap((movie) => {
    const edit = edits[movie.id];
    const frames = edit?.frames ?? movie.frames;
    if (edit?.enabled === false || !frames.length) return [];
    return [
      {
        ...movie,
        frames,
        title: edit?.titles?.[locale] || movie.titles[locale],
        relatedMovieIds: edit?.relatedMovieIds,
      },
    ];
  });
  pools.set(locale, pool);
  return pool;
}
