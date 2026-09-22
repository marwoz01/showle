"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaDetails } from "@/types";
import type { MovieSuggestion } from "@/types/movie-suggestion";

export function useCollectionMovieSearch(query: string, locale: string) {
  const [results, setResults] = useState<MovieSuggestion[]>([]);
  const [popular, setPopular] = useState<MediaDetails[]>([]);
  const [searchState, setSearchState] = useState({ query: "", loading: false, error: false });
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [popularError, setPopularError] = useState(false);
  const pagination = useRef({ page: 0, total: 1, loading: false });
  const popularController = useRef<AbortController | null>(null);

  const fetchPopular = useCallback(async () => {
    const state = pagination.current;
    if (state.loading || state.page >= state.total) return;
    state.loading = true;
    const controller = new AbortController();
    popularController.current = controller;
    setLoadingPopular(true);
    setPopularError(false);
    try {
      const response = await fetch(`/api/movies/popular?page=${state.page + 1}`, { signal: controller.signal });
      if (!response.ok) throw new Error("popular");
      const data: { results: MediaDetails[]; totalPages: number } = await response.json();
      if (controller.signal.aborted) return;
      setPopular((previous) => {
        const ids = new Set(previous.map((movie) => movie.id));
        return [...previous, ...data.results.filter((movie) => !ids.has(movie.id))];
      });
      state.page += 1;
      state.total = data.totalPages;
    } catch {
      if (!controller.signal.aborted) setPopularError(true);
    } finally {
      if (popularController.current === controller) {
        state.loading = false;
        if (!controller.signal.aborted) {
          setLoadingPopular(false);
          setInitialLoadDone(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    const state = pagination.current;
    void fetchPopular();
    return () => {
      popularController.current?.abort();
      state.loading = false;
    };
  }, [fetchPopular]);

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResults([]);
      setSearchState({ query, loading: true, error: false });
      try {
        const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}&lang=${locale}`, { signal: controller.signal });
        if (!response.ok) throw new Error("search");
        const data: MovieSuggestion[] = await response.json();
        if (!controller.signal.aborted) {
          setResults(data);
          setSearchState({ query, loading: false, error: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchState({ query, loading: false, error: true });
        }
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, locale]);

  const searching = query.length >= 2;
  const currentResults = searchState.query === query;
  return {
    movies: searching ? (currentResults ? results : []) : popular,
    loading: searching ? (!currentResults || searchState.loading) : loadingPopular,
    initialLoadDone,
    error: searching ? (currentResults && searchState.error) : popularError,
    loadMore: () => { if (!searching) void fetchPopular(); },
  };
}
