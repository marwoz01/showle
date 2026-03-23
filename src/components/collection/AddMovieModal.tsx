"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { MediaDetails } from "@/types";
import { X, Search, Loader2, Eye, Bookmark } from "lucide-react";
import StarRating from "@/components/collection/StarRating";

interface AddMovieModalProps {
  onClose: () => void;
}

export default function AddMovieModal({ onClose }: AddMovieModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<MediaDetails | null>(null);
  const [category, setCategory] = useState<"watched" | "watchlist">("watched");
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    try {
      await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.id,
          title: selected.title,
          year: selected.year,
          posterPath: selected.posterPath,
          genres: selected.genres,
          director: selected.director,
          overview: selected.overview,
          runtime: selected.runtime,
          tmdbRating: selected.rating,
          category,
          rating: category === "watched" ? rating : null,
        }),
      });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/6 bg-background shadow-2xl">
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

        <div className="p-6">
          {!selected ? (
            <>
              {/* Search */}
              <div className="relative">
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

              {/* Results */}
              {results.length > 0 && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-white/6 bg-card">
                  {results.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => setSelected(movie)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4"
                    >
                      {movie.posterPath && (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                          alt={movie.title}
                          width={32}
                          height={48}
                          className="rounded"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {movie.title}
                        </p>
                        <p className="text-xs text-muted">
                          {movie.year} · {movie.genres.slice(0, 2).join(", ")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected movie */}
              <div className="mb-6 flex items-start gap-4">
                {selected.posterPath && (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${selected.posterPath}`}
                    alt={selected.title}
                    width={80}
                    height={120}
                    className="shrink-0 rounded-lg"
                  />
                )}
                <div className="min-w-0">
                  <h4 className="text-lg font-bold text-foreground">
                    {selected.title}
                  </h4>
                  <p className="text-sm text-muted">
                    {selected.year} · {selected.genres.slice(0, 3).join(", ")}
                  </p>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setQuery("");
                      setRating(null);
                    }}
                    className="mt-2 text-xs text-accent-purple hover:underline"
                  >
                    {t.game.back}
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted">
                  {t.collection.chooseCategory}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCategory("watched")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      category === "watched"
                        ? "border-accent-purple/30 bg-accent-purple/10 text-accent-purple"
                        : "border-white/6 bg-white/3 text-muted hover:bg-white/6"
                    }`}
                  >
                    <Eye size={16} />
                    {t.collection.watched}
                  </button>
                  <button
                    onClick={() => setCategory("watchlist")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      category === "watchlist"
                        ? "border-accent-purple/30 bg-accent-purple/10 text-accent-purple"
                        : "border-white/6 bg-white/3 text-muted hover:bg-white/6"
                    }`}
                  >
                    <Bookmark size={16} />
                    {t.collection.watchlist}
                  </button>
                </div>
              </div>

              {/* Rating (only for watched) */}
              {category === "watched" && (
                <div className="mb-6">
                  <p className="mb-2 text-xs font-medium text-muted">
                    {t.collection.rating}
                  </p>
                  <StarRating value={rating} onChange={setRating} size={20} inline />
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-purple py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  t.collection.addToCollection
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
