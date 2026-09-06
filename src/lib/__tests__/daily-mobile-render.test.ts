import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import { mobileGame } from "@/lib/__tests__/fixtures/daily-mobile";

const language = vi.hoisted(() => ({ locale: "pl" as "pl" | "en" }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.locale === "pl" ? pl : en, locale: language.locale }) }));
vi.mock("@/components/ui/icons", () => ({ Film: () => null, Lightbulb: () => null, Lock: () => null }));
import DailyMobileContent from "@/components/game/DailyMobileContent";
import DailyMobileTabs from "@/components/game/DailyMobileTabs";

describe.each(["pl", "en"] as const)("mobile daily workspace (%s)", (locale) => {
  const t = locale === "pl" ? pl : en;
  const render = (panel: "guesses" | "hints" | "revealed", count = 3, selectedId: number | null = null) => {
    language.locale = locale;
    return renderToStaticMarkup(createElement(DailyMobileContent, { game: mobileGame(count, t), panel, selectedId, onSelectGuess: vi.fn() })).replaceAll("&#x27;", "'");
  };
  it("starts with a short actionable empty state, not nine empty cards", () => {
    const html = render("guesses", 0);
    expect(html).toContain(t.game.mobile.emptyTitle);
    expect(html).toContain(t.game.mobile.emptyHelp);
    expect(html).not.toContain("data-compact-clues");
  });
  it("shows one complete nine-clue comparison and access to every attempt", () => {
    const html = render("guesses", 6);
    expect(html.match(/<dt /g)).toHaveLength(9);
    expect(html.match(/aria-pressed=/g)).toHaveLength(6);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain(t.game.mobile.latestGuess);
    expect(html).toContain(t.game.mobile.higher);
    expect(html).toContain(t.game.mobile.lower);
    expect(html).toContain(t.game.mobile.partial);
    expect(html).not.toContain("line-clamp");
  });
  it("lets the user inspect an earlier film without replacing it with the newest", () => {
    const html = render("guesses", 6, 1);
    expect(html).toContain(">Eternal Sunshine of the Spotless Mind</h2>");
    expect(html).not.toContain(t.game.mobile.latestGuess);
  });
  it("explains exactly when locked hints unlock", () => {
    const html = render("hints", 2);
    expect(html).toContain(t.hints.genresAre(locale === "pl" ? "Romans, Dramat" : "Romance, Drama"));
    expect(html).toContain(t.game.mobile.hintAfter(4));
    expect(html).toContain(t.game.mobile.hintAfter(6));
    expect(html).not.toContain("???");
  });
  it("keeps undiscovered fields hidden in the combined clue view", () => {
    const html = render("revealed");
    expect(html.match(/<dt /g)).toHaveLength(9);
    expect(html).toContain("16 680");
    expect(html).not.toContain("Michel Gondry");
  });
  it("labels tabs, counts and the newly unlocked hint for assistive technology", () => {
    language.locale = locale;
    const html = renderToStaticMarkup(createElement(DailyMobileTabs, {
      id: "daily", active: "guesses", counts: { guesses: 2, hints: 1, revealed: 2 }, newHint: true, onChange: vi.fn(),
    }));
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain(t.game.mobile.newHint);
    expect(html).toContain('aria-controls="daily-hints-panel"');
  });
});
