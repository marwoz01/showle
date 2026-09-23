"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { Loader2 } from "@/components/ui/icons";
import { profileMutation } from "@/lib/profile-client";
import { accountLocaleWriter } from "@/lib/account-locale-writer";
import type { ProfileDetails } from "@/types/profile";
import ProfilePrivacy from "@/components/profile/ProfilePrivacy";
import ProfileData from "@/components/profile/ProfileData";

export default function ProfileSettings({ profile, userId, onSaved }: { profile: ProfileDetails; userId: string; onSaved: () => Promise<void> }) {
  const { t, locale, setLocale } = useTranslation();
  const { openUserProfile } = useClerk();
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function saveIdentity() {
    if (pending) return;
    setPending(true); setMessage("");
    try { await profileMutation("/api/profile", { displayName: name.trim(), bio: bio.trim() }); await onSaved(); setMessage(t.profile.saved); }
    catch { setMessage(t.common.genericError); }
    finally { setPending(false); }
  }
  async function language(next: "pl" | "en") {
    if (pending) return;
    setPending(true); setMessage("");
    try {
      setLocale(next);
      // AccountLocaleSync sees the same change; the shared writer reuses its job.
      if (await accountLocaleWriter.save(userId, next)) await onSaved();
    }
    catch { setMessage(t.common.genericError); }
    finally { setPending(false); }
  }
  const inputClass = "block min-h-12 w-full rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-base text-foreground outline-accent-purple sm:text-sm";
  return <div className="space-y-6">
    <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.identity}</h2><p className="text-sm text-muted">{t.profile.identityHint}</p>
      <form className="max-w-2xl space-y-5" onSubmit={(event) => { event.preventDefault(); void saveIdentity(); }}><label className="block space-y-2 text-sm text-muted">{t.profile.displayName}<input required maxLength={40} disabled={pending} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="block space-y-2 text-sm text-muted">{t.profile.bio}<textarea maxLength={280} rows={3} disabled={pending} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={t.profile.bioPlaceholder} className={`${inputClass} resize-y`} /></label>
        <button disabled={pending || !name.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold disabled:opacity-50">{pending && <Loader2 size={16} className="animate-spin" />}{t.profile.save}</button>
      </form>
    </section>
    <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.account}</h2><button onClick={() => openUserProfile({ appearance: { variables: { colorBackground: "var(--color-card)" }, elements: { card: "!bg-card" } } })} className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5">{t.profile.manageAccount}</button></section>
    <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.language}</h2><div className="inline-flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">{(["pl", "en"] as const).map((value) => <button key={value} disabled={pending} aria-pressed={locale === value} onClick={() => void language(value)} className={`min-h-11 rounded-lg px-5 py-2 text-sm font-medium ${locale === value ? "bg-accent-purple/15 text-accent-purple" : "text-muted hover:bg-white/5"}`}>{t.lang[value]}</button>)}</div></section>
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
    <ProfilePrivacy profile={profile} onSaved={onSaved} />
    <ProfileData userId={userId} onSaved={onSaved} />
  </div>;
}
