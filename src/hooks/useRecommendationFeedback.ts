"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { RECOMMENDATION_FEEDBACK_RESET_EVENT, readFeedback, recommendationFeedbackStorageKey, updateFeedback, type FeedbackEntry } from "@/lib/recommend-feedback-storage";
import type { RecommendationReaction } from "@/types/recommendation";

export function useRecommendationFeedback() {
  const { userId, isLoaded } = useAuth();
  const storageKey = recommendationFeedbackStorageKey(userId);
  const [snapshot, setSnapshot] = useState<{ key: string; entries: FeedbackEntry[]; ready: boolean } | null>(null);
  const entries = snapshot?.key === storageKey ? snapshot.entries : [];
  const [pending, setPending] = useState<number[]>([]);
  const busy = useRef(new Set<number>());
  const currentKey = useRef(storageKey);
  const revision = useRef({ value: 0 });
  const mutations = useRef(new Map<number, AbortController>());
  useEffect(() => {
    if (!isLoaded) return;
    currentKey.current = storageKey;
    const generation = revision.current;
    const inFlight = mutations.current;
    let active = true;
    let refresh: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function reload() {
      const currentRevision = ++generation.value;
      refresh?.abort();
      clearTimeout(timeout);
      inFlight.forEach((controller) => controller.abort());
      inFlight.clear();
      busy.current.clear();
      setPending([]);
      let cached: FeedbackEntry[] = [];
      try { cached = readFeedback(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { /* Optional cache. */ }
      setSnapshot({ key: storageKey, entries: cached, ready: !userId });
      if (!userId) return;
      const controller = new AbortController();
      refresh = controller;
      timeout = setTimeout(() => controller.abort(), 6000);
      void fetch("/api/recommend/feedback", { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("feedback_unavailable");
          const body = await response.json();
          if (!Array.isArray(body.feedback)) throw new Error("feedback_unavailable");
          if (!active || generation.value !== currentRevision) return;
          const entries = readFeedback(body.feedback);
          setSnapshot({ key: storageKey, entries, ready: true });
          // Avoid a storage-event refresh loop between tabs with identical data.
          try {
            const serialized = JSON.stringify(entries);
            if (localStorage.getItem(storageKey) !== serialized) localStorage.setItem(storageKey, serialized);
          } catch { /* The server response is still available in memory. */ }
        })
        .catch(() => {
          if (active && generation.value === currentRevision) setSnapshot({ key: storageKey, entries: cached, ready: true });
        })
        .finally(() => { if (refresh === controller) clearTimeout(timeout); });
    }

    function onReset(event: Event) {
      if (event instanceof CustomEvent && event.detail === userId) reload();
    }
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) reload();
    }
    reload();
    window.addEventListener(RECOMMENDATION_FEEDBACK_RESET_EVENT, onReset);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", reload);
    return () => {
      active = false;
      generation.value++;
      refresh?.abort();
      clearTimeout(timeout);
      inFlight.forEach((controller) => controller.abort());
      inFlight.clear();
      window.removeEventListener(RECOMMENDATION_FEEDBACK_RESET_EVENT, onReset);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", reload);
    };
  }, [storageKey, isLoaded, userId]);
  async function react(id: number, reaction: RecommendationReaction | null) {
    if (!isLoaded || snapshot?.key !== storageKey || !snapshot.ready || busy.current.has(id)) return false;
    const key = storageKey;
    const currentRevision = revision.current.value;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    mutations.current.set(id, controller);
    busy.current.add(id);
    setPending((ids) => [...ids, id]);
    try {
      if (userId) {
        const response = await fetch("/api/recommend/feedback", { method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tmdbId: id, reaction }) });
        if (!response.ok) throw new Error("feedback_failed");
      }
      if (currentKey.current !== key || revision.current.value !== currentRevision) return false;
      setSnapshot((previous) => {
        if (previous?.key !== key || revision.current.value !== currentRevision) return previous;
        const bounded = updateFeedback(previous.entries, id, reaction);
        try { localStorage.setItem(key, JSON.stringify(bounded)); } catch { /* Current-session feedback still works. */ }
        return { key, entries: bounded, ready: true };
      });
      return true;
    } catch { return false; }
    finally {
      clearTimeout(timer);
      if (mutations.current.get(id) === controller) {
        mutations.current.delete(id);
        busy.current.delete(id);
        setPending((ids) => ids.filter((value) => value !== id));
      }
    }
  }
  return { feedback: Object.fromEntries(entries), react, pending, isLoaded, feedbackReady: isLoaded && snapshot?.key === storageKey && snapshot.ready, userId,
    positiveIds: entries.filter(([, reaction]) => reaction === "more").map(([id]) => id),
    negativeIds: entries.filter(([, reaction]) => reaction === "less").map(([id]) => id) };
}
