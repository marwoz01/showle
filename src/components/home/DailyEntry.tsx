"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Clapperboard } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { getTodayKey } from "@/lib/game-date";
import type { DailyGameView } from "@/types/daily-game";

export default function DailyEntry() {
  const { t, locale } = useTranslation();
  const { isLoaded, userId } = useAuth();
  const [progress, setProgress] = useState<{
    owner: string;
    dateKey: string;
    status: string;
    attempts: number;
  } | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    const ac = new AbortController();
    const update = () => {
      try {
        const saved = JSON.parse(
          localStorage.getItem(`showle-progress:${userId ?? "guest"}`) ??
            "null",
        );
        if (saved?.dateKey === getTodayKey())
          setProgress({ ...saved, owner: userId ?? "guest" });
      } catch {
        /* Server state is used if browser storage is disabled. */
      }
      fetch(`/api/game/state?lang=${locale}`, {
        signal: ac.signal,
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((view: DailyGameView | null) => {
          if (view && !ac.signal.aborted)
            setProgress({
              owner: userId ?? "guest",
              dateKey: view.dateKey,
              status: view.status,
              attempts: view.guesses.length,
            });
        })
        .catch(() => {});
    };
    update();
    window.addEventListener("focus", update);
    window.addEventListener("game-progress", update);
    return () => {
      ac.abort();
      window.removeEventListener("focus", update);
      window.removeEventListener("game-progress", update);
    };
  }, [isLoaded, locale, userId]);
  const current =
    progress?.dateKey === getTodayKey() &&
    progress.owner === (userId ?? "guest")
      ? progress
      : null;
  const action =
    current && current.status !== "playing"
      ? experience[locale].viewResult
      : current?.attempts
        ? experience[locale].continueGame
        : t.modes.playChallenge;
  return (
    <Link
      href="/play/movie"
      className="soft-panel group relative flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-3xl p-7 sm:p-9"
    >
      <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-accent-purple/10 blur-3xl" />
      <div className="relative">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-purple/15">
            <Clapperboard className="text-accent-purple" size={22} idle />
          </div>
          <span className="rounded-md bg-accent-purple/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-purple">
            {experience[locale].dailyEyebrow}
          </span>
        </div>
        <h2 className="mb-3 text-3xl font-semibold sm:text-4xl">
          {t.modes.dailyMovie}
        </h2>
        <p className="max-w-lg text-sm leading-relaxed text-muted">
          {t.modes.dailyMovieDesc}
        </p>
      </div>
      <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white">
          {action}
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
