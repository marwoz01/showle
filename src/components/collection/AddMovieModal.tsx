"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { X, Search, Loader2, Eye, Bookmark } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import type { MediaDetails } from "@/types";
import type { CollectionCategory, CollectionSaveResult } from "@/types/collection";
import AddMovieResults, { type CollectionMovieOption } from "@/components/collection/AddMovieResults";
import { useCollectionMovieSearch } from "@/components/collection/useCollectionMovieSearch";

export interface AddMovieModalProps {
  onClose: () => void;
  onSaved: (result: CollectionSaveResult) => void;
}

export default function AddMovieModal({ onClose, onSaved }: AddMovieModalProps) {
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Map<number, CollectionMovieOption>>(new Map());
  const [saving, setSaving] = useState<CollectionCategory | null>(null);
  const [error, setError] = useState<"save" | "limit" | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const search = useCollectionMovieSearch(query, locale);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const toggleMovie = (movie: CollectionMovieOption) => {
    if (busyRef.current) return;
    if (!selected.has(movie.id) && selected.size >= 50) { setError("limit"); return; }
    setError(null);
    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(movie.id)) next.delete(movie.id);
      else next.set(movie.id, movie);
      return next;
    });
  };

  const save = async (category: CollectionCategory) => {
    if (!selected.size || busyRef.current) return;
    busyRef.current = true;
    dialogRef.current?.focus();
    setSaving(category);
    setError(null);
    try {
      const movies = await Promise.all(Array.from(selected.values()).map(async (movie) => {
        if ("genres" in movie) return movie;
        const response = await fetch(`/api/movies/details?id=${movie.id}&lang=${locale}`);
        if (!response.ok) throw new Error("details");
        return await response.json() as MediaDetails;
      }));
      const response = await fetch("/api/collection/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, movies: movies.map((movie) => ({
          tmdbId: movie.id, title: movie.title, year: movie.year,
          posterPath: movie.posterPath, genres: movie.genres, director: movie.director,
          overview: movie.overview, runtime: movie.runtime, tmdbRating: movie.rating,
        })) }),
      });
      if (!response.ok) throw new Error("save");
      onSaved(await response.json() as CollectionSaveResult);
    } catch {
      setError("save");
      requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>(`[data-save-category="${category}"]`)?.focus());
    } finally {
      busyRef.current = false;
      setSaving(null);
    }
  };

  const close = () => { if (!busyRef.current) onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div ref={dialogRef} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby={headingId} aria-busy={saving !== null}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/6 bg-background shadow-2xl sm:max-h-[85dvh]"
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); close(); }
          if (event.key !== "Tab") return;
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]');
          if (!focusable?.length) { event.preventDefault(); return; }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/6 px-4 py-4 sm:px-6">
          <h3 id={headingId} className="font-display text-base font-semibold text-foreground">{t.collection.addMovie}</h3>
          <button type="button" onClick={close} disabled={saving !== null} aria-label={t.collection.close}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground disabled:opacity-50"><X size={18} /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
          <div className="relative shrink-0">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input ref={inputRef} type="search" aria-label={t.collection.searchPlaceholder} placeholder={t.collection.searchPlaceholder}
              value={query} disabled={saving !== null} onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-white/6 bg-card py-3.5 pl-12 pr-4 text-base text-foreground outline-none transition-all placeholder:text-muted focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 sm:text-sm" />
          </div>
          {selected.size > 0 && (
            <div className="mt-3 flex max-h-20 shrink-0 flex-wrap gap-1.5 overflow-y-auto">
              {Array.from(selected.values()).map((movie) => (
                <button key={movie.id} type="button" disabled={saving !== null} onClick={() => toggleMovie(movie)}
                  aria-label={t.collection.deselectMovie(normalizeDisplayText(movie.title))}
                  className="flex max-w-full items-center gap-1 rounded-full bg-accent-purple/15 px-2.5 py-1 text-xs font-medium text-accent-purple transition-colors hover:bg-accent-purple/25">
                  <span className="truncate">{normalizeDisplayText(movie.title)}</span><X size={12} className="shrink-0" />
                </button>
              ))}
            </div>
          )}
          {query.length < 2 && search.initialLoadDone && search.movies.length > 0 && <p className="mt-3 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted/50">{t.collection.popularMovies}</p>}
          <AddMovieResults movies={search.movies} selected={selected} loading={search.loading} error={search.error}
            disabled={saving !== null} onSelect={toggleMovie} onLoadMore={search.loadMore} />
        </div>
        {(selected.size > 0 || error) && (
          <div className="shrink-0 border-t border-white/6 px-4 py-4 sm:px-6">
            {error && <p role="alert" className="mb-3 text-sm text-muted">{error === "limit" ? t.collection.selectionLimit : t.collection.saveError}</p>}
            {selected.size > 0 && <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" data-save-category="watchlist" onClick={() => void save("watchlist")} disabled={saving !== null}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-purple px-3 py-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                {saving === "watchlist" ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <Bookmark size={16} className="shrink-0" />}
                {t.collection.addToWatchlistCount(selected.size)}
              </button>
              <button type="button" data-save-category="watched" onClick={() => void save("watched")} disabled={saving !== null}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent-purple/30 bg-accent-purple/10 px-3 py-3 text-xs font-semibold text-accent-purple transition-colors hover:bg-accent-purple/20 disabled:opacity-50">
                {saving === "watched" ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <Eye size={16} className="shrink-0" />}
                {t.collection.addAsWatchedCount(selected.size)}
              </button>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}
