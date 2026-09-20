"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import SearchBar from "@/components/game/SearchBar";
import { X } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";

interface Props { ids: number[]; onChange: (ids: number[]) => void; disabled: boolean }

export default function FavoriteMoviesPicker({ ids, onChange, disabled }: Props) {
  const { t, locale } = useTranslation();
  const [titles, setTitles] = useState<Record<number, string>>({});
  const knownTitles = useRef<Record<number, string>>({});
  const idKey = ids.join(",");
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const requests = idKey.split(",").filter(Boolean).map(async (id) => {
      if (knownTitles.current[Number(id)]) return;
      try {
        const response = await fetch(`/api/movies/details?id=${id}&lang=${locale}`, { signal: controller.signal });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (data && typeof data === "object" && "title" in data && typeof data.title === "string" && !controller.signal.aborted) {
          const title = data.title;
          knownTitles.current[Number(id)] = title;
          setTitles((previous) => ({ ...previous, [id]: title }));
        }
      } catch { /* Keep the saved ID removable when the catalog is unavailable. */ }
    });
    void Promise.allSettled(requests).then(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [idKey, locale]);

  return <fieldset className="space-y-3">
    <legend className="text-sm font-semibold">{t.recommendationHome.favoritesLabel}</legend>
    <p className="text-sm text-muted">{t.recommendationHome.favoritesHint}</p>
    {!!ids.length && <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const title = normalizeDisplayText(titles[id] ?? t.recommendationHome.savedMovie(id));
        return <li key={id} className="inline-flex max-w-full items-center gap-2 rounded-xl bg-accent-purple/10 pl-3 text-sm">
          <span className="min-w-0 truncate">{title}</span>
          <button type="button" disabled={disabled} onClick={() => onChange(ids.filter((value) => value !== id))}
            aria-label={t.recommendationHome.removeFavorite(title)} className="min-h-11 shrink-0 rounded-xl px-3 text-muted hover:text-foreground disabled:opacity-40"><X size={16} /></button>
        </li>;
      })}
    </ul>}
    <SearchBar disabled={disabled || ids.length >= 5} placeholder={t.recommendationHome.favoriteSearch} onSelect={(movie) => {
      if (ids.includes(movie.id) || ids.length >= 5) return;
      knownTitles.current[movie.id] = movie.title;
      setTitles((previous) => ({ ...previous, [movie.id]: movie.title }));
      onChange([...ids, movie.id]);
    }} />
    {ids.length >= 5 && <p className="text-xs text-muted">{t.recommendationHome.favoriteLimit}</p>}
  </fieldset>;
}
