"use client";

import Image from "next/image";
import { useTranslation } from "@/i18n";
import { Check, Loader2 } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import type { MediaDetails } from "@/types";
import type { MovieSuggestion } from "@/types/movie-suggestion";

export type PickedMovie = MediaDetails | MovieSuggestion;
interface Props { movies: PickedMovie[]; selected: PickedMovie[]; onSelect: (movie: PickedMovie) => void; loading: boolean }
export default function AddMovieList({ movies, selected, onSelect, loading }: Props) {
  const { t } = useTranslation();
  return <div className="max-h-[40dvh] overflow-y-auto rounded-xl border border-white/6">
    {movies.map((movie) => {
      const checked = selected.some((item) => item.id === movie.id);
      return <button type="button" key={movie.id} aria-pressed={checked} onClick={() => onSelect(movie)}
        className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/4 ${checked ? "bg-accent-purple/10" : ""}`}>
        <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-accent-purple bg-accent-purple text-white" : "border-white/15 text-transparent"}`}><Check size={12} /></span>
        {movie.posterPath && <Image src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`} alt="" width={32} height={48} className="rounded" />}
        <span className="min-w-0"><span className="block truncate text-sm">{normalizeDisplayText(movie.title)}</span><span className="text-xs text-muted">{movie.year}</span></span>
      </button>;
    })}
    {loading && <div role="status" aria-label={t.common.loading} className="flex justify-center p-4"><Loader2 size={18} className="animate-spin" /></div>}
    {!loading && !movies.length && <p className="p-6 text-center text-sm text-muted">{t.collection.noSearchResults}</p>}
  </div>;
}
