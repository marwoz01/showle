import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuessResult } from "@/types";
import en from "@/i18n/en";
import { mobileGuess } from "./fixtures/daily-mobile";

const animation = vi.hoisted(() => vi.fn());
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: en, locale: "en" }) }));
vi.mock("@/hooks/useDailyCardAnimation", () => ({ useDailyCardAnimation: animation }));
import MovieRevealCard from "@/components/game/MovieRevealCard";

function guess(attemptNumber: number, exact: Record<string, string> = {}): GuessResult {
  const result = mobileGuess(attemptNumber, en);
  result.comparison = result.comparison.map((field) => ({
    ...field,
    status: Object.hasOwn(exact, field.label) ? "exact" : "miss",
    answerValue: exact[field.label] ?? "Undiscovered answer value",
  }));
  return result;
}

const answer = {
  directorProfilePath: "/secret-director.jpg",
  cast: [
    { name: "Jim Carrey", character: "Joel", profilePath: "/lead.jpg" },
    { name: "Undiscovered supporting actor", character: "Hidden role", profilePath: "/secret-supporting.jpg" },
  ],
};

describe("daily movie reveal card", () => {
  beforeEach(() => animation.mockClear());

  it("keeps undiscovered answers and portraits hidden even when passed completed-game data", () => {
    const html = renderToStaticMarkup(createElement(MovieRevealCard, { guesses: [guess(1)], answer }));

    expect(html).toContain("???");
    expect(html).toContain("0/9");
    expect(html).not.toContain("Undiscovered");
    expect(html).not.toContain("secret-director");
    expect(html).not.toContain("secret-supporting");
    expect(html).not.toContain("Jim Carrey");
    expect(html).not.toContain('data-card-celebrate="true"');
  });

  it("shows only exact discoveries and celebrates new ones independently of response order", () => {
    const first = guess(1, { [en.comparison.director]: "Michel Gondry" });
    const second = guess(2, { [en.comparison.director]: "Michel Gondry", [en.comparison.leadActor]: "Jim Carrey" });
    const html = renderToStaticMarkup(createElement(MovieRevealCard, { guesses: [second, first], answer, animate: true }));

    expect(html).toContain("Michel Gondry");
    expect(html).toContain("Jim Carrey");
    expect(html).toContain("2/9");
    expect(html).not.toContain("Undiscovered");
    expect(html).not.toContain("secret-supporting");
    expect(html.match(/data-card-celebrate="true"/g)).toHaveLength(1);
    expect(animation.mock.calls.at(-1)?.[1]).toBe(2);
  });

  it("does not celebrate restored progress or count an empty exact value as discovered", () => {
    const html = renderToStaticMarkup(createElement(MovieRevealCard, {
      guesses: [guess(3, { [en.comparison.director]: "Michel Gondry", [en.comparison.leadActor]: "" })], answer,
    }));

    expect(html).toContain("Michel Gondry");
    expect(html).toContain("1/9");
    expect(html).not.toContain("Jim Carrey");
    expect(html).not.toContain('data-card-celebrate="true"');
    expect(animation.mock.calls.at(-1)?.[1]).toBeUndefined();
  });

  it("does not treat matching missing person names as a discovery", () => {
    const html = renderToStaticMarkup(createElement(MovieRevealCard, {
      guesses: [guess(1, { [en.comparison.director]: "Unknown", [en.comparison.leadActor]: en.common.unknown })], answer, animate: true,
    }));

    expect(html).toContain("0/9");
    expect(html).not.toContain('data-card-celebrate="true"');
    expect(html).not.toContain("secret-director");
  });
});
