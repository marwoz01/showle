"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import { Loader2 } from "@/components/ui/icons";
import { MOVIE_GENRES } from "@/constants/genres";
import { RECOMMENDATION_PROVIDERS } from "@/constants/recommendation";
import { localizeGenre } from "@/lib/localization";
import { profileMutation } from "@/lib/profile-client";
import { clearRecommendationAccountFeedback } from "@/lib/recommend-feedback-storage";
import type { ProfilePreferences } from "@/types/profile";

export default function ProfileTaste({ initial, onSaved, userId }: { initial: ProfilePreferences; onSaved: () => Promise<void>; userId: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(false);
  const chip = (selected: boolean) => `min-h-11 rounded-xl border px-4 py-2.5 text-sm transition-colors ${selected ? "border-accent-purple/30 bg-accent-purple/15 text-accent-purple" : "border-white/6 bg-white/3 text-muted hover:bg-white/8"}`;
  async function save() {
    if (pending) return;
    setPending(true); setMessage("");
    try { await profileMutation("/api/profile/preferences", value); await onSaved(); setMessage(t.profile.saved); }
    catch { setMessage(t.common.genericError); }
    finally { setPending(false); }
  }
  async function resetFeedback() {
    if (pending) return;
    setPending(true); setMessage("");
    try { await profileMutation("/api/profile/preferences", { action: "reset-feedback" }, "POST"); clearRecommendationAccountFeedback(userId); setReset(false); setMessage(t.profile.feedbackReset); }
    catch { setMessage(t.common.genericError); }
    finally { setPending(false); }
  }
  return <div className="space-y-6">
    <p className="max-w-3xl text-sm leading-relaxed text-muted">{t.profile.tasteHint}</p>
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={pending} className="soft-card rounded-2xl p-5 sm:p-6"><legend className="sr-only">{t.profile.platforms}</legend><h2 className="font-display text-xl font-semibold">{t.profile.platforms}</h2><p className="mt-2 text-sm text-muted">{t.profile.platformsHint}</p>
        <div className="mt-5 flex flex-wrap gap-2">{RECOMMENDATION_PROVIDERS.map((provider) => <button key={provider.id} type="button" aria-pressed={value.providerIds.includes(provider.id)} className={chip(value.providerIds.includes(provider.id))}
          onClick={() => setValue((previous) => ({ ...previous, providerIds: previous.providerIds.includes(provider.id) ? previous.providerIds.filter((id) => id !== provider.id) : [...previous.providerIds, provider.id] }))}>{provider.name}</button>)}</div>
      </fieldset>
      {(["genres", "excludedGenres"] as const).map((field) => <fieldset key={field} disabled={pending} className="soft-card rounded-2xl p-5 sm:p-6"><legend className="sr-only">{field === "genres" ? t.profile.likedGenres : t.profile.excludedGenres}</legend><h2 className="font-display text-xl font-semibold">{field === "genres" ? t.profile.likedGenres : t.profile.excludedGenres}</h2>
        <div className="mt-5 flex flex-wrap gap-2">{MOVIE_GENRES.map((genre) => <button key={genre} type="button" aria-pressed={value[field].includes(genre)} className={chip(value[field].includes(genre))} onClick={() => setValue((previous) => ({
          ...previous, [field]: previous[field].includes(genre) ? previous[field].filter((item) => item !== genre) : [...previous[field], genre],
          [field === "genres" ? "excludedGenres" : "genres"]: previous[field === "genres" ? "excludedGenres" : "genres"].filter((item) => item !== genre),
        }))}>{localizeGenre(genre, t)}</button>)}</div>
      </fieldset>)}
      <section className="soft-card rounded-2xl p-5 sm:p-6"><label className="block space-y-4 font-display text-lg font-semibold">{t.profile.runtime}<select disabled={pending} value={value.maxRuntime ?? ""} onChange={(event) => setValue((previous) => ({ ...previous, maxRuntime: event.target.value ? Number(event.target.value) : null }))} className="block min-h-12 w-full rounded-xl border border-white/8 bg-card px-4 text-sm font-normal outline-accent-purple sm:max-w-sm">
        <option value="">{t.profile.unlimited}</option>{[...new Set([60, 90, 120, 150, 180, 240, ...(value.maxRuntime ? [value.maxRuntime] : [])])].sort((a, b) => a - b).map((minutes) => <option key={minutes} value={minutes}>{t.profile.minutes(minutes)}</option>)}
      </select></label></section>
      <button disabled={pending} className="flex min-h-12 items-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold disabled:opacity-50">{pending && <Loader2 size={16} className="animate-spin" />}{t.profile.saveTaste}</button>
    </form>
    <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-lg font-semibold">{t.profile.feedback}</h2><p className="max-w-2xl text-sm leading-relaxed text-muted">{t.profile.feedbackHint}</p>
      {reset ? <div className="space-y-3"><p className="text-sm">{t.profile.resetFeedbackConfirm}</p><div className="flex flex-wrap gap-3"><button disabled={pending} onClick={() => void resetFeedback()} className="min-h-11 rounded-xl bg-accent-purple px-4 text-sm font-semibold disabled:opacity-50">{t.profile.resetFeedback}</button><button disabled={pending} onClick={() => setReset(false)} className="min-h-11 rounded-xl bg-white/5 px-4 text-sm">{t.profile.cancel}</button></div></div>
        : <button onClick={() => setReset(true)} disabled={pending} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm hover:bg-white/5">{t.profile.resetFeedback}</button>}
    </section>
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
  </div>;
}
