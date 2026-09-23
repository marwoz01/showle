import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuessResult } from "@/types";
import en from "@/i18n/en";
import { compareMedia } from "@/lib/comparer";
import { mobileGuess } from "./fixtures/daily-mobile";

const animation = vi.hoisted(() => vi.fn());
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: en, locale: "en" }) }));
vi.mock("@/hooks/useDailyCardAnimation", () => ({ useDailyCardAnimation: animation }));
import GuessCard from "@/components/game/GuessCard";

function matchedPeopleGuess(): GuessResult {
  const result = mobileGuess(2, en);
  result.guess.cast = [
    { name: "Kate Winslet", character: "Clementine", profilePath: "/supporting.jpg" },
    { name: "JIM CARREY", character: "Joel", profilePath: "/lead.jpg" },
  ];
  result.comparison = result.comparison.map((field) => ({
    ...field,
    status: [en.comparison.director, en.comparison.leadActor].includes(field.label) ? "exact" : "miss",
  }));
  return result;
}

describe("daily movie guess card", () => {
  beforeEach(() => animation.mockClear());

  it("highlights only shared genres when the guessed film includes extra genres", () => {
    const result = matchedPeopleGuess();
    result.guess.genres = ["Drama", "Thriller", "Crime"];
    result.comparison = compareMedia(result.guess, { ...result.guess, genres: ["Drama"] }, en);
    const html = renderToStaticMarkup(createElement(GuessCard, { result }));

    expect(html).toContain('data-genre="Drama" data-status="exact" data-card-celebrate="true"');
    expect(html).toContain('data-genre="Thriller" data-status="miss" data-card-celebrate="false"');
    expect(html).toContain('data-genre="Crime" data-status="miss" data-card-celebrate="false"');
  });

  it("marks exact director and lead actor matches without claiming supporting cast matches", () => {
    const html = renderToStaticMarkup(createElement(GuessCard, { result: matchedPeopleGuess(), animate: true }));

    expect(html).toContain('data-person-name="Michel Gondry" data-status="exact"');
    expect(html).toContain('data-person-name="Jim Carrey" data-status="exact"');
    expect(html).toContain("Kate Winslet");
    expect(html).not.toContain('data-person-name="Kate Winslet" data-status="exact"');
    expect(html.match(/data-card-celebrate="true"/g)).toHaveLength(2);
    expect(html).toContain("lead.jpg");
    expect(animation.mock.calls.at(-1)?.[1]).toBe(2);
  });

  it("preserves discovered people in restored history without starting a confirmation animation", () => {
    const html = renderToStaticMarkup(createElement(GuessCard, { result: matchedPeopleGuess() }));

    expect(html).toContain('data-person-name="Michel Gondry" data-status="exact"');
    expect(animation.mock.calls.at(-1)?.[1]).toBeUndefined();
  });

  it("uses cast membership even when the guessed lead has a supporting role in the answer", () => {
    const result = matchedPeopleGuess();
    result.comparison = result.comparison.map((field) => ({ ...field, status: "miss" }));
    result.castComparison = [
      { name: " jim carrey ", status: "exact" },
      { name: "Kate Winslet", status: "miss" },
    ];
    const html = renderToStaticMarkup(createElement(GuessCard, { result, animate: true }));

    expect(html).toContain('data-person-name="Jim Carrey" data-status="exact"');
    expect(html).toContain('data-person-name="Kate Winslet" data-status="miss"');
    expect(html).toContain("ring-match-miss");
    expect(html.match(/data-card-celebrate="true"/g)).toHaveLength(1);
  });

  it("marks absent lead and supporting actors red, and matching supporting actors green", () => {
    const result = matchedPeopleGuess();
    result.guess.cast!.push({ name: "Elijah Wood", character: "Patrick", profilePath: "" });
    result.comparison = result.comparison.map((field) => ({ ...field, status: "miss" }));
    result.castComparison = [
      { name: "Jim Carrey", status: "miss" },
      { name: "Kate Winslet", status: "miss" },
      { name: "Elijah Wood", status: "exact" },
    ];
    const html = renderToStaticMarkup(createElement(GuessCard, { result }));

    expect(html).toContain('data-person-name="Jim Carrey" data-status="miss"');
    expect(html).toContain('data-person-name="Kate Winslet" data-status="miss"');
    expect(html).toContain('data-person-name="Elijah Wood" data-status="exact"');
    expect(html).toContain(en.game.mobile.miss);
    expect(animation.mock.calls.at(-1)?.[1]).toBeUndefined();
  });

  it("keeps actors neutral when a nonmatching lead clue cannot confirm their absence", () => {
    const result = matchedPeopleGuess();
    result.comparison = result.comparison.map((field) => ({ ...field, status: "miss" }));
    const html = renderToStaticMarkup(createElement(GuessCard, { result }));

    expect(html).toContain('data-person-name="Jim Carrey"><dt');
    expect(html).toContain('data-person-name="Kate Winslet"><dt');
    expect(html).not.toContain('data-card-celebrate="true"');
  });

  it("does not mark missing director and lead actor data as correct matches", () => {
    const result = matchedPeopleGuess();
    result.guess.director = "Unknown";
    result.guess.leadActor = "Unknown";
    result.comparison = result.comparison.map((field) => ({
      ...field,
      guessValue: field.status === "exact" ? en.common.unknown : field.guessValue,
    }));
    const html = renderToStaticMarkup(createElement(GuessCard, { result, animate: true }));

    expect(html).not.toContain('data-person-name="Unknown" data-status="exact"');
    expect(html).not.toContain('data-card-celebrate="true"');
  });

  it("identifies the correctly guessed film for its whole-card celebration", () => {
    const result = { ...matchedPeopleGuess(), isCorrect: true };
    const html = renderToStaticMarkup(createElement(GuessCard, { result, animate: true }));

    expect(html).toContain('data-card-win="true"');
    expect(html).toContain(en.game.correct);
    expect(animation.mock.calls.at(-1)?.[1]).toBe(result.guess.id);
  });
});
