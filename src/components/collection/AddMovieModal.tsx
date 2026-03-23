"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { MediaDetails } from "@/types";
import { X, Search, Loader2, Eye, Bookmark, Check } from "lucide-react";

interface AddMovieModalProps {
  onClose: () => void;
}

export default function AddMovieModal({ onClose }: AddMovieModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState<"watched" | "watchlist">("watched");
  const inputRef = useRef<HTMLInputElement>(null);

  // Popular movies state
  const [popular, setPopular] = useState<MediaDetails[]>([]);
  const [popularPage, setPopularPage] = useState(1);
  const [popularTotalPages, setPopularTotalPages] = useState(1);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Multi-select
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [savingBulk, setSavingBulk] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const checkedMoviesRef = useRef<Map<number, MediaDetails>>(new Map());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch popular movies
  const fetchPopular = useCallback(async (page: number) => {
    setLoadingPopular(true);
    try {
      const res = await fetch(`/api/movies/popular?page=${page}`);
      const data = await res.json();
      if (page === 1) {
        setPopular(data.results || []);
      } else {
        setPopular((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const unique = (data.results || []).filter((m: MediaDetails) => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
      }
      setPopularTotalPages(data.totalPages || 1);
    } catch {
      // silently fail
    } finally {
      setLoadingPopular(false);
      setInitialLoadDone(true);
    }
  }, []);

  useEffect(() => {
    fetchPopular(1);
  }, [fetchPopular]);

  // Search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data: MediaDetails[] = await res.json();
        setResults(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Infinite scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (query.length >= 2) return;
      if (loadingPopular) return;
      if (popularPage >= popularTotalPages) return;

      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        const nextPage = popularPage + 1;
        setPopularPage(nextPage);
        fetchPopular(nextPage);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [query, loadingPopular, popularPage, popularTotalPages, fetchPopular]);

  const toggleCheck = (movie: MediaDetails) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(movie.id)) {
        next.delete(movie.id);
        checkedMoviesRef.current.delete(movie.id);
      } else {
        next.add(movie.id);
        checkedMoviesRef.current.set(movie.id, movie);
      }
      return next;
    });
  };

  const handleBulkSave = async () => {
    if (checked.size === 0) return;
    setSavingBulk(true);

    try {
      const movies = Array.from(checkedMoviesRef.current.values());
      await Promise.all(
        movies.map((movie) =>
          fetch("/api/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: movie.posterPath,
              genres: movie.genres,
              director: movie.director,
              overview: movie.overview,
              runtime: movie.runtime,
              tmdbRating: movie.rating,
              category,
            }),
          })
        )
      );
      onClose();
    } catch {
      setSavingBulk(false);
    }
  };

  const displayMovies = query.length >= 2 ? results : popular;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/6 bg-background shadow-2xl"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
          <h3 className="text-base font-semibold text-foreground">
            {t.collection.addMovie}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-6">
          {/* Search */}
          <div className="relative shrink-0">
            {isLoading ? (
              <Loader2
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-muted"
              />
            ) : (
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={t.collection.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-white/6 bg-card py-3.5 pl-12 pr-4 text-sm text-foreground placeholder-muted outline-none transition-all focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30"
            />
          </div>

          {/* Category selector */}
          <div className="mt-3 flex shrink-0 gap-2">
            <button
              onClick={() => setCategory("watched")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                category === "watched"
                  ? "border-accent-purple/30 bg-accent-purple/10 text-accent-purple"
                  : "border-white/6 bg-white/3 text-muted hover:bg-white/6"
              }`}
            >
              <Eye size={14} />
              {t.collection.watched}
            </button>
            <button
              onClick={() => setCategory("watchlist")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                category === "watchlist"
                  ? "border-accent-purple/30 bg-accent-purple/10 text-accent-purple"
                  : "border-white/6 bg-white/3 text-muted hover:bg-white/6"
              }`}
            >
              <Bookmark size={14} />
              {t.collection.watchlist}
            </button>
          </div>

          {/* Selected chips */}
          {checked.size > 0 && (
            <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
              {Array.from(checkedMoviesRef.current.values()).map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => toggleCheck(movie)}
                  className="flex items-center gap-1 rounded-full bg-accent-purple/15 px-2.5 py-1 text-xs font-medium text-accent-purple transition-colors hover:bg-accent-purple/25"
                >
                  {movie.title}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}

          {/* Section label */}
          {query.length < 2 && initialLoadDone && popular.length > 0 && (
            <p className="mt-3 mb-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted/50">
              {t.collection.popularMovies}
            </p>
          )}

          {/* Movie list */}
          <div
            ref={listRef}
            className="mt-1 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/6 bg-card"
          >
            {displayMovies.map((movie) => {
              const isChecked = checked.has(movie.id);
              return (
                <button
                  key={movie.id}
                  onClick={() => toggleCheck(movie)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4 ${
                    isChecked ? "bg-accent-purple/5" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      isChecked
                        ? "border-accent-purple bg-accent-purple text-white"
                        : "border-white/15 bg-white/3 text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>

                  {movie.posterPath && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                      alt={movie.title}
                      width={32}
                      height={48}
                      className="shrink-0 rounded"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {movie.title}
                    </p>
                    <p className="text-xs text-muted">
                      {movie.year}
                      {movie.genres.length > 0 && (
                        <> · {movie.genres.slice(0, 2).join(", ")}</>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Loading indicator */}
            {(loadingPopular || isLoading) && (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={18} className="animate-spin text-muted" />
              </div>
            )}

            {/* Empty search */}
            {!loadingPopular &&
              !isLoading &&
              displayMovies.length === 0 &&
              initialLoadDone &&
              query.length >= 2 && (
                <p className="py-6 text-center text-xs text-muted">
                  {t.collection.searchPlaceholder}
                </p>
              )}
          </div>

          {/* Bulk add button */}
          {checked.size > 0 && (
            <button
              onClick={handleBulkSave}
              disabled={savingBulk}
              className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-accent-purple py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {savingBulk ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t.collection.addSelected(checked.size)
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
