"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { accountLocaleWriter } from "@/lib/account-locale-writer";

export default function AccountLocaleSync() {
  const { isLoaded, userId } = useAuth();
  const { setLocale } = useTranslation();
  useEffect(() => {
    if (!isLoaded || !userId) return;
    const releaseWriter = accountLocaleWriter.activate(userId);
    const controller = new AbortController();
    let active = true;
    let applying = false;
    let changed = false;
    const persist = () => {
      if (applying) return;
      changed = true;
      let locale: string | null;
      try { locale = localStorage.getItem("showle-locale"); } catch { return; }
      if (locale !== "pl" && locale !== "en") return;
      void accountLocaleWriter.save(userId, locale).catch(() => {});
    };
    window.addEventListener("showle-locale-change", persist);
    void fetch("/api/profile/preferences", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!active || changed || (data.locale !== "pl" && data.locale !== "en")) return;
        applying = true;
        try { setLocale(data.locale); } finally { applying = false; }
      }).catch(() => {});
    return () => { active = false; releaseWriter(); controller.abort(); window.removeEventListener("showle-locale-change", persist); };
  }, [isLoaded, userId, setLocale]);
  return null;
}
