"use client";

import Image from "next/image";
import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import type { MovieSuggestion } from "@/types/movie-suggestion";
import DailyMovieMetric from "./DailyMovieMetric";
import { Film } from "@/components/ui/icons";
import styles from "./daily-movie-card.module.css";

export default function PendingGuessCard({ movie, headingLevel = 3 }: {
  movie: MovieSuggestion; headingLevel?: 2 | 3;
}) {
  const { t } = useTranslation();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const metrics = Object.values(t.comparison).filter((label) => ![t.comparison.genre, t.comparison.director, t.comparison.leadActor].includes(label));

  return (
    <article className="soft-panel rounded-[2rem] p-2" aria-busy="true" data-pending-guess-card={movie.id}>
      <div className="soft-card rounded-[1.55rem] p-4 [container-type:inline-size] sm:p-5">
        <div className={styles.summary}>
          <div className={styles.poster}>
            {movie.posterPath ? <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={normalizeDisplayText(movie.title)} fill sizes="(min-width: 1024px) 152px, 80px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-muted/40"><Film size={28} /></div>}
          </div>
          <header className={styles.identity}>
            <Heading className="min-w-0 font-display text-lg font-semibold leading-tight [overflow-wrap:anywhere] sm:text-2xl">{normalizeDisplayText(movie.title)}</Heading>
            <p className="mt-2 text-xs text-muted">{t.game.mobile.checking}</p>
          </header>
          <dl className={styles.metrics}>
            {metrics.map((label) => <DailyMovieMetric key={label} label={label} value="…" />)}
          </dl>
        </div>
      </div>
    </article>
  );
}
