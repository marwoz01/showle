"use client";

import { useEffect, useState, useRef } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n";
import { Bookmark, BookmarkCheck, Eye, Loader2 } from "@/components/ui/icons";
import type { MediaDetails } from "@/types";
import type { CollectionCategory, SavedMovie } from "@/types/collection";
import { useCollectionStatus } from "@/components/providers/CollectionProvider";
import { collectionRequest, collectionChanged } from "@/lib/collection-client";
import { rememberMovieSave, takePendingMovieSave } from "@/lib/pending-movie-save";

interface SaveMovieButtonProps { movie: MediaDetails; variant?: "icon" | "button" }
export default function SaveMovieButton(props: SaveMovieButtonProps) {
  const { user, isLoaded } = useUser();
  return user ? <SaveControl key={`${user.id}:${props.movie.id}`} owner={user.id} {...props} />
    : <GuestSaveControl {...props} ready={isLoaded} />;
}
function GuestSaveControl({ movie, variant = "icon", ready }: SaveMovieButtonProps & { ready: boolean }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  return <SignInButton mode="modal" fallbackRedirectUrl={pathname} signUpFallbackRedirectUrl={pathname}>
    <button type="button" disabled={!ready} aria-label={t.collection.signInToSave} title={t.collection.signInToSave}
      onClick={() => { try { rememberMovieSave(movie.id, window.location.pathname, sessionStorage); } catch { /* Login still works without storage. */ } }}
      className={variant === "icon" ? "rounded-lg bg-black/60 p-2 text-white/80 disabled:opacity-50" : "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/8 px-4 py-2.5 text-sm text-muted hover:text-foreground disabled:opacity-50"}>
      <Bookmark size={16} />{variant === "button" && t.collection.signInToSave}
    </button>
  </SignInButton>;
}
function SaveControl({ movie, variant = "icon", owner }: SaveMovieButtonProps & { owner: string }) {
  const { t } = useTranslation();
  const { status, retry } = useCollectionStatus(movie.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const busy = useRef(false);
  const control = useRef<HTMLButtonElement>(null);
  const saved = status === "watched" || status === "watchlist";
  useEffect(() => {
    if (status === "loading" || status === "error") return;
    // Wait for the account's collection status and the sign-in modal to settle.
    const frame = requestAnimationFrame(() => {
      try {
        if (takePendingMovieSave(movie.id, window.location.pathname, sessionStorage) && !saved) {
          setShowPopover(true); control.current?.focus();
        }
      } catch { /* The user can still open the menu manually. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [movie.id, status, saved]);
  const handleSave = async (category: CollectionCategory) => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(false);
    try {
      const result = await collectionRequest<SavedMovie>("/api/collection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: movie.id, title: movie.title, year: movie.year,
          posterPath: movie.posterPath, genres: movie.genres, director: movie.director,
          overview: movie.overview, runtime: movie.runtime, tmdbRating: movie.rating, category }),
      });
      collectionChanged(owner, result);
      setShowPopover(false);
    } catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  };
  if (saved) return <span aria-label={t.collection.alreadySaved} title={t.collection.tabs[status]}
    className={variant === "icon" ? "inline-flex rounded-lg bg-black/60 p-2 text-accent-purple" : "flex w-full items-center justify-center gap-2 rounded-lg bg-accent-purple/10 px-4 py-2.5 text-sm text-accent-purple"}>
    <BookmarkCheck size={16} />{variant === "button" && t.collection.saved}
  </span>;
  return <div className="relative" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setShowPopover(false); } }}>
    <button ref={control} type="button" disabled={saving || status === "loading"} aria-label={status === "error" ? t.common.tryAgain : t.collection.addToCollection}
      aria-expanded={showPopover} onClick={() => status === "error" ? retry() : setShowPopover(!showPopover)}
      className={variant === "icon" ? "rounded-lg bg-black/60 p-2 text-white/80 disabled:opacity-50" : "flex w-full items-center justify-center gap-2 rounded-lg border border-white/8 px-4 py-2.5 text-sm text-muted disabled:opacity-50"}>
      {saving || status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} />}
      {variant === "button" && (status === "error" ? t.common.tryAgain : t.collection.addToCollection)}
    </button>
    {showPopover && <>
      <div className="fixed inset-0 z-10" onClick={() => { if (!saving) setShowPopover(false); }} />
      <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-white/10 bg-card-hover p-1 shadow-xl">
        {(["watched", "watchlist"] as const).map((category) => {
          const Icon = category === "watched" ? Eye : Bookmark;
          return <button key={category} type="button" disabled={saving} onClick={() => void handleSave(category)}
            className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-sm text-muted hover:bg-white/5 disabled:opacity-50">
            <Icon size={14} />{t.collection.tabs[category]}
          </button>;
        })}
        {error && <p role="alert" className="px-3 py-2 text-xs text-muted">{t.collection.saveError}</p>}
      </div>
    </>}
    {status === "error" && <span className="sr-only" role="alert">{t.collection.loadError}</span>}
  </div>;
}
