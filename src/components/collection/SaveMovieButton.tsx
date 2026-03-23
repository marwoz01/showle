"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { Bookmark, BookmarkCheck, Eye, Loader2 } from "lucide-react";
import { MediaDetails } from "@/types";

interface SaveMovieButtonProps {
  movie: MediaDetails;
  variant?: "icon" | "button";
}

export default function SaveMovieButton({
  movie,
  variant = "icon",
}: SaveMovieButtonProps) {
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    fetch(`/api/collection?category=watched`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.items?.some(
          (item: { tmdbId: number }) => item.tmdbId === movie.id
        );
        if (found) {
          setSaved(true);
          return;
        }
        return fetch(`/api/collection?category=watchlist`).then((r) =>
          r.json()
        );
      })
      .then((data) => {
        if (data?.items?.some(
          (item: { tmdbId: number }) => item.tmdbId === movie.id
        )) {
          setSaved(true);
        }
      })
      .catch(() => {});
  }, [isSignedIn, movie.id]);

  if (!isSignedIn) return null;

  const handleSave = async (category: "watched" | "watchlist") => {
    setSaving(true);
    setShowPopover(false);

    try {
      await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          genres: movie.genres,
          director: movie.director,
          overview: movie.overview,
          runtime: movie.runtime,
          tmdbRating: movie.rating,
          category,
        }),
      });
      setSaved(true);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    if (variant === "icon") {
      return (
        <div className="rounded-lg bg-black/60 p-1.5 text-accent-purple backdrop-blur-sm">
          <BookmarkCheck size={16} />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-sm text-accent-purple">
        <BookmarkCheck size={16} />
        {t.collection.saved}
      </div>
    );
  }

  if (saving) {
    return (
      <div className="rounded-lg bg-black/60 p-1.5 backdrop-blur-sm">
        <Loader2 size={16} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={
          variant === "icon"
            ? "rounded-lg bg-black/60 p-1.5 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
            : "flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/6 hover:text-foreground"
        }
      >
        <Bookmark size={16} />
        {variant === "button" && t.collection.addToCollection}
      </button>

      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-card-hover shadow-xl">
            <button
              onClick={() => handleSave("watched")}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <Eye size={14} />
              {t.collection.watched}
            </button>
            <button
              onClick={() => handleSave("watchlist")}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <Bookmark size={14} />
              {t.collection.watchlist}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
