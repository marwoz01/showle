"use client";

import { useRef } from "react";
import type { GuessResult, MediaDetails } from "@/types";
import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import { useDailyCardAnimation } from "@/hooks/useDailyCardAnimation";
import { Film } from "@/components/ui/icons";
import DailyMovieMetric from "./DailyMovieMetric";
import DailyMoviePerson from "./DailyMoviePerson";
import styles from "./daily-movie-card.module.css";

interface MovieRevealCardProps {
  guesses: GuessResult[];
  answer: Pick<MediaDetails, "directorProfilePath" | "cast">;
  animate?: boolean;
}

export default function MovieRevealCard({
  guesses,
  answer,
  animate = false,
}: MovieRevealCardProps) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const latestAttempt = Math.max(0, ...guesses.map((guess) => guess.attemptNumber));
  const solved = new Map<string, string>();
  const previouslySolved = new Set<string>();

  for (const result of [...guesses].sort((a, b) => a.attemptNumber - b.attemptNumber)) {
    for (const field of result.comparison) {
      // A completed game's response may contain answers for missed clues too.
      if (field.status !== "exact" || !field.answerValue) continue;
      const isPerson = field.label === t.comparison.director || field.label === t.comparison.leadActor;
      if (isPerson && ["", "unknown", t.common.unknown.toLowerCase()].includes(field.answerValue.trim().toLowerCase())) continue;
      if (!solved.has(field.label)) solved.set(field.label, field.answerValue);
      if (result.attemptNumber < latestAttempt) previouslySolved.add(field.label);
    }
  }

  const celebrate = (label: string) =>
    animate && solved.has(label) && !previouslySolved.has(label);
  const director = solved.get(t.comparison.director);
  const leadActor = solved.get(t.comparison.leadActor);
  const genres = solved.get(t.comparison.genre);
  const leadActorMember = leadActor
    ? answer.cast?.find(
        (member) => member.name.toLowerCase() === leadActor.toLowerCase(),
      )
    : undefined;
  const metricLabels = [
    t.comparison.year,
    t.comparison.country,
    t.comparison.runtime,
    t.comparison.budget,
    t.comparison.popularity,
    t.comparison.rating,
  ];
  const revealedCount = Object.values(t.comparison).filter((label) => solved.has(label)).length;

  useDailyCardAnimation(rootRef, animate ? latestAttempt : undefined);

  return (
    <div ref={rootRef} className="soft-panel rounded-[2rem] p-2" data-movie-reveal-card>
      <section className="soft-card rounded-[1.55rem] p-4 [container-type:inline-size] sm:p-5">
        <div className={styles.summary}>
          <div className={`${styles.poster} mystery-poster relative flex aspect-2/3 items-center justify-center overflow-hidden rounded-[1.1rem] bg-[#121214] text-muted/30 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_35px_rgba(0,0,0,.32)]`}>
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="mystery-poster-scan absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-accent-purple/12 to-transparent" />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[.035] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
              <Film size={30} strokeWidth={1.5} />
            </span>
          </div>

          <header className={`${styles.identity} min-w-0`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-purple">
              {t.game.movieCard}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-wide text-muted/45 sm:text-3xl">
              ???
            </h3>
            <dl className="mt-2">
              <div data-card-celebrate={celebrate(t.comparison.genre) || undefined}>
                <dt className="sr-only">{t.comparison.genre}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {(genres ? genres.split(", ") : ["?"]).map((genre) => (
                    <span key={genre} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${genres ? "bg-match-exact/10 text-match-exact" : "bg-white/5 text-muted/40"}`}>
                      {normalizeDisplayText(genre)}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </header>

          <dl className={styles.metrics}>
            {metricLabels.map((label) => (
              <DailyMovieMetric
                key={label}
                label={label}
                value={solved.get(label)}
                status={solved.has(label) ? "exact" : undefined}
                celebrate={celebrate(label)}
              />
            ))}
          </dl>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-white/7 pt-4">
          <div className={styles.people}>
            <dl className={styles.personGroup}>
              <DailyMoviePerson
                label={t.comparison.director}
                name={director}
                profilePath={director ? answer.directorProfilePath : undefined}
                status={director ? "exact" : undefined}
                celebrate={celebrate(t.comparison.director)}
              />
            </dl>
            <dl className={styles.personGroup}>
              <DailyMoviePerson
                label={t.comparison.leadActor}
                name={leadActor}
                profilePath={leadActorMember?.profilePath}
                status={leadActor ? "exact" : undefined}
                celebrate={celebrate(t.comparison.leadActor)}
              />
            </dl>
          </div>

          <div className="ml-auto w-36 max-w-full pb-1" aria-label={`${t.game.revealed}: ${revealedCount}/9`}>
            <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted/55">
              <span>{t.game.revealed}</span>
              <span className="text-foreground/75">{revealedCount}/9</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
              <div className="h-full rounded-full bg-linear-to-r from-accent-purple to-match-exact transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(revealedCount / 9) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
