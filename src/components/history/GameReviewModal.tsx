"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Loader2, Film, Trophy, XCircle } from "lucide-react";
import { useTranslation } from "@/i18n";
import { MediaDetails, GuessResult } from "@/types";
import { compareMedia } from "@/lib/comparer";
import { MAX_ATTEMPTS } from "@/constants";
import GuessCard from "@/components/game/GuessCard";

interface GameReviewData {
  game: {
    id: string;
    dateKey: string;
    status: string;
    attemptCount: number;
    hintsUsed: number;
    targetTitle: string;
    targetYear: number;
    targetPoster: string;
    completedAt: string;
  };
  targetMovie: MediaDetails | null;
  guessMovies: (MediaDetails | null)[];
}

interface GameReviewModalProps {
  gameId: string;
  onClose: () => void;
}

export default function GameReviewModal({ gameId, onClose }: GameReviewModalProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<GameReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchReview() {
      try {
        const res = await fetch(`/api/game/history/${gameId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReview();
    return () => { cancelled = true; };
  }, [gameId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const won = data?.game.status === "won";
  const targetMovie = data?.targetMovie;

  // Build guess results for GuessCard reuse
  const guessResults: GuessResult[] = [];
  if (data && targetMovie) {
    data.guessMovies.forEach((movie, i) => {
      if (movie) {
        guessResults.push({
          guess: movie,
          comparison: compareMedia(movie, targetMovie, t),
          isCorrect: movie.id === targetMovie.id,
          attemptNumber: i + 1,
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/6 bg-background p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/6 hover:text-foreground"
        >
          <X size={20} />
        </button>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-sm text-muted">
            Something went wrong. Please try again.
          </div>
        )}

        {data && targetMovie && (
          <>
            {/* Header banner */}
            <div
              className={`-mx-6 -mt-6 mb-6 flex flex-col items-center gap-3 px-6 py-8 ${
                won ? "bg-match-exact/8" : "bg-match-miss/8"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  won
                    ? "bg-match-exact/20 text-match-exact"
                    : "bg-match-miss/20 text-match-miss"
                }`}
              >
                {won ? <Trophy size={24} /> : <XCircle size={24} />}
              </div>
              <h2
                className={`text-xl font-semibold ${
                  won ? "text-match-exact" : "text-match-miss"
                }`}
              >
                {won ? t.history.resultWon : t.history.resultLost}
              </h2>
              <p className="text-xs text-muted">
                {data.game.attemptCount}/{MAX_ATTEMPTS} {t.history.attempts.toLowerCase()}
                {" · "}
                {data.game.hintsUsed} {t.history.hintsUsed.toLowerCase()}
              </p>
            </div>

            {/* Movie info */}
            <div className="mb-6 flex items-start gap-4">
              {targetMovie.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${targetMovie.posterPath}`}
                  alt={targetMovie.title}
                  width={185}
                  height={278}
                  className="h-36 w-24 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Film size={24} className="text-muted" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground">
                  {targetMovie.title}
                </h3>
                <p className="mt-0.5 text-sm text-muted">
                  {targetMovie.year} · {targetMovie.director} · {targetMovie.runtime} min
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {targetMovie.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs font-medium text-muted"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Guess cards */}
            <div className="space-y-3">
              {guessResults.map((result) => (
                <GuessCard key={result.attemptNumber} result={result} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
