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
  Play,
  ExternalLink,
} from "lucide-react";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import MovieGallery from "@/components/movie/MovieGallery";
import CastList from "@/components/movie/CastList";
import WatchProviders from "@/components/movie/WatchProviders";
import { localizeCountry, localizeGenre } from "@/lib/localization";
import type { MovieTrailer } from "@/lib/trailers";

interface ResultScreenProps {
  answer: MediaDetails;
  localizedAnswer?: MediaDetails | null;
  status: GameStatus;
  guesses: GuessResult[];
  hintsUsed: number;
}

interface TrailerState {
  requestKey: string;
  trailer: MovieTrailer | null;
  autoplay: boolean;
}

export default function ResultScreen({
  answer,
  localizedAnswer,
  status,
  guesses,
  hintsUsed,
}: ResultScreenProps) {
  const { t, locale } = useTranslation();
  const [copied, setCopied] = useState(false);

  const won = status === "won";
  const [gallery, setGallery] = useState<string[]>([]);
  const [trailerState, setTrailerState] = useState<TrailerState | null>(null);
  const trailerRequestKey = `${answer.id}:${locale}`;

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

    const ac = new AbortController();
    fetch(`/api/movies/trailer?id=${answer.id}&lang=${locale}`, {
      signal: ac.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const trailer = (data?.trailer ?? null) as MovieTrailer | null;
        setTrailerState({
          requestKey: trailerRequestKey,
          trailer,
          autoplay: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
      })
      .catch(() => {
        // A missing trailer should never block the result screen.
      });

    return () => ac.abort();
  }, [answer.id, locale, trailerRequestKey, won]);

  useEffect(() => {
    if (
      !won ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

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
  const displayAnswer = locale === "pl" && localizedAnswer
    ? localizedAnswer
    : answer;
  const localizedTagline = locale === "pl"
    ? localizedAnswer?.tagline
    : answer.tagline;
  const localizedOverview = locale === "pl"
    ? localizedAnswer?.overview
    : answer.overview;
  const activeTrailer =
    won && trailerState?.requestKey === trailerRequestKey
      ? trailerState.trailer
      : null;
  const trailerAutoplay =
    trailerState?.requestKey === trailerRequestKey && trailerState.autoplay;
  const youtubeEmbedUrl = activeTrailer
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(activeTrailer.key)}?autoplay=${trailerAutoplay ? "1" : "0"}&mute=${trailerAutoplay ? "1" : "0"}&playsinline=1&rel=0&hl=${locale}&cc_lang_pref=${locale}`
    : null;
  const trailerPending = won && trailerState?.requestKey !== trailerRequestKey;

  async function handleShare() {
    const text = t.result.shareText(displayAnswer.title, attempts, MAX_ATTEMPTS);
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
    <div className="soft-panel animate-result-reveal overflow-hidden rounded-2xl">
      {/* Cinematic hero with backdrop */}
      <div className="relative h-72 overflow-hidden sm:h-96">
        {displayAnswer.backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${displayAnswer.backdropPath}`}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="animate-result-backdrop object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-accent-purple/30 to-card" />
        )}

        {/* Layered gradients for legibility of overlay text */}
        <div className="absolute inset-0 bg-linear-to-t from-card via-card/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-card/70 via-transparent to-transparent" />

        {/* Outcome badge — top-right */}
        <div className="animate-result-badge absolute right-5 top-5 flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md">
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
              {displayAnswer.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80">
              <span className="font-medium">{displayAnswer.year}</span>
              {displayAnswer.runtime > 0 && (
                <>
                  <span className="text-foreground/40">·</span>
                  <span>{displayAnswer.runtime} min</span>
                </>
              )}
              {displayAnswer.director && displayAnswer.director !== "Unknown" && (
                <>
                  <span className="text-foreground/40">·</span>
                  <span>{displayAnswer.director}</span>
                </>
              )}
            </div>
          </div>

          {displayAnswer.rating > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1.5 backdrop-blur-md">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-100">
                {displayAnswer.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Three-column body: poster | details | trailer and stats */}
      <div
        className={`grid grid-cols-1 gap-6 px-6 py-6 lg:gap-8 ${
          won
            ? "lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_360px]"
            : "lg:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[180px_minmax(0,1fr)_180px]"
        }`}
      >
        {/* Left — poster + actions */}
        <div className="flex flex-row gap-4 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:flex-col">
          <div className="aspect-2/3 w-32 shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-lg shadow-black/40 lg:w-full">
            {displayAnswer.posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w342${displayAnswer.posterPath}`}
                alt={displayAnswer.title}
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
        <div
          className={`flex min-w-0 flex-col gap-4 lg:col-start-2 ${
            won ? "lg:row-start-2 xl:row-start-1" : "lg:row-start-1"
          }`}
        >
          {localizedTagline && (
            <p className="text-base italic text-muted/80">
              &ldquo;{localizedTagline}&rdquo;
            </p>
          )}

          {displayAnswer.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayAnswer.genres.map((genre) => (
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
            {displayAnswer.director && displayAnswer.director !== "Unknown" && (
              <>
                <dt className="text-muted">{t.comparison.director}</dt>
                <dd className="text-foreground">{displayAnswer.director}</dd>
              </>
            )}
            {displayAnswer.country && displayAnswer.country !== "Unknown" && (
              <>
                <dt className="text-muted">{t.comparison.country}</dt>
                <dd className="text-foreground">
                  {localizeCountry(
                    displayAnswer.country,
                    displayAnswer.countryCode,
                    locale,
                    t.common.unknown,
                  )}
                </dd>
              </>
            )}
          </dl>

          {displayAnswer.cast && displayAnswer.cast.length > 0 && (
            <div className="border-t border-white/6 pt-4">
              <CastList cast={displayAnswer.cast} label={t.result.cast} />
            </div>
          )}

        </div>

        {/* Right — trailer first on mobile, with compact stats underneath */}
        <aside
          className={`min-w-0 lg:col-start-2 ${
            won
              ? "order-first lg:order-none lg:row-start-1 xl:col-start-3"
              : "order-none lg:row-start-2 xl:col-start-3 xl:row-start-1"
          }`}
        >
          {won && (youtubeEmbedUrl || trailerPending) ? (
            <div className="soft-card overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/15 text-accent-purple">
                    <Play size={14} className="fill-current" />
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {t.result.trailer}
                  </span>
                </div>
                {activeTrailer && (
                  <a
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(activeTrailer.key)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
                  >
                    {t.result.watchOnYouTube}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="aspect-video w-full overflow-hidden bg-black">
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`${t.result.trailer}: ${displayAnswer.title}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="h-9 w-9 animate-pulse rounded-full bg-accent-purple/20" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-px bg-white/5">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-w-0 flex-col items-center bg-[#111114] px-2 py-4 text-center"
                  >
                    <span className="mb-1.5 text-muted">{stat.icon}</span>
                    <span className="text-xl font-bold text-foreground">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 truncate text-[10px] text-muted sm:text-xs">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 xl:grid-cols-1 xl:gap-4 xl:border-l xl:border-white/6 xl:pl-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                    className="flex flex-col items-center gap-1 rounded-xl bg-white/3 px-3 py-4 xl:items-start xl:bg-transparent xl:px-0 xl:py-0"
                >
                  <span className="text-muted">{stat.icon}</span>
                  <span className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </span>
                  <span className="text-xs text-muted">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Shared lower row — uses the space beneath both details and trailer */}
        <div className="min-w-0 border-t border-white/6 pt-5 lg:col-start-2 lg:row-start-3 xl:col-span-2 xl:row-start-2">
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.75fr)] xl:gap-10">
            {localizedOverview && (
              <section className="min-w-0">
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {t.result.storyline}
                </h4>
                <p className="text-sm leading-relaxed text-muted">
                  {localizedOverview}
                </p>
              </section>
            )}

            <WatchProviders tmdbId={answer.id} divider={false} />
          </div>
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
