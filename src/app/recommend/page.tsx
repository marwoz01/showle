"use client";

import { useState, useRef } from "react";
import { useTranslation } from "@/i18n";
import { ArrowLeft, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import PreferenceForm from "@/components/recommend/PreferenceForm";
import RecommendationCard from "@/components/recommend/RecommendationCard";
import type { MediaDetails } from "@/types";

interface Recommendation {
  movie: MediaDetails;
  justification: string;
}

type ViewState = "form" | "loading" | "results" | "error";

export default function RecommendPage() {
  const { t, locale } = useTranslation();
  const [view, setView] = useState<ViewState>("form");
  const [results, setResults] = useState<Recommendation[]>([]);
  const [errorType, setErrorType] = useState<string>("");
  const [preferences, setPreferences] = useState({
    genres: [] as string[],
    yearFrom: 1920,
    yearTo: 2026,
    popularity: "popular",
  });
  const [excludeIds, setExcludeIds] = useState<number[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(prefs: {
    genres: string[];
    yearFrom: number;
    yearTo: number;
    popularity: string;
  }) {
    setPreferences(prefs);
    setView("loading");
    setErrorType("");

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, locale, exclude: excludeIds }),
      });

      if (res.status === 429) {
        setErrorType("rate_limited");
        setView("error");
        return;
      }

      if (!res.ok) {
        setView("error");
        return;
      }

      const data: Recommendation[] = await res.json();

      if (data.length === 0) {
        setView("error");
        setErrorType("no_results");
        return;
      }

      setResults(data);
      setExcludeIds((prev) => [...prev, ...data.map((r) => r.movie.id)]);
      setView("results");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setView("error");
    }
  }

  function handleChangePreferences() {
    setExcludeIds([]);
    setView("form");
  }

  function handleTryAgain() {
    handleSubmit(preferences);
  }

  return (
    <div ref={topRef} className="relative space-y-8 overflow-x-hidden">
      {/* Background ambient glow — hidden on mobile */}
      <div className="pointer-events-none absolute -top-32 left-1/2 hidden h-96 w-150 -translate-x-1/2 rounded-full bg-accent-purple/8 blur-3xl sm:block" />

      {/* Header */}
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-semibold text-foreground">
            {t.recommend.title}
          </h1>
        </div>
        <p className="max-w-xl text-sm text-muted">{t.recommend.subtitle}</p>
      </div>

      {/* Content */}
      <div className="relative">
        {view === "form" && (
          <PreferenceForm
            onSubmit={handleSubmit}
            initialGenres={preferences.genres}
            initialYearFrom={preferences.yearFrom}
            initialYearTo={preferences.yearTo}
            initialPopularity={preferences.popularity}
          />
        )}

        {view === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2
              size={32}
              className="animate-spin text-accent-purple"
            />
            <p className="text-sm text-muted">{t.recommend.loading}</p>
          </div>
        )}

        {view === "error" && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <p className="text-sm text-muted">
              {errorType === "rate_limited"
                ? t.recommend.error
                : errorType === "no_results"
                  ? t.recommend.noResults
                  : t.recommend.error}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTryAgain}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <RefreshCw size={16} />
                {t.recommend.tryAgain}
              </button>
              <button
                onClick={handleChangePreferences}
                className="inline-flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/6"
              >
                {t.recommend.changePreferences}
              </button>
            </div>
          </div>
        )}

        {view === "results" && results.length > 0 && (
          <div className="space-y-8">
            {/* Top Pick — first result */}
            <RecommendationCard
              key={results[0].movie.id}
              movie={results[0].movie}
              justification={results[0].justification}
              index={0}
              variant="top"
            />

            {/* Remaining results — vertical cards */}
            {results.length > 1 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {results.slice(1).map((rec, i) => (
                  <RecommendationCard
                    key={rec.movie.id}
                    movie={rec.movie}
                    justification={rec.justification}
                    index={i + 1}
                  />
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleTryAgain}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-purple px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
              >
                <RefreshCw size={16} />
                {t.recommend.tryAgain}
              </button>
              <button
                onClick={handleChangePreferences}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/6 bg-white/3 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/6 sm:w-auto"
              >
                <ArrowRight size={16} className="rotate-180" />
                {t.recommend.changePreferences}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS animation for card reveal */}
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
