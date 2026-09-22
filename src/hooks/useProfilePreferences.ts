"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { MovieChoicePreferences } from "@/types/movie-choice";

export function hasProfilePreferences(value: MovieChoicePreferences | null) {
  return Boolean(value && (value.genres.length || value.excludedGenres.length || value.providerIds.length || value.maxRuntime !== null));
}

export function useProfilePreferences() {
  const { isLoaded, userId } = useAuth();
  const owner = userId ?? "guest";
  const [loaded, setLoaded] = useState<{ owner: string; preferences: MovieChoicePreferences | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    void fetch("/api/profile/preferences", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("preferences_unavailable");
        const data = await response.json();
        const value = data.preferences;
        if (!value || !Array.isArray(value.genres) || !Array.isArray(value.excludedGenres) || !Array.isArray(value.providerIds)
          || !(value.maxRuntime === null || typeof value.maxRuntime === "number")) throw new Error("preferences_unavailable");
        if (active) setLoaded({ owner: userId, preferences: value, failed: false });
      })
      .catch(() => { if (active) setLoaded({ owner: userId, preferences: null, failed: true }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [isLoaded, userId]);

  const current = userId && loaded?.owner === owner ? loaded : null;
  return {
    owner,
    loading: !isLoaded || Boolean(userId && !current),
    preferences: current?.preferences ?? null,
    failed: current?.failed ?? false,
  };
}
