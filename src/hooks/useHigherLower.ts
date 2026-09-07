"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  HigherLowerChoice,
  HigherLowerLocale,
  HigherLowerRequest,
  HigherLowerResponse,
} from "@/types/higher-lower";

const SESSION_KEY = "showle:higher-lower:runtime:session:v1";
const BEST_KEY = "showle:higher-lower:runtime:best:v1";

function readBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

type Action = HigherLowerRequest["action"];

export function useHigherLower(locale: HigherLowerLocale) {
  const [response, setResponse] = useState<HigherLowerResponse | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [best, setBest] = useState(0);
  const [baseline, setBaseline] = useState(0);
  const [recordSaved, setRecordSaved] = useState(true);
  const token = useRef<string | null>(null);
  const bestInMemory = useRef(0);
  const baselineReady = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ action: Action; choice?: HigherLowerChoice }>({ action: "start" });

  const request = useCallback(async (action: Action, choice?: HigherLowerChoice) => {
    if (controller.current && action !== "start" && action !== "resume") return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    lastRequest.current = { action, choice };
    setPending(true);
    setError(null);
    const timeout = window.setTimeout(() => current.abort(), 15000);

    try {
      const result = await fetch("/api/higher-lower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: current.signal,
        body: JSON.stringify({ action, locale, ...(action !== "start" && token.current ? { token: token.current } : {}), ...(choice ? { choice } : {}) }),
      });
      const body = await result.json();
      if (!result.ok) throw new Error(typeof body.error === "string" ? body.error : "game_unavailable");
      if (controller.current !== current) return;
      const next = body as HigherLowerResponse;
      token.current = next.token;
      setResponse(next);
      const storedBest = Math.max(readBest(), bestInMemory.current);
      if (action === "start" || !baselineReady.current) {
        setBaseline(storedBest);
        baselineReady.current = true;
      }
      bestInMemory.current = Math.max(storedBest, next.game.score);
      setBest(bestInMemory.current);
      try {
        sessionStorage.setItem(SESSION_KEY, next.token);
      } catch {
        // Storage is optional: this tab can still finish its current run.
      }
      try {
        localStorage.setItem(BEST_KEY, String(bestInMemory.current));
        setRecordSaved(true);
      } catch {
        setRecordSaved(false);
      }
    } catch (cause) {
      if (controller.current !== current) return;
      const code = cause instanceof Error ? cause.message : "game_unavailable";
      setError(code);
      if (code === "invalid_session") {
        token.current = null;
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Optional storage. */ }
      }
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === current) {
        controller.current = null;
        setPending(false);
      }
    }
  }, [locale]);

  useEffect(() => {
    if (!token.current) {
      try { token.current = sessionStorage.getItem(SESSION_KEY); } catch { /* Optional storage. */ }
    }
    void request(token.current ? "resume" : "start");
    return () => {
      const active = controller.current;
      controller.current = null;
      active?.abort();
    };
  }, [request]);

  const answer = useCallback((choice: HigherLowerChoice) => {
    if (response?.game.status === "guessing" && !error) void request("answer", choice);
  }, [response?.game.status, error, request]);

  return {
    game: response?.game ?? null,
    pending,
    error,
    best,
    recordSaved,
    isNewBest: Boolean(response && response.game.score > baseline),
    answer,
    next: () => void request("next"),
    restart: () => void request("start"),
    retry: () => {
      const { action, choice } = lastRequest.current;
      void request(error === "invalid_session" ? "start" : action, choice);
    },
  };
}
