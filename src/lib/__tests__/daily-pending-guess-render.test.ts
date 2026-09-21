import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import { mobileGame } from "@/lib/__tests__/fixtures/daily-mobile";
import type { MovieSuggestion } from "@/types/movie-suggestion";

const language = vi.hoisted(() => ({ locale: "pl" as "pl" | "en" }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.locale === "pl" ? pl : en, locale: language.locale }) }));
vi.mock("@/components/ui/icons", () => ({ Film: () => null, Lightbulb: () => null, Lock: () => null, UserRound: () => null, Check: () => null }));
import PendingGuessCard from "@/components/game/PendingGuessCard";
import DailyMobileContent from "@/components/game/DailyMobileContent";

const movie: MovieSuggestion = { id: 300, title: "Selected movie", originalTitle: "Selected movie", year: 2024, posterPath: "" };

describe.each(["pl", "en"] as const)("daily pending guess (%s)", (locale) => {
  const t = locale === "pl" ? pl : en;

  it("shows the selected title without inventing comparison results or an attempt number", () => {
    language.locale = locale;
    const html = renderToStaticMarkup(createElement(PendingGuessCard, { movie }));
    expect(html).toContain(movie.title);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(t.game.mobile.checking);
    expect(html).not.toContain("data-status=");
    expect(html).not.toContain("text-match-exact");
    expect(html).not.toContain("data-card-win");
    expect(html).not.toContain("data-guess-card=");
    expect(html).not.toContain("2024");
    expect(html).not.toContain("#1");
  });

  it("replaces the mobile empty state immediately while the first guess is pending", () => {
    language.locale = locale;
    const html = renderToStaticMarkup(createElement(DailyMobileContent, {
      game: mobileGame(0, t), panel: "guesses", selectedId: null, pendingMovie: movie, onSelectGuess: vi.fn(),
    }));
    expect(html).toContain('data-pending-guess-card="300"');
    expect(html).not.toContain(t.game.mobile.emptyTitle);
    expect(html).not.toContain('role="group"');
  });

  it("retains saved attempts without showing an old card as the new result", () => {
    language.locale = locale;
    const props = { game: mobileGame(3, t), panel: "guesses" as const, selectedId: 1, onSelectGuess: vi.fn() };
    const pendingHtml = renderToStaticMarkup(createElement(DailyMobileContent, { ...props, pendingMovie: movie }));
    expect(pendingHtml.match(/aria-pressed=/g)).toHaveLength(3);
    expect(pendingHtml).not.toContain('aria-pressed="true"');
    expect(pendingHtml).toContain('data-pending-guess-card="300"');
    expect(pendingHtml).not.toContain("data-guess-card=");

    const restoredHtml = renderToStaticMarkup(createElement(DailyMobileContent, { ...props, pendingMovie: null }));
    expect(restoredHtml).toContain('data-guess-card="1"');
    expect(restoredHtml).not.toContain("data-pending-guess-card");
    expect(restoredHtml.match(/aria-pressed=/g)).toHaveLength(3);
    expect(restoredHtml.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
});
