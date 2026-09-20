"use client";

import { useEffect, useRef, useState } from "react";
import { GUEST_PREFERENCES_KEY, readGuestPreferences, serializeGuestPreferences } from "@/lib/recommend-home-storage";
import { parseRecommendationSettings } from "@/lib/recommend-settings-input";
import type { RecommendationSettings } from "@/types/recommendation-settings";

export function useHomePreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<RecommendationSettings | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionOnly, setSessionOnly] = useState(false);
  const [revision, setRevision] = useState(0);
  const active = useRef(false);
  const saveRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; saveRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), 12000);
    setReady(false); setError(false);
    async function load() {
      try {
        if (!userId) {
          let stored: RecommendationSettings | null = null;
          try { stored = readGuestPreferences(localStorage.getItem(GUEST_PREFERENCES_KEY)); } catch { setSessionOnly(true); }
          setPreferences(stored); setReady(true); return;
        }
        const response = await fetch("/api/recommend/preferences", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("preferences_unavailable");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("preferences" in data)) throw new Error("invalid_response");
        const parsed = data.preferences === null ? null : parseRecommendationSettings(data.preferences);
        if (data.preferences !== null && !parsed) throw new Error("invalid_response");
        if (active.current && !controller.signal.aborted) { setPreferences(parsed); setReady(true); }
      } catch { if (active.current && (!controller.signal.aborted || controller.signal.reason === "timeout")) setError(true); }
      finally { clearTimeout(timeout); }
    }
    void load();
    return () => { clearTimeout(timeout); controller.abort("unmounted"); };
  }, [userId, revision]);

  async function save(value: RecommendationSettings) {
    if (saveRequest.current) return false;
    const controller = new AbortController();
    saveRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setSaving(true);
    try {
      let saved = value;
      if (userId) {
        const response = await fetch("/api/recommend/preferences", { method: "PUT", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
        if (!response.ok) throw new Error("save_failed");
        const data: unknown = await response.json();
        const parsed = data && typeof data === "object" && "preferences" in data ? parseRecommendationSettings(data.preferences) : null;
        if (!parsed) throw new Error("invalid_response");
        saved = parsed;
      } else {
        try { localStorage.setItem(GUEST_PREFERENCES_KEY, serializeGuestPreferences(value)); setSessionOnly(false); }
        catch { setSessionOnly(true); }
      }
      if (!active.current || controller.signal.aborted) return false;
      setPreferences(saved); setReady(true);
      return true;
    } catch { return false; }
    finally {
      clearTimeout(timeout); saveRequest.current = null;
      if (active.current) setSaving(false);
    }
  }

  return { preferences, ready, error, saving, sessionOnly, save, retry: () => setRevision((value) => value + 1) };
}
