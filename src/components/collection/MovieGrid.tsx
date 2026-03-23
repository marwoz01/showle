"use client";

import { useTranslation } from "@/i18n";
import { ArrowUpDown } from "lucide-react";
import CollectionCard from "@/components/collection/CollectionCard";

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

type SortOption = "date" | "rating" | "title" | "year";

interface MovieGridProps {
  movies: SavedMovie[];
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onRate: (id: string, rating: number) => void;
  onChangeCategory: (id: string, category: "watched" | "watchlist") => void;
  onDelete: (id: string) => void;
  onReview: (movie: SavedMovie) => void;
}

const SORT_OPTIONS: SortOption[] = ["date", "rating", "title", "year"];

export default function MovieGrid({
  movies,
  sort,
  onSortChange,
  onRate,
  onChangeCategory,
  onDelete,
  onReview,
}: MovieGridProps) {
  const { t } = useTranslation();

  const sortLabels: Record<SortOption, string> = {
    date: t.collection.sortDate,
    rating: t.collection.sortRating,
    title: t.collection.sortTitle,
    year: t.collection.sortYear,
  };

  return (
    <div>
      {/* Sort controls */}
      <div className="mb-4 flex items-center gap-2">
        <ArrowUpDown size={14} className="text-muted" />
        <span className="text-xs text-muted">{t.collection.sortBy}:</span>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => onSortChange(option)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                sort === option
                  ? "bg-accent-purple/15 text-accent-purple"
                  : "text-muted hover:bg-white/4 hover:text-foreground"
              }`}
            >
              {sortLabels[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((movie) => (
          <CollectionCard
            key={movie.id}
            movie={movie}
            onRate={onRate}
            onChangeCategory={onChangeCategory}
            onDelete={onDelete}
            onReview={onReview}
          />
        ))}
      </div>
    </div>
  );
}
