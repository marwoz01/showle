"use client";

import Image from "next/image";
import { ArrowUpDown, Film, Lock, Sparkles } from "@/components/ui/icons";
import ProfileMovieGrid from "@/components/profile/public/ProfileMovieGrid";
import { useTranslation } from "@/i18n";
import { publicProfileCopy } from "@/i18n/profile-public";
import type { ComparedMovieRating, TasteComparison } from "@/types/public-profile";

export default function TasteComparisonResults({ comparison }: { comparison: TasteComparison }) {
  const { locale } = useTranslation();
  const copy = publicProfileCopy[locale];
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const { score, sharedRatingCount, ratingDetailsVisible } = comparison;
  const metrics = [
    { value: sharedRatingCount, label: copy.sharedRatings },
    { value: comparison.agreementCount, label: copy.agreements, note: copy.agreementNote },
    { value: comparison.differenceCount, label: copy.differences, note: copy.differenceNote },
  ];

  return <div className="space-y-7">
    <section className="overflow-hidden rounded-2xl border border-accent-purple/20 bg-accent-purple/5 p-5 sm:p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="7" className="text-white/8" />
            {score !== null && <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="7" pathLength="100" strokeDasharray={`${score} 100`} strokeLinecap="round" className="text-accent-purple" />}
          </svg>
          <span className="font-display text-4xl font-bold tracking-tight text-foreground">{score === null ? "-" : `${score}%`}</span>
        </div>
        <div className="min-w-0 flex-1 text-center sm:pt-2 sm:text-left">
          <h3 className="font-display text-xl font-semibold sm:text-2xl">{copy.taste}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{score === null ? copy.insufficient : copy.explanation}</p>
          {comparison.averageRatingGap !== null && <p className="mt-3 text-sm text-muted">{copy.averageGap}: <strong className="font-semibold text-foreground">{format.format(comparison.averageRatingGap)}</strong></p>}
        </div>
      </div>
      <dl className="mt-6 grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-3">
        {metrics.map(({ value, label, note }) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-white/3 px-4 py-3 sm:block">
          <dt className="text-xs text-muted">{label}{note && <span className="mt-1 block text-[11px]">{note}</span>}</dt>
          <dd className="font-display text-2xl font-semibold tabular-nums sm:mt-2">{value === null ? "-" : value}</dd>
        </div>)}
      </dl>
    </section>

    {ratingDetailsVisible ? <div className="grid gap-5 lg:grid-cols-2">
      <RatingGroup movies={comparison.similarRatings} different={false} noSharedRatings={!sharedRatingCount} />
      <RatingGroup movies={comparison.differentRatings} different noSharedRatings={!sharedRatingCount} />
    </div> : <p className="flex items-start gap-3 rounded-xl bg-white/3 p-4 text-sm leading-relaxed text-muted"><Lock size={17} className="mt-0.5 shrink-0" />{copy.privateRatings}</p>}

    <section>
      <h3 className="font-display text-lg font-semibold">{copy.common}</h3>
      <p className="mb-5 mt-2 text-sm text-muted">{ratingDetailsVisible ? copy.commonNote : copy.commonPrivateNote}</p>
      {comparison.sharedMovies.length ? <ProfileMovieGrid movies={comparison.sharedMovies} /> : <p className="rounded-xl bg-white/3 p-5 text-sm text-muted">{ratingDetailsVisible ? copy.noCommon : copy.noCommonFavorites}</p>}
    </section>
  </div>;
}

function RatingGroup({ movies, different, noSharedRatings }: { movies: ComparedMovieRating[]; different: boolean; noSharedRatings: boolean }) {
  const { locale } = useTranslation();
  const copy = publicProfileCopy[locale];
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const Icon = different ? ArrowUpDown : Sparkles;
  return <section className="min-w-0 rounded-2xl border border-white/8 bg-white/2 p-4 sm:p-5">
    <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Icon size={18} className={different ? "text-match-partial" : "text-accent-green"} />{different ? copy.differentOpinion : copy.sameOpinion}</h3>
    <p className="mb-4 mt-2 text-xs leading-relaxed text-muted">{different ? copy.differentOpinionNote : copy.sameOpinionNote}</p>
    {movies.length ? <ul className="space-y-3">{movies.map((movie) => <li key={movie.id} className="flex min-w-0 gap-3 rounded-xl bg-white/3 p-3">
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
        {movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`} alt="" fill sizes="56px" className="object-cover" /> : <Film size={22} className="absolute inset-0 m-auto text-muted" />}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="break-words text-sm font-semibold leading-snug">{movie.title}</h4>
        <p className="mt-0.5 text-xs text-muted">{movie.year > 0 && <>{movie.year}<span aria-hidden="true"> · </span></>}{copy.gap}: {format.format(movie.gap)}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <p>{copy.you} <strong className="ml-1 text-foreground">{format.format(movie.viewerRating)}<span className="font-normal text-muted">/10</span></strong></p>
          <p>{copy.other} <strong className="ml-1 text-foreground">{format.format(movie.otherRating)}<span className="font-normal text-muted">/10</span></strong></p>
        </div>
      </div>
    </li>)}</ul> : <p className="rounded-xl bg-white/3 p-4 text-sm leading-relaxed text-muted">{noSharedRatings ? copy.noSharedRatings : different ? copy.noDifferences : copy.noAgreements}</p>}
  </section>;
}
