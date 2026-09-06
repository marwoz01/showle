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
import { ArrowLeft, Plus, Loader2, Search, X, Library, Eye, Bookmark } from "@/components/ui/icons";
import Image from "next/image";
import { MediaDetails } from "@/types";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import RankingItemRow from "@/components/collection/RankingItemRow";
import { MAX_RANKING_ADD_BATCH } from "@/lib/ranking-input";

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
  const { t, locale } = useTranslation();
  const [list, setList] = useState<RankedList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MovieSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/collection/rankings/${listId}`);
      if (!res.ok) throw new Error("ranking");
      const data = await res.json();
      setList(data);
    } catch {
      setBulkMessage(t.common.genericError);
    } finally {
      setLoading(false);
    }
  }, [listId, t.common.genericError]);

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
          `/api/movies/search?q=${encodeURIComponent(query)}&lang=${locale}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("search");
        const data: MovieSuggestion[] = await res.json();
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
  }, [query, locale]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !list || saving || bulkLoading || active.id === over.id) return;

    const oldIndex = list.items.findIndex((i) => i.id === active.id);
    const newIndex = list.items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(list.items, oldIndex, newIndex).map(
      (item, idx) => ({ ...item, position: idx + 1 })
    );

    setList({ ...list, items: reordered });

    setSaving(true);
    setBulkMessage(null);
    try {
      await writeItems("PUT", { move: { id: String(active.id), position: newIndex + 1 } });
    } catch (error) {
      setBulkMessage(error instanceof Error && error.message === t.collection.rankingLimit ? t.collection.rankingLimit : t.common.genericError);
    } finally {
      await fetchList();
      setSaving(false);
    }
  };

  const writeItems = async (method: "POST" | "PUT", body: { items: unknown[] } | { move: { id: string; position: number } }) => {
    const res = await fetch(`/api/collection/rankings/${listId}/items`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(res.status === 409 ? t.collection.rankingLimit : t.common.genericError);
    return res.json();
  };

  const handleAddItem = async (suggestion: MovieSuggestion) => {
    if (saving || bulkLoading) return;
    setSaving(true);
    setBulkMessage(null);
    try {
      const details = await fetch(`/api/movies/details?id=${suggestion.id}&lang=${locale}`);
      if (!details.ok) throw new Error(t.common.genericError);
      const movie: MediaDetails = await details.json();
      await writeItems("POST", { items: [{
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          genres: movie.genres,
          director: movie.director,
          overview: movie.overview,
      }] });
      setShowSearch(false);
      setQuery("");
      setSearchResults([]);
    } catch (error) {
      setBulkMessage(error instanceof Error && error.message === t.collection.rankingLimit ? t.collection.rankingLimit : t.common.genericError);
    } finally {
      await fetchList();
      setSaving(false);
    }
  };

  const handleBulkAdd = async (category: "watched" | "watchlist") => {
    if (saving || bulkLoading) return;
    setBulkLoading(true);
    setShowBulkMenu(false);
    setBulkMessage(null);

    try {
      // Use the collection endpoint's current page; keep each write bounded.
      const res = await fetch(`/api/collection?category=${category}&sort=date`);
      if (!res.ok) throw new Error(t.common.genericError);
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
      const items = movies.map((m: { tmdbId: number; title: string; year: number; posterPath: string; genres?: string[]; director?: string; overview?: string }) => ({
            tmdbId: m.tmdbId,
            title: m.title,
            year: m.year,
            posterPath: m.posterPath,
            genres: m.genres || [],
            director: m.director || "",
            overview: m.overview || "",
      }));
      let added = 0;
      let skipped = 0;
      for (let offset = 0; offset < items.length; offset += MAX_RANKING_ADD_BATCH) {
        const result = await writeItems("POST", { items: items.slice(offset, offset + MAX_RANKING_ADD_BATCH) });
        added += result.added ?? 0;
        skipped += result.skipped ?? 0;
      }
      setBulkMessage(t.collection.addedCount(added, skipped));
    } catch (error) {
      setBulkMessage(error instanceof Error && error.message === t.collection.rankingLimit ? t.collection.rankingLimit : t.common.genericError);
    } finally {
      await fetchList();
      setBulkLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!list || saving || bulkLoading) return;
    setSaving(true);
    setList({
      ...list,
      items: list.items
        .filter((i) => i.id !== itemId)
        .map((item, idx) => ({ ...item, position: idx + 1 })),
    });

    try {
      const res = await fetch(`/api/collection/rankings/${listId}/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
    } catch {
      setBulkMessage(t.common.genericError);
    } finally {
      await fetchList();
      setSaving(false);
    }
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
              disabled={bulkLoading || saving}
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
            disabled={saving || bulkLoading}
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
                  disabled={saving || bulkLoading}
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
