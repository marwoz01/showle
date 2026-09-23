"use client";

import { useTranslation } from "@/i18n";
import { Check, Lock } from "@/components/ui/icons";
import ProfileBadgeEmblem, { BADGE_APPEARANCE } from "@/components/profile/ProfileBadgeEmblem";
import type { ProfileBadge } from "@/types/profile";
import { Gem } from "lucide-react";
import { BADGE_GEM_REWARDS } from "@/constants/gems";
import { useGemWallet } from "@/hooks/useGemWallet";

export default function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  const { t } = useTranslation();
  const { wallet } = useGemWallet();
  const labels = {
    "first-film": [t.profile.badgeFirst, t.profile.badgeFirstHint],
    "film-collector": [t.profile.badgeCollector, t.profile.badgeCollectorHint],
    "daily-first-win": [t.profile.badgeDaily, t.profile.badgeDailyHint],
    "daily-streak-7": [t.profile.badgeStreak, t.profile.badgeStreakHint],
    "year-expert": [t.profile.badgeYear, t.profile.badgeYearHint],
  };
  return <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6">
    <div><h2 className="font-display text-xl font-semibold">{t.profile.badges}</h2><p className="mt-2 text-sm text-muted">{t.profile.badgeHint}</p></div>
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {badges.map((badge) => {
        const appearance = BADGE_APPEARANCE[badge.id];
        const progress = Math.max(0, Math.min(badge.progress, badge.target));
        const credited = wallet?.earnedRewardKeys.includes(`badge:${badge.id}`);
        return <li key={badge.id} className={`rounded-2xl border bg-linear-to-br to-card p-4 ${badge.unlocked ? appearance.surface : "border-white/8 from-white/3"}`}>
          <div className="flex items-center gap-3">
            <ProfileBadgeEmblem id={badge.id} unlocked={badge.unlocked} />
            <div className="min-w-0"><h3 className="font-display text-sm font-semibold">{labels[badge.id][0]}</h3><p className="mt-1 text-xs leading-relaxed text-muted">{labels[badge.id][1]}</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-xs"><span className={`inline-flex items-center gap-1.5 ${badge.unlocked ? appearance.accent : "text-muted"}`}>{badge.unlocked ? <Check size={13} /> : <Lock size={12} />}{badge.unlocked ? t.profile.unlocked : t.profile.locked}</span><span className="tabular-nums text-muted">{progress} / {badge.target}</span></div>
          <progress aria-label={labels[badge.id][0]} max={badge.target} value={progress} className={`mt-2 h-1 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-white/6 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-current [&::-moz-progress-bar]:bg-current ${badge.unlocked ? appearance.accent : "text-muted/45"}`} />
          {BADGE_GEM_REWARDS[badge.id] > 0 && <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gem-blue/8 px-2.5 py-1.5 text-xs text-gem-blue"><Gem size={13} aria-hidden="true" /><span className="font-semibold tabular-nums">+{BADGE_GEM_REWARDS[badge.id]}</span><span className="ml-1">{credited ? t.gems.credited : t.gems.reward}</span></div>}
        </li>;
      })}
    </ul>
  </section>;
}
