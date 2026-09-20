"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { CollectionCategory, CollectionPage, CollectionSort, SavedMovie } from "@/types/collection";
import { collectionChanged, collectionRequest, CollectionRequestError } from "@/lib/collection-client";

export function useCollectionMovies(category: CollectionCategory, sort: CollectionSort, order: "asc" | "desc") {
  const { userId } = useAuth();
  const [movies, setMovies] = useState<SavedMovie[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const request = useRef<AbortController | null>(null);
  const active = useRef(true);
  const busy = useRef(new Set<string>());
  const retrySave = useRef<(() => Promise<boolean>) | null>(null);
  const retryPage = useRef(1);
  const load = useCallback(async (nextPage = 1) => {
    request.current?.abort();
    const ac = new AbortController();
    request.current = ac;
    retryPage.current = nextPage;
    setLoadError(false);
    if (nextPage === 1) setLoading(true); else setLoadingMore(true);
    try {
      const result = await collectionRequest<CollectionPage>(`/api/collection?category=${category}&sort=${sort}&order=${order}&page=${nextPage}`, { signal: ac.signal });
      if (ac.signal.aborted || !active.current) return;
      setMovies((previous) => nextPage === 1 ? result.items : [...previous, ...result.items.filter((item) => !previous.some((movie) => movie.id === item.id))]);
      setTotal(result.total);
      setPage(nextPage);
    } catch { if (!ac.signal.aborted && active.current) setLoadError(true); }
    finally {
      if (!ac.signal.aborted && active.current) { setLoading(false); setLoadingMore(false); request.current = null; }
    }
  }, [category, sort, order]);
  useEffect(() => {
    active.current = true;
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => { active.current = false; request.current?.abort(); window.removeEventListener("focus", refresh); };
  }, [load]);
  const mutate = async (movie: SavedMovie, data?: { rating?: number; category?: CollectionCategory; review?: string | null }): Promise<boolean> => {
    if (busy.current.size) return false;
    busy.current.add(movie.id); setPending([...busy.current]); setSaveError(false);
    retrySave.current = () => mutate(movie, data);
    try {
      const result = await collectionRequest<SavedMovie | { success: true }>(`/api/collection/${movie.id}`, {
        method: data ? "PATCH" : "DELETE",
        ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}),
      }).catch((error: unknown) => {
        // A retried delete can return 404 after the first response was lost.
        if (!data && error instanceof CollectionRequestError && error.status === 404) return { success: true as const };
        throw error;
      });
      if (userId) collectionChanged(userId, data ? result as SavedMovie : { tmdbId: movie.tmdbId, category: null });
      if (!active.current) return true;
      retrySave.current = null;
      // Rebase pagination after a removal or a sort-affecting update.
      await load();
      return true;
    } catch { if (active.current) setSaveError(true); return false; }
    finally { busy.current.delete(movie.id); if (active.current) setPending([...busy.current]); }
  };
  return { movies, total, loading, loadingMore, loadError, saveError, pending, mutate,
    refresh: () => load(), retryLoad: () => load(retryPage.current), retrySave: () => retrySave.current?.(),
    loadMore: () => { if (!request.current) void load(page + 1); },
  };
}
