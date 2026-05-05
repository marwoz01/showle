"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { MediaDetails, GuessResult, GameStatus } from "@/types";
import { MAX_ATTEMPTS } from "@/constants";
import { useTranslation } from "@/i18n";
import {
  Trophy,
  XCircle,
  Copy,
  Check,
  BarChart3,
  Lightbulb,
  Target,
  Star,
} from "lucide-react";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import MovieGallery from "@/components/movie/MovieGallery";
import CastList from "@/components/movie/CastList";
import WatchProviders from "@/components/movie/WatchProviders";

interface ResultScreenProps {
  answer: MediaDetails;
  status: GameStatus;
  guesses: GuessResult[];
  hintsUsed: number;
}

export default function ResultScreen({
  answer,
  status,
  guesses,
  hintsUsed,
}: ResultScreenProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const won = status === "won";
  const [gallery, setGallery] = useState<string[]>([]);

  // Fetch a handful of cinematic stills once the result is shown.
  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/movies/gallery?id=${answer.id}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.backdrops) setGallery(data.backdrops as string[]);
      })
      .catch(() => {
        // ignore — gallery is purely cosmetic
      });
    return () => ac.abort();
  }, [answer.id]);

  useEffect(() => {
    if (!won) return;

    const duration = 2500;
    const end = Date.now() + duration;

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#7C4DFF", "#00E676", "#00BCD4", "#FFC107"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#7C4DFF", "#00E676", "#00BCD4", "#FFC107"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }, [won]);

  const attempts = guesses.length;
  const exactCount = guesses.reduce(
    (sum, g) => sum + g.comparison.filter((c) => c.status === "exact").length,
    0,
  );
  const totalFields = guesses.reduce((sum, g) => sum + g.comparison.length, 0);
  const accuracy = totalFields > 0 ? Math.round((exactCount / totalFields) * 100) : 0;

  async function handleShare() {
    const text = t.result.shareText(answer.title, attempts, MAX_ATTEMPTS);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  const stats = [
    { icon: <Target size={16} />, label: t.result.attempts, value: `${attempts}/${MAX_ATTEMPTS}` },
    { icon: <Lightbulb size={16} />, label: t.result.hintsUsed, value: `${hintsUsed}` },
    { icon: <BarChart3 size={16} />, label: t.result.accuracy, value: `${accuracy}%` },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-card">
      {/* Cinematic hero with backdrop */}
      <div className="relative h-72 overflow-hidden sm:h-96">
        {answer.backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${answer.backdropPath}`}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-accent-purple/30 to-card" />
        )}

        {/* Layered gradients for legibility of overlay text */}
        <div className="absolute inset-0 bg-linear-to-t from-card via-card/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-card/70 via-transparent to-transparent" />

        {/* Outcome badge — top-right */}
        <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              won ? "bg-match-exact/30 text-match-exact" : "bg-match-miss/30 text-match-miss"
            }`}
          >
            {won ? <Trophy size={16} /> : <XCircle size={16} />}
          </span>
          <span
            className={`text-sm font-semibold ${won ? "text-match-exact" : "text-match-miss"}`}
          >
            {won ? t.result.youGuessed : t.game.lost}
          </span>
        </div>

        {/* Title + meta — bottom-left, rating chip — bottom-right */}
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl font-bold text-foreground drop-shadow-2xl sm:text-4xl">
              {answer.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80">
              <span className="font-medium">{answer.year}</span>
              {answer.runtime > 0 && (
                <>
                  <span className="text-foreground/40">·</span>
                  <span>{answer.runtime} min</span>
                </>
              )}
              {answer.director && answer.director !== "Unknown" && (
                <>
                  <span className="text-foreground/40">·</span>
                  <span>{answer.director}</span>
                </>
              )}
            </div>
          </div>

          {answer.rating > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1.5 backdrop-blur-md">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-100">
                {answer.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Three-column body: poster | details | stats */}
      <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[180px_1fr_180px] lg:gap-8">
        {/* Left — poster + actions */}
        <div className="flex flex-row gap-4 lg:flex-col">
          <div className="aspect-2/3 w-32 shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-lg shadow-black/40 lg:w-full">
            {answer.posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w342${answer.posterPath}`}
                alt={answer.title}
                width={342}
                height={513}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-2 lg:flex-none">
            <SaveMovieButton movie={answer} variant="button" />
            <button
              onClick={handleShare}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-purple px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  {t.result.copied}
                </>
              ) : (
                <>
                  <Copy size={16} />
                  {t.result.share}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Middle — details */}
        <div className="flex min-w-0 flex-col gap-4">
          {answer.tagline && (
            <p className="text-base italic text-muted/80">
              &ldquo;{answer.tagline}&rdquo;
            </p>
          )}

          {answer.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {answer.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs font-medium text-muted"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {answer.director && answer.director !== "Unknown" && (
              <>
                <dt className="text-muted">{t.comparison.director}</dt>
                <dd className="text-foreground">{answer.director}</dd>
              </>
            )}
            {answer.country && answer.country !== "Unknown" && (
              <>
                <dt className="text-muted">{t.comparison.country}</dt>
                <dd className="text-foreground">{answer.country}</dd>
              </>
            )}
          </dl>

          {answer.cast && answer.cast.length > 0 && (
            <div className="border-t border-white/6 pt-4">
              <CastList cast={answer.cast} label={t.result.cast} />
            </div>
          )}

          {answer.overview && (
            <div className="border-t border-white/6 pt-4">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                {t.result.storyline}
              </h4>
              <p className="text-sm leading-relaxed text-muted">
                {answer.overview}
              </p>
            </div>
          )}

          <WatchProviders tmdbId={answer.id} />
        </div>

        {/* Right — stats */}
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-4 lg:border-l lg:border-white/6 lg:pl-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-xl bg-white/3 px-3 py-4 lg:items-start lg:bg-transparent lg:px-0 lg:py-0"
            >
              <span className="text-muted">{stat.icon}</span>
              <span className="text-2xl font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gallery — cinematic stills from TMDB */}
      {gallery.length > 0 && (
        <div className="border-t border-white/6 px-6 py-5">
          <MovieGallery paths={gallery} label={t.result.gallery} />
        </div>
      )}

      {/* Footer — emoji grid */}
      <div className="border-t border-white/6 bg-white/2 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {guesses.map((g, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted">#{i + 1}</span>
              <div className="flex gap-0.5">
                {g.comparison.map((c, j) => (
                  <div
                    key={j}
                    className={`h-3 w-3 rounded-sm ${
                      c.status === "exact"
                        ? "bg-match-exact"
                        : c.status === "partial"
                          ? "bg-match-partial"
                          : "bg-match-miss"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
