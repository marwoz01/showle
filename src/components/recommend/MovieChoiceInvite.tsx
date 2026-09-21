"use client";

import { useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { movieChoiceRoomCopy } from "@/i18n/movie-choice-room";
import { copyDuelInvite, shareDuelInvite } from "@/lib/duel-invite";
import { Check, Copy, ExternalLink } from "@/components/ui/icons";

export default function MovieChoiceInvite({ code }: { code: string }) {
  const { locale } = useTranslation();
  const c = movieChoiceRoomCopy[locale];
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<"copied" | "manual" | "shared" | "cancelled" | "">("");
  // This component only mounts once a browser has joined a room.
  const link = typeof window === "undefined" ? "" : new URL(`/recommend/together?code=${code}`, window.location.origin).href;
  const fallback = () => {
    input.current?.focus(); input.current?.select();
    return document.execCommand("copy");
  };
  const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium hover:bg-white/10 focus-visible:outline-accent-purple";
  async function copy() {
    const next = await copyDuelInvite(link, navigator, fallback, window.matchMedia("(pointer: coarse)").matches);
    if (next === "manual") { input.current?.focus(); input.current?.select(); }
    setResult(next);
  }
  async function share() {
    const next = await shareDuelInvite(link, c.title, navigator, fallback);
    if (next === "manual") { input.current?.focus(); input.current?.select(); }
    setResult(next);
  }
  return (
    <section className="soft-card space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-md">
          <h2 className="font-display text-lg font-semibold">{c.inviteTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{c.inviteHelp}</p>
        </div>
        <div className="rounded-xl bg-accent-purple/10 px-5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">{c.code}</p>
          <p className="select-all font-display text-2xl font-semibold tracking-[0.2em] text-accent-purple" data-room-code>{code}</p>
        </div>
      </div>
      <label className="block text-xs text-muted">
        {c.inviteLink}
        <input ref={input} readOnly value={link} onFocus={event => event.currentTarget.select()}
          className="mt-2 min-h-11 w-full min-w-0 rounded-xl bg-white/5 px-3 text-base text-foreground outline-accent-purple sm:text-sm" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => void copy()}>{result === "copied" ? <Check size={16} /> : <Copy size={16} />}{result === "copied" ? c.copied : c.copy}</button>
        <button type="button" className={buttonClass} onClick={() => void share()}><ExternalLink size={16} />{c.share}</button>
      </div>
      <p role="status" className="text-xs text-muted">{result === "manual" ? c.manualCopy : result === "copied" ? c.copied : ""}</p>
    </section>
  );
}
