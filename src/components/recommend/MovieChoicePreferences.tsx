"use client";

import { useId, useState } from "react";
import { useTranslation } from "@/i18n";
import { movieChoiceRoomCopy } from "@/i18n/movie-choice-room";
import { MOVIE_GENRES } from "@/constants/genres";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import { localizeGenre } from "@/lib/localization";
import type { MovieChoicePreferences as MovieChoicePreferencesValue } from "@/types/movie-choice";

interface Props {
  initial: MovieChoicePreferencesValue | null;
  disabled: boolean;
  onSubmit: (value: MovieChoicePreferencesValue) => void;
}

const chipClass = (selected: boolean) =>
  `min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple disabled:cursor-wait ${
    selected ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"
  }`;

export default function MovieChoicePreferences({ initial, disabled, onSubmit }: Props) {
  const { t, locale } = useTranslation();
  const copy = movieChoiceRoomCopy[locale];
  const id = useId();
  const [value, setValue] = useState<MovieChoicePreferencesValue>(() => ({
    genres: [...(initial?.genres ?? [])],
    excludedGenres: [...(initial?.excludedGenres ?? [])],
    maxRuntime: initial?.maxRuntime ?? null,
    providerIds: [...(initial?.providerIds ?? [])],
  }));

  function toggleGenre(genre: string, excluded: boolean) {
    setValue((previous) => {
      const selected = excluded ? previous.excludedGenres : previous.genres;
      const next = selected.includes(genre)
        ? selected.filter((item) => item !== genre)
        : [...selected, genre];
      return excluded
        ? { ...previous, excludedGenres: next, genres: previous.genres.filter((item) => item !== genre) }
        : { ...previous, genres: next, excludedGenres: previous.excludedGenres.filter((item) => item !== genre) };
    });
  }

  return (
    <form
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onSubmit(value);
      }}
    >
      <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-60">
        <legend className="sr-only">{copy.preferencesTitle}</legend>
        <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6">
          <div>
            <h2 id={`${id}-title`} className="font-display text-xl font-semibold">{copy.preferencesTitle}</h2>
            <p id={`${id}-genres-help`} className="mt-2 text-sm leading-relaxed text-muted">{copy.preferencesHelp}</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-genres-help`}>
            {MOVIE_GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                aria-pressed={value.genres.includes(genre)}
                className={chipClass(value.genres.includes(genre))}
                onClick={() => toggleGenre(genre, false)}
              >
                {localizeGenre(genre, t)}
              </button>
            ))}
          </div>
        </section>

        <details className="soft-card rounded-2xl p-5 sm:p-6">
          <summary className="min-h-11 cursor-pointer content-center rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent-purple">
            {copy.filters}
          </summary>
          <div className="mt-5 space-y-6">
            <div>
              <label htmlFor={`${id}-runtime`} className="mb-3 block text-sm font-medium">{t.recommendation.maxRuntime}</label>
              <select
                id={`${id}-runtime`}
                value={value.maxRuntime ?? ""}
                onChange={(event) => setValue((previous) => ({
                  ...previous,
                  maxRuntime: event.target.value ? Number(event.target.value) : null,
                }))}
                className="min-h-12 w-full rounded-xl bg-white/5 px-4 py-3 text-sm outline-accent-purple"
              >
                <option value="">{t.recommendation.noRuntimeLimit}</option>
                {[60, 90, 120, 150, 180].map((minutes) => (
                  <option key={minutes} value={minutes}>{t.recommendation.minutes(minutes)}</option>
                ))}
              </select>
            </div>

            <fieldset className="min-w-0" aria-describedby={`${id}-platforms-help`}>
              <legend className="mb-3 text-sm font-medium">{t.recommendation.providers}</legend>
              <div className="flex flex-wrap gap-2">
                {RECOMMENDATION_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    aria-pressed={value.providerIds.includes(provider.id)}
                    className={chipClass(value.providerIds.includes(provider.id))}
                    onClick={() => setValue((previous) => ({
                      ...previous,
                      providerIds: previous.providerIds.includes(provider.id)
                        ? previous.providerIds.filter((providerId) => providerId !== provider.id)
                        : [...previous.providerIds, provider.id],
                    }))}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
              <p id={`${id}-platforms-help`} className="mt-3 text-xs leading-relaxed text-muted">{copy.platformsHelp}</p>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="mb-3 text-sm font-medium">{copy.excluded}</legend>
              <div className="flex flex-wrap gap-2">
                {MOVIE_GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={value.excludedGenres.includes(genre)}
                    className={chipClass(value.excludedGenres.includes(genre))}
                    onClick={() => toggleGenre(genre, true)}
                  >
                    {localizeGenre(genre, t)}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-xs leading-relaxed text-muted">{copy.constraintsHelp}</p>
          </div>
        </details>

        <button
          type="submit"
          className="min-h-12 w-full rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple disabled:cursor-wait"
        >
          {disabled ? copy.working : copy.submitPreferences}
        </button>
      </fieldset>
    </form>
  );
}
