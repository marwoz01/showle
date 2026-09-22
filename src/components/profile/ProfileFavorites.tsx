"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { Film, Loader2, Plus, X } from "@/components/ui/icons";
import SearchBar from "@/components/game/SearchBar";
import { profileMutation } from "@/lib/profile-client";
import { normalizeDisplayText } from "@/lib/typography";
import type { ProfileMovie } from "@/types/profile";

export default function ProfileFavorites({ movies, onSaved }: { movies: ProfileMovie[]; onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(movies);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    if (pending) return;
    setPending(true); setMessage("");
    try {
      await profileMutation("/api/profile", { favoriteMovieIds: draft.map((movie) => movie.id) });
      await onSaved(); setEditing(false); setMessage(t.profile.saved);
    } catch { setMessage(t.common.genericError); }
    finally { setPending(false); }
  }
  const visible = editing ? draft : movies;
  return <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t.profile.favorites}</h2>
      {!editing && <button className="min-h-11 rounded-xl px-3 text-sm text-accent-purple hover:bg-accent-purple/10" onClick={() => { setDraft(movies); setEditing(true); setMessage(""); }}>{t.profile.editFavorites}</button>}
    </div>
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {Array.from({ length: 4 }, (_, index) => {
        const movie = visible[index];
        return <div key={movie?.id ?? `empty-${index}`} className="min-w-0">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/8 bg-white/3">
            {movie?.posterPath ? <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={normalizeDisplayText(movie.title)} fill sizes="(max-width: 640px) 22vw, 230px" className="object-cover" />
              : <div className="flex h-full items-center justify-center text-muted/40">{movie ? <Film size={24} /> : <Plus size={22} />}</div>}
            {movie && editing && <button type="button" disabled={pending} aria-label={`${t.profile.removeFavorite}: ${movie.title}`} onClick={() => setDraft((previous) => previous.filter((item) => item.id !== movie.id))} className="absolute right-1 top-1 rounded-full bg-black/80 p-2 text-white hover:bg-black"><X size={14} /></button>}
          </div>
          <p className="mt-2 text-xs leading-relaxed break-words text-muted">{movie ? normalizeDisplayText(movie.title) : t.profile.emptyFavorite}</p>
        </div>;
      })}
    </div>
    {editing && <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">{t.profile.favoritesHint}</p>
      {draft.length < 4 && <SearchBar disabled={pending} placeholder={t.profile.favoriteSearch} onSelect={(movie) => {
        if (draft.some((item) => item.id === movie.id)) { setMessage(t.profile.favoriteDuplicate); return; }
        if (draft.length >= 4) { setMessage(t.profile.favoriteLimit); return; }
        setDraft((previous) => [...previous, movie]); setMessage("");
      }} />}
      <div className="flex flex-wrap gap-3"><button disabled={pending} onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold disabled:opacity-50">{pending && <Loader2 size={16} className="animate-spin" />}{t.profile.saveFavorites}</button>
        <button disabled={pending} onClick={() => { setEditing(false); setMessage(""); }} className="min-h-11 rounded-xl bg-white/5 px-4 py-3 text-sm">{t.profile.cancel}</button></div>
    </div>}
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
  </section>;
}
