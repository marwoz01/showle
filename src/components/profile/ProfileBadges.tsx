"use client";

import { useTranslation } from "@/i18n";
import { Check, Lock, Trophy } from "@/components/ui/icons";
import type { ProfileBadge } from "@/types/profile";

export default function ProfileBadges({ badges }: { badges: ProfileBadge[] }) {
  const { t } = useTranslation();
  const labels = {
    "first-film": [t.profile.badgeFirst, t.profile.badgeFirstHint],
    "film-collector": [t.profile.badgeCollector, t.profile.badgeCollectorHint],
    "daily-first-win": [t.profile.badgeDaily, t.profile.badgeDailyHint],
    "daily-streak-7": [t.profile.badgeStreak, t.profile.badgeStreakHint],
    "year-expert": [t.profile.badgeYear, t.profile.badgeYearHint],
  };
  return <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6">
    <div><h2 className="font-display text-xl font-semibold">{t.profile.badges}</h2><p className="mt-2 text-sm text-muted">{t.profile.badgeHint}</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => <div key={badge.id} className={`rounded-xl border p-4 ${badge.unlocked ? "border-accent-purple/30 bg-accent-purple/10" : "border-white/6 bg-white/3"}`}>
        <div className="mb-3 flex items-center gap-3"><Trophy size={20} className={badge.unlocked ? "text-accent-purple" : "text-muted/50"} /><h3 className="font-display text-sm font-semibold">{labels[badge.id][0]}</h3></div>
        <p className="min-h-10 text-xs leading-relaxed text-muted">{labels[badge.id][1]}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted"><span className="inline-flex items-center gap-1.5">{badge.unlocked ? <Check size={12} /> : <Lock size={12} />}{badge.unlocked ? t.profile.unlocked : t.profile.locked}</span><span>{Math.min(badge.progress, badge.target)} / {badge.target}</span></div>
        <progress aria-label={labels[badge.id][0]} max={badge.target} value={Math.min(badge.progress, badge.target)} className="mt-3 h-1.5 w-full overflow-hidden rounded-full accent-accent-purple" />
      </div>)}
    </div>
  </section>;
}
