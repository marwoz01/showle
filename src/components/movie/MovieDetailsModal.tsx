"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { X, Star } from "lucide-react";
import { MediaDetails } from "@/types";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import MovieGallery from "@/components/movie/MovieGallery";
import CastList from "@/components/movie/CastList";
import WatchProviders from "@/components/movie/WatchProviders";
import { localizeCountry, localizeGenre } from "@/lib/localization";

interface MovieDetailsModalProps {
  tmdbId: number;
  // Partial data shown immediately while we fetch the rest from TMDB.
  initial?: Partial<MediaDetails> & { title: string; year?: number; posterPath?: string };
  onClose: () => void;
}

export default function MovieDetailsModal({
  tmdbId,
  initial,
  onClose,
}: MovieDetailsModalProps) {
  const { t, locale } = useTranslation();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);

  useEffect(() => {
    const ac = new AbortController();

    fetch(`/api/movies/details?id=${tmdbId}&lang=${locale}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setDetails(data as MediaDetails);
      })
      .catch(() => {});

    fetch(`/api/movies/gallery?id=${tmdbId}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.backdrops) setGallery(data.backdrops as string[]);
      })
      .catch(() => {});

    return () => ac.abort();
  }, [tmdbId, locale]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKey]);

  // Merge fetched details with initial for instant render of partial data.
  const movie: MediaDetails | null = details ?? (initial ? {
    id: tmdbId,
    type: "movie",
    title: initial.title,
    year: initial.year ?? 0,
    genres: initial.genres ?? [],
    country: initial.country ?? "",
    director: initial.director ?? "",
    leadActor: initial.leadActor ?? "",
    runtime: initial.runtime ?? 0,
    budget: initial.budget ?? 0,
    popularity: initial.popularity ?? 0,
    rating: initial.rating ?? 0,
    posterPath: initial.posterPath ?? "",
    backdropPath: initial.backdropPath,
    overview: locale === "en" ? (initial.overview ?? "") : "",
    tagline: locale === "en" ? initial.tagline : undefined,
  } : null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop + flex wrapper combined: clicks anywhere in the empty area
          close the modal; the inner card stops propagation. min-h-full lets
          the modal center vertically while still scrolling when too tall. */}
      <div
        className="relative flex min-h-full items-start justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
      <div
        className="relative my-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/6 bg-card shadow-2xl sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — always reachable in top-right */}
        <button
          onClick={onClose}
          aria-label={t.movieModal.close}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-foreground/80 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-foreground"
        >
          <X size={18} />
        </button>

        {movie && (
          <>
            {/* Cinematic hero */}
            <div className="relative h-56 overflow-hidden sm:h-72">
              {movie.backdropPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w1280${movie.backdropPath}`}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 1024px, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-accent-purple/30 to-card" />
              )}

              <div className="absolute inset-0 bg-linear-to-t from-card via-card/60 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-r from-card/70 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-foreground drop-shadow-2xl sm:text-3xl">
                    {movie.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-foreground/80">
                    {movie.year > 0 && <span className="font-medium">{movie.year}</span>}
                    {movie.runtime > 0 && (
                      <>
                        <span className="text-foreground/40">·</span>
                        <span>{movie.runtime} min</span>
                      </>
                    )}
                    {movie.director && movie.director !== "Unknown" && (
                      <>
                        <span className="text-foreground/40">·</span>
                        <span>{movie.director}</span>
                      </>
                    )}
                  </div>
                </div>

                {movie.rating > 0 && (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1.5 backdrop-blur-md">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-100">
                      {movie.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Body — poster + details */}
            <div className="grid grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-[160px_1fr] sm:gap-8">
              <div className="flex flex-row gap-4 sm:flex-col">
                <div className="aspect-2/3 w-28 shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-lg shadow-black/40 sm:w-full">
                  {movie.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                      alt={movie.title}
                      width={342}
                      height={513}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 sm:flex-none">
                  <SaveMovieButton movie={movie} variant="button" />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                {movie.tagline && (
                  <p className="text-base italic text-muted/80">
                    &ldquo;{movie.tagline}&rdquo;
                  </p>
                )}

                {movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {movie.genres.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs font-medium text-muted"
                      >
                        {localizeGenre(genre, t)}
                      </span>
                    ))}
                  </div>
                )}

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {movie.director && movie.director !== "Unknown" && (
                    <>
                      <dt className="text-muted">{t.comparison.director}</dt>
                      <dd className="text-foreground">{movie.director}</dd>
                    </>
                  )}
                  {movie.country && movie.country !== "Unknown" && (
                    <>
                      <dt className="text-muted">{t.comparison.country}</dt>
                      <dd className="text-foreground">
                        {localizeCountry(
                          movie.country,
                          movie.countryCode,
                          locale,
                          t.common.unknown,
                        )}
                      </dd>
                    </>
                  )}
                </dl>

                {movie.cast && movie.cast.length > 0 && (
                  <div className="border-t border-white/6 pt-4">
                    <CastList cast={movie.cast} label={t.result.cast} />
                  </div>
                )}

                {movie.overview && (
                  <div className="border-t border-white/6 pt-4">
                    <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                      {t.result.storyline}
                    </h4>
                    <p className="text-sm leading-relaxed text-muted">
                      {movie.overview}
                    </p>
                  </div>
                )}

                <WatchProviders tmdbId={tmdbId} />
              </div>
            </div>

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="border-t border-white/6 px-6 py-5">
                <MovieGallery paths={gallery} label={t.result.gallery} />
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
