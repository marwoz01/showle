import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n";
import pl from "@/i18n/pl";
import en from "@/i18n/en";
import { parseDuelInvitation } from "@/lib/duel-invite";

const language = vi.hoisted(() => ({ locale: "pl" as Locale }));
vi.mock("@/i18n", () => ({ useTranslation: () => ({ t: language.locale === "pl" ? pl : en, locale: language.locale }) }));
vi.mock("@/components/ui/icons", () => ({
  Film: () => null, Swords: () => null, LoaderCircle: () => null, Check: () => null, Clipboard: () => null,
}));
import FrameGameEntry from "@/components/game/FrameGameEntry";
import DuelRoomInvite from "@/components/game/DuelRoomInvite";
import DuelPage from "@/app/play/duel/page";

const entryProps = {
  solo: false, invitation: parseDuelInvitation(undefined), name: "", code: "",
  pending: false, initialized: true, onNameChange: vi.fn(), onCodeChange: vi.fn(), onEnter: vi.fn(),
};

describe("invitation entry screens", () => {
  it.each(["pl", "en"] as const)("highlights joining the chosen room, not creating another one (%s)", (locale) => {
    language.locale = locale;
    const t = locale === "pl" ? pl : en;
    const html = renderToStaticMarkup(createElement(FrameGameEntry, {
      ...entryProps, invitation: parseDuelInvitation("ABCDEF"), code: "ABCDEF",
    }));
    expect(html).toContain(t.duel.joinRoom);
    expect(html).toContain("ABCDEF");
    expect(html).toContain('autoComplete="nickname"');
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('id="room-code"');
    expect(html).not.toContain(t.duel.createRoom);
    expect(html).not.toMatch(/[\u2010-\u2015\u2212]/);
  });
  it("retains the manual code and room creation flow for normal visits", () => {
    language.locale = "pl";
    const html = renderToStaticMarkup(createElement(FrameGameEntry, entryProps));
    expect(html).toContain('id="room-code"');
    expect(html).toContain(pl.duel.createRoom);
    expect(html).toContain(pl.duel.joinRoom);
  });
  it("offers recovery for a broken invitation", () => {
    language.locale = "pl";
    const html = renderToStaticMarkup(createElement(FrameGameEntry, { ...entryProps, invitation: parseDuelInvitation("") }));
    expect(html).toContain(pl.duel.invalidInvitation);
    expect(html).toContain('role="alert"');
    expect(html).toContain('id="room-code"');
  });
  it("keeps the solo entry free of invitation and name fields", () => {
    const html = renderToStaticMarkup(createElement(FrameGameEntry, {
      ...entryProps, solo: true, invitation: parseDuelInvitation("ABCDEF"),
    }));
    expect(html).not.toContain("ABCDEF");
    expect(html).not.toContain('id="player-name"');
    expect(html).not.toContain('id="room-code"');
  });
  it("renders a labelled, selectable link fallback in the waiting room", () => {
    language.locale = "pl";
    const html = renderToStaticMarkup(createElement(DuelRoomInvite, { code: "ABCDEF" }));
    expect(html).toContain(pl.duel.copyInviteLink);
    expect(html).toContain('id="duel-invite-link"');
    expect(html).toContain('readOnly=""');
    expect(html).toContain('role="status"');
    expect(html).toContain("ABCDEF");
  });
  it("processes invitations on the server and remounts the game when the room link changes", async () => {
    const a = await DuelPage({ searchParams: Promise.resolve({ code: "abcdef" }) });
    const b = await DuelPage({ searchParams: Promise.resolve({ code: "GHIJKL" }) });
    const invalid = await DuelPage({ searchParams: Promise.resolve({ code: ["ABCDEF", "GHIJKL"] }) });
    expect(a.props.invitation).toEqual({ status: "valid", code: "ABCDEF" });
    expect(a.key).not.toEqual(b.key);
    expect(invalid.props.invitation).toEqual({ status: "invalid" });
    expect(invalid.key).not.toEqual(a.key);
  });
});
