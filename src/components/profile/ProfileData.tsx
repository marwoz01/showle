"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import { Loader2, Trash2 } from "@/components/ui/icons";
import { profileMutation } from "@/lib/profile-client";
import { clearHigherLowerAccountStorage } from "@/lib/higher-lower-storage";
import { clearRecommendationAccountFeedback } from "@/lib/recommend-feedback-storage";

export default function ProfileData({ userId, onSaved }: { userId: string; onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  async function download(format: "csv" | "json") {
    if (pending) return;
    setPending(format); setMessage("");
    try {
      const response = await fetch(`/api/profile/export?format=${format}`, { cache: "no-store" });
      if (!response.ok) throw new Error("export");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `showle-${format === "csv" ? "collection" : "data"}.${format}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(t.profile.exported);
    } catch { setMessage(t.common.genericError); }
    finally { setPending(null); }
  }
  async function deleteData() {
    if (pending || confirmation !== t.profile.deleteWord) return;
    setPending("delete"); setMessage("");
    try {
      await profileMutation("/api/profile/data", { confirmation: "DELETE SHOWLE DATA" }, "DELETE");
      clearHigherLowerAccountStorage(userId);
      clearRecommendationAccountFeedback(userId);
      try { localStorage.removeItem(`showle-progress:${userId}`); } catch { /* Browser storage is optional. */ }
      window.dispatchEvent(new Event("game-progress"));
      window.dispatchEvent(new Event("game-completed"));
      setDeleting(false); setConfirmation("");
      await onSaved(); setMessage(t.profile.dataDeleted);
    } catch { setMessage(t.common.genericError); }
    finally { setPending(null); }
  }
  return <>
    <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.export}</h2><p className="text-sm text-muted">{t.profile.exportHint}</p>
      <div className="flex flex-wrap gap-3">{(["csv", "json"] as const).map((format) => <button key={format} disabled={pending !== null} onClick={() => void download(format)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/5 disabled:opacity-50">{pending === format && <Loader2 size={16} className="animate-spin" />}{format === "csv" ? t.profile.exportCsv : t.profile.exportJson}</button>)}</div>
    </section>
    <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6"><h2 className="font-display text-xl font-semibold">{t.profile.data}</h2><p className="max-w-3xl text-sm leading-relaxed text-muted">{t.profile.dataHint}</p>
      {deleting ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void deleteData(); }}><label className="block max-w-sm space-y-2 text-sm">{t.profile.deleteConfirmation}<input autoComplete="off" disabled={pending !== null} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="block min-h-12 w-full rounded-xl border border-white/10 bg-white/3 px-4 outline-accent-purple" /></label>
        <div className="flex flex-wrap gap-3"><button disabled={pending !== null || confirmation !== t.profile.deleteWord} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-match-miss/30 bg-match-miss/10 px-4 py-3 text-sm font-semibold text-match-miss disabled:opacity-40">{pending === "delete" ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}{t.profile.deleteData}</button><button type="button" disabled={pending !== null} onClick={() => { setDeleting(false); setConfirmation(""); }} className="min-h-11 rounded-xl bg-white/5 px-4 py-3 text-sm">{t.profile.cancel}</button></div>
      </form> : <button disabled={pending !== null} onClick={() => setDeleting(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-muted hover:text-foreground"><Trash2 size={16} />{t.profile.deleteData}</button>}
    </section>
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
  </>;
}
