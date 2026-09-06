"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n";
import { ArrowLeft, Loader2, RefreshCw } from "@/components/ui/icons";
import Link from "next/link";
import PreferenceForm from "@/components/recommend/PreferenceForm";
import RecommendationResults from "@/components/recommend/RecommendationResults";
import { useRecommendationFeedback } from "@/hooks/useRecommendationFeedback";
import { MAX_RECOMMEND_EXCLUDES } from "@/lib/recommend-input";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import type { Recommendation, RecommendationMeta, RecommendationPreference, RecommendationReaction } from "@/types/recommendation";

type ViewState = "form" | "loading" | "results" | "error";

export default function RecommendPage() {
  const { t, locale } = useTranslation();
  const taste = useRecommendationFeedback();
  const [view, setView] = useState<ViewState>("form");
  const [results, setResults] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<RecommendationMeta | null>(null);
  const [errorType, setErrorType] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<"saved" | "error" | "">("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<RecommendationPreference>({
    genres: [], excludedGenres: [], yearFrom: 1920, yearTo: new Date().getFullYear(),
    popularity: "any", freeformText: "", maxRuntime: null, providerIds: [], referenceMovieId: null,
  });
  const [reference, setReference] = useState<MovieSuggestion | null>(null);
  const [excludeIds, setExcludeIds] = useState<number[]>([]);
  const topRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!taste.isLoaded) return;
    const ac = new AbortController();
    requestRef.current?.abort();
    busy.current = false;
    setRemaining(null); setQuotaLimit(null); setResults([]); setExcludeIds([]); setView("form");
    fetch("/api/recommend", { cache: "no-store", signal: ac.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data && !ac.signal.aborted) { setRemaining(data.remaining); setQuotaLimit(data.limit); } })
      .catch(() => {});
    return () => { ac.abort(); requestRef.current?.abort(); };
  }, [taste.userId, taste.isLoaded]);

  async function handleSubmit(prefs: RecommendationPreference, selectedReference = reference) {
    if (busy.current || taste.pending.length) return;
    busy.current = true;
    const ac = new AbortController();
    requestRef.current = ac;
    const timer = setTimeout(() => ac.abort("timeout"), 25000);
    setPreferences(prefs); setReference(selectedReference); setView("loading"); setErrorType(""); setFeedbackMessage("");
    try {
      const response = await fetch("/api/recommend", { method: "POST", signal: ac.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, locale, exclude: excludeIds, positiveIds: taste.positiveIds, negativeIds: taste.negativeIds }),
      });
      const data = await response.json();
      if (ac.signal.aborted) return;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setQuotaLimit(data.limit);
      if (!response.ok) { setErrorType(data.error ?? "internal"); setMeta(data.meta ?? null); setView("error"); return; }
      if (!Array.isArray(data.recommendations) || !data.recommendations.length) { setErrorType("no_results"); setView("error"); return; }
      setResults(data.recommendations); setMeta(data.meta ?? null);
      setExcludeIds((previous) => [...new Set([...previous, ...data.recommendations.map((r: Recommendation) => r.movie.id)])].slice(-MAX_RECOMMEND_EXCLUDES));
      setView("results");
      topRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } catch {
      if (!ac.signal.aborted || ac.signal.reason === "timeout") { setErrorType("internal"); setView("error"); }
    } finally { clearTimeout(timer); if (requestRef.current === ac) busy.current = false; }
  }

  async function react(id: number, reaction: RecommendationReaction | null) {
    setFeedbackMessage((await taste.react(id, reaction)) ? "saved" : "error");
  }
  const errors: Record<string, string> = {
    daily_limit_reached: t.recommend.dailyLimitReached, daily_limit_anon: t.recommend.dailyLimitAnon,
    no_results: t.recommend.noResults, pool_exhausted: t.recommendation.exhausted,
    conflicting_preferences: t.recommendation.conflicting, reference_unavailable: t.recommendation.referenceUnavailable,
    rate_limited: t.recommendation.rateLimited,
  };
  const actionClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40";

  return (
    <div ref={topRef} className="relative mx-auto max-w-6xl space-y-7">
      <header>
        <div className="mb-3 flex items-center gap-3">
          <Link href="/" aria-label={t.nav.home} className="rounded-lg p-2 text-muted hover:text-foreground"><ArrowLeft size={20} /></Link>
          <h1 className="text-3xl font-semibold">{t.recommend.title}</h1>
        </div>
        <p className="max-w-xl text-sm text-muted">{t.recommend.subtitle}</p>
      </header>
      {view === "form" && <PreferenceForm initial={preferences} initialReference={reference} onSubmit={handleSubmit} remaining={remaining} quotaLimit={quotaLimit} />}
      {view === "loading" && <div role="status" className="flex flex-col items-center gap-4 py-20 text-sm text-muted"><Loader2 size={30} className="animate-spin" />{t.recommend.loading}</div>}
      {view === "error" && <div role="alert" className="soft-card space-y-5 rounded-2xl p-8 text-center">
        <p className="text-sm text-muted">{errors[errorType] ?? t.recommend.error}</p>
        {meta && meta.matching === "filters" && <p className="text-sm text-muted">{t.recommendation.degraded}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {errorType === "daily_limit_anon" && <Link href="/sign-in" className={actionClass}>{t.recommend.loginForMore}</Link>}
          {!["daily_limit_reached", "daily_limit_anon", "pool_exhausted", "no_results"].includes(errorType) &&
            <button onClick={() => void handleSubmit(preferences)} disabled={remaining === 0 || taste.pending.length > 0} className={actionClass}>{t.common.tryAgain}</button>}
          <button onClick={() => setView("form")} className="min-h-12 rounded-xl bg-white/5 px-5 py-3 text-sm">{t.recommend.changePreferences}</button>
        </div>
      </div>}
      {view === "results" && <>
        <RecommendationResults results={results} meta={meta} hasDescription={Boolean(preferences.freeformText)} hasReference={Boolean(preferences.referenceMovieId)} feedback={taste.feedback}
          pending={taste.pending} feedbackReady={taste.isLoaded} onReact={(id, reaction) => void react(id, reaction)} />
        <p role="status" className="min-h-5 text-sm text-muted">{feedbackMessage === "saved" ? t.recommendation.feedbackSaved : feedbackMessage === "error" ? t.recommendation.feedbackError : ""}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => void handleSubmit(preferences)} disabled={remaining === 0 || taste.pending.length > 0} className={actionClass}><RefreshCw size={16} />{t.recommend.tryAgain}</button>
          <button onClick={() => setView("form")} className="min-h-12 rounded-xl bg-white/5 px-5 py-3 text-sm">{t.recommend.changePreferences}</button>
          {remaining !== null && quotaLimit !== null && <p className="text-xs text-muted">{t.recommend.quotaInfo(remaining, quotaLimit)}</p>}
        </div>
      </>}
    </div>
  );
}
