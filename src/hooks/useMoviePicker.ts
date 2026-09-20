"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaDetails } from "@/types";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import { collectionRequest } from "@/lib/collection-client";

export function useMoviePicker(locale: string) {
  const [query, setQuery] = useState("");
  const [popular, setPopular] = useState<MediaDetails[]>([]);
  const [results, setResults] = useState<MovieSuggestion[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [searching, setSearching] = useState(false);
  const [popularError, setPopularError] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  const retryPage = useRef(1);
  const searchingNow = query.trim().length >= 2;
  const fetchPopular = useCallback(async (next: number) => {
    request.current?.abort();
    const ac = new AbortController();
    request.current = ac;
    retryPage.current = next;
    setLoadingPopular(true); setPopularError(false);
    try {
      const data = await collectionRequest<{ results: MediaDetails[]; totalPages: number }>(`/api/movies/popular?page=${next}`, { signal: ac.signal });
      if (ac.signal.aborted) return;
      setPopular((previous) => next === 1 ? data.results : [...previous, ...data.results.filter((movie) => !previous.some((item) => item.id === movie.id))]);
      setPage(next); setPages(data.totalPages);
    } catch { if (!ac.signal.aborted) setPopularError(true); }
    finally { if (!ac.signal.aborted) { setLoadingPopular(false); request.current = null; } }
  }, []);
  useEffect(() => { void fetchPopular(1); return () => request.current?.abort(); }, [fetchPopular]);
  useEffect(() => {
    setResults([]); setSearchError(false);
    if (!searchingNow) { setSearching(false); return; }
    const ac = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await collectionRequest<MovieSuggestion[]>(`/api/movies/search?q=${encodeURIComponent(query.trim())}&lang=${locale}`, { signal: ac.signal });
        if (!ac.signal.aborted) setResults(data);
      } catch { if (!ac.signal.aborted) setSearchError(true); }
      finally { if (!ac.signal.aborted) setSearching(false); }
    }, 300);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [query, locale, searchingNow, searchRevision]);
  return { query, setQuery, movies: searchingNow ? results : popular, searchingNow, error: searchingNow ? searchError : popularError,
    loading: searchingNow ? searching : loadingPopular, more: !searchingNow && page < pages,
    loadMore: () => { if (!request.current) void fetchPopular(page + 1); },
    retry: () => searchingNow ? setSearchRevision((value) => value + 1) : void fetchPopular(retryPage.current),
  };
}
