"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { MOVIE_GENRES } from "@/constants/genres";
import { localizeGenre } from "@/lib/localization";
import { normalizeDisplayText } from "@/lib/typography";
import { Sparkles, X } from "@/components/ui/icons";
import SearchBar from "@/components/game/SearchBar";
import RecommendationFilters from "@/components/recommend/RecommendationFilters";
import type { RecommendationPreference } from "@/types/recommendation";
import type { MovieSuggestion } from "@/types/movie-suggestion";

interface PreferenceFormProps {
  initial: RecommendationPreference;
  initialReference: MovieSuggestion | null;
  onSubmit: (preferences: RecommendationPreference, reference: MovieSuggestion | null) => void;
  remaining: number | null;
  quotaLimit: number | null;
}
export default function PreferenceForm({ initial, initialReference, onSubmit, remaining, quotaLimit }: PreferenceFormProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [reference, setReference] = useState(initialReference);
  const update = (patch: Partial<RecommendationPreference>) => setValue((previous) => ({ ...previous, ...patch }));
  const canSubmit = (value.genres.length > 0 || value.freeformText.trim().length > 0 || value.referenceMovieId !== null) &&
    value.yearFrom >= 1888 && value.yearFrom <= value.yearTo && value.yearTo <= new Date().getFullYear() + 1;
  const popularityOptions = [
    { key: "any", label: t.recommendation.anyPopularity },
    { key: "popular", label: t.recommend.popularityPopular },
    { key: "medium", label: t.recommend.popularityMedium },
    { key: "niche", label: t.recommend.popularityNiche },
  ] as const;
  return (
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      if (canSubmit && remaining !== 0) onSubmit({ ...value, freeformText: value.freeformText.trim() }, reference);
    }}>
      <section className="soft-card space-y-6 rounded-2xl p-6 sm:p-8">
        <div>
          <label htmlFor="recommend-description" className="mb-3 block text-sm font-semibold">{t.recommend.freeformLabel}</label>
          <textarea id="recommend-description" value={value.freeformText} maxLength={400} rows={3}
            onChange={(event) => update({ freeformText: event.target.value })}
            placeholder={t.recommend.freeformPlaceholder}
            className="w-full resize-none rounded-xl bg-white/5 px-4 py-3 text-base text-foreground outline-accent-purple placeholder:text-muted sm:text-sm" />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t.recommendation.reference}</p>
          {reference ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-accent-purple/10 p-4 text-sm">
              <span><span className="sr-only">{t.recommendation.referenceSelected}: </span>{normalizeDisplayText(reference.title)} ({reference.year})</span>
              <button type="button" aria-label={t.recommendation.removeReference} onClick={() => { setReference(null); update({ referenceMovieId: null }); }} className="rounded-lg p-2 text-muted hover:text-foreground"><X size={18} /></button>
            </div>
          ) : (
            <SearchBar placeholder={t.recommendation.referencePlaceholder} onSelect={(movie) => { setReference(movie); update({ referenceMovieId: movie.id }); }} />
          )}
        </div>
      </section>
      <fieldset className="soft-card rounded-2xl p-6 sm:p-8">
        <legend className="sr-only">{t.recommend.genresLabel}</legend>
        <p className="mb-3 text-sm font-semibold">{t.recommend.genresLabel}</p>
        <div className="flex flex-wrap gap-2">
          {MOVIE_GENRES.map((genre) => <button type="button" key={genre} aria-pressed={value.genres.includes(genre)}
            onClick={() => update({
              genres: value.genres.includes(genre) ? value.genres.filter((g) => g !== genre) : [...value.genres, genre],
              excludedGenres: value.excludedGenres.filter((g) => g !== genre),
            })}
            className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${value.genres.includes(genre) ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"}`}>
            {localizeGenre(genre, t)}
          </button>)}
        </div>
        <p className="mt-3 text-xs text-muted">{t.recommendation.genresHint}</p>
      </fieldset>
      <fieldset className="soft-card rounded-2xl p-6">
        <legend className="sr-only">{t.recommend.popularityLabel}</legend>
        <p className="mb-4 text-sm font-semibold">{t.recommend.popularityLabel}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {popularityOptions.map((option) => <button type="button" key={option.key} aria-pressed={value.popularity === option.key}
            onClick={() => update({ popularity: option.key })}
            className={`min-h-12 rounded-xl px-3 py-3 text-sm font-medium ${value.popularity === option.key ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"}`}>
            {option.label}
          </button>)}
        </div>
      </fieldset>
      <RecommendationFilters value={value} onChange={update} />
      <button type="submit" disabled={!canSubmit || remaining === 0}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent-purple px-6 py-4 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
        <Sparkles size={20} />{t.recommend.submit}
      </button>
      {remaining !== null && quotaLimit !== null && <p className="text-center text-xs text-muted">{t.recommend.quotaInfo(remaining, quotaLimit)}</p>}
      {remaining === 0 && quotaLimit === 1 && <p className="text-center text-sm"><Link href="/sign-in" className="text-accent-purple hover:underline">{t.recommend.loginForMore}</Link></p>}
    </form>
  );
}
