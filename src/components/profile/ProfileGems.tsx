"use client";

import { useEffect } from "react";
import { Award, CalendarDays, Flame, Gem, TrendingUp } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useGemWallet } from "@/hooks/useGemWallet";
import { BADGE_GEM_REWARDS, DAILY_PARTICIPATION_REWARD, HIGHER_LOWER_MILESTONES } from "@/constants/gems";
import { COIN_REWARDS, STREAK_MILESTONES, getWinReward } from "@/lib/coins";
import { MAX_ATTEMPTS } from "@/constants";
import type { GemTransaction } from "@/types/gems";

export default function ProfileGems() {
  const { t, locale } = useTranslation();
  const { wallet, loading, error, refresh } = useGemWallet();
  const number = new Intl.NumberFormat(locale);
  const badgeNames: Record<string, string> = {
    "first-film": t.profile.badgeFirst, "film-collector": t.profile.badgeCollector,
    "daily-first-win": t.profile.badgeDaily, "daily-streak-7": t.profile.badgeStreak,
    "year-expert": t.profile.badgeYear,
  };
  useEffect(() => {
    if (window.location.hash !== "#gems") return;
    const frame = requestAnimationFrame(() => document.getElementById("gems")?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, []);
  const transactionLabel = (transaction: GemTransaction) => {
    const [kind, value] = transaction.rewardKey?.split(":") ?? [];
    if (kind === "badge" && badgeNames[value]) return t.gems.badgeReward(badgeNames[value]);
    if (kind === "rated") return t.gems.ratingReward(Number(value));
    if (kind === "higher-lower") return t.gems.higherLowerReward(Number(value));
    if (transaction.reason === "win_reward") return t.gems.dailyReward;
    if (transaction.reason === "daily_participation_reward") return t.gems.participationReward;
    return t.gems.otherReward;
  };
  const badgeRewards = Object.values(BADGE_GEM_REWARDS).filter((amount) => amount > 0);
  const rules = [
    { icon: CalendarDays, title: t.gems.daily, hint: `${t.gems.dailyHint} ${t.gems.participation(DAILY_PARTICIPATION_REWARD)}`, amounts: [t.gems.dailyRange(getWinReward(MAX_ATTEMPTS), Math.max(...Object.values(COIN_REWARDS)))] },
    { icon: Award, title: t.gems.badges, hint: t.gems.badgesHint, amounts: [t.gems.badgeRange(Math.min(...badgeRewards), Math.max(...badgeRewards))] },
    { icon: Flame, title: t.gems.streak, hint: t.gems.streakHint, amounts: Object.entries(STREAK_MILESTONES).map(([target, amount]) => t.gems.milestone(Number(target), amount)) },
    { icon: TrendingUp, title: t.gems.higherLower, hint: t.gems.higherLowerHint, amounts: HIGHER_LOWER_MILESTONES.map(({ target, amount }) => t.gems.milestone(target, amount)) },
  ];
  return <section id="gems" aria-labelledby="gems-title" className="soft-card scroll-mt-24 overflow-hidden rounded-2xl lg:scroll-mt-8">
    <div className="flex flex-col gap-6 border-b border-white/6 bg-linear-to-br from-gem-blue/12 via-transparent to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-gem-blue/20 bg-gem-blue/10 text-gem-blue"><Gem size={30} strokeWidth={1.6} fill="currentColor" fillOpacity={0.13} aria-hidden="true" /></span>
        <div><h2 id="gems-title" className="font-display text-xl font-semibold">{t.gems.title}</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">{t.gems.intro}</p></div>
      </div>
      <div className="shrink-0 sm:text-right"><p className="text-xs text-muted">{t.gems.balance}</p><p className="mt-1 font-display text-4xl font-bold tabular-nums text-gem-blue" aria-live="polite">{wallet ? number.format(wallet.balance) : loading ? "…" : "?"}</p></div>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 px-5 pt-5 text-sm text-muted sm:px-6"><p>{t.gems.loadError}</p><button onClick={refresh} className="min-h-10 rounded-lg border border-white/10 px-3 text-foreground hover:bg-white/5">{t.common.tryAgain}</button></div>}
    <div className="grid gap-7 p-5 sm:p-6 xl:grid-cols-[1.4fr_1fr]">
      <div><h3 className="mb-4 font-display text-sm font-semibold">{t.gems.earn}</h3><ul className="space-y-4">{rules.map(({ icon: Icon, title, hint, amounts }) => <li key={title} className="flex gap-3"><Icon size={17} className="mt-0.5 shrink-0 text-gem-blue/80" aria-hidden="true" /><div className="min-w-0"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p><div className="mt-2 flex flex-wrap gap-1.5">{amounts.map((amount) => <span key={amount} className="rounded-md bg-gem-blue/8 px-2 py-1 text-[11px] font-medium tabular-nums text-gem-blue">{amount}</span>)}</div></div></li>)}</ul></div>
      <div><h3 className="mb-4 font-display text-sm font-semibold">{t.gems.recent}</h3>{wallet && (wallet.transactions.length ? <ul className="divide-y divide-white/6">{wallet.transactions.slice(0, 6).map((transaction) => <li key={transaction.id} className="flex items-start justify-between gap-3 py-3 first:pt-0"><div className="min-w-0"><p className="break-words text-sm">{transactionLabel(transaction)}</p><time dateTime={transaction.createdAt} className="mt-1 block text-xs text-muted">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(transaction.createdAt))}</time></div><span className="inline-flex shrink-0 items-center gap-1.5 font-display text-sm font-semibold tabular-nums text-gem-blue"><Gem size={13} aria-hidden="true" />+{number.format(transaction.amount)}</span></li>)}</ul> : <p className="text-sm leading-relaxed text-muted">{t.gems.empty}</p>)}{loading && <div role="status" className="space-y-4" aria-label={t.profile.loading}><div className="h-10 animate-pulse rounded-lg bg-white/5" /><div className="h-10 animate-pulse rounded-lg bg-white/5" /></div>}</div>
    </div>
  </section>;
}
