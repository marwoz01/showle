"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { changeRelationship, type SocialAction } from "@/components/profile/social/social-client";
import type { SocialPerson } from "@/types/social";

export default function SocialActions({ person, onChanged }: { person: SocialPerson; onChanged: (next: SocialPerson) => void }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const { relationship: relation } = person;
  async function act(action: SocialAction) {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setPending(true); setFailed(false);
    try {
      const next = await changeRelationship(person.publicSlug, action, controller.signal);
      if (!controller.signal.aborted) { setConfirm(false); onChanged(next); }
    } catch { if (!controller.signal.aborted) setFailed(true); }
    finally { if (!controller.signal.aborted) setPending(false); if (request.current === controller) request.current = null; }
  }
  const button = (action: SocialAction, primary = false) => <button key={action} disabled={pending} onClick={() => action === "remove" ? setConfirm(true) : void act(action)}
    className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50 ${primary ? "bg-accent-purple text-white" : "border border-white/10 hover:bg-white/5"}`}>{t.social[action]}</button>;
  if (relation.isSelf) return <p className="text-sm text-muted">{t.social.own}</p>;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {relation.friendship === "friends" && <span className="inline-flex items-center gap-1.5 text-sm text-match-exact"><Check size={16} />{t.social.friendsLabel}</span>}
      {relation.friendship === "outgoing" && <span className="text-sm text-muted">{t.social.pending}</span>}
      {relation.isFollowing && <span className="text-xs text-muted">{t.social.followingLabel}</span>}
      {relation.followsYou && <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-muted">{t.social.followsYou}</span>}
      {pending && <Loader2 size={16} aria-label={t.social.loading} className="animate-spin text-muted" />}
    </div>
    <div className="flex flex-wrap gap-2">
      {relation.friendship === "none" && button("request", true)}
      {relation.friendship === "incoming" && <>{button("accept", true)}{button("decline")}</>}
      {relation.friendship === "outgoing" && button("cancel")}
      {relation.friendship === "friends" && button("remove")}
      {(person.isPublic || relation.isFollowing) && button(relation.isFollowing ? "unfollow" : "follow")}
    </div>
    {confirm && <div className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-3"><p className="text-sm text-muted">{t.social.removeConfirm}</p><div className="flex flex-wrap gap-2"><button disabled={pending} onClick={() => void act("remove")} className="min-h-11 rounded-lg bg-accent-purple px-3 py-2 text-sm disabled:opacity-50">{t.social.confirmRemove}</button><button disabled={pending} onClick={() => setConfirm(false)} className="min-h-11 rounded-lg px-3 py-2 text-sm">{t.social.keep}</button></div></div>}
    {failed && <p role="alert" className="text-sm text-muted">{t.common.genericError}</p>}
  </div>;
}
