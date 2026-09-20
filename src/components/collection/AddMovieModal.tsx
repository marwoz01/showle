"use client";

import { useId, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { X, Loader2 } from "@/components/ui/icons";
import Modal from "@/components/ui/Modal";
import AddMovieList, { type PickedMovie } from "@/components/collection/AddMovieList";
import { useMoviePicker } from "@/hooks/useMoviePicker";
import { collectionChanged, collectionRequest } from "@/lib/collection-client";
import type { CollectionCategory, SavedMovie } from "@/types/collection";
import type { MediaDetails } from "@/types";

export default function AddMovieModal({ onClose }: { onClose: () => void }) {
  const { userId } = useAuth();
  const { t, locale } = useTranslation();
  const id = useId();
  const picker = useMoviePicker(locale);
  const [category, setCategory] = useState<CollectionCategory>("watched");
  const [selected, setSelected] = useState<PickedMovie[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"save" | "limit" | null>(null);
  const busy = useRef(false);
  const toggle = (movie: PickedMovie) => {
    if (selected.some((item) => item.id === movie.id)) setSelected(selected.filter((item) => item.id !== movie.id));
    else if (selected.length >= 20) setError("limit");
    else { setSelected([...selected, movie]); setError(null); }
  };
  const save = async () => {
    if (busy.current || !selected.length) return;
    busy.current = true; setSaving(true); setError(null);
    const completed = new Set<number>();
    try {
      // Stop on the first failure and keep only unsaved selections for retry.
      for (const selection of selected) {
        const movie = "genres" in selection ? selection : await collectionRequest<MediaDetails>(`/api/movies/details?id=${selection.id}&lang=${locale}`);
        await collectionRequest<SavedMovie>("/api/collection", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: movie.id, title: movie.title, year: movie.year, posterPath: movie.posterPath,
            genres: movie.genres, director: movie.director, overview: movie.overview, runtime: movie.runtime, tmdbRating: movie.rating, category }) });
        completed.add(movie.id);
      }
      onClose();
    } catch { setSelected((previous) => previous.filter((movie) => !completed.has(movie.id))); setError("save"); }
    finally {
      if (completed.size && userId) collectionChanged(userId);
      busy.current = false; setSaving(false);
    }
  };
  return <Modal titleId={id} onClose={onClose} busy={saving}>
    <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
      <h2 id={id} className="font-semibold">{t.collection.addMovie}</h2>
      <button type="button" disabled={saving} onClick={onClose} aria-label={t.collection.cancel} className="p-3 text-muted"><X size={18} /></button>
    </div>
    <fieldset disabled={saving} className="space-y-3 p-6">
      <label htmlFor={`${id}-search`} className="sr-only">{t.collection.searchPlaceholder}</label>
      <input id={`${id}-search`} autoFocus type="search" value={picker.query} onChange={(event) => picker.setQuery(event.target.value)}
        placeholder={t.collection.searchPlaceholder} className="min-h-12 w-full rounded-xl border border-white/8 bg-card px-4 text-sm outline-none focus:border-accent-purple" />
      <div className="flex gap-2">{(["watched", "watchlist"] as const).map((value) => <button key={value} type="button" aria-pressed={category === value}
        onClick={() => setCategory(value)} className={`min-h-11 flex-1 rounded-lg px-3 text-xs ${category === value ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted"}`}>{t.collection.tabs[value]}</button>)}</div>
      {!picker.searchingNow && <p className="text-xs text-muted">{t.collection.popularMovies}</p>}
      <AddMovieList movies={picker.movies} selected={selected} onSelect={toggle} loading={picker.loading} />
      {picker.error && <p role="alert" className="text-sm text-muted">{t.collection.loadError} <button type="button" onClick={picker.retry} className="min-h-11 text-accent-purple">{t.common.tryAgain}</button></p>}
      {picker.more && !picker.error && <button type="button" onClick={picker.loadMore} disabled={picker.loading} className="min-h-11 w-full text-sm text-accent-purple">{t.collection.loadMore}</button>}
      {error && <p role="alert" className="text-sm text-muted">{error === "limit" ? t.collection.selectionLimit : t.collection.saveError}</p>}
      {selected.length > 0 && <button type="button" onClick={() => void save()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-purple text-sm font-semibold text-white">
        {saving && <Loader2 size={16} className="animate-spin" />}{t.collection.addSelected(selected.length)}
      </button>}
    </fieldset>
  </Modal>;
}
