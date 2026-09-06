"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clipboard } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { buildDuelInviteUrl, copyDuelInvite, shareDuelInvite } from "@/lib/duel-invite";
import { copySelectedDuelInvite, selectDuelInvite } from "@/lib/duel-invite-selection";

export default function DuelRoomInvite({ code }: { code: string }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "manual">("idle");
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    setUrl(buildDuelInviteUrl(window.location.origin, code));
    setCanShare(typeof navigator.share === "function" && window.isSecureContext);
    setStatus("idle");
  }, [code]);

  useEffect(() => {
    if (status !== "copied" && status !== "shared") return;
    const timer = setTimeout(() => setStatus("idle"), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  async function send(method: "copy" | "share") {
    if (!url || busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const fallback = () => copySelectedDuelInvite(input.current);
      const preferSelection = navigator.maxTouchPoints > 0 || status === "manual";
      const result = method === "copy"
        ? await copyDuelInvite(url, navigator, fallback, preferSelection)
        : await shareDuelInvite(url, t.duel.invitationTitle, navigator, fallback);
      setStatus(result === "cancelled" ? "idle" : result);
      if (result === "manual") {
        selectDuelInvite(input.current);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-4 text-left">
      <label htmlFor="duel-invite-link" className="block text-sm text-muted">
        {t.duel.invitationLink}
      </label>
      <input
        ref={input}
        id="duel-invite-link"
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        readOnly
        value={url}
        onFocus={(event) => selectDuelInvite(event.currentTarget)}
        onClick={(event) => selectDuelInvite(event.currentTarget)}
        aria-describedby="duel-invite-status"
        className="min-h-12 w-full min-w-0 select-text rounded-xl bg-white/5 px-4 text-base text-muted outline-accent-purple sm:text-sm"
      />
      <div className={`grid gap-3 ${canShare ? "sm:grid-cols-2" : ""}`}>
        <button
          type="button"
          disabled={!url || pending}
          onClick={() => void send("copy")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {status === "copied" ? <Check size={18} /> : <Clipboard size={18} />}
          {status === "copied" ? t.duel.copied : t.duel.copyInviteLink}
        </button>
        {canShare && (
          <button
            type="button"
            disabled={!url || pending}
            onClick={() => void send("share")}
            className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/15 disabled:opacity-50"
          >
            {t.duel.shareInvitation}
          </button>
        )}
      </div>
      <p id="duel-invite-status" role="status" className="min-h-5 text-center text-xs text-muted">
        {status === "manual" ? t.duel.copyInviteManually
          : status === "copied" ? t.duel.inviteLinkCopied
            : status === "shared" ? t.duel.inviteShared : ""}
      </p>
      <p className="text-center text-sm text-muted">
        {t.duel.inviteCode}: <span className="ml-2 font-mono font-semibold tracking-widest text-foreground">{code}</span>
      </p>
    </div>
  );
}
