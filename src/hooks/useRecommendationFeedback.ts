"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { readFeedback, updateFeedback, type FeedbackEntry } from "@/lib/recommend-feedback-storage";
import type { RecommendationReaction } from "@/types/recommendation";

export function useRecommendationFeedback() {
  const { userId, isLoaded } = useAuth();
  const storageKey = `showle-recommend-feedback:${userId ?? "guest"}`;
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [pending, setPending] = useState<number[]>([]);
  const busy = useRef(new Set<number>());
  const currentKey = useRef(storageKey);
  useEffect(() => {
    currentKey.current = storageKey;
    try {
      setEntries(readFeedback(JSON.parse(localStorage.getItem(storageKey) || "[]")));
    } catch { setEntries([]); }
  }, [storageKey]);
  async function react(id: number, reaction: RecommendationReaction | null) {
    if (!isLoaded || busy.current.has(id)) return false;
    const key = storageKey;
    busy.current.add(id);
    setPending((ids) => [...ids, id]);
    try {
      if (userId) {
        const response = await fetch("/api/recommend/feedback", { method: "POST", signal: AbortSignal.timeout(8000),
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tmdbId: id, reaction }) });
        if (!response.ok) throw new Error("feedback_failed");
      }
      if (currentKey.current !== key) return false;
      setEntries((previous) => {
        const bounded = updateFeedback(previous, id, reaction);
        try { localStorage.setItem(key, JSON.stringify(bounded)); } catch { /* Current-session feedback still works. */ }
        return bounded;
      });
      return true;
    } catch { return false; }
    finally { busy.current.delete(id); setPending((ids) => ids.filter((value) => value !== id)); }
  }
  return { feedback: Object.fromEntries(entries), react, pending, isLoaded, userId,
    positiveIds: entries.filter(([, reaction]) => reaction === "more").map(([id]) => id),
    negativeIds: entries.filter(([, reaction]) => reaction === "less").map(([id]) => id) };
}
