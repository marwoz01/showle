"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslation } from "@/i18n";
import { ArrowLeft, Plus, Loader2, Search, X, Library, Eye, Bookmark } from "lucide-react";
import Image from "next/image";
import { MediaDetails } from "@/types";
import RankingItemRow from "@/components/collection/RankingItemRow";

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

interface RankedList {
  id: string;
  name: string;
  description: string | null;
  items: RankingItem[];
}

interface RankingDetailProps {
  listId: string;
  onBack: () => void;
}

export default function RankingDetail({ listId, onBack }: RankingDetailProps) {
  const { t } = useTranslation();
  const [list, setList] = useState<RankedList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaDetails[]>([]);
  const [searching, setSearching] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/collection/rankings/${listId}`);
      const data = await res.json();
      setList(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data: MediaDetails[] = await res.json();
        setSearchResults(data);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !list || active.id === over.id) return;

    const oldIndex = list.items.findIndex((i) => i.id === active.id);
    const newIndex = list.items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(list.items, oldIndex, newIndex).map(
      (item, idx) => ({ ...item, position: idx + 1 })
    );

    setList({ ...list, items: reordered });

    await fetch(`/api/collection/rankings/${listId}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((item) => ({ id: item.id, position: item.position })),
      }),
    });
  };

  const handleAddItem = async (movie: MediaDetails) => {
    try {
      await fetch(`/api/collection/rankings/${listId}/items`, {
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
        }),
      });
      setShowSearch(false);
      setQuery("");
      setSearchResults([]);
      fetchList();
    } catch {
      // silently fail
    }
  };

  const handleBulkAdd = async (category: "watched" | "watchlist") => {
    setBulkLoading(true);
    setShowBulkMenu(false);
    setBulkMessage(null);

    try {
      // Fetch all movies from the category
      const res = await fetch(`/api/collection?category=${category}&sort=date`);
      const data = await res.json();
      const movies = data.items || [];

      if (movies.length === 0) {
        setBulkMessage(
          category === "watched"
            ? t.collection.emptyWatched
            : t.collection.emptyWatchlist
        );
        setBulkLoading(false);
        return;
      }

      // Bulk add to ranking
      const addRes = await fetch(`/api/collection/rankings/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: movies.map((m: { tmdbId: number; title: string; year: number; posterPath: string; genres?: string[]; director?: string; overview?: string }) => ({
            tmdbId: m.tmdbId,
            title: m.title,
            year: m.year,
            posterPath: m.posterPath,
            genres: m.genres || [],
            director: m.director || "",
            overview: m.overview || "",
          })),
        }),
      });
      const result = await addRes.json();
      setBulkMessage(t.collection.addedCount(result.added || 0, result.skipped || 0));
      fetchList();
    } catch {
      // silently fail
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!list) return;
    setList({
      ...list,
      items: list.items
        .filter((i) => i.id !== itemId)
        .map((item, idx) => ({ ...item, position: idx + 1 })),
    });

    await fetch(`/api/collection/rankings/${listId}/items/${itemId}`, {
      method: "DELETE",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-foreground">{list.name}</h2>
          {list.description && (
            <p className="text-xs text-muted">{list.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk add from collection */}
          <div className="relative">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              disabled={bulkLoading}
              className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/6 hover:text-foreground disabled:opacity-50"
            >
              {bulkLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Library size={16} />
              )}
              <span className="hidden sm:inline">{t.collection.addFromCollection}</span>
            </button>

            {showBulkMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowBulkMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-card-hover shadow-xl">
                  <button
                    onClick={() => handleBulkAdd("watched")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Eye size={14} />
                    {t.collection.addAllWatched}
                  </button>
                  <button
                    onClick={() => handleBulkAdd("watchlist")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <Bookmark size={14} />
                    {t.collection.addAllWatchlist}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Single add via search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 rounded-lg bg-accent-purple px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            {t.collection.addToList}
          </button>
        </div>
      </div>

      {/* Bulk add feedback */}
      {bulkMessage && (
        <div className="flex items-center justify-between rounded-lg border border-white/6 bg-accent-purple/10 px-4 py-2.5">
          <p className="text-sm text-accent-purple">{bulkMessage}</p>
          <button
            onClick={() => setBulkMessage(null)}
            className="text-accent-purple/60 hover:text-accent-purple"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add movie search */}
      {showSearch && (
        <div className="rounded-xl border border-white/6 bg-card p-4">
          <div className="relative">
            {searching ? (
              <Loader2
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-muted"
              />
            ) : (
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
            )}
            <input
              type="text"
              placeholder={t.collection.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-white/6 bg-white/3 py-2.5 pl-12 pr-10 text-sm text-foreground placeholder-muted outline-none focus:border-accent-purple/50"
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearch(false);
                setQuery("");
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {searchResults.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => handleAddItem(movie)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/4"
                >
                  {movie.posterPath && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                      alt={movie.title}
                      width={24}
                      height={36}
                      className="rounded"
                    />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {movie.title}
                  </span>
                  <span className="text-xs text-muted">({movie.year})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {list.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {t.collection.addToList}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={list.items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {list.items.map((item) => (
                <RankingItemRow
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
