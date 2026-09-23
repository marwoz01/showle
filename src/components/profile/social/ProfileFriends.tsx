"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { loadSocial } from "@/components/profile/social/social-client";
import FriendInvite from "@/components/profile/social/FriendInvite";
import FriendSearch from "@/components/profile/social/FriendSearch";
import SocialFeed from "@/components/profile/social/SocialFeed";
import SocialPersonCard from "@/components/profile/social/SocialPersonCard";
import type { SocialPerson, SocialSummary } from "@/types/social";

type List = "friends" | "requests" | "following" | "followers";

export default function ProfileFriends({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<SocialSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<List>("friends");
  const [initialCode] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("invite") ?? "");
  useEffect(() => {
    const controller = new AbortController();
    void loadSocial<SocialSummary>("/api/social", controller.signal)
      .then((next) => { if (!controller.signal.aborted) { setData(next); setFailed(false); } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [revision]);
  function refresh() { setRevision((value) => value + 1); }
  function changed(person: SocialPerson) {
    const update = (items: SocialPerson[]) => items.map((item) => item.publicSlug === person.publicSlug ? person : item);
    setData((current) => current ? { friends: update(current.friends), following: update(current.following), followers: update(current.followers), incoming: update(current.incoming), outgoing: update(current.outgoing) } : null);
    refresh();
  }
  const cards = (people: SocialPerson[]) => <div className="grid gap-3 sm:grid-cols-2">{people.map((person) => <SocialPersonCard key={person.publicSlug} person={person} onChanged={changed} />)}</div>;
  const counts = data ? { friends: data.friends.length, requests: data.incoming.length + data.outgoing.length, following: data.following.length, followers: data.followers.length } : null;
  const empty = { friends: t.social.emptyFriends, following: t.social.emptyFollowing, followers: t.social.emptyFollowers, requests: t.social.emptyRequests };
  const hasConnections = Boolean(data?.friends.length || data?.following.length);
  return <div className="space-y-6">
    <div><h2 className="font-display text-2xl font-semibold">{t.social.title}</h2><p className="mt-2 text-sm text-muted">{t.social.subtitle}</p></div>
    {hasConnections && <SocialFeed key={revision} revision={revision} />}
    <FriendInvite slug={slug} />
    <FriendSearch initialCode={initialCode} onChanged={refresh} />
    <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap gap-2">{(["friends", "requests", "following", "followers"] as const).map((value) => <button key={value} aria-pressed={list === value} onClick={() => setList(value)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium ${list === value ? "bg-accent-purple/15 text-accent-purple" : "bg-white/3 text-muted hover:text-foreground"}`}>{t.social[value]}{counts && <span className="ml-2 tabular-nums">{counts[value]}</span>}</button>)}</div>
      {failed && <div role="alert" className="space-y-3"><p className="text-sm text-muted">{t.common.genericError}</p><button onClick={refresh} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm">{t.common.tryAgain}</button></div>}
      {!data ? !failed && <p role="status" className="text-sm text-muted">{t.social.loading}</p> : list === "requests" ? <div className="space-y-6">
        {data.incoming.length > 0 && <div className="space-y-3"><h3 className="font-display font-semibold">{t.social.incoming}</h3>{cards(data.incoming)}</div>}
        {data.outgoing.length > 0 && <div className="space-y-3"><h3 className="font-display font-semibold">{t.social.outgoing}</h3>{cards(data.outgoing)}</div>}
        {!data.incoming.length && !data.outgoing.length && <p className="text-sm text-muted">{empty.requests}</p>}
      </div> : data[list].length ? cards(data[list]) : <p className="text-sm text-muted">{empty[list]}</p>}
    </section>
    {!hasConnections && data && <SocialFeed key={revision} revision={revision} />}
  </div>;
}
