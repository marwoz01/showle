"use client";

import { useEffect, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useTranslation } from "@/i18n";
import { loadSocial } from "@/components/profile/social/social-client";
import SocialPersonCard from "@/components/profile/social/SocialPersonCard";
import SocialActions from "@/components/profile/social/SocialActions";
import type { SocialPerson } from "@/types/social";

export default function PublicSocial({ slug, inviteOnly = false, onChanged }: { slug: string; inviteOnly?: boolean; onChanged: () => void }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { t } = useTranslation();
  if (!isLoaded) return null;
  if (!isSignedIn || !user) return <SignInButton mode="modal"><button className="min-h-11 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold">{t.social.signIn}</button></SignInButton>;
  return <PublicSocialSession key={`${user.id}:${slug}`} slug={slug} inviteOnly={inviteOnly} onChanged={onChanged} />;
}

function PublicSocialSession({ slug, inviteOnly, onChanged }: { slug: string; inviteOnly: boolean; onChanged: () => void }) {
  const { t } = useTranslation();
  const [person, setPerson] = useState<SocialPerson | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void loadSocial<{ person: SocialPerson }>(`/api/social/relationship?slug=${encodeURIComponent(slug)}`, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setPerson(result.person); setFailed(false); } })
      .catch((error: unknown) => { if (!controller.signal.aborted && !(error instanceof Error && error.message === "404")) setFailed(true); });
    return () => controller.abort();
  }, [slug, revision]);
  function changed(next: SocialPerson) { setPerson(next); onChanged(); }
  if (failed) return <div className="space-y-3"><p role="alert" className="text-sm text-muted">{t.common.genericError}</p><button onClick={() => setRevision((value) => value + 1)} className="min-h-11 rounded-xl border border-white/10 px-4 py-2 text-sm">{t.common.tryAgain}</button></div>;
  if (!person) return null;
  return inviteOnly ? <SocialPersonCard person={person} onChanged={changed} /> : <SocialActions person={person} onChanged={changed} />;
}
