"use client";

import { useRef } from "react";
import Image from "next/image";
import type { GuessResult } from "@/types";
import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import { useDailyCardAnimation } from "@/hooks/useDailyCardAnimation";
import DailyMoviePerson from "./DailyMoviePerson";
import DailyMovieMetric from "./DailyMovieMetric";
import { Film, UserRound } from "@/components/ui/icons";
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
  const director = field(t.comparison.director);
  const leadActor = field(t.comparison.leadActor);
  const knownName = (name: string) => Boolean(name.trim()) && !["unknown", t.common.unknown.toLowerCase()].includes(name.trim().toLowerCase());
  const leadMember = guess.cast?.find((member) => member.name.toLowerCase() === guess.leadActor.toLowerCase());
  const supporting = guess.cast?.filter((member) => member.name.toLowerCase() !== guess.leadActor.toLowerCase()).slice(0, 4) ?? [];
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
            {genre && <dl className="mt-3" data-card-celebrate={genre.status === "exact"}>
              <dt className="sr-only">{genre.label}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {genre.guessValue.split(", ").map((name) => <span key={name} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${genre.status === "exact" ? "bg-match-exact/10 text-match-exact" : genre.status === "partial" ? "bg-match-partial/10 text-match-partial" : "bg-match-miss/10 text-match-miss"}`}>{normalizeDisplayText(name)}</span>)}
                <span className="sr-only">. {t.game.mobile[genre.status]}</span>
              </dd>
            </dl>}
          </header>
          <dl className={styles.metrics}>
            {metrics.map((item) => <DailyMovieMetric key={item.label} label={item.label} value={item.guessValue} status={item.status} direction={item.direction} celebrate />)}
          </dl>
        </div>
        <div className={`mt-5 border-t border-white/6 pt-4 ${styles.people}`}>
          <dl className={styles.personGroup}><DailyMoviePerson label={t.comparison.director} name={director?.guessValue} profilePath={guess.directorProfilePath} status={knownName(guess.director) ? director?.status : undefined} celebrate /></dl>
          <dl className={styles.personGroup}><DailyMoviePerson label={t.comparison.leadActor} name={leadActor?.guessValue} profilePath={leadMember?.profilePath} status={knownName(guess.leadActor) ? leadActor?.status : undefined} celebrate /></dl>
          {supporting.length > 0 && <div className={styles.supporting}>
            <p className="mb-3 text-[9px] font-medium uppercase tracking-wider text-muted/65">{t.result.cast}</p>
            <ul className="grid grid-cols-4 gap-3">
              {supporting.map((member) => <li key={member.name} className="min-w-0 text-center">
                <span className="relative mx-auto block h-12 w-12 overflow-hidden rounded-full bg-white/5 sm:h-16 sm:w-16">
                  {member.profilePath ? <Image src={`https://image.tmdb.org/t/p/w185${member.profilePath}`} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-muted/40"><UserRound size={22} /></span>}
                </span>
                <span className="mt-3 block text-[11px] leading-4 text-muted [overflow-wrap:anywhere]">{normalizeDisplayText(member.name)}</span>
              </li>)}
            </ul>
          </div>}
        </div>
      </div>
    </article>
  );
}
