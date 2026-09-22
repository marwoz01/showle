"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Bookmark, Clock, Eye, Flame, Star, Trophy } from "@/components/ui/icons";
import { localizeGenre } from "@/lib/localization";
import { normalizeDisplayText } from "@/lib/typography";
import type { ProfileResponse } from "@/types/profile";
import ProfileFavorites from "@/components/profile/ProfileFavorites";
import ProfileBadges from "@/components/profile/ProfileBadges";
import ProfileCompareLink from "@/components/profile/ProfileCompareLink";

export default function ProfileOverview({ data, onSaved }: { data: ProfileResponse; onSaved: () => Promise<void> }) {
  const { t, locale } = useTranslation();
  const { summary, activity } = data;
  const number = new Intl.NumberFormat(locale);
  const cards = [
    { label: t.profile.watched, value: number.format(summary.watchedCount), icon: Eye, href: "/collection?tab=watched" },
    { label: t.profile.watchlist, value: number.format(summary.watchlistCount), icon: Bookmark, href: "/collection?tab=watchlist" },
    { label: t.profile.watchTime, value: number.format(Math.round(summary.totalMinutes / 60)), icon: Clock, href: "/collection?tab=watched" },
    { label: t.profile.averageRating, value: summary.averageRating === null ? "-" : number.format(Math.round(summary.averageRating * 10) / 10), icon: Star, href: "/collection?tab=watched" },
  ];
  return <>
    <div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map((card) => <Link key={card.label} href={card.href} className="soft-card rounded-2xl p-5 transition-colors hover:border-accent-purple/30"><card.icon size={20} className="mb-4 text-accent-purple" /><p className="font-display text-3xl font-bold">{card.value}</p><p className="mt-2 text-xs text-muted">{card.label}</p></Link>)}</div><p className="mt-3 text-xs text-muted">{t.profile.timeHint}</p></div>
    <ProfileFavorites movies={data.profile.favoriteMovies} onSaved={onSaved} />
    <section className="soft-card rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.genreTitle}</h2>
      {summary.favoriteGenres.length ? <div className="mt-5 flex flex-wrap gap-2">{summary.favoriteGenres.slice(0, 5).map(({ genre, count }) => <span key={genre} className="rounded-full bg-accent-purple/10 px-4 py-2 text-sm text-accent-purple">{localizeGenre(genre, t)} <span className="ml-1 text-muted">{count}</span></span>)}</div> : <p className="mt-3 text-sm text-muted">{t.profile.noGenres}</p>}
    </section>
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t.profile.games}</h2><Link href="/stats" className="text-sm text-accent-purple hover:underline">{t.profile.allStats}</Link></div>
      <div className="grid gap-4 lg:grid-cols-3"><div className="soft-card rounded-2xl p-6 lg:col-span-2"><div className="mb-6 flex items-center gap-3"><Flame className="text-accent-purple" size={22} /><h3 className="font-display text-lg font-semibold">{t.profile.daily}</h3></div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{[
          [t.profile.streak, summary.daily.currentStreak], [t.profile.bestStreak, summary.daily.maxStreak],
          [t.profile.winRate, `${summary.daily.gamesPlayed ? Math.round(summary.daily.gamesWon / summary.daily.gamesPlayed * 100) : 0}%`], [t.profile.dailyPlayed, summary.daily.gamesPlayed],
        ].map(([label, value]) => <div key={label}><p className="font-display text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-muted">{label}</p></div>)}</div></div>
        <div className="soft-card rounded-2xl p-6"><div className="mb-5 flex items-center gap-3"><Trophy size={22} className="text-accent-purple" /><h3 className="font-display text-lg font-semibold">{t.profile.higherLower}</h3></div><p className="font-display text-3xl font-bold">{summary.higherLowerBest}</p><p className="mt-2 text-xs text-muted">{t.profile.bestScore}</p><Link href="/play/higher-lower" className="mt-4 inline-block text-sm text-accent-purple hover:underline">{t.profile.play}</Link></div>
      </div>
    </section>
    <ProfileBadges badges={data.badges} />
    <div className="grid gap-6 lg:grid-cols-2"><section className="soft-card rounded-2xl p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{t.profile.activity}</h2><Link href="/history" className="text-xs text-accent-purple hover:underline">{t.profile.allHistory}</Link></div>
      {!activity.length ? <p className="text-sm text-muted">{t.profile.noActivity}</p> : <ul className="divide-y divide-white/6">{activity.slice(0, 6).map((item) => <li key={`${item.kind}-${item.id}`} className="py-3 first:pt-0"><p className="text-xs text-muted">{item.kind === "game" ? (item.won ? t.profile.activityWon : t.profile.activityLost) : item.kind === "rating" ? t.profile.activityRating : item.kind === "watched" ? t.profile.activityWatched : t.profile.activityWatchlist}</p><p className="mt-1 text-sm font-medium break-words">{normalizeDisplayText(item.title)}{item.rating != null && <span className="ml-2 text-accent-purple">{item.rating}/10</span>}</p><time dateTime={item.date} className="mt-1 block text-xs text-muted">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.date))}</time></li>)}</ul>}
    </section><ProfileCompareLink /></div>
  </>;
}
