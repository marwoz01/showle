"use client";

import { useRef } from "react";
import Image from "next/image";
import type { GuessResult } from "@/types";
import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import { knownCastNames, normalizeCastName } from "@/lib/cast-comparison";
import { useDailyCardAnimation } from "@/hooks/useDailyCardAnimation";
import DailyMoviePerson from "@/components/game/DailyMoviePerson";
import DailyMovieMetric from "@/components/game/DailyMovieMetric";
import { Film } from "@/components/ui/icons";
import styles from "./daily-movie-card.module.css";

export default function GuessCard({ result, animate = false, headingLevel = 3 }: {
  result: GuessResult; animate?: boolean; headingLevel?: 2 | 3;
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLElement>(null);
  useDailyCardAnimation(root, animate ? result.guess.id : undefined);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const { guess, comparison } = result;
  const field = (label: string) => comparison.find((item) => item.label === label);
  const genre = field(t.comparison.genre);
  const genreItems = genre?.items ?? genre?.guessValue.split(", ").map((value) => ({ value, status: genre.status })) ?? [];
  const director = field(t.comparison.director);
  const leadActor = field(t.comparison.leadActor);
  const knownName = (name: string) => knownCastNames([name]).length > 0 && normalizeCastName(name) !== normalizeCastName(t.common.unknown);
  const castStatus = (name: string) => knownName(name)
    ? result.castComparison?.find((member) => normalizeCastName(member.name) === normalizeCastName(name))?.status
    : undefined;
  const leadStatus = castStatus(guess.leadActor) ?? (knownName(guess.leadActor) && leadActor?.status === "exact" ? "exact" : undefined);
  const leadMember = guess.cast?.find((member) => normalizeCastName(member.name) === normalizeCastName(guess.leadActor));
  const supporting = guess.cast?.filter((member) => normalizeCastName(member.name) !== normalizeCastName(guess.leadActor)).slice(0, 4) ?? [];
  const metrics = comparison.filter((item) => ![t.comparison.genre, t.comparison.director, t.comparison.leadActor].includes(item.label));

  return (
    <article ref={root} className="soft-panel rounded-[2rem] p-2" data-guess-card={guess.id}>
      <div className="soft-card rounded-[1.55rem] p-4 [container-type:inline-size] sm:p-5" data-card-win={result.isCorrect}>
        <div className={styles.summary}>
          <div className={styles.poster}>
            {guess.posterPath ? <Image src={`https://image.tmdb.org/t/p/w342${guess.posterPath}`} alt={normalizeDisplayText(guess.title)} fill sizes="(min-width: 1024px) 152px, 80px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-muted/40"><Film size={28} /></div>}
          </div>
          <header className={styles.identity}>
            <div className="flex items-start justify-between gap-3">
              <Heading className="min-w-0 font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere] sm:text-2xl">{normalizeDisplayText(guess.title)}</Heading>
              <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-muted">#{result.attemptNumber}</span>
            </div>
            {result.isCorrect && <p className="mt-1 text-xs font-semibold text-match-exact">{t.game.correct}</p>}
            {genre && <dl className="mt-3">
              <dt className="sr-only">{genre.label}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {genreItems.map(({ value, status }) => <span key={value} data-genre={value} data-status={status} data-card-celebrate={status === "exact"} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status === "exact" ? "bg-match-exact/10 text-match-exact" : status === "partial" ? "bg-match-partial/10 text-match-partial" : "bg-match-miss/10 text-match-miss"}`}>
                  {normalizeDisplayText(value)}<span className="sr-only">. {t.game.mobile[status]}</span>
                </span>)}
              </dd>
            </dl>}
          </header>
          <dl className={styles.metrics}>
            {metrics.map((item) => <DailyMovieMetric key={item.label} label={item.label} value={item.guessValue} status={item.status} direction={item.direction} celebrate />)}
          </dl>
        </div>
        <div className={`mt-5 border-t border-white/6 pt-4 ${styles.people}`}>
          <dl className={styles.personGroup}><DailyMoviePerson label={t.comparison.director} name={director?.guessValue} profilePath={guess.directorProfilePath} status={knownName(guess.director) ? director?.status : undefined} celebrate /></dl>
          <dl className={styles.personGroup}><DailyMoviePerson label={t.comparison.leadActor} name={leadActor?.guessValue} profilePath={leadMember?.profilePath} status={leadStatus} celebrate /></dl>
          {supporting.length > 0 && <div className={styles.supporting}>
            <p className="mb-3 text-[9px] font-medium uppercase tracking-wider text-muted/65">{t.result.cast}</p>
            <ul className="grid grid-cols-4 gap-3">
              {supporting.map((member) => <li key={member.name} className="min-w-0 text-center">
                <dl><DailyMoviePerson label={t.result.cast} name={member.name} profilePath={member.profilePath} status={castStatus(member.name)} compact celebrate /></dl>
              </li>)}
            </ul>
          </div>}
        </div>
      </div>
    </article>
  );
}
