"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, RefreshCw } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { loadSocial } from "@/components/profile/social/social-client";
import type { SocialActivity } from "@/types/social";

export default function SocialFeed({ slug, revision = 0 }: { slug?: string; revision?: number }) {
  const { t, locale } = useTranslation();
  const [activity, setActivity] = useState<SocialActivity[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void loadSocial<{ activity: SocialActivity[] }>(`/api/social/feed${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`, controller.signal)
      .then((data) => { if (!controller.signal.aborted) { setActivity(data.activity); setFailed(false); } })
      .catch(() => { if (!controller.signal.aborted) { setActivity(null); setFailed(true); } });
    return () => controller.abort();
  }, [slug, revision, retry]);
  return <section className="soft-card space-y-5 rounded-2xl p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{slug ? t.social.activity : t.social.feed}</h2>{!slug && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{t.social.feedHint}</p>}</div><button onClick={() => { setActivity(null); setFailed(false); setRetry((value) => value + 1); }} aria-label={t.social.refresh} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-muted hover:text-foreground"><RefreshCw size={17} /></button></div>
    {failed ? <p role="alert" className="text-sm text-muted">{t.common.genericError}</p> : !activity ? <p role="status" className="text-sm text-muted">{t.social.loading}</p> : !activity.length ? (slug ? <p className="text-sm text-muted">{t.social.unavailableActivity}</p> : null) :
      <ul className="divide-y divide-white/6">{activity.map((entry) => <li key={entry.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
        {entry.movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w92${entry.movie.posterPath}`} alt="" width={44} height={66} className="h-[66px] w-11 shrink-0 rounded-lg object-cover" /> : <div className="flex h-[66px] w-11 shrink-0 items-center justify-center rounded-lg bg-white/5"><Eye size={18} className="text-muted" /></div>}
        <div className="min-w-0 flex-1"><Link href={`/u/${entry.person.publicSlug}`} className="break-words text-sm font-medium text-accent-purple hover:underline">{entry.person.displayName}</Link><p className="mt-1 text-xs text-muted">{entry.kind === "rating" ? t.social.rated : t.social.watched}</p><h3 className="mt-1 break-words font-display text-sm font-semibold">{entry.movie.title}{entry.movie.year > 0 && <span className="ml-2 font-normal text-muted">{entry.movie.year}</span>}</h3><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">{entry.rating !== null && <span>{t.social.rating}: <strong className="font-medium text-foreground">{entry.rating}/10</strong></span>}<time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</time></div></div>
      </li>)}</ul>}
  </section>;
}
