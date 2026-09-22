"use client";

import { useState } from "react";
import { Copy } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";

export default function FriendInvite({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  async function copy() {
    const url = `${window.location.origin}/profile?invite=${encodeURIComponent(slug)}`; setLink(url);
    try { await navigator.clipboard.writeText(url); setMessage(t.social.copied); }
    catch { setMessage(t.social.copyError); }
  }
  return <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6">
    <h2 className="font-display text-xl font-semibold">{t.social.invite}</h2><p className="max-w-3xl text-sm leading-relaxed text-muted">{t.social.inviteHint}</p>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 space-y-2 text-sm text-muted">{t.social.inviteCode}<input readOnly value={link || slug} onFocus={(event) => event.currentTarget.select()} className="block min-h-12 w-full rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-foreground" /></label><button onClick={() => void copy()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold"><Copy size={16} />{t.social.copyInvite}</button></div>
    {message && <p role="status" className="text-sm text-muted">{message}</p>}
  </section>;
}
