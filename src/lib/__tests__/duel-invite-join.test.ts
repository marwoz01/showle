import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDuelInviteUrl, parseDuelInvitation } from "@/lib/duel-invite";

const db = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn(), view: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { duelRoom: db } }));
vi.mock("@/lib/duel-rate-limit", () => ({ allowDuelRequest: () => true }));
vi.mock("@/lib/duel-room", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/duel-room")>(),
  getDuelRoomView: db.view,
}));
import { POST } from "@/app/api/duel/rooms/route";

const waitingRoom = {
  code: "ABCDEF", mode: "duel", status: "waiting", hostId: "host-1234", guestId: null,
  expiresAt: new Date("2099-01-01"),
};
function join(playerId = "guest-1234", code = "ABCDEF") {
  return POST(new NextRequest("https://showle.example/api/duel/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-duel-player": playerId },
    body: JSON.stringify({ action: "join", name: "Friend", playerId, code, locale: "pl", mode: "duel" }),
  }));
}
beforeEach(() => {
  vi.clearAllMocks();
  db.findUnique.mockResolvedValue(waitingRoom);
  db.updateMany.mockResolvedValue({ count: 1 });
  db.view.mockResolvedValue({ code: "ABCDEF", you: "guest", status: "playing", question: null });
});

describe("joining with a shared room link (isolated database)", () => {
  it("joins the exact linked room with the recipient's own identity", async () => {
    const link = new URL(buildDuelInviteUrl("https://showle.example", waitingRoom.code));
    const invitation = parseDuelInvitation(link.searchParams.get("code") ?? undefined);
    expect(invitation.status).toBe("valid");
    if (invitation.status !== "valid") throw new Error("Invalid test invitation");
    const response = await join("friend-1234", invitation.code);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ code: "ABCDEF", you: "guest", question: null });
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { code: "ABCDEF", status: "waiting", guestId: null },
      data: { guestId: "friend-1234", guestName: "Friend", status: "playing", roundStartedAt: null, roundEndsAt: null },
    });
    expect(db.view).toHaveBeenCalledWith("ABCDEF", "friend-1234");
    expect(db.create).not.toHaveBeenCalled();
  });
  it.each([null, { ...waitingRoom, expiresAt: new Date(0) }])("rejects missing or expired linked rooms %#", async (room) => {
    db.findUnique.mockResolvedValue(room);
    const response = await join();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "room_not_found" });
    expect(db.updateMany).not.toHaveBeenCalled();
  });
  it.each([
    { ...waitingRoom, guestId: "other-1234" },
    { ...waitingRoom, status: "playing" },
    { ...waitingRoom, status: "finished" },
    { ...waitingRoom, mode: "practice" },
  ])("does not admit an outsider into an unavailable room %#", async (room) => {
    db.findUnique.mockResolvedValue(room);
    const response = await join();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "room_full" });
    expect(db.updateMany).not.toHaveBeenCalled();
    expect(db.view).not.toHaveBeenCalled();
  });
  it.each(["host-1234", "guest-1234"])("reconnects a known participant without taking a second slot (%s)", async (playerId) => {
    db.findUnique.mockResolvedValue({ ...waitingRoom, status: "playing", guestId: "guest-1234" });
    expect((await join(playerId)).status).toBe(200);
    expect(db.view).toHaveBeenCalledWith("ABCDEF", playerId);
    expect(db.updateMany).not.toHaveBeenCalled();
  });
  it("reports a full room if someone else takes the guest slot during joining", async () => {
    db.updateMany.mockResolvedValue({ count: 0 });
    expect((await join()).status).toBe(409);
    expect(db.view).not.toHaveBeenCalled();
  });
  it("rejects a malformed code before reading the room", async () => {
    expect((await join("guest-1234", "bad")).status).toBe(400);
    expect(db.findUnique).not.toHaveBeenCalled();
  });
});
