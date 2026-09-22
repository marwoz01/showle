"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Check, Clock, Copy, Eye, Flame, Trophy, UserRound } from "@/components/ui/icons";
import ProfileMovieGrid from "@/components/profile/public/ProfileMovieGrid";
import ProfileComparison from "@/components/profile/public/ProfileComparison";
import { useTranslation } from "@/i18n";
import { publicProfileCopy } from "@/i18n/profile-public";
import type { PublicProfile } from "@/types/public-profile";
import PublicSocial from "@/components/profile/social/PublicSocial";
import SocialFeed from "@/components/profile/social/SocialFeed";

export default function PublicProfileView({ slug }: { slug: string }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { t } = useTranslation();
  if (!isLoaded) return <p role="status" className="py-10 text-sm text-muted">{t.social.loading}</p>;
  return <PublicProfileContent key={`${isSignedIn ? user?.id : "guest"}:${slug}`} slug={slug} />;
}

function PublicProfileContent({ slug }: { slug: string }) {
  const { locale, t } = useTranslation();
  const copy = publicProfileCopy[locale];
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [clipboard, setClipboard] = useState<"idle" | "copied" | "error">("idle");
  function refresh() { setProfile(null); setState("loading"); setRetry((value) => value + 1); }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/profiles/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 404) { setState("missing"); return; }
        if (!response.ok) throw new Error("Profile unavailable");
        const data = await response.json() as PublicProfile;
        if (!controller.signal.aborted) { setProfile(data); setState("ready"); }
      })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [slug, retry]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/u/${encodeURIComponent(slug)}`); setClipboard("copied"); }
    catch { setClipboard("error"); }
  }

  const stats = profile ? [
    { label: copy.watched, value: profile.watchedCount, Icon: Eye },
    { label: copy.hours, value: Math.round(profile.totalMinutes / 60), Icon: Clock },
    { label: copy.streak, value: profile.daily.currentStreak, Icon: Flame },
    { label: copy.best, value: profile.higherLowerBest, Icon: Trophy },
  ] : [];

  return <div className="mx-auto max-w-5xl space-y-8 py-4 sm:py-8">
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"><ArrowLeft size={17} />{copy.back}</Link>
    {state === "loading" && <div role="status" className="space-y-5"><p className="text-sm text-muted">{copy.loading}</p><div className="h-40 rounded-2xl bg-white/3 motion-safe:animate-pulse" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[0, 1, 2, 3].map((id) => <div key={id} className="aspect-2/3 rounded-xl bg-white/3 motion-safe:animate-pulse" />)}</div></div>}
    {(state === "missing" || state === "error") && <section className="rounded-2xl border border-white/8 bg-white/3 p-6 sm:p-10">
      <h1 className="font-display text-2xl font-bold">{state === "missing" ? copy.missing : copy.unavailable}</h1>
      {state === "missing" ? <p className="mt-3 text-sm text-muted">{copy.missingNote}</p>
        : <button onClick={() => { setState("loading"); setRetry((value) => value + 1); }} className="mt-5 min-h-11 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white">{copy.retry}</button>}
    </section>}
    {state === "missing" && <PublicSocial slug={slug} inviteOnly onChanged={refresh} />}
    {state === "ready" && profile && <>
      <header className="flex flex-col gap-5 rounded-2xl border border-white/8 bg-white/3 p-5 sm:flex-row sm:items-start sm:p-7">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-purple/15 text-accent-purple">
          {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={80} height={80} unoptimized className="h-full w-full object-cover" /> : <UserRound size={32} />}
        </div>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-accent-purple">{t.social.filmProfile}</p><h1 className="mt-2 break-words font-display text-3xl font-bold sm:text-4xl">{profile.displayName}</h1>
          {profile.bio && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{profile.bio}</p>}
        </div>
        <button onClick={copyLink} className="flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/5">{clipboard === "copied" ? <Check size={16} /> : <Copy size={16} />}{clipboard === "copied" ? copy.copied : copy.copyLink}</button>
      </header>
      {clipboard === "error" && <p role="alert" className="text-sm text-muted">{copy.copyError}</p>}
      <PublicSocial slug={slug} onChanged={refresh} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(({ label, value, Icon }) => <div key={label} className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5"><Icon size={18} className="mb-3 text-accent-purple" /><dd className="font-display text-2xl font-bold">{value.toLocaleString(locale)}</dd><dt className="mt-1 text-xs leading-relaxed text-muted">{label}</dt></div>)}</dl>
      <section><h2 className="mb-5 font-display text-xl font-semibold sm:text-2xl">{copy.favorites}</h2>{profile.favoriteMovies.length ? <ProfileMovieGrid movies={profile.favoriteMovies} /> : <p className="rounded-xl bg-white/3 p-5 text-sm text-muted">{copy.emptyFavorites}</p>}</section>
      <section><h2 className="mb-4 font-display text-xl font-semibold sm:text-2xl">{copy.badges}</h2>{profile.badges.length ? <ul className="flex flex-wrap gap-3">{profile.badges.map((badge) => <li key={badge.id} className="flex items-center gap-2 rounded-full border border-accent-purple/20 bg-accent-purple/10 px-4 py-2 text-sm text-foreground"><Trophy size={16} className="text-accent-purple" />{copy.badgeNames[badge.id]}</li>)}</ul> : <p className="text-sm text-muted">{copy.noBadges}</p>}</section>
      <ProfileComparison slug={slug} onPrivate={() => { setProfile(null); setState("missing"); }} />
      <SocialFeed slug={slug} revision={retry} />
    </>}
  </div>;
}
