"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import React from "react";
import { useRouter } from "next/navigation";
import pl from "./pl";
import en from "./en";
import { Translations } from "./types";
import { createLocalePreference } from "@/lib/locale-preference";

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
const localePreference = createLocalePreference();

function persistLocaleCookie(locale: Locale) {
  try { document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`; }
  catch { /* Embedded/private browsing can block cookies while the current tab still works. */ }
}

function subscribeToLocale(onStoreChange: () => void) {
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    localePreference.external(event.newValue);
    onStoreChange();
  };
  window.addEventListener("storage", storageChanged);
  window.addEventListener(LOCALE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", storageChanged);
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
  const router = useRouter();
  const getStoredLocale = useCallback(() => localePreference.read(() => localStorage.getItem(STORAGE_KEY), initialLocale), [initialLocale]);
  const locale = useSyncExternalStore<Locale>(
    subscribeToLocale,
    getStoredLocale,
    () => initialLocale,
  );
  const t = translations[locale];

  const setLocale = useCallback((newLocale: Locale) => {
    localePreference.set(newLocale, (value) => localStorage.setItem(STORAGE_KEY, value));
    persistLocaleCookie(newLocale);
    window.dispatchEvent(new Event(LOCALE_EVENT));
    router.refresh();
  }, [router]);

  useEffect(() => {
    document.documentElement.lang = locale;
    persistLocaleCookie(locale);
  }, [locale]);

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
