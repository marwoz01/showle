import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { DuelRoom } from "@prisma/client";

const db = vi.hoisted(() => ({ member: vi.fn(), transaction: vi.fn(), lock: vi.fn(), saved: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { duelRoom: { findFirst: db.member }, $transaction: db.transaction } }));
const now = Date.parse("2026-09-06T12:00:00Z");
const room: DuelRoom = {
  code: "ABCDEF", mode: "duel", status: "playing", matchNumber: 1,
  hostId: "host-1234", guestId: "guest-1234", hostName: "Host", guestName: "Guest",
  currentRound: 0, hostScore: 0, guestScore: 0, hostRoundPoints: 0, guestRoundPoints: 0,
  hostAnsweredRound: -1, guestAnsweredRound: -1, hostAnswerIndex: null, guestAnswerIndex: null,
  hostReadyRound: -1, guestReadyRound: -1, hostRematch: false, guestRematch: false,
  questions: [], roundHistory: [], roundWinnerId: null, roundStartedAt: null, roundEndsAt: null, roundResolvedAt: null,
  expiresAt: new Date(now + 7200000), createdAt: new Date(now), updatedAt: new Date(now),
};
const params = { params: Promise.resolve({ code: "ABCDEF" }) };
const request = (player = "host-1234", ip = "203.0.113.1", body: unknown = { type: "ready", match: 1, round: 0 }) =>
  new NextRequest("http://localhost/api/duel/rooms/ABCDEF/action", {
    method: "POST", headers: { "x-duel-player": player, "x-forwarded-for": ip }, body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  const tx = { $executeRaw: db.lock, duelRoom: { findUnique: db.saved, update: db.update } };
  db.transaction.mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
  db.member.mockResolvedValue({ code: "ABCDEF" });
  db.saved.mockResolvedValue(room);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("duel membership and request budgets", () => {
  it("rejects non-members and expired rooms before locking", async () => {
    db.member.mockResolvedValue(null);
    const { getDuelRoomView } = await import("@/lib/duel-room");
    expect(await getDuelRoomView("ABCDEF", "outsider")).toBeNull();
    expect(db.member).toHaveBeenCalledWith({
      where: { code: "ABCDEF", expiresAt: { gt: new Date(now) }, OR: [{ hostId: "outsider" }, { guestId: "outsider" }] },
      select: { code: true },
    });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.lock).not.toHaveBeenCalled();
  });
  it.each([null, { ...room, guestId: "new-guest" }, { ...room, expiresAt: new Date(now) }])(
    "rechecks membership and expiry after acquiring the lock %#", async (saved) => {
      db.saved.mockResolvedValue(saved);
      const { getDuelRoomView } = await import("@/lib/duel-room");
      expect(await getDuelRoomView("ABCDEF", "guest-1234")).toBeNull();
      expect(db.lock).toHaveBeenCalledTimes(1);
      expect(db.update).not.toHaveBeenCalled();
    });
  it("lets a legitimate member read and confirm readiness without exposing a clue", async () => {
    const { POST } = await import("@/app/api/duel/rooms/[code]/action/route");
    const response = await POST(request(), params);
    expect(response.status).toBe(200);
    const view = await response.json();
    expect(view.players[0].ready).toBe(true);
    expect(view.question).toBeNull();
    expect(db.update).toHaveBeenCalledTimes(1);
  });
  it("shares an IP budget across action/answer even when every player token changes", async () => {
    db.member.mockResolvedValue(null);
    const { POST: action } = await import("@/app/api/duel/rooms/[code]/action/route");
    const { POST: answer } = await import("@/app/api/duel/rooms/[code]/answer/route");
    for (let i = 0; i < 120; i++) {
      const response = await (i % 2 ? answer : action)(request(`player-${i}`, "203.0.113.1", { type: "ready", round: 0, match: 1, answerIndex: 0 }), params);
      expect(response.status).toBe(404);
    }
    expect((await action(request("rotated-again"), params)).status).toBe(429);
    expect(db.member).toHaveBeenCalledTimes(120);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("enforces a fixed process budget despite rotating both player and IP headers", async () => {
    db.member.mockResolvedValue(null);
    const { POST } = await import("@/app/api/duel/rooms/[code]/action/route");
    for (let i = 0; i < 600; i++) {
      expect((await POST(request(`player-${i}`, `203.0.${Math.floor(i / 250)}.${i % 250 + 1}`), params)).status).toBe(404);
    }
    // A malformed body proves the guard also executes before JSON parsing.
    const denied = new NextRequest("http://localhost/api/duel/rooms/ABCDEF/action", { method: "POST", body: "{broken" });
    expect((await POST(denied, params)).status).toBe(429);
    expect(db.member).toHaveBeenCalledTimes(600);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(["action", "answer"])("bounds the %s body and validates types before a DB lookup", async (kind) => {
    const { POST } = kind === "action" ? await import("@/app/api/duel/rooms/[code]/action/route") : await import("@/app/api/duel/rooms/[code]/answer/route");
    expect((await POST(request("host-1234", "203.0.113.1", { padding: "x".repeat(5000) }), params)).status).toBe(413);
    expect((await POST(request("host-1234", "203.0.113.1", { type: "ready", match: "1", round: 0, answerIndex: 0 }), params)).status).toBe(400);
    expect(db.member).not.toHaveBeenCalled();
  });
});
