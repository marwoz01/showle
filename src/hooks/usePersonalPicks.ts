"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_HOME_REFINEMENT, homeResponseError, parseHomePicks, type HomeRefinement } from "@/lib/recommend-home-response";
import { MAX_RECOMMEND_EXCLUDES } from "@/lib/recommend-input";
import type { Recommendation, RecommendationMeta } from "@/types/recommendation";
import type { RecommendationSettings } from "@/types/recommendation-settings";
import type { Locale } from "@/i18n";

interface PickRequest { settings: RecommendationSettings; refinement: HomeRefinement; exclude: number[] }

export function usePersonalPicks(userId: string | null, locale: Locale, positiveIds: number[], negativeIds: number[]) {
  const [results, setResults] = useState<Recommendation[]>([]);
  const [meta, setMeta] = useState<RecommendationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const last = useRef<PickRequest | null>(null);
  const seen = useRef<number[]>([]);
  const feedback = useRef({ positiveIds, negativeIds });

  useEffect(() => { feedback.current = { positiveIds, negativeIds }; }, [positiveIds, negativeIds]);
  useEffect(() => () => { request.current?.abort("unmounted"); }, []);

  const load = useCallback(async (settings: RecommendationSettings, refinement = EMPTY_HOME_REFINEMENT, exclude: number[] = []) => {
    request.current?.abort("superseded");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 25000);
    last.current = { settings, refinement, exclude };
    setLoading(true); setError(""); setResults([]); setMeta(null);
    try {
      const isDefault = !refinement.freeformText.trim() && !refinement.referenceMovieId && !refinement.maxRuntime && !exclude.length;
      const method = userId && isDefault ? "GET" : "POST";
      const response = await fetch(`/api/recommend/picks?locale=${locale}`, { method, cache: "no-store", signal: controller.signal,
        ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favoriteIds: settings.favoriteIds,
          providerIds: settings.providerIds, ...refinement, source: "catalog", locale, exclude, ...feedback.current }) } : {}) });
      const data: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (data && typeof data === "object") {
        if ("remaining" in data && typeof data.remaining === "number") setRemaining(data.remaining);
        if ("limit" in data && typeof data.limit === "number") setLimit(data.limit);
      }
      if (!response.ok) throw new Error(homeResponseError(data));
      const parsed = parseHomePicks(data);
      if (!parsed) throw new Error("no_results");
      seen.current = [...new Set([...exclude, ...parsed.recommendations.map(({ movie }) => movie.id)])].slice(-MAX_RECOMMEND_EXCLUDES);
      setResults(parsed.recommendations); setMeta(parsed.meta);
    } catch (failure) {
      if (!controller.signal.aborted || controller.signal.reason === "timeout") setError(failure instanceof Error ? failure.message : "internal");
    } finally {
      clearTimeout(timeout);
      if (request.current === controller && (!controller.signal.aborted || controller.signal.reason === "timeout")) setLoading(false);
    }
  }, [userId, locale]);

  function retry() { if (last.current) void load(last.current.settings, last.current.refinement, last.current.exclude); }
  function next() { if (last.current) void load(last.current.settings, last.current.refinement, seen.current); }
  return { results, meta, loading, error, remaining, limit, load, retry, next };
}
