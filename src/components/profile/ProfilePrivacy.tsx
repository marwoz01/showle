"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Copy, ExternalLink, Loader2 } from "@/components/ui/icons";
import { profileMutation } from "@/lib/profile-client";
import type { ProfileDetails } from "@/types/profile";

export default function ProfilePrivacy({ profile, onSaved }: { profile: ProfileDetails; onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(profile.isPublic);
  const [activityVisibility, setActivityVisibility] = useState(profile.activityVisibility);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  async function save() {
    if (pending) return;
    setPending(true); setMessage("");
    try { await profileMutation("/api/profile", { isPublic: visible, activityVisibility }); await onSaved(); setMessage(t.profile.saved); }
    catch { setMessage(t.common.genericError); }
    finally { setPending(false); }
  }
  async function copy() {
    const url = `${window.location.origin}/u/${profile.publicSlug}`;
    setLink(url);
    try { await navigator.clipboard.writeText(url); setMessage(t.profile.copied); }
    catch { setMessage(t.profile.copyError); }
  }
  return <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.privacy}</h2>
    <p className="max-w-3xl text-sm leading-relaxed text-muted">{t.profile.privacyHint}</p>
    <p className="max-w-3xl text-sm leading-relaxed text-muted">{t.social.friendPrivacy}</p>
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm"><input type="checkbox" checked={visible} disabled={pending} onChange={(event) => setVisible(event.target.checked)} className="h-5 w-5 accent-accent-purple" />{t.profile.publicToggle}</label>
    <label className="block max-w-xl space-y-2 text-sm text-muted">{t.social.visibility}<select value={activityVisibility} disabled={pending} onChange={(event) => setActivityVisibility(event.target.value as typeof activityVisibility)} className="block min-h-12 w-full rounded-xl border border-white/10 bg-card px-3 py-3 text-sm text-foreground outline-accent-purple"><option value="private">{t.social.visibilityPrivate}</option><option value="friends">{t.social.visibilityFriends}</option><option value="public">{t.social.visibilityPublic}</option></select></label>
    <p className="max-w-3xl text-xs leading-relaxed text-muted">{t.social.visibilityHint}</p>
    <div className="flex flex-wrap gap-3"><button disabled={pending || (visible === profile.isPublic && activityVisibility === profile.activityVisibility)} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold disabled:opacity-50">{pending && <Loader2 size={16} className="animate-spin" />}{t.profile.savePrivacy}</button>
      {profile.isPublic && <><button onClick={() => void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm"><Copy size={16} />{t.profile.share}</button><Link href={`/u/${profile.publicSlug}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-3 text-sm text-accent-purple">{t.profile.viewPublic}<ExternalLink size={14} /></Link></>}
    </div>
    {profile.isPublic && link && <input aria-label={t.profile.share} readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-xl border border-white/8 bg-white/3 px-3 py-3 text-sm text-muted" />}
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
  </section>;
}
