"use client";

import { useTranslation } from "@/i18n";
import { MOVIE_GENRES } from "@/constants/genres";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import { localizeGenre } from "@/lib/localization";
import type { RecommendationPreference } from "@/types/recommendation";

interface Props { value: RecommendationPreference; onChange: (patch: Partial<RecommendationPreference>) => void }
export default function RecommendationFilters({ value, onChange }: Props) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const inputClass = "min-h-12 w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-accent-purple";
  const chipClass = (selected: boolean) => `min-h-10 rounded-xl px-3 py-2 text-sm transition-colors ${selected ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"}`;
  return (
    <details className="soft-card rounded-2xl p-6">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">{t.recommendation.advanced}</summary>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-3 text-sm text-muted">{t.recommend.yearLabel}</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs text-muted">{t.recommendation.startYear}
              <input type="number" min={1888} max={year} value={value.yearFrom} className={inputClass}
                onChange={(event) => onChange({ yearFrom: Number(event.target.value) })} />
            </label>
            <label className="space-y-2 text-xs text-muted">{t.recommendation.endYear}
              <input type="number" min={1888} max={year + 1} value={value.yearTo} className={inputClass}
                onChange={(event) => onChange({ yearTo: Number(event.target.value) })} />
            </label>
          </div>
        </fieldset>
        <label className="space-y-3 text-sm text-muted">{t.recommendation.maxRuntime}
          <select value={value.maxRuntime ?? ""} onChange={(event) => onChange({ maxRuntime: event.target.value ? Number(event.target.value) : null })} className={inputClass}>
            <option value="">{t.recommendation.noRuntimeLimit}</option>
            {[60, 90, 120, 150, 180].map((minutes) => <option key={minutes} value={minutes}>{t.recommendation.minutes(minutes)}</option>)}
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-3 text-sm text-muted">{t.recommendation.providers}</legend>
          <div className="flex flex-wrap gap-2">
            {RECOMMENDATION_PROVIDERS.map((provider) => <button type="button" key={provider.id} aria-pressed={value.providerIds.includes(provider.id)}
              className={chipClass(value.providerIds.includes(provider.id))}
              onClick={() => onChange({ providerIds: value.providerIds.includes(provider.id) ? value.providerIds.filter((id) => id !== provider.id) : [...value.providerIds, provider.id] })}>
              {provider.name}
            </button>)}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">{t.recommendation.providersHint}</p>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-3 text-sm text-muted">{t.recommendation.excludedGenres}</legend>
          <div className="flex flex-wrap gap-2">
            {MOVIE_GENRES.map((genre) => <button type="button" key={genre} aria-pressed={value.excludedGenres.includes(genre)}
              className={chipClass(value.excludedGenres.includes(genre))}
              onClick={() => onChange({
                excludedGenres: value.excludedGenres.includes(genre) ? value.excludedGenres.filter((g) => g !== genre) : [...value.excludedGenres, genre],
                genres: value.genres.filter((g) => g !== genre),
              })}>{localizeGenre(genre, t)}</button>)}
          </div>
        </fieldset>
      </div>
    </details>
  );
}
