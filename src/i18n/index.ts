"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import React from "react";
import { usePathname } from "next/navigation";
import pl from "./pl";
import en from "./en";
import { Translations } from "./types";

export type { Translations };

export type Locale = "pl" | "en";

const translations: Record<Locale, Translations> = { pl, en };

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "pl",
  t: pl,
  setLocale: () => {},
});

const STORAGE_KEY = "showle-locale";
const LOCALE_EVENT = "showle-locale-change";

function getStoredLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return saved && translations[saved] ? saved : "pl";
}

function subscribeToLocale(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCALE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCALE_EVENT, onStoreChange);
  };
}

export function I18nProvider({
  children,
  initialLocale = "pl",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const pathname = usePathname();
  const locale = useSyncExternalStore<Locale>(
    subscribeToLocale,
    getStoredLocale,
    () => initialLocale,
  );
  const t = translations[locale];

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.cookie = `${STORAGE_KEY}=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t.meta.title;
    document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t.meta.description);
  }, [locale, pathname, t]);

  const value: I18nContextValue = {
    locale,
    t,
    setLocale,
  };

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation() {
  return useContext(I18nContext);
}
