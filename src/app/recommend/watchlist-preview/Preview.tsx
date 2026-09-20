"use client";
import { useState } from "react";
import { useTranslation } from "@/i18n";
import PreferenceForm from "@/components/recommend/PreferenceForm";
import RecommendationResults from "@/components/recommend/RecommendationResults";
import type { RecommendationPreference } from "@/types/recommendation";
export default function Preview() {
  const { t, setLocale, locale } = useTranslation();
  const [signedIn, setSignedIn] = useState(true);
  const [count, setCount] = useState(12);
  const [submitted, setSubmitted] = useState<RecommendationPreference | null>(null);
  return <div className="mx-auto max-w-6xl space-y-5">
    <h1 className="text-3xl font-semibold">{t.recommend.title}</h1>
    <PreferenceForm initial={{ source: "catalog", genres: [], excludedGenres: [], yearFrom: 1920, yearTo: 2026, popularity: "any", freeformText: "", maxRuntime: null, providerIds: [], referenceMovieId: null }}
      initialReference={null} remaining={20} quotaLimit={20} signedIn={signedIn} watchlistCount={count} onSubmit={(preferences) => setSubmitted(preferences)} />
    {submitted && <><p role="status">Fixture source: {submitted.source}. Mood: {submitted.freeformText}</p><RecommendationResults results={[]} meta={{ source: submitted.source, watchlistUnavailable: 1, matching: "filters", interpretation: "local", relevance: "local", personalized: false, partial: false }}
      hasDescription={Boolean(submitted.freeformText)} feedback={{}} pending={[]} feedbackReady onReact={() => {}} /></>}
    <div className="flex flex-wrap gap-4 py-8 text-xs">
      <p className="w-full">DEV PREVIEW: no account changes, no AI requests</p>
      <button onClick={() => setSignedIn((previous) => !previous)}>Toggle login</button>
      <button onClick={() => setCount((previous) => previous ? 0 : 12)}>Toggle empty</button>
      <button onClick={() => setLocale(locale === "pl" ? "en" : "pl")}>PL/EN</button>
    </div>
  </div>;
}
