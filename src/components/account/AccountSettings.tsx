"use client";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { accountCopy } from "@/i18n/account";
import ConfirmModal from "@/components/collection/ConfirmModal";

export default function AccountSettings() {
  const { locale } = useTranslation();
  const copy = accountCopy[locale];
  const { openUserProfile } = useClerk();
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const button = "min-h-12 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-accent-purple hover:bg-white/5 disabled:opacity-50";
  async function download() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/user/data", { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(response.status === 429 ? "limit" : "failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "showle-data.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (issue) { setError(issue instanceof Error && issue.message === "limit" ? copy.rateLimit : copy.error); }
    finally { setBusy(false); }
  }
  async function clear() {
    const response = await fetch("/api/user/data", { method: "DELETE", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "clear-my-showle-data" }) });
    if (!response.ok) { setError(response.status === 429 ? copy.rateLimit : copy.error); return false; }
    try {
      if (user) {
        localStorage.removeItem(`showle-recommend-feedback:${user.id}`);
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("showle-") && key.includes(user.id)) localStorage.removeItem(key);
        }
      }
    } catch { /* The server has confirmed deletion even if local storage is blocked. */ }
    window.location.assign("/recommend");
    return true;
  }
  return <div className="mx-auto max-w-2xl space-y-6">
    <header><h1 className="text-3xl font-semibold">{copy.title}</h1><p className="mt-2 text-sm text-muted">{copy.description}</p></header>
    <section className="soft-card space-y-3 rounded-2xl p-6"><p className="text-sm text-muted">{copy.exportHint}</p>
      <button disabled={busy || !user} onClick={() => void download()} className={button}>{busy ? copy.exporting : copy.export}</button></section>
    <section className="soft-card space-y-3 rounded-2xl p-6"><p className="text-sm text-muted">{copy.manageHint}</p>
      <button disabled={!user} onClick={() => openUserProfile()} className={button}>{copy.manage}</button></section>
    <section className="soft-card space-y-3 rounded-2xl p-6"><p className="text-sm text-muted">{copy.clearHint}</p>
      <button disabled={busy || !user} onClick={() => setConfirm(true)} className={button}>{copy.clear}</button></section>
    {error && <p role="alert" className="text-sm text-muted">{error}</p>}
    {confirm && <ConfirmModal message={copy.confirm} onCancel={() => setConfirm(false)} onConfirm={clear} />}
  </div>;
}
