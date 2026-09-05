"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useSyncExternalStore } from "react";
import en from "@/i18n/en";
import pl from "@/i18n/pl";

function readLocale() {
  return localStorage.getItem("showle-locale") === "en" ? "en" : "pl";
}

function subscribe() {
  return () => {};
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const locale = useSyncExternalStore(subscribe, readLocale, () => "pl");
  const t = locale === "en" ? en : pl;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body style={{ background: "#101012", color: "#f0f0f5", fontFamily: "system-ui" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {t.common.genericError}
          </h2>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#f0f0f5",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {t.common.tryAgain}
          </button>
        </div>
      </body>
    </html>
  );
}
