"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { HIGHER_LOWER_ACCOUNT_RESET_EVENT, higherLowerStorageKeys, readHigherLowerBest } from "@/lib/higher-lower-storage";
import type {
  HigherLowerChoice,
  HigherLowerLocale,
  HigherLowerRequest,
  HigherLowerResponse,
} from "@/types/higher-lower";

type Action = HigherLowerRequest["action"];

export function useHigherLower(locale: HigherLowerLocale) {
  const { isLoaded, userId } = useAuth();
  const owner = userId ?? "guest";
  const { session: sessionKey, best: bestKey } = higherLowerStorageKeys(userId);
  const [scopedResponse, setResponse] = useState<{ owner: string; value: HigherLowerResponse } | null>(null);
  const [prepared, setPrepared] = useState<{ owner: string; value: HigherLowerResponse } | null>(null);
  const response = scopedResponse?.owner === owner ? scopedResponse.value : null;
  const preparedNext = prepared?.owner === owner ? prepared.value : null;
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [best, setBest] = useState(0);
  const [baseline, setBaseline] = useState(0);
  const [recordSaved, setRecordSaved] = useState(true);
  const [account, setAccount] = useState<{ owner: string; best: number; available: boolean } | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const activeOwner = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const bestInMemory = useRef(0);
  const baselineReady = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ action: Action; choice?: HigherLowerChoice }>({ action: "start" });

  const request = useCallback(async (action: Action, choice?: HigherLowerChoice) => {
    if (!isLoaded || activeOwner.current !== owner) return;
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
      if (action === "next") setPrepared({ owner, value: next });
      else {
        setPrepared(null);
        setResponse({ owner, value: next });
      }
      const storedBest = Math.max(readHigherLowerBest(bestKey), bestInMemory.current);
      if (action === "start" || !baselineReady.current) {
        setBaseline(storedBest);
        baselineReady.current = true;
      }
      bestInMemory.current = Math.max(storedBest, next.game.score);
      setBest(bestInMemory.current);
      try {
        sessionStorage.setItem(sessionKey, next.token);
      } catch {
        // Storage is optional: this tab can still finish its current run.
      }
      try {
        localStorage.setItem(bestKey, String(bestInMemory.current));
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
        try { sessionStorage.removeItem(sessionKey); } catch { /* Optional storage. */ }
      }
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === current) {
        controller.current = null;
        setPending(false);
      }
    }
  }, [locale, isLoaded, owner, bestKey, sessionKey]);

  useEffect(() => {
    function resetAccount(event: Event) {
      if (!userId || (event instanceof CustomEvent ? event.detail !== userId
        : !(event instanceof StorageEvent) || event.key !== bestKey || event.newValue !== null)) return;
      controller.current?.abort();
      controller.current = null;
      activeOwner.current = null;
      token.current = null;
      try { sessionStorage.removeItem(sessionKey); } catch { /* Optional storage. */ }
      setAccount(null);
      setResponse(null);
      setPrepared(null);
      setResetVersion((value) => value + 1);
    }
    window.addEventListener(HIGHER_LOWER_ACCOUNT_RESET_EVENT, resetAccount);
    window.addEventListener("storage", resetAccount);
    return () => {
      window.removeEventListener(HIGHER_LOWER_ACCOUNT_RESET_EVENT, resetAccount);
      window.removeEventListener("storage", resetAccount);
    };
  }, [userId, bestKey, sessionKey]);

  useEffect(() => {
    if (!isLoaded) return;
    if (activeOwner.current !== owner) {
      activeOwner.current = owner;
      token.current = null;
      bestInMemory.current = readHigherLowerBest(bestKey);
      baselineReady.current = false;
      setBest(bestInMemory.current);
      setBaseline(bestInMemory.current);
      setSyncFailed(false);
      setResponse(null);
      setPrepared(null);
    }
    if (!token.current) {
      try { token.current = sessionStorage.getItem(sessionKey); } catch { /* Optional storage. */ }
    }
    void request(token.current ? "resume" : "start");
    return () => {
      const active = controller.current;
      controller.current = null;
      active?.abort();
    };
  }, [request, isLoaded, owner, bestKey, sessionKey, resetVersion]);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const current = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => current.abort(), 6000);
    void fetch("/api/user/higher-lower-record", { cache: "no-store", signal: current.signal })
      .then(async (result) => {
        if (!result.ok) throw new Error("record_unavailable");
        const body = await result.json();
        if (!Number.isSafeInteger(body.bestScore) || body.bestScore < 0) throw new Error("record_unavailable");
        if (!active || activeOwner.current !== owner) return;
        bestInMemory.current = Math.max(bestInMemory.current, body.bestScore);
        setBest(bestInMemory.current);
        setBaseline((previous) => Math.max(previous, body.bestScore));
        setAccount({ owner, best: body.bestScore, available: true });
        try { localStorage.setItem(bestKey, String(bestInMemory.current)); } catch { /* The account remains the source of truth. */ }
      })
      .catch(() => {
        if (active && activeOwner.current === owner) {
          setAccount({ owner, best: 0, available: false });
          setSyncFailed(true);
        }
      })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); current.abort(); };
  }, [isLoaded, userId, owner, bestKey, resetVersion]);

  useEffect(() => {
    if (!isLoaded || !userId || !response || response.game.score <= 0 || account?.owner !== owner
      || (account.available && account.best >= response.game.score)) return;
    const current = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => current.abort(), 6000);
    // Only the authenticated server token is submitted, never the local best.
    void fetch("/api/user/higher-lower-record", {
      method: "POST", cache: "no-store", signal: current.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: response.token }),
    }).then(async (result) => {
      if (!result.ok) throw new Error("record_unavailable");
      const body = await result.json();
      if (!Number.isSafeInteger(body.bestScore) || body.bestScore < response.game.score) throw new Error("record_unavailable");
      if (!active || activeOwner.current !== owner) return;
      bestInMemory.current = Math.max(bestInMemory.current, body.bestScore);
      setBest(bestInMemory.current);
      setAccount({ owner, best: body.bestScore, available: true });
      setSyncFailed(false);
      try { localStorage.setItem(bestKey, String(bestInMemory.current)); } catch { /* Account sync succeeded. */ }
    }).catch(() => { if (active && activeOwner.current === owner) setSyncFailed(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); current.abort(); };
  }, [isLoaded, userId, owner, response, account, bestKey]);

  const answer = useCallback((choice: HigherLowerChoice) => {
    if (response?.game.status === "guessing" && !error) void request("answer", choice);
  }, [response?.game.status, error, request]);

  const next = useCallback(() => {
    if (response?.game.status === "revealed" && !preparedNext && !error) void request("next");
  }, [response?.game.status, preparedNext, error, request]);

  const commitNext = useCallback(() => {
    if (!preparedNext || activeOwner.current !== owner) return;
    setResponse({ owner, value: preparedNext });
    setPrepared(null);
  }, [owner, preparedNext]);

  return {
    scope: `${owner}:${resetVersion}:${locale}`,
    game: response?.game ?? null,
    preparedNext: preparedNext?.game ?? null,
    pending,
    error,
    best: activeOwner.current === owner ? best : 0,
    recordSaved,
    accountRecordStatus: !userId ? "guest" : syncFailed ? "unavailable" : account?.owner === owner && account.available && account.best >= best ? "synced" : "pending",
    isNewBest: Boolean(response && response.game.score > baseline),
    answer,
    next,
    commitNext,
    restart: () => void request("start"),
    retry: () => {
      const { action, choice } = lastRequest.current;
      void request(error === "invalid_session" ? "start" : action, choice);
    },
  };
}
