"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, Trash2 } from "lucide-react";

interface RankingItem {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
  genres: string[];
  director: string;
  overview: string;
  position: number;
}

interface RankingItemRowProps {
  item: RankingItem;
  onDelete: (itemId: string) => void;
}

export default function RankingItemRow({ item, onDelete }: RankingItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-lg border border-white/6 bg-card px-3 py-3 transition-colors hover:bg-card-hover"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>

      {/* Position */}
      <span className="mt-1 w-6 text-center text-sm font-bold text-accent-purple">
        {item.position}
      </span>

      {/* Poster thumbnail */}
      {item.posterPath ? (
        <Image
          src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
          alt={item.title}
          width={40}
          height={60}
          className="shrink-0 rounded"
        />
      ) : (
        <div className="flex h-15 w-10 shrink-0 items-center justify-center rounded bg-white/5 text-[8px] text-muted">
          ?
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
        <p className="text-xs text-muted">
          {item.year}
          {item.director && <> · {item.director}</>}
        </p>

        {/* Genre badges */}
        {item.genres.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Overview */}
        {item.overview && (
          <p className="mt-1 line-clamp-1 text-[10px] leading-snug text-muted/60">
            {item.overview}
          </p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="mt-1 rounded-md p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
