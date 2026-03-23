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
} from "lucide-react";
import SaveMovieButton from "@/components/collection/SaveMovieButton";

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
    0
  );
  const totalFields = guesses.reduce((sum, g) => sum + g.comparison.length, 0);
  const accuracy = totalFields > 0 ? Math.round((exactCount / totalFields) * 100) : 0;

  async function handleShare() {
    const emojiGrid = guesses
      .slice()
      .reverse()
      .map((g) =>
        g.comparison.map((c) =>
          c.status === "exact" ? "🟩" : c.status === "partial" ? "🟨" : "🟥"
        ).join("")
      )
      .join("\n");

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
    {
      icon: <Target size={18} />,
      label: t.result.attempts,
      value: `${attempts}/${MAX_ATTEMPTS}`,
    },
    {
      icon: <Lightbulb size={18} />,
      label: t.result.hintsUsed,
      value: `${hintsUsed}`,
    },
    {
      icon: <BarChart3 size={18} />,
      label: t.result.accuracy,
      value: `${accuracy}%`,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-card">
      {/* Header banner */}
      <div
        className={`relative flex flex-col items-center gap-3 px-6 py-8 ${
          won ? "bg-match-exact/8" : "bg-match-miss/8"
        }`}
      >
        {/* Glow */}
        <div
          className={`pointer-events-none absolute -top-10 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full blur-3xl ${
            won ? "bg-match-exact/20" : "bg-match-miss/20"
          }`}
        />

        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-full ${
            won
              ? "bg-match-exact/20 text-match-exact"
              : "bg-match-miss/20 text-match-miss"
          }`}
        >
          {won ? <Trophy size={28} /> : <XCircle size={28} />}
        </div>

        <h2
          className={`relative text-2xl font-semibold ${
            won ? "text-match-exact" : "text-match-miss"
          }`}
        >
          {won ? t.result.youGuessed : t.game.lost}
        </h2>
      </div>

      {/* Two-column body */}
      <div className="flex flex-col lg:flex-row">
        {/* Left column — movie info + emoji grid + share */}
        <div className="flex flex-1 flex-col lg:border-r lg:border-white/6">
          {/* Poster + details */}
          <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-start sm:gap-6">
            {/* Poster */}
            <div className="flex shrink-0 justify-center sm:justify-start">
              <div className="h-72 w-48 overflow-hidden rounded-xl bg-white/5 shadow-lg shadow-black/30">
                <Image
                  src={`https://image.tmdb.org/t/p/w342${answer.posterPath}`}
                  alt={answer.title}
                  width={342}
                  height={513}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            {/* Details */}
            <div className="flex min-w-0 flex-col justify-center text-center sm:text-left">
              <h3 className="text-2xl font-bold text-foreground">
                {answer.title}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {answer.year} &middot; {answer.director} &middot; {answer.runtime} min
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {answer.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full bg-white/6 px-2.5 py-0.5 text-xs font-medium text-muted"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              {answer.tagline && (
                <p className="mt-3 text-sm italic text-muted/70">
                  &ldquo;{answer.tagline}&rdquo;
                </p>
              )}
              {answer.overview && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                  {answer.overview}
                </p>
              )}
            </div>
          </div>

          {/* Emoji grid + share */}
          <div className="mt-auto flex items-center gap-4 border-t border-white/6 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {guesses.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-muted">
                    #{i + 1}
                  </span>
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
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <SaveMovieButton movie={answer} variant="button" />
            </div>
            <button
              onClick={handleShare}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-accent-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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

        {/* Right column — stats only */}
        <div className="flex flex-col border-t border-white/6 lg:w-48 lg:shrink-0 lg:border-t-0">
          <div className="grid grid-cols-3 divide-x divide-white/6 lg:flex lg:flex-1 lg:flex-col lg:divide-x-0 lg:divide-y">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-1 flex-col items-center justify-center gap-1.5 py-5">
                <span className="text-muted">{stat.icon}</span>
                <span className="text-lg font-semibold text-foreground">
                  {stat.value}
                </span>
                <span className="text-xs text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
