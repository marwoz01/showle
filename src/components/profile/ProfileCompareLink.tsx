"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { Sparkles } from "@/components/ui/icons";
import { friendSlug, loadSocial } from "@/components/profile/social/social-client";
import ProfileComparison from "@/components/profile/public/ProfileComparison";
import type { SocialPerson, SocialSummary } from "@/types/social";

export default function ProfileCompareLink() {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState("");
  const [friends, setFriends] = useState<SocialPerson[]>([]);
  const [friendsFailed, setFriendsFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [target, setTarget] = useState<{ slug: string; attempt: number } | null>(null);
  const [error, setError] = useState<"invalid" | "private" | null>(null);
  const onPrivate = useCallback(() => { setTarget(null); setError("private"); }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSocial<SocialSummary>("/api/social", controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setFriends(data.friends); setFriendsFailed(false); } })
      .catch(() => { if (!controller.signal.aborted) setFriendsFailed(true); });
    return () => controller.abort();
  }, [retry]);

  function compare(slug: string) {
    setError(null);
    setTarget((previous) => ({ slug, attempt: (previous?.attempt ?? 0) + 1 }));
  }

  return <section className="soft-card space-y-6 rounded-2xl p-5 sm:p-6">
    <div className="flex items-start gap-3 sm:gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple"><Sparkles size={22} aria-hidden="true" /></span>
      <div><h2 className="font-display text-xl font-semibold">{t.profile.compare}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t.profile.compareHint}</p></div>
    </div>
    <div className="max-w-2xl space-y-4">
      {friends.length > 0 && <label className="block space-y-2 text-sm text-muted">{t.profile.chooseFriend}
        <select value={selected} onChange={(event) => {
          const slug = event.target.value;
          setSelected(slug); setValue(""); setError(null);
          if (slug) compare(slug); else setTarget(null);
        }} className="block min-h-12 w-full rounded-xl border border-white/10 bg-card px-3 text-base text-foreground outline-accent-purple sm:text-sm">
          <option value="">{t.profile.chooseFriend}</option>
          {friends.map((friend) => <option key={friend.publicSlug} value={friend.publicSlug}>{friend.displayName}</option>)}
        </select>
      </label>}
      {friendsFailed && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-muted"><p>{t.common.genericError}</p><button onClick={() => { setFriendsFailed(false); setRetry((count) => count + 1); }} className="min-h-11 text-accent-purple hover:underline">{t.common.tryAgain}</button></div>}
      <form className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end" onSubmit={(event) => {
        event.preventDefault();
        const slug = friendSlug(value, window.location.origin);
        if (!slug) { setTarget(null); setError("invalid"); return; }
        setSelected(""); compare(slug);
      }}>
        <label className="block min-w-0 flex-1 space-y-2 text-sm text-muted">{friends.length ? t.profile.compareByLink : t.profile.friendLink}
          <input value={value} onChange={(event) => { setValue(event.target.value); setSelected(""); setTarget(null); setError(null); }} maxLength={250} className="block min-h-12 w-full rounded-xl border border-white/8 bg-white/3 px-3 text-base text-foreground outline-accent-purple sm:text-sm" />
        </label>
        <button className="min-h-12 shrink-0 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent-purple/85 disabled:opacity-50" disabled={!value.trim()}>{t.profile.compareAction}</button>
      </form>
    </div>
    {error && <p role="alert" className="text-sm text-muted">{error === "invalid" ? t.profile.invalidLink : t.profile.compareUnavailable}</p>}
    {target && <ProfileComparison key={`${target.slug}:${target.attempt}`} slug={target.slug} onPrivate={onPrivate} autoCompare embedded />}
  </section>;
}
