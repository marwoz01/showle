"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import FavoriteMoviesPicker from "@/components/recommend/FavoriteMoviesPicker";
import type { RecommendationSettings } from "@/types/recommendation-settings";

interface Props {
  initial: RecommendationSettings; signedIn: boolean; saving: boolean; error: boolean;
  onSave: (preferences: RecommendationSettings) => void; onCancel?: () => void;
}

export default function PersonalPreferencesForm({ initial, signedIn, saving, error, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const copy = t.recommendationHome;
  const chip = (selected: boolean) => `min-h-11 rounded-xl px-4 py-2 text-sm transition-colors disabled:opacity-40 ${selected ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"}`;
  return <form className="soft-card space-y-7 rounded-2xl p-5 sm:p-8" onSubmit={(event) => {
    event.preventDefault(); if (!saving) onSave({ ...value, onboarded: true });
  }}>
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">{copy.setupTitle}</h2>
      <p className="text-sm text-muted">{copy.setupDescription}</p>
    </div>
    <FavoriteMoviesPicker ids={value.favoriteIds} disabled={saving} onChange={(favoriteIds) => setValue((previous) => ({ ...previous, favoriteIds }))} />
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{copy.platformsLabel}</legend>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} aria-pressed={!value.providerIds.length} className={chip(!value.providerIds.length)}
          onClick={() => setValue((previous) => ({ ...previous, providerIds: [] }))}>{copy.allPlatforms}</button>
        {RECOMMENDATION_PROVIDERS.map((provider) => <button key={provider.id} type="button" disabled={saving}
          aria-pressed={value.providerIds.includes(provider.id)} className={chip(value.providerIds.includes(provider.id))}
          onClick={() => setValue((previous) => ({ ...previous, providerIds: previous.providerIds.includes(provider.id)
            ? previous.providerIds.filter((id) => id !== provider.id) : [...previous.providerIds, provider.id] }))}>{provider.name}</button>)}
      </div>
      <p className="text-xs leading-relaxed text-muted">{copy.platformsHint}</p>
    </fieldset>
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-muted">{t.common.genericError}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{saving ? copy.saving : copy.save}</button>
        {onCancel ? <button type="button" disabled={saving} onClick={onCancel} className="min-h-12 rounded-xl bg-white/5 px-5 py-3 text-sm">{copy.cancel}</button>
          : <button type="button" disabled={saving} onClick={() => onSave({ favoriteIds: [], providerIds: [], onboarded: true })}
            className="min-h-12 rounded-xl px-5 py-3 text-sm text-muted hover:text-foreground">{copy.skip}</button>}
      </div>
      <p className="text-xs leading-relaxed text-muted">{signedIn ? copy.accountHint : copy.guestHint}</p>
    </div>
  </form>;
}
