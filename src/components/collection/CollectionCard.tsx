"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { MoreVertical, Eye, Bookmark, Trash2, MessageSquare } from "lucide-react";
import StarRating from "@/components/collection/StarRating";
import ConfirmModal from "@/components/collection/ConfirmModal";
import MovieDetailsModal from "@/components/movie/MovieDetailsModal";
import { localizeGenre } from "@/lib/localization";

interface SavedMovie {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  category: string;
  rating: number | null;
  review: string | null;
  genres: string[];
  director: string;
  overview: string;
}

interface CollectionCardProps {
  movie: SavedMovie;
  onRate: (id: string, rating: number) => void;
  onChangeCategory: (id: string, category: "watched" | "watchlist") => void;
  onDelete: (id: string) => void;
  onReview: (movie: SavedMovie) => void;
}

export default function CollectionCard({
  movie,
  onRate,
  onChangeCategory,
  onDelete,
  onReview,
}: CollectionCardProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Stop nested actions (menu, save) from firing the card click that opens details.
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowDetails(true);
    }
  };

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={() => setShowDetails(true)}
      onKeyDown={handleKey}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/6 bg-card transition-all hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none">
      {/* Poster */}
      <div className="p-2.5 pb-0">
        <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg">
          {movie.posterPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-white/5 p-3 text-center text-xs text-muted">
              {movie.title}
            </div>
          )}

          {/* Menu button */}
          <div className="absolute right-1.5 top-1.5" onClick={stopPropagation}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg bg-black/60 p-1.5 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-48 overflow-hidden rounded-lg border border-white/10 bg-card-hover shadow-xl">
                  {movie.category === "watchlist" ? (
                    <button
                      onClick={() => {
                        onChangeCategory(movie.id, "watched");
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      <Eye size={14} />
                      {t.collection.markWatched}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onChangeCategory(movie.id, "watchlist");
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      <Bookmark size={14} />
                      {t.collection.moveToWatchlist}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onReview(movie);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <MessageSquare size={14} />
                    {movie.review ? t.collection.editReview : t.collection.writeReview}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    {t.collection.removeMovie}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="mb-0.5 text-sm font-bold leading-tight text-foreground">
          {movie.title}
        </h3>

        {/* Year + Director */}
        <p className="mb-1 text-[10px] text-muted">
          {movie.year}
          {movie.director && <> · {movie.director}</>}
        </p>

        {/* Rating + Genre badges */}
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {movie.category === "watched" && (
            <div onClick={stopPropagation}>
              <StarRating
                value={movie.rating}
                onChange={(rating) => onRate(movie.id, rating)}
              />
            </div>
          )}
          {movie.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted"
            >
              {localizeGenre(genre, t)}
            </span>
          ))}
        </div>

        {/* Review snippet */}
        {movie.review && (
          <p className="mt-auto line-clamp-2 rounded-md bg-white/3 px-2 py-1.5 text-[10px] leading-snug text-muted">
            {movie.review}
          </p>
        )}
      </div>

      {showDeleteConfirm && (
        <div onClick={stopPropagation}>
          <ConfirmModal
            message={t.collection.removeConfirm}
            onConfirm={() => {
              onDelete(movie.id);
              setShowDeleteConfirm(false);
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </div>
      )}
    </div>

    {showDetails && (
      <MovieDetailsModal
        tmdbId={movie.tmdbId}
        initial={{
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          genres: movie.genres,
          director: movie.director,
          overview: movie.overview,
        }}
        onClose={() => setShowDetails(false)}
      />
    )}
    </>
  );
}
