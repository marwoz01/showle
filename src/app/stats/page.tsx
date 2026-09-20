"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import {
  ChevronLeft,
  Trophy,
  Target,
  Flame,
  BarChart3,
  Loader2,
} from "@/components/ui/icons";
import GameHeatmap from "@/components/stats/GameHeatmap";
import experience from "@/i18n/experience";

interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  averageGuesses: number;
}

export default function StatsPage() {
  const { t, locale } = useTranslation();
  const { isSignedIn, isLoaded } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      return;
    }

    const ac = new AbortController();
    fetch("/api/user/stats", { signal: ac.signal, cache: "no-store" })
      .then((res) => { if (!res.ok) throw new Error("stats"); return res.json(); })
      .then((data) => { if (!ac.signal.aborted) setStats(data); })
      .catch(() => { if (!ac.signal.aborted) setError(true); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [isSignedIn, isLoaded, revision]);

  if (!isLoaded || (isSignedIn && loading)) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4">
        <BarChart3 size={48} className="text-muted" />
        <p className="text-muted">{t.auth.signIn}</p>
        <Link
          href="/sign-in"
          className="rounded-lg bg-accent-purple px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t.nav.login}
        </Link>
      </div>
    );
  }

  if (error) return <div role="alert" className="space-y-3 p-6 text-sm"><p>{t.common.genericError}</p>
    <button type="button" onClick={() => { setLoading(true); setError(false); setRevision((value) => value + 1); }} className="min-h-11 text-accent-purple">{t.common.tryAgain}</button></div>;

  const winRate = stats && stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const statCards = [
    {
      label: t.stats.gamesPlayed,
      value: stats?.gamesPlayed ?? 0,
      icon: Target,
    },
    {
      label: experience[locale].winRate,
      value: `${winRate}%`,
      icon: Trophy,
    },
    {
      label: t.stats.currentStreak,
      value: stats?.currentStreak ?? 0,
      icon: Flame,
    },
    {
      label: t.stats.bestStreak,
      value: stats?.maxStreak ?? 0,
      icon: Flame,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft size={16} />
          {t.game.back}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{t.nav.stats}</h1>
      </div>

      <GameHeatmap />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="soft-card rounded-xl p-5"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-purple/15 text-accent-purple">
              <card.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      {stats && stats.gamesPlayed > 0 && (
        <div className="soft-card rounded-xl p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {t.result.attempts}
          </h2>
          <p className="text-sm text-muted">
            {t.stats.averageGuesses(stats.averageGuesses)}
          </p>
        </div>
      )}
    </div>
  );
}
