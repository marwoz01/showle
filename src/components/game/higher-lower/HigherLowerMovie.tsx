"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { HigherLowerMovieView } from "@/types/higher-lower";
import type { higherLowerCopy } from "@/i18n/higher-lower";
import styles from "./higher-lower.module.css";

interface Props {
  movie: HigherLowerMovieView;
  copy: (typeof higherLowerCopy)["pl"];
  side: "left" | "right";
  carried?: boolean;
  outcome?: "correct" | "equal" | "wrong" | null;
  children?: ReactNode;
}

export default function HigherLowerMovie({ movie, copy, side, carried, outcome, children }: Props) {
  const hidden = movie.runtime === null;
  return (
    <article
      className={`${styles.movie} ${side === "left" ? styles.left : styles.right} ${carried ? styles.carried : ""}`}
      aria-labelledby={`higher-lower-${side}-title`}
      data-side={side}
    >
      <Image
        src={`https://image.tmdb.org/t/p/w1280${movie.backdropPath}`}
        alt=""
        fill
        priority
        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, calc((100vw - 240px) / 2)"
        className={styles.backdrop}
      />
      <div className={styles.shade} />
      <div className={styles.movieContent}>
        <p className={styles.year}>{movie.year}</p>
        <h2 id={`higher-lower-${side}-title`} className={styles.movieTitle}>{movie.title}</h2>
        <p className={styles.metricLabel}>{copy.runtime}</p>
        <p
          className={`${styles.value} ${outcome ? styles.revealed : ""} ${outcome === "wrong" ? styles.wrongValue : outcome ? styles.correctValue : ""}`}
          aria-label={hidden ? copy.unknown : undefined}
        >
          <span>{hidden ? "?" : movie.runtime}</span>
          {!hidden && <span className={styles.unit}>{copy.minutes}</span>}
        </p>
        {children}
      </div>
    </article>
  );
}
