"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "@/components/ui/icons";
import RecommendationCard from "@/components/recommend/RecommendationCard";
import ProfileMovieGrid from "@/components/profile/public/ProfileMovieGrid";
import { useTranslation } from "@/i18n";
import { publicProfileCopy } from "@/i18n/profile-public";
import type { ProfileComparisonResponse } from "@/types/public-profile";

export default function ProfileComparison({ slug, onPrivate }: { slug: string; onPrivate: () => void }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const viewerId = isLoaded && isSignedIn ? user.id : null;
  // Switching accounts or target profiles unmounts all previous results and requests.
  return <ProfileComparisonSession key={JSON.stringify([viewerId, slug])} slug={slug} viewerId={viewerId} isLoaded={isLoaded} onPrivate={onPrivate} />;
}

function ProfileComparisonSession({ slug, viewerId, isLoaded, onPrivate }: {
  slug: string; viewerId: string | null; isLoaded: boolean; onPrivate: () => void;
}) {
  const { locale } = useTranslation();
  const copy = publicProfileCopy[locale];
  const [result, setResult] = useState<ProfileComparisonResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "self">("idle");
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  async function compare() {
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
  }

  return <section id="compare" className="scroll-mt-6 space-y-6 border-t border-white/8 pt-8">
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-display text-xl font-semibold sm:text-2xl">{copy.compare}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{copy.compareDescription}</p></div>
      {isLoaded && !viewerId ? <SignInButton mode="modal"><button className="min-h-11 shrink-0 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white">{copy.signIn}</button></SignInButton>
        : <button onClick={compare} disabled={!isLoaded || status === "loading"} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/85 disabled:opacity-60">
          <Sparkles size={17} />{status === "loading" ? copy.comparing : copy.compare}
        </button>}
    </div>
    <div aria-live="polite">
      {status === "error" && <p role="alert" className="text-sm text-red-300">{copy.comparisonError}</p>}
      {status === "self" && <div className="rounded-2xl border border-white/8 bg-white/3 p-5"><p className="text-sm leading-relaxed text-muted">{copy.ownProfile}</p><Link href="/profile" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent-purple">{copy.manage}<ArrowRight size={16} className="ml-2" /></Link></div>}
    </div>
    {result && viewerId && <div className="space-y-8">
      <div className="rounded-2xl border border-accent-purple/20 bg-accent-purple/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {result.comparison.score !== null && <div><p className="font-display text-4xl font-bold text-accent-purple">{result.comparison.score}%</p><p className="mt-1 text-sm text-foreground">{copy.taste}</p></div>}
          <p className="text-sm text-muted">{copy.sharedRatings}: <strong className="font-semibold text-foreground">{result.comparison.sharedRatingCount}</strong></p>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{result.comparison.score === null ? copy.insufficient : copy.explanation}</p>
      </div>
      <section><h3 className="font-display text-lg font-semibold">{copy.common}</h3><p className="mb-5 mt-2 text-sm text-muted">{copy.commonNote}</p>
        {result.comparison.sharedMovies.length ? <ProfileMovieGrid movies={result.comparison.sharedMovies} /> : <p className="rounded-xl bg-white/3 p-5 text-sm text-muted">{copy.noCommon}</p>}
      </section>
      <section><h3 className="font-display text-lg font-semibold">{copy.suggestions}</h3><p className="mb-5 mt-2 max-w-3xl text-sm leading-relaxed text-muted">{copy.suggestionsNote}</p>
        {result.suggestions.length ? <div className="grid gap-5 md:grid-cols-3">{result.suggestions.map((movie, index) => <RecommendationCard key={movie.id} movie={movie} index={index} justification={copy.suggestionReason} />)}</div>
          : <p className="rounded-xl bg-white/3 p-5 text-sm text-muted">{copy.noSuggestions}</p>}
        <Link href="/recommend/together" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent-purple/30 bg-accent-purple/10 px-4 py-3 text-sm font-medium text-accent-purple">{copy.together}<ArrowRight size={16} /></Link>
      </section>
    </div>}
  </section>;
}
