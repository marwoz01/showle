"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "@/components/ui/icons";
import RecommendationCard from "@/components/recommend/RecommendationCard";
import TasteComparisonResults from "@/components/profile/public/TasteComparisonResults";
import { useTranslation } from "@/i18n";
import { publicProfileCopy } from "@/i18n/profile-public";
import type { ProfileComparisonResponse } from "@/types/public-profile";

interface ProfileComparisonProps {
  slug: string;
  onPrivate: () => void;
  autoCompare?: boolean;
  embedded?: boolean;
}

export default function ProfileComparison({ slug, onPrivate, autoCompare = false, embedded = false }: ProfileComparisonProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { locale } = useTranslation();
  const viewerId = isLoaded && isSignedIn ? user.id : null;
  // Switching account, target or language clears results and aborts stale requests.
  return <ProfileComparisonSession key={JSON.stringify([viewerId, slug, locale])} slug={slug} viewerId={viewerId} isLoaded={isLoaded} onPrivate={onPrivate} autoCompare={autoCompare} embedded={embedded} />;
}

function ProfileComparisonSession({ slug, viewerId, isLoaded, onPrivate, autoCompare, embedded }: ProfileComparisonProps & { viewerId: string | null; isLoaded: boolean }) {
  const { locale } = useTranslation();
  const copy = publicProfileCopy[locale];
  const [result, setResult] = useState<ProfileComparisonResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "self">("idle");
  const activeRequest = useRef<AbortController | null>(null);
  const autoStarted = useRef(false);

  const compare = useCallback(async () => {
    if (!viewerId || !isLoaded) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setResult(null);
    setStatus("loading");
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(slug)}/compare?lang=${locale}`, { cache: "no-store", signal: controller.signal });
      if (activeRequest.current !== controller || controller.signal.aborted) return;
      if (response.status === 404) { onPrivate(); return; }
      if (response.status === 409) { setStatus("self"); return; }
      if (!response.ok) throw new Error("Comparison unavailable");
      const data = await response.json() as ProfileComparisonResponse;
      if (activeRequest.current !== controller || controller.signal.aborted) return;
      setResult(data);
      setStatus("idle");
    } catch { if (activeRequest.current === controller && !controller.signal.aborted) setStatus("error"); }
    finally { if (activeRequest.current === controller) activeRequest.current = null; }
  }, [viewerId, isLoaded, slug, locale, onPrivate]);

  useEffect(() => {
    if (!autoCompare || !viewerId || !isLoaded || autoStarted.current) return;
    autoStarted.current = true;
    void compare();
  }, [autoCompare, viewerId, isLoaded, compare]);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    autoStarted.current = false;
  }, []);

  return <section id={embedded ? undefined : "compare"} className={embedded ? "space-y-6" : "scroll-mt-6 space-y-6 border-t border-white/8 pt-8"}>
    {!embedded && <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-display text-xl font-semibold sm:text-2xl">{copy.compare}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{copy.compareDescription}</p></div>
      {isLoaded && !viewerId ? <SignInButton mode="modal"><button className="min-h-11 shrink-0 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white">{copy.signIn}</button></SignInButton>
        : <button onClick={compare} disabled={!isLoaded || status === "loading"} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/85 disabled:opacity-60">
          <Sparkles size={17} />{status === "loading" ? copy.comparing : copy.compare}
        </button>}
    </div>}
    <div aria-live="polite">
      {embedded && status === "loading" && <p className="rounded-xl bg-white/3 p-5 text-sm text-muted">{copy.comparing}</p>}
      {embedded && isLoaded && !viewerId && <SignInButton mode="modal"><button className="min-h-11 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white">{copy.signIn}</button></SignInButton>}
      {status === "error" && <div><p role="alert" className="text-sm text-match-miss">{copy.comparisonError}</p>{embedded && <button onClick={() => void compare()} className="mt-2 min-h-11 text-sm font-semibold text-accent-purple">{copy.retry}</button>}</div>}
      {status === "self" && <div className="rounded-2xl border border-white/8 bg-white/3 p-5"><p className="text-sm leading-relaxed text-muted">{copy.ownProfile}</p><Link href="/profile" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent-purple">{copy.manage}<ArrowRight size={16} className="ml-2" /></Link></div>}
    </div>
    {result && viewerId && <div className="space-y-8">
      <TasteComparisonResults comparison={result.comparison} />
      <section><h3 className="font-display text-lg font-semibold">{copy.suggestions}</h3><p className="mb-5 mt-2 max-w-3xl text-sm leading-relaxed text-muted">{copy.suggestionsNote}</p>
        {result.suggestions.length ? <div className="grid gap-5 md:grid-cols-3">{result.suggestions.map((movie, index) => <RecommendationCard key={movie.id} movie={movie} index={index} justification={copy.suggestionReason} />)}</div>
          : <p className="rounded-xl bg-white/3 p-5 text-sm text-muted">{copy.noSuggestions}</p>}
        <Link href="/recommend/together" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent-purple/30 bg-accent-purple/10 px-4 py-3 text-sm font-medium text-accent-purple">{copy.together}<ArrowRight size={16} /></Link>
      </section>
    </div>}
  </section>;
}
