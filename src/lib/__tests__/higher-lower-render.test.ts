import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HigherLowerGameView } from "@/types/higher-lower";
import { higherLowerCopy } from "@/i18n/higher-lower";

const mocks = vi.hoisted(() => ({
  locale: "pl" as "pl" | "en",
  useHigherLower: vi.fn(),
}));

vi.mock("@/i18n", () => ({ useTranslation: () => ({ locale: mocks.locale }) }));
vi.mock("@/hooks/useHigherLower", () => ({ useHigherLower: mocks.useHigherLower }));
vi.mock("@/components/ui/icons", () => ({
  ArrowDown: () => null,
  ArrowLeft: () => null,
  ArrowRight: () => null,
  ArrowUp: () => null,
  Check: () => null,
  Clock: () => null,
  Copy: () => null,
  Flame: () => null,
  Loader2: () => null,
  RefreshCw: () => null,
  Trophy: () => null,
  X: () => null,
}));

import HigherLowerGame from "@/components/game/higher-lower/HigherLowerGame";
import type { useHigherLower } from "@/hooks/useHigherLower";

type HookState = ReturnType<typeof useHigherLower>;

function game(status: HigherLowerGameView["status"] = "guessing"): HigherLowerGameView {
  return {
    round: 4,
    score: status === "revealed" ? 4 : 3,
    status,
    left: {
      id: 1,
      title: mocks.locale === "pl" ? "Incepcja" : "Inception",
      year: 2010,
      runtime: 148,
      backdropPath: "/inception.jpg",
    },
    right: {
      id: 2,
      title: "Interstellar",
      year: 2014,
      runtime: status === "guessing" ? null : 169,
      backdropPath: "/interstellar.jpg",
    },
    outcome: status === "guessing" ? null : status === "revealed" ? "correct" : "wrong",
  };
}

function render(overrides: Partial<HookState> = {}) {
  mocks.useHigherLower.mockReturnValue({
    game: game(),
    pending: false,
    error: null,
    best: 8,
    recordSaved: true,
    isNewBest: false,
    answer: vi.fn(),
    next: vi.fn(),
    restart: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  } satisfies HookState);
  return renderToStaticMarkup(createElement(HigherLowerGame)).replaceAll("&#x27;", "'");
}

function buttons(html: string) {
  return html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
}

function button(html: string, label: string) {
  return buttons(html).find((markup) => markup.includes(`>${label}</button>`));
}

describe.each(["pl", "en"] as const)("higher/lower game screen (%s)", (locale) => {
  const copy = higherLowerCopy[locale];

  beforeEach(() => {
    mocks.locale = locale;
    mocks.useHigherLower.mockClear();
  });

  it("keeps the candidate runtime hidden until the answer and labels both choices", () => {
    const html = render();
    const candidate = html.match(/<article\b[^>]*data-side="right"[^>]*>[\s\S]*?<\/article>/)?.[0];
    expect(candidate).toBeDefined();
    expect(candidate).toContain('aria-labelledby="higher-lower-right-title"');
    expect(candidate).toContain(`aria-label="${copy.unknown}"`);
    expect(candidate).toContain("<span>?</span>");
    expect(candidate).not.toContain(">169<");
    expect(candidate).not.toContain(`>${copy.minutes}</span>`);
    expect(html).not.toContain("169 min");
    expect(html).toContain("<span>148</span>");
    expect(button(html, copy.higher)).toContain('aria-keyshortcuts="ArrowUp"');
    expect(button(html, copy.lower)).toContain('aria-keyshortcuts="ArrowDown"');
    expect(button(html, copy.higher)).not.toContain("disabled");
    expect(button(html, copy.continue)).toBeUndefined();
    expect(button(html, copy.playAgain)).toBeUndefined();
    expect(mocks.useHigherLower).toHaveBeenCalledWith(locale);
  });

  it.each(["correct", "equal"] as const)("reveals the %s result and allows only advancing", (outcome) => {
    const nextGame = game("revealed");
    nextGame.outcome = outcome;
    if (outcome === "equal") nextGame.right.runtime = nextGame.left.runtime;
    const html = render({ game: nextGame });
    expect(html).toContain(`<span>${nextGame.right.runtime}</span>`);
    expect(html).toContain(outcome === "equal" ? copy.equal : copy.correct);
    expect(html).toContain(`Interstellar: ${nextGame.right.runtime} ${copy.minutes}`);
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain(`aria-label="${copy.unknown}"`);
    expect(button(html, copy.continue)).toBeDefined();
    expect(button(html, copy.higher)).toBeUndefined();
    expect(button(html, copy.lower)).toBeUndefined();
    expect(button(html, copy.playAgain)).toBeUndefined();
  });

  it("ends a failed streak with replay and a named share action", () => {
    const html = render({ game: game("finished") });
    expect(html).toContain("<span>169</span>");
    expect(html).toContain(copy.wrong);
    expect(html).toContain(copy.gameOver);
    expect(button(html, copy.playAgain)).toBeDefined();
    expect(buttons(html).find((markup) => markup.includes(`aria-label="${copy.share}"`))).toBeDefined();
    expect(button(html, copy.continue)).toBeUndefined();
    expect(button(html, copy.higher)).toBeUndefined();
    expect(button(html, copy.lower)).toBeUndefined();
  });

  it("distinguishes a new personal best from an ordinary finished run", () => {
    const html = render({ game: game("finished"), isNewBest: true, best: 3 });
    expect(html).toContain(copy.newBest);
    expect(html).not.toContain(copy.gameOver);
  });

  it("disables both guesses while an answer is pending and keeps its value hidden", () => {
    const html = render({ pending: true });
    expect(button(html, copy.higher)).toContain('disabled=""');
    expect(button(html, copy.lower)).toContain('disabled=""');
    expect(html).toContain(copy.checking);
    expect(html).toContain(`aria-label="${copy.unknown}"`);
    expect(html).not.toContain(">169<");
  });

  it.each([
    ["invalid_session", "sessionExpired", "playAgain"],
    ["rate_limit", "rateLimited", "tryAgain"],
    ["game_unavailable", "error", "tryAgain"],
  ] as const)("offers localized recovery for %s without enabling stale guesses", (error, message, action) => {
    const html = render({ error });
    expect(html).toContain('role="alert"');
    expect(html).toContain(copy[message]);
    expect(button(html, copy[action])).toBeDefined();
    expect(button(html, copy.higher)).toContain('disabled=""');
    expect(button(html, copy.lower)).toContain('disabled=""');
  });

  it("renders initial loading without guess actions and provides a labelled rules dialog", () => {
    const html = render({ game: null, pending: true });
    expect(html).toContain(copy.loading);
    expect(html).toContain(`>${copy.title}</h1>`);
    expect(html).toContain('href="/play"');
    expect(html).toContain(`aria-label="${copy.back}"`);
    expect(html).not.toContain("<article");
    expect(button(html, copy.higher)).toBeUndefined();
    expect(button(html, copy.lower)).toBeUndefined();
    expect(html).toMatch(/<dialog\b[^>]*aria-labelledby="higher-lower-rules"/);
    expect(html).toContain('id="higher-lower-rules"');
    expect(html).toContain(copy.rulesTitle);
    expect(html).toContain(copy.rulesBody);
    expect(buttons(html).find((markup) => markup.includes(`aria-label="${copy.close}"`))).toBeDefined();
  });
});
