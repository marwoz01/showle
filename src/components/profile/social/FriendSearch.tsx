"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import { friendSlug, loadSocial } from "@/components/profile/social/social-client";
import SocialPersonCard from "@/components/profile/social/SocialPersonCard";
import type { SocialPerson } from "@/types/social";

export default function FriendSearch({ initialCode, onChanged }: { initialCode: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<SocialPerson[] | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [person, setPerson] = useState<SocialPerson | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void loadSocial<{ people: SocialPerson[] }>(`/api/social/search?q=${encodeURIComponent(query.trim())}`, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setPeople(result.people); })
        .catch(() => { if (!controller.signal.aborted) setSearchFailed(true); });
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  async function findCode() {
    const slug = friendSlug(code, window.location.origin);
    request.current?.abort(); setPerson(null); setMessage("");
    if (!slug) { setPending(false); setMessage(t.social.invalidCode); return; }
    const controller = new AbortController(); request.current = controller; setPending(true);
    try {
      const result = await loadSocial<{ person: SocialPerson }>(`/api/social/relationship?slug=${encodeURIComponent(slug)}`, controller.signal);
      if (!controller.signal.aborted) setPerson(result.person);
    } catch { if (!controller.signal.aborted) setMessage(t.social.unavailable); }
    finally { if (!controller.signal.aborted) setPending(false); }
  }
  function changed(next: SocialPerson) {
    setPeople((items) => items?.map((item) => item.publicSlug === next.publicSlug ? next : item) ?? null);
    setPerson((current) => current?.publicSlug === next.publicSlug ? next : current);
    onChanged();
  }
  const input = "min-h-12 w-full rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-base outline-accent-purple sm:text-sm";
  return <section className="soft-card space-y-6 rounded-2xl p-5 sm:p-6">
    <div><h2 className="font-display text-xl font-semibold">{t.social.find}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{t.social.searchHint}</p></div>
    <label className="relative block"><span className="sr-only">{t.social.search}</span><Search size={18} className="pointer-events-none absolute left-4 top-4 text-muted" /><input maxLength={80} value={query} onChange={(event) => { setQuery(event.target.value); setPeople(null); setSearchFailed(false); }} placeholder={t.social.search} className={`${input} pl-11`} /></label>
    {query.trim().length >= 2 && <div aria-live="polite">{searchFailed ? <p role="alert" className="text-sm text-muted">{t.common.genericError}</p> : people === null ? <p className="text-sm text-muted">{t.social.loading}</p> : people.length === 0 ? <p className="text-sm text-muted">{t.social.noResults}</p> : <div className="grid gap-3 sm:grid-cols-2">{people.map((item) => <SocialPersonCard key={item.publicSlug} person={item} onChanged={changed} />)}</div>}</div>}
    <form onSubmit={(event) => { event.preventDefault(); void findCode(); }} className="space-y-3 border-t border-white/8 pt-5"><label className="block space-y-2 text-sm text-muted">{t.social.enterCode}<input value={code} onChange={(event) => { request.current?.abort(); setCode(event.target.value); setPerson(null); setMessage(""); setPending(false); }} placeholder={t.social.codePlaceholder} maxLength={300} className={input} /></label><button disabled={!code.trim() || pending} className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/5 disabled:opacity-50">{pending ? t.social.loading : t.social.findCode}</button></form>
    {message && <p role="alert" className="text-sm text-muted">{message}</p>}
    {person && <SocialPersonCard person={person} onChanged={changed} />}
  </section>;
}
