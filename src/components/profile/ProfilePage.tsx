"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { ExternalLink, Loader2, Lock, User } from "@/components/ui/icons";
import type { ProfileResponse } from "@/types/profile";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileTaste from "@/components/profile/ProfileTaste";
import ProfileSettings from "@/components/profile/ProfileSettings";
import ProfileFriends from "@/components/profile/social/ProfileFriends";

type Tab = "overview" | "taste" | "friends" | "settings";

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { t } = useTranslation();
  if (!isLoaded) return <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-muted"><Loader2 className="animate-spin" />{t.profile.loading}</div>;
  if (!isSignedIn || !user) return <div className="flex min-h-72 flex-col items-center justify-center gap-5"><User size={36} className="text-accent-purple" /><p>{t.profile.login}</p><Link className="rounded-xl bg-accent-purple px-5 py-3 font-semibold" href="/sign-in">{t.auth.signIn}</Link></div>;
  return <ProfileWorkspace key={user.id} userId={user.id} avatarVersion={user.imageUrl} />;
}

function ProfileWorkspace({ userId, avatarVersion }: { userId: string; avatarVersion: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>(() => typeof window !== "undefined" && window.location.hash !== "#gems" && new URLSearchParams(window.location.search).has("invite") ? "friends" : "overview");
  const tabId = useId();
  useEffect(() => {
    let frame: number | undefined;
    const openGems = (event: Event) => {
      if (event.type !== "showle-open-gems" && window.location.hash !== "#gems") return;
      setTab("overview");
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => document.getElementById("gems")?.scrollIntoView({ block: "start" }));
    };
    window.addEventListener("hashchange", openGems);
    window.addEventListener("showle-open-gems", openGems);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openGems);
      window.removeEventListener("showle-open-gems", openGems);
    };
  }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/profile", { cache: "no-store", signal });
    if (!response.ok) throw new Error("profile");
    const next: ProfileResponse = await response.json();
    if (signal?.aborted) return;
    setData(next);
    setFailed(false);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => load(controller.signal)).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [load, avatarVersion]);
  const refresh = async () => { try { await load(); } catch (error) { setFailed(true); throw error; } };

  if (!data) return <div role={failed ? "alert" : "status"} className="flex min-h-72 flex-col items-center justify-center gap-4 text-muted">
    {failed ? <><p>{t.common.genericError}</p><button onClick={() => void load().catch(() => setFailed(true))} className="rounded-xl bg-white/5 px-5 py-3 text-foreground">{t.common.tryAgain}</button></>
      : <><Loader2 size={24} className="animate-spin" />{t.profile.loading}</>}
  </div>;

  const { profile } = data;
  return (
    <div className="relative mx-auto max-w-6xl space-y-7 pb-8">
      <header className="soft-card rounded-2xl p-5 sm:p-8">
        <p className="mb-6 text-xs font-medium text-muted">{t.profile.title}</p>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {profile.avatarUrl ? (
            // Clerk hosts user-uploaded avatars; no Next image proxy is needed.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" width={80} height={80} className="h-20 w-20 rounded-2xl border border-white/10 object-cover" />
          ) : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple"><User size={32} /></div>}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-bold break-words sm:text-4xl">{profile.displayName || t.profile.emptyName}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-muted"><Lock size={12} />{profile.isPublic ? t.profile.public : t.profile.private}</span>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed break-words text-muted">{profile.bio || t.profile.subtitle}</p>
          </div>
          <button onClick={() => setTab("settings")} className="min-h-11 shrink-0 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/5">{t.profile.edit}</button>
        </div>
        {profile.isPublic && <Link href={`/u/${profile.publicSlug}`} className="mt-5 inline-flex items-center gap-2 text-sm text-accent-purple hover:underline">{t.profile.viewPublic}<ExternalLink size={14} /></Link>}
      </header>
      <div role="tablist" aria-label={t.profile.title} className="grid grid-cols-2 gap-1 rounded-xl border border-white/6 bg-white/3 p-1 sm:grid-cols-4">
        {(["overview", "taste", "friends", "settings"] as const).map((value, index, tabs) => <button key={value} id={`${tabId}-${value}-tab`} role="tab" aria-selected={tab === value} aria-controls={`${tabId}-${value}-panel`} tabIndex={tab === value ? 0 : -1}
          onClick={() => setTab(value)} onKeyDown={(event) => {
            const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : null;
            if (next) { event.preventDefault(); setTab(next); document.getElementById(`${tabId}-${next}-tab`)?.focus(); }
          }} className={`min-h-12 rounded-lg px-1 py-3 text-xs font-semibold transition-colors sm:px-2 sm:text-sm ${tab === value ? "bg-accent-purple/15 text-accent-purple" : "text-muted hover:bg-white/5 hover:text-foreground"}`}>{value === "friends" ? t.social.title : t.profile[value]}</button>)}
      </div>
      {failed && <p role="alert" className="text-sm text-muted">{t.common.genericError}</p>}
      <div role="tabpanel" id={`${tabId}-${tab}-panel`} aria-labelledby={`${tabId}-${tab}-tab`} className="space-y-6">
        {tab === "overview" && <ProfileOverview data={data} onSaved={refresh} />}
        {tab === "taste" && <ProfileTaste key={profile.publicSlug} userId={userId} initial={profile.preferences} onSaved={refresh} />}
        {tab === "friends" && <ProfileFriends key={profile.publicSlug} slug={profile.publicSlug} />}
        {tab === "settings" && <ProfileSettings key={profile.publicSlug} profile={profile} userId={userId} onSaved={refresh} />}
      </div>
    </div>
  );
}
