"use client";

import { useState } from "react";
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

    const text = `${t.result.shareText(answer.title, attempts, MAX_ATTEMPTS)}\n\n${emojiGrid}`;

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

      {/* Movie info */}
      <div className="flex items-center gap-5 border-b border-white/6 px-6 py-5">
        {/* Poster placeholder */}
        <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
          <img
            src={`https://image.tmdb.org/t/p/w154${answer.posterPath}`}
            alt={answer.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {answer.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {answer.year} &middot; {answer.director}
          </p>
          <p className="mt-1 text-xs text-muted">
            {answer.genres.join(", ")}
          </p>
          {answer.tagline && (
            <p className="mt-2 text-xs italic text-muted/70">
              &ldquo;{answer.tagline}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-white/6 border-b border-white/6">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1.5 py-5">
            <span className="text-muted">{stat.icon}</span>
            <span className="text-lg font-semibold text-foreground">
              {stat.value}
            </span>
            <span className="text-xs text-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Emoji grid preview */}
      <div className="border-b border-white/6 px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {guesses
            .slice()
            .reverse()
            .map((g, i) => (
              <div key={i} className="flex gap-0.5">
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
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-6 py-5">
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-purple py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
  );
}
