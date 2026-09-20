import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DuelRoomView } from "@/types/duel";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import experience from "@/i18n/experience";

const language = vi.hoisted(() => ({ locale: "pl" as "pl" | "en" }));
const renderState = vi.hoisted(() => ({ room: null as DuelRoomView | null, injected: false }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: <T>(initialState: T | (() => T)) => {
      // The room is FrameGame's first nullable state. Inject a server snapshot
      // while preserving React's real hooks and the component's rendering logic.
      if (initialState === null && !renderState.injected) {
        renderState.injected = true;
        return react.useState(renderState.room);
      }
      return react.useState(initialState);
    },
  };
});
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.locale === "pl" ? pl : en, locale: language.locale }) }));
vi.mock("@gsap/react", () => ({ useGSAP: () => undefined }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import FrameGame from "@/components/game/FrameGame";

const start = Date.parse("2026-09-20T12:00:00Z");
const room: DuelRoomView = {
  code: "ABCDEF", mode: "duel", matchNumber: 1, serverNow: new Date(start - 3000).toISOString(),
  status: "playing", you: "host", currentRound: 1, totalRounds: 6,
  roundStartsAt: null, roundEndsAt: null, roundResolvedAt: null, roundWinner: null, winner: null,
  history: [], nextFramePath: null, question: null,
  players: [
    { role: "host", name: "Host", score: 950, roundPoints: 0, answered: false, answerIndex: null, ready: true, rematch: false },
    { role: "guest", name: "Guest", score: 950, roundPoints: 0, answered: false, answerIndex: null, ready: false, rematch: false },
  ],
};

function render(view: DuelRoomView, now = start) {
  renderState.room = view;
  renderState.injected = false;
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  try {
    return renderToStaticMarkup(createElement(FrameGame, { solo: false }));
  } finally {
    clock.mockRestore();
  }
}

describe.each(["pl", "en"] as const)("duel round presentation (%s)", (locale) => {
  it("waits for the actual round start before displaying 3", () => {
    language.locale = locale;
    const html = render(room);
    expect(html).toContain(experience[locale].prepare);
    expect(html).not.toMatch(/>3<\/p>/);
  });

  it("gives 3, 2 and 1 exactly one second each", () => {
    language.locale = locale;
    const ready = { ...room, roundStartsAt: new Date(start).toISOString(), roundEndsAt: new Date(start + 10000).toISOString() };
    for (const [elapsed, digit] of [[0, 3], [999, 3], [1000, 2], [1999, 2], [2000, 1], [2999, 1]]) {
      expect(render(ready, start - 3000 + elapsed)).toContain(`>${digit}</p>`);
    }
    expect(render(ready, start)).not.toMatch(/>[123]<\/p>/);
  });

  it("does not reveal the frame or answers before the server releases them", () => {
    language.locale = locale;
    const html = render({ ...room, roundStartsAt: new Date(start).toISOString() }, start - 1000);
    expect(html).toContain('>1</p>');
    expect(html).not.toContain('image.tmdb.org/t/p/');
    expect(html).toContain('aria-label="A"');
    expect(html).toContain('aria-label="D"');
    expect(html.match(/disabled=""/g)).toHaveLength(4);
  });

  it("keeps scores and an accessible time bar without the removed chrome", () => {
    language.locale = locale;
    const t = locale === "pl" ? pl : en;
    const html = render({ ...room, currentRound: 0 });
    expect(html).toContain('data-testid="score-host">950</span>');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain(`aria-label="${experience[locale].remainingTime}"`);
    expect(html).not.toContain(t.duel.round(1, 6));
    expect(html).not.toContain(experience[locale].tiedScore);
    expect(html).not.toContain('>10s<');
    expect(html).not.toContain('animate-spin');
    expect(html).not.toContain('Gdy oboje');
    expect(html).not.toContain('When both players');
  });

  it("requests the smaller frame immediately without a rotating loader", () => {
    language.locale = locale;
    const html = render({ ...room, roundStartsAt: new Date(start).toISOString(), roundEndsAt: new Date(start + 10000).toISOString(),
      question: { imagePath: "/frame.jpg", options: [{ title: "A", year: 2000 }, { title: "B", year: 2001 }, { title: "C", year: 2002 }, { title: "D", year: 2003 }] } });
    expect(html).toContain('https://image.tmdb.org/t/p/w780/frame.jpg');
    expect(html).toContain('fetchPriority="high"');
    expect(html).not.toContain('w1280');
    expect(html).not.toContain('animate-spin');
  });
});
