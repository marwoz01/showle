import { MediaDetails, Hint } from "@/types";
import { Translations } from "@/i18n/types";

export function generateHints(answer: MediaDetails, t: Translations): Hint[] {
  const decade = Math.floor(answer.year / 10) * 10;

  return [
    {
      id: 1,
      type: "decade",
      content: t.hints.fromDecade(decade),
      revealedAt: 1,
    },
    {
      id: 2,
      type: "genre",
      content: t.hints.genreIs(answer.genres[0]),
      revealedAt: 2,
    },
    {
      id: 3,
      type: "director_initials",
      content: t.hints.directorInitials(getInitials(answer.director)),
      revealedAt: 3,
    },
    {
      id: 4,
      type: "trivia",
      content: answer.tagline
        ? t.hints.tagline(answer.tagline)
        : t.hints.overview(answer.overview.slice(0, 80)),
      revealedAt: 4,
    },
    {
      id: 5,
      type: "title_reveal",
      content: t.hints.titleStartsWith(answer.title[0]),
      revealedAt: 5,
    },
  ];
}

export function getRevealedHints(allHints: Hint[], attemptCount: number): Hint[] {
  return allHints.filter((h) => h.revealedAt <= attemptCount);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join(".");
}
