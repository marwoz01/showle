"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { getTodayKey } from "@/lib/game-date";
import type { DailyGameView } from "@/types/daily-game";

export function useGame() {
  const { userId, isLoaded } = useAuth();
  const { locale } = useTranslation();
  const [game, setGame] = useState<DailyGameView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const busy = useRef(false);
  const version = useRef(0);

  const remember = useCallback((view: DailyGameView) => {
    setGame(view);
    try {
      localStorage.setItem(`showle-progress:${userId ?? "guest"}`, JSON.stringify({
        dateKey: view.dateKey, status: view.status, attempts: view.guesses.length,
      }));
    } catch { /* Storage may be disabled; the server remains authoritative. */ }
    window.dispatchEvent(new Event("game-progress"));
  }, [userId]);

  const refresh = useCallback(async () => {
    const current = ++version.current;
    setError(false);
    try {
      const response = await fetch(`/api/game/state?lang=${locale}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load");
      let view: DailyGameView = await response.json();
      // One-time migration of old anonymous local progress. Replay IDs, not trusted outcomes.
      if (!userId && !view.guesses.length && view.status === "playing") {
        let saved;
        try { saved = JSON.parse(localStorage.getItem("showle-daily-movie") ?? "null"); } catch { /* no legacy state */ }
        if (saved?.dateKey === view.dateKey && Array.isArray(saved.guessIds)) {
          const ids = [...new Set(saved.guessIds)].filter((id) => Number.isSafeInteger(id) && Number(id) > 0).slice(0, 7);
          const actions = ids.map((movieId) => ({ type: "guess", movieId }));
          if (saved.status === "lost") actions.push({ type: "give-up", movieId: 0 });
          for (const action of actions) {
            const migrated = await fetch(`/api/game/state?lang=${locale}&dateKey=${view.dateKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
            });
            if (!migrated.ok) throw new Error("migration");
            view = await migrated.json();
            if (view.status !== "playing") break;
          }
          try { localStorage.removeItem("showle-daily-movie"); } catch { /* optional storage */ }
        }
      }
      if (current === version.current) remember(view);
    } catch {
      if (current === version.current) setError(true);
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, [locale, userId, remember]);

  useEffect(() => {
    if (!isLoaded) return;
    setLoading(true);
    setCelebrate(false);
    void refresh();
    const invalidate = () => { version.current++; };
    return invalidate;
  }, [isLoaded, refresh]);

  useEffect(() => {
    const focus = () => { if (!busy.current) void refresh(); };
    const timer = window.setInterval(() => {
      if (game && game.dateKey !== getTodayKey() && !busy.current) { setCelebrate(false); void refresh(); }
    }, 15000);
    window.addEventListener("focus", focus);
    return () => { clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [game, refresh]);

  const act = useCallback(async (action: { type: string; movieId?: number }) => {
    if (busy.current || loading || !game || game.status !== "playing") return;
    busy.current = true;
    setPending(true);
    setError(false);
    const current = ++version.current;
    try {
      const response = await fetch(`/api/game/state?lang=${locale}&dateKey=${game.dateKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
      });
      if (response.status === 409) { await refresh(); return; }
      if (!response.ok) throw new Error("save");
      const view: DailyGameView = await response.json();
      if (current !== version.current) return;
      remember(view);
      setCelebrate(view.status === "won");
      if (view.status !== "playing") window.dispatchEvent(new Event("game-completed"));
    } catch {
      if (current === version.current) setError(true);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, [game, loading, locale, refresh, remember]);

  return { game, loading, pending, error, celebrate, refresh,
    submitGuess: (movie: { id: number }) => act({ type: "guess", movieId: movie.id }),
    giveUp: () => act({ type: "give-up" }),
  };
}
