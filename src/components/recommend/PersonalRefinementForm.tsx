"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import SearchBar from "@/components/game/SearchBar";
import { X } from "@/components/ui/icons";
import { EMPTY_HOME_REFINEMENT, type HomeRefinement } from "@/lib/recommend-home-response";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import { normalizeDisplayText } from "@/lib/typography";

interface Props { disabled: boolean; onSubmit: (value: HomeRefinement) => void }

export default function PersonalRefinementForm({ disabled, onSubmit }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState<HomeRefinement>(EMPTY_HOME_REFINEMENT);
  const [reference, setReference] = useState<MovieSuggestion | null>(null);
  const copy = t.recommendationHome;
  const chip = (selected: boolean) => `min-h-11 rounded-xl px-3 py-2 text-sm disabled:opacity-40 ${selected ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"}`;
  return <form className="soft-card space-y-4 rounded-2xl p-5 sm:p-6" onSubmit={(event) => {
    event.preventDefault(); if (!disabled) onSubmit({ ...value, freeformText: value.freeformText.trim() });
  }}>
    <label htmlFor="personal-mood" className="block text-sm font-semibold">{copy.refineLabel}</label>
    <div className="flex flex-col gap-3 sm:flex-row">
      <input id="personal-mood" type="text" value={value.freeformText} disabled={disabled} maxLength={400}
        onChange={(event) => setValue((previous) => ({ ...previous, freeformText: event.target.value }))}
        placeholder={copy.refinePlaceholder} className="min-h-12 min-w-0 flex-1 rounded-xl bg-white/5 px-4 py-3 text-base outline-accent-purple placeholder:text-muted disabled:opacity-40 sm:text-sm" />
      <button type="submit" disabled={disabled} className="min-h-12 shrink-0 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40">{copy.apply}</button>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} aria-pressed={value.freeformText === copy.lightPrompt} className={chip(value.freeformText === copy.lightPrompt)}
        onClick={() => setValue((previous) => ({ ...previous, freeformText: previous.freeformText === copy.lightPrompt ? "" : copy.lightPrompt }))}>{copy.light}</button>
      <button type="button" disabled={disabled} aria-pressed={value.maxRuntime === 90} className={chip(value.maxRuntime === 90)}
        onClick={() => setValue((previous) => ({ ...previous, maxRuntime: previous.maxRuntime === 90 ? null : 90 }))}>{copy.short}</button>
    </div>
    <details>
      <summary className="cursor-pointer py-2 text-sm text-muted">{copy.referenceToggle}</summary>
      <div className="mt-2">
        {reference ? <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 pl-4 text-sm">
          <span>{normalizeDisplayText(reference.title)} ({reference.year})</span>
          <button type="button" disabled={disabled} aria-label={t.recommendation.removeReference} className="min-h-11 rounded-xl px-3 text-muted"
            onClick={() => { setReference(null); setValue((previous) => ({ ...previous, referenceMovieId: null })); }}><X size={18} /></button>
        </div> : <SearchBar disabled={disabled} placeholder={t.recommendation.referencePlaceholder} onSelect={(movie) => {
          setReference(movie); setValue((previous) => ({ ...previous, referenceMovieId: movie.id }));
        }} />}
      </div>
    </details>
  </form>;
}
