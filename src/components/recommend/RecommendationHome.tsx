"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { ArrowLeft, Loader2, RefreshCw } from "@/components/ui/icons";
import { useHomePreferences } from "@/hooks/useHomePreferences";
import { usePersonalPicks } from "@/hooks/usePersonalPicks";
import { useRecommendationFeedback } from "@/hooks/useRecommendationFeedback";
import { EMPTY_HOME_PREFERENCES } from "@/lib/recommend-home-storage";
import { EMPTY_HOME_REFINEMENT, type HomeRefinement } from "@/lib/recommend-home-response";
import PersonalPreferencesForm from "@/components/recommend/PersonalPreferencesForm";
import PersonalRefinementForm from "@/components/recommend/PersonalRefinementForm";
import PersonalPickCard from "@/components/recommend/PersonalPickCard";
import type { RecommendationSettings } from "@/types/recommendation-settings";
import type { RecommendationReaction } from "@/types/recommendation";

export default function RecommendationHome({ userId, embedded = false }: { userId: string | null; embedded?: boolean }) {
  const { t, locale } = useTranslation();
  const settings = useHomePreferences(userId);
  const taste = useRecommendationFeedback();
  const picks = usePersonalPicks(userId, locale, taste.positiveIds, taste.negativeIds);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [notice, setNotice] = useState<"saved" | "feedback" | "feedbackError" | "">("");
  const [refinement, setRefinement] = useState<HomeRefinement>(EMPTY_HOME_REFINEMENT);
  const { preferences, ready } = settings;
  const { load } = picks;
  const copy = t.recommendationHome;
  const onboarding = ready && (!preferences?.onboarded || editing);
  const buttonClass = "min-h-12 rounded-xl bg-white/5 px-5 py-3 text-sm font-medium text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-40";

  useEffect(() => {
    if (ready && preferences?.onboarded) void load(preferences);
  }, [ready, preferences, load]);

  async function save(value: RecommendationSettings) {
    setSaveError(false);
    if (await settings.save(value)) { setRefinement(EMPTY_HOME_REFINEMENT); setEditing(false); setNotice("saved"); }
    else setSaveError(true);
  }
  async function react(id: number, reaction: RecommendationReaction | null) {
    setNotice((await taste.react(id, reaction)) ? "feedback" : "feedbackError");
  }
  function refine(value: HomeRefinement) {
    if (!preferences) return;
    setRefinement(value); setNotice(""); void picks.load(preferences, value);
  }
  const errors: Record<string, string> = {
    no_results: copy.noResults, pool_exhausted: t.recommendation.exhausted,
    daily_limit_anon: t.recommend.dailyLimitAnon, daily_limit_reached: t.recommend.dailyLimitReached,
    rate_limited: t.recommendation.rateLimited, conflicting_preferences: t.recommendation.conflicting,
    reference_unavailable: t.recommendation.referenceUnavailable,
  };
  const profileKey = `${preferences?.favoriteIds.join(",")}:${preferences?.providerIds.join(",")}`;
  return <div className="relative mx-auto max-w-6xl space-y-7">
    <header className="space-y-3">
      <div className="flex items-center gap-3">
        {!embedded && <Link href="/" aria-label={t.nav.home} className="rounded-xl p-2 text-muted hover:text-foreground"><ArrowLeft size={20} /></Link>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{copy.title}</h1>
      </div>
      <p className="text-sm text-muted sm:text-base">{copy.subtitle}</p>
      <nav aria-label={t.nav.recommend} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {ready && preferences?.onboarded && !editing && <button type="button" onClick={() => { setEditing(true); setSaveError(false); }} className="min-h-11 text-accent-purple hover:underline">{copy.edit}</button>}
        <Link href="/recommend?advanced=1" className="inline-flex min-h-11 items-center text-muted hover:text-foreground">{copy.advanced}</Link>
        {userId && <Link href="/recommend?source=watchlist" className="inline-flex min-h-11 items-center text-muted hover:text-foreground">{copy.watchlist}</Link>}
        {embedded && <a href="#games" className="inline-flex min-h-11 items-center text-muted hover:text-foreground">{t.nav.play}</a>}
      </nav>
    </header>
    {settings.error ? <div role="alert" className="soft-card space-y-4 rounded-2xl p-6 text-sm text-muted">
      <p>{copy.preferenceError}</p><button type="button" onClick={settings.retry} className={buttonClass}>{t.common.tryAgain}</button>
    </div> : !ready ? <p role="status" className="py-12 text-center text-muted">{t.common.loading}</p> : onboarding ?
      <PersonalPreferencesForm initial={preferences ?? EMPTY_HOME_PREFERENCES} signedIn={Boolean(userId)} saving={settings.saving} error={saveError}
        onSave={(value) => void save(value)} onCancel={preferences?.onboarded ? () => setEditing(false) : undefined} /> : <>
      <PersonalRefinementForm key={profileKey} disabled={picks.loading || taste.pending.length > 0} onSubmit={refine} />
      {(notice || settings.sessionOnly) && <div role="status" className="space-y-1 text-sm text-muted">
        {notice === "saved" && <p>{copy.saved}</p>}
        {notice === "feedback" && <p>{t.recommendation.feedbackSaved}</p>}
        {notice === "feedbackError" && <p>{t.recommendation.feedbackError}</p>}
        {settings.sessionOnly && <p>{copy.sessionOnly}</p>}
      </div>}
      {picks.loading && <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-muted"><Loader2 size={24} className="animate-spin" />{copy.loading}</div>}
      {picks.error && <div role="alert" className="soft-card space-y-4 rounded-2xl p-6 text-sm text-muted">
        <p>{errors[picks.error] ?? t.recommend.error}</p>
        <div className="flex flex-wrap gap-3">
          {picks.error === "daily_limit_anon" && <Link href="/sign-in" className={buttonClass}>{t.nav.login}</Link>}
          {!picks.error.startsWith("daily_limit") && <button type="button" onClick={picks.retry} className={buttonClass}>{t.common.tryAgain}</button>}
          <button type="button" onClick={() => { setEditing(true); setSaveError(false); }} className={buttonClass}>{copy.edit}</button>
        </div>
      </div>}
      {!!picks.results.length && <section aria-labelledby="personal-picks-heading" className="space-y-4">
        <div className="space-y-2">
          <h2 id="personal-picks-heading" className="text-xl font-semibold">{picks.meta?.personalized || refinement.freeformText || refinement.referenceMovieId ? copy.picksTitle : copy.popularTitle}</h2>
          {!picks.meta?.personalized && !refinement.freeformText && !refinement.referenceMovieId && <p className="max-w-2xl text-sm text-muted">{copy.popularHint}</p>}
          {picks.results.length < 3 && <p className="text-sm text-muted">{copy.partial(picks.results.length)}</p>}
          {(refinement.freeformText || refinement.referenceMovieId) && picks.meta?.relevance === "local" && <p className="text-sm text-muted">{t.recommendation.degraded}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {picks.results.map((result) => <PersonalPickCard key={result.movie.id} result={result} selected={taste.feedback[result.movie.id]}
            disabled={!taste.isLoaded || taste.pending.includes(result.movie.id)} onReact={(reaction) => void react(result.movie.id, reaction)} />)}
        </div>
        <p className="text-xs text-muted">{copy.feedbackHint}</p>
        <button type="button" disabled={picks.loading || taste.pending.length > 0} onClick={() => { setNotice(""); picks.next(); }} className={`inline-flex items-center gap-2 ${buttonClass}`}><RefreshCw size={16} />{copy.next}</button>
      </section>}
      {picks.remaining !== null && picks.limit !== null && <p className="text-xs text-muted">{t.recommend.quotaInfo(picks.remaining, picks.limit)}</p>}
    </>}
  </div>;
}
