"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n";
import {
  ChevronLeft,
  Trophy,
  Target,
  Flame,
  BarChart3,
  Loader2,
} from "lucide-react";

interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  averageGuesses: number;
}

export default function StatsPage() {
  const { t } = useTranslation();
  const { data: session, status: authStatus } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session) {
      setLoading(false);
      return;
    }

    fetch("/api/user/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, authStatus]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4">
        <BarChart3 size={48} className="text-muted" />
        <p className="text-muted">{t.auth.signIn}</p>
        <Link
          href="/login"
          className="rounded-lg bg-accent-purple px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t.nav.login}
        </Link>
      </div>
    );
  }

  const winRate = stats && stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const statCards = [
    {
      label: t.result.attempts,
      value: stats?.gamesPlayed ?? 0,
      icon: Target,
    },
    {
      label: t.result.accuracy,
      value: `${winRate}%`,
      icon: Trophy,
    },
    {
      label: "Streak",
      value: stats?.currentStreak ?? 0,
      icon: Flame,
    },
    {
      label: "Max streak",
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/6 bg-card p-5"
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
        <div className="rounded-xl border border-white/6 bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {t.result.attempts}
          </h2>
          <p className="text-sm text-muted">
            Avg: {stats.averageGuesses} guesses per game
          </p>
        </div>
      )}
    </div>
  );
}
