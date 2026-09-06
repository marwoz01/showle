import { describe, expect, it } from "vitest";
import type { DuelRoom } from "@prisma/client";
import { transitionRoom } from "@/lib/duel-engine";
import { createDuelQuestions } from "@/lib/duel";
const questions = createDuelQuestions(
  Array.from({ length: 12 }, (_, id) => ({
    id,
    title: `Film ${id}`,
    year: 2000,
    frames: [`/image${id}`],
    genreIds: [18],
    keywordIds: [],
    castIds: [],
    directorIds: [],
    language: "en",
    collectionId: null,
  })),
  () => 0.4,
);
const now = Date.parse("2026-09-06T12:00:00Z");
function room(mode = "duel"): DuelRoom {
  return {
    code: "ABCDEF",
    mode,
    status: "playing",
    matchNumber: 1,
    hostId: "host-1234",
    guestId: mode === "duel" ? "guest-1234" : null,
    hostName: "Host",
    guestName: "Guest",
    currentRound: 0,
    hostScore: 0,
    guestScore: 0,
    hostRoundPoints: 0,
    guestRoundPoints: 0,
    hostAnsweredRound: -1,
    guestAnsweredRound: -1,
    hostReadyRound: -1,
    guestReadyRound: -1,
    hostRematch: false,
    guestRematch: false,
    questions,
    roundHistory: [],
    roundWinnerId: null,
    roundStartedAt: null,
    roundEndsAt: null,
    roundResolvedAt: null,
    expiresAt: new Date(now + 7200000),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  } as unknown as DuelRoom;
}
function start(original: DuelRoom) {
  const hostReady = transitionRoom(
    original,
    "host-1234",
    { type: "ready", round: 0, match: 1 },
    now,
  );
  return original.mode === "practice"
    ? hostReady
    : transitionRoom(
        hostReady,
        "guest-1234",
        { type: "ready", round: 0, match: 1 },
        now,
      );
}
describe("frame-game server state machine", () => {
  it("waits for both players, then gives a 3-second countdown and full 10-second round", () => {
    const waiting = transitionRoom(
      room(),
      "host-1234",
      { type: "ready", round: 0, match: 1 },
      now,
    );
    expect(waiting.roundStartedAt).toBeNull();
    const ready = start(room());
    expect(ready.roundStartedAt?.getTime()).toBe(now + 3000);
    expect(ready.roundEndsAt?.getTime()).toBe(now + 13000);
  });
  it("rejects answers before the countdown finishes and at the deadline", () => {
    const ready = start(room());
    const action = {
      type: "answer",
      round: 0,
      match: 1,
      answerIndex: questions[0].correctIndex,
    } as const;
    expect(
      transitionRoom(ready, "host-1234", action, now + 2999).hostScore,
    ).toBe(0);
    expect(
      transitionRoom(ready, "host-1234", action, now + 13000).hostScore,
    ).toBe(0);
  });
  it("allows both correct answers, scores by time, and ignores duplicate requests", () => {
    const action = {
      type: "answer",
      round: 0,
      match: 1,
      answerIndex: questions[0].correctIndex,
    } as const;
    const host = transitionRoom(start(room()), "host-1234", action, now + 4000);
    expect(host.hostScore).toBe(950);
    expect(host.roundResolvedAt).toBeNull();
    const repeated = transitionRoom(host, "host-1234", action, now + 4500);
    expect(repeated.hostScore).toBe(950);
    const guest = transitionRoom(repeated, "guest-1234", action, now + 8000);
    expect(guest.guestScore).toBe(750);
    expect(guest.roundResolvedAt).not.toBeNull();
    expect(guest.roundHistory).toHaveLength(1);
  });
  it("does not start the next round until its frame has loaded on both devices", () => {
    const expired = transitionRoom(
      start(room()),
      "host-1234",
      { type: "tick" },
      now + 13000,
    );
    const next = transitionRoom(
      expired,
      "host-1234",
      { type: "tick" },
      now + 15500,
    );
    expect(next.currentRound).toBe(1);
    expect(next.roundEndsAt).toBeNull();
    expect(next.roundHistory).toHaveLength(1);
  });
  it("requires both rematch votes and rejects old-match answers after resetting", () => {
    const finished = {
      ...room(),
      status: "finished",
      hostScore: 5000,
      currentRound: 5,
    };
    const host = transitionRoom(
      finished,
      "host-1234",
      { type: "rematch", match: 1, questions },
      now,
    );
    expect(host.status).toBe("finished");
    const next = transitionRoom(
      host,
      "guest-1234",
      { type: "rematch", match: 1, questions },
      now,
    );
    expect(next.code).toBe("ABCDEF");
    expect(next.matchNumber).toBe(2);
    expect(next.hostScore).toBe(0);
    const stale = transitionRoom(
      next,
      "host-1234",
      { type: "ready", match: 1, round: 0 },
      now,
    );
    expect(stale.hostReadyRound).toBe(-1);
  });
  it("completes all six solo rounds without waiting for a guest", () => {
    let current = room("practice");
    let time = now;
    for (let index = 0; index < 6; index++) {
      current = transitionRoom(
        current,
        "host-1234",
        { type: "ready", round: index, match: 1 },
        time,
      );
      current = transitionRoom(
        current,
        "host-1234",
        {
          type: "answer",
          round: index,
          match: 1,
          answerIndex: questions[index].correctIndex,
        },
        time + 4000,
      );
      expect(current.roundResolvedAt).not.toBeNull();
      current = transitionRoom(
        current,
        "host-1234",
        { type: "tick" },
        time + 6500,
      );
      time += 7000;
    }
    expect(current.status).toBe("finished");
    expect(current.hostScore).toBe(5700);
    expect(current.roundHistory).toHaveLength(6);
  });
  it("does not accept actions from non-members or expired rooms", () => {
    expect(
      transitionRoom(
        room(),
        "outsider",
        { type: "ready", match: 1, round: 0 },
        now,
      ).hostReadyRound,
    ).toBe(-1);
    expect(
      transitionRoom(
        room(),
        "host-1234",
        { type: "ready", match: 1, round: 0 },
        now + 7200001,
      ).roundStartedAt,
    ).toBeNull();
  });
});
