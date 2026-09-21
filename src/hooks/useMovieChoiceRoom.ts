"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MovieChoicePreferences, MovieChoiceRequest, MovieChoiceRoomView } from "@/types/movie-choice";

const ENDPOINT = "/api/recommend/together";
const STORAGE_KEY = "showle:movie-choice:room";

function savedCode() {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return code && /^[A-Z0-9]{6}$/.test(code) ? code : null;
  } catch { return null; }
}

function remember(code: string | null) {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* Room membership still works when browser storage is unavailable. */ }
}

function updateAddress(code: string | null) {
  try {
    const url = new URL(window.location.href);
    if (code) url.searchParams.set("code", code);
    else url.searchParams.delete("code");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  } catch { /* Saving the room in memory/storage still works without history access. */ }
}

function samePreferences(left: MovieChoicePreferences | null, right: MovieChoicePreferences) {
  const sameSet = <T,>(first: T[], second: T[]) => new Set(first).size === new Set(second).size && first.every(value => second.includes(value));
  return left !== null && left.maxRuntime === right.maxRuntime &&
    sameSet(left.genres, right.genres) && sameSet(left.excludedGenres, right.excludedGenres) && sameSet(left.providerIds, right.providerIds);
}

function confirmsAction(next: MovieChoiceRoomView, action: MovieChoiceRequest) {
  if (action.action === "create" || next.code !== action.code) return false;
  if (action.action === "join") return true;
  if (action.action === "reset") return next.batch > action.batch;
  if (next.batch !== action.batch) return false;
  if (action.action === "preferences") return samePreferences(next.preferences, action.preferences);
  return next.votes.some(vote => vote.movieId === action.movieId && vote.liked === action.liked);
}

export function useMovieChoiceRoom(initialCode: string | null, invalidInvitation = false) {
  const [room, setRoom] = useState<MovieChoiceRoomView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(invalidInvitation ? "invalid_code" : "");
  const activeCode = useRef<string | null>(null);
  const snapshot = useRef<MovieChoiceRoomView | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const epoch = useRef(0);
  const sessionReady = useRef(false);
  const sessionRequest = useRef<AbortController | null>(null);
  const request = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);

  const accept = useCallback((next: MovieChoiceRoomView) => {
    const previous = snapshot.current;
    // Equal revisions may expose a generation lease that expired on the server.
    const accepted = previous?.code === next.code && previous.revision > next.revision ? previous : next;
    snapshot.current = accepted;
    activeCode.current = accepted.code;
    remember(accepted.code);
    updateAddress(accepted.code);
    setRoom(accepted);
    return accepted;
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionReady.current) return true;
    if (!mounted.current) return false;
    sessionRequest.current?.abort();
    const controller = new AbortController();
    const requestEpoch = epoch.current;
    sessionRequest.current = controller;
    const current = () => mounted.current && epoch.current === requestEpoch && sessionRequest.current === controller;
    const timer = setTimeout(() => controller.abort("timeout"), 12000);
    try {
      // Establish identity before a write so a lost join response is recoverable.
      const response = await fetch(ENDPOINT, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!current() || controller.signal.aborted) return false;
      if (!response.ok || data.ready !== true) { setError(data.error ?? "internal"); return false; }
      sessionReady.current = true;
      return true;
    } catch {
      if (current() && (!controller.signal.aborted || controller.signal.reason === "timeout")) setError("network");
      return false;
    } finally {
      clearTimeout(timer);
      if (sessionRequest.current === controller) sessionRequest.current = null;
    }
  }, []);

  const refresh = useCallback(async (code = activeCode.current, bootstrap = false, duringMutation = false): Promise<MovieChoiceRoomView | null> => {
    if (!code || !mounted.current || (busy.current && !duringMutation)) return null;
    request.current?.abort();
    const controller = new AbortController();
    const requestEpoch = epoch.current;
    request.current = controller;
    const current = () => mounted.current && epoch.current === requestEpoch && request.current === controller;
    const timer = setTimeout(() => controller.abort("timeout"), 12000);
    try {
      const response = await fetch(`${ENDPOINT}?code=${encodeURIComponent(code)}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!current() || controller.signal.aborted) return null;
      if (response.ok) { const accepted = accept(data); setError(""); return accepted; }
      if (response.status === 404 || response.status === 403) {
        if (savedCode() === code) remember(null);
        activeCode.current = null;
        snapshot.current = null;
        setRoom(null);
        if (!bootstrap) setError("room_not_found");
      } else setError(data.error ?? "internal");
    } catch {
      if (current() && (!controller.signal.aborted || controller.signal.reason === "timeout")) setError("network");
    } finally {
      clearTimeout(timer);
      if (request.current === controller) request.current = null;
    }
    return null;
  }, [accept]);

  useEffect(() => {
    let alive = true;
    mounted.current = true;
    epoch.current += 1;
    const bootstrapEpoch = epoch.current;
    busy.current = false;
    const resume = invalidInvitation ? null : initialCode ?? savedCode();
    activeCode.current = resume;
    snapshot.current = null;
    let timer: ReturnType<typeof setTimeout>;
    let polling = true;
    async function poll() {
      if (!alive || polling) return;
      polling = true;
      clearTimeout(timer);
      try { if (!document.hidden) await refresh(); }
      finally {
        polling = false;
        if (alive) timer = setTimeout(poll, 2000);
      }
    }
    const onVisible = () => { if (!document.hidden) void poll(); };
    // Keep this lifecycle's bootstrap and polling separate from a StrictMode
    // cleanup/remount; a previous request must not finish the new loading state.
    void (async () => {
      await Promise.resolve();
      try {
        if (!alive || epoch.current !== bootstrapEpoch) return;
        setLoading(true); setPending(false); setRoom(null);
        setError(invalidInvitation ? "invalid_code" : "");
        if (await ensureSession() && alive && epoch.current === bootstrapEpoch) await refresh(resume, true);
      }
      finally {
        if (alive) {
          if (epoch.current === bootstrapEpoch) setLoading(false);
          polling = false;
          timer = setTimeout(poll, 2000);
        }
      }
    })();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      alive = false;
      mounted.current = false;
      epoch.current += 1;
      clearTimeout(timer);
      sessionRequest.current?.abort();
      request.current?.abort();
      mutation.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [initialCode, invalidInvitation, ensureSession, refresh]);

  const send = useCallback(async (action: MovieChoiceRequest) => {
    if (!mounted.current || busy.current) return false;
    busy.current = true;
    request.current?.abort();
    const controller = new AbortController();
    const requestEpoch = epoch.current;
    mutation.current = controller;
    const current = () => mounted.current && epoch.current === requestEpoch && mutation.current === controller;
    setPending(true); setError("");
    let message = "";
    try {
      if ((action.action === "create" || action.action === "join") && !await ensureSession()) return false;
      if (!current()) return false;
      const timer = setTimeout(() => controller.abort("timeout"), 25000);
      try {
        const response = await fetch(ENDPOINT, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action), signal: controller.signal,
        });
        const data = await response.json();
        if (!current()) return false;
        if (controller.signal.aborted) message = "network";
        else if (!response.ok) message = data.error ?? "internal";
        else { accept(data); return true; }
      } catch {
        if (current() && (!controller.signal.aborted || controller.signal.reason === "timeout")) message = "network";
      } finally { clearTimeout(timer); }

      if (!current()) return false;
      // Keep both the UI and mutation lock held until an uncertain write has
      // been read back. Joining can recover even before activeCode is assigned.
      const reconcileCode = action.action === "create" ? null : action.code;
      if (message && reconcileCode) {
        const recovered = await refresh(reconcileCode, false, true);
        if (!current()) return false;
        if (recovered && confirmsAction(recovered, action)) { setError(""); return true; }
      }
      if (message) setError(message);
      return false;
    } finally {
      if (current()) {
        mutation.current = null;
        busy.current = false;
        setPending(false);
      }
    }
  }, [accept, ensureSession, refresh]);

  const forget = useCallback(() => {
    epoch.current += 1;
    sessionRequest.current?.abort();
    request.current?.abort();
    mutation.current?.abort();
    mutation.current = null;
    busy.current = false;
    activeCode.current = null;
    snapshot.current = null;
    remember(null);
    updateAddress(null);
    setRoom(null); setError(""); setPending(false); setLoading(false);
  }, []);

  return { room, loading, pending, error, send, refresh, forget };
}
