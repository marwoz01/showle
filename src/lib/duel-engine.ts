import type { DuelRoom, Prisma } from "@prisma/client";
import {
  calculateDuelPoints,
  DUEL_REVEAL_MS,
  DUEL_ROUND_MS,
  DUEL_ROUNDS,
  type DuelQuestion,
} from "@/lib/duel";
import type { DuelRoomView } from "@/types/duel";

export type RoomAction =
  | { type: "ready"; round: number; match: number }
  | { type: "answer"; round: number; match: number; answerIndex: number }
  | { type: "rematch"; match: number; questions: DuelQuestion[] }
  | { type: "tick" };

export function answerWindowOpen(
  room: Pick<
    DuelRoom,
    "status" | "roundStartedAt" | "roundEndsAt" | "roundResolvedAt"
  >,
  now: number,
) {
  return (
    room.status === "playing" &&
    !room.roundResolvedAt &&
    Boolean(
      room.roundStartedAt &&
        room.roundEndsAt &&
        room.roundStartedAt.getTime() <= now &&
        room.roundEndsAt.getTime() > now,
    )
  );
}

function advance(room: DuelRoom, now: number) {
  if (room.status !== "playing") return;
  const bothAnswered =
    room.hostAnsweredRound === room.currentRound &&
    (room.mode === "practice" || room.guestAnsweredRound === room.currentRound);
  if (
    !room.roundResolvedAt &&
    room.roundEndsAt &&
    (room.roundEndsAt.getTime() <= now || bothAnswered)
  ) {
    room.roundResolvedAt = new Date(now);
    room.roundWinnerId =
      room.hostRoundPoints === room.guestRoundPoints
        ? null
        : room.hostRoundPoints > room.guestRoundPoints
          ? room.hostId
          : room.guestId;
    const question = (room.questions as unknown as DuelQuestion[])[
      room.currentRound
    ];
    const correct = question.options[question.correctIndex];
    room.roundHistory = [
      ...(room.roundHistory as DuelRoomView["history"]),
      {
        title: correct.title,
        year: correct.year,
        hostPoints: room.hostRoundPoints,
        guestPoints: room.guestRoundPoints,
      },
    ];
  }
  if (
    room.roundResolvedAt &&
    room.roundResolvedAt.getTime() + DUEL_REVEAL_MS <= now
  ) {
    if (room.currentRound >= DUEL_ROUNDS - 1) {
      room.status = "finished";
      return;
    }
    room.currentRound++;
    room.hostRoundPoints = 0;
    room.guestRoundPoints = 0;
    room.roundWinnerId = null;
    room.roundResolvedAt = null;
    room.roundStartedAt = null;
    room.roundEndsAt = null;
  }
}

// Pure state transitions; the database adapter serializes all writes per room.
export function transitionRoom(
  original: DuelRoom,
  playerId: string,
  action: RoomAction,
  now = Date.now(),
): DuelRoom {
  const room = { ...original };
  if (
    room.expiresAt.getTime() <= now ||
    (playerId !== room.hostId && playerId !== room.guestId)
  )
    return room;
  advance(room, now);
  const host = playerId === room.hostId;
  if (action.type === "tick" || action.match !== room.matchNumber) return room;
  if (
    action.type === "ready" &&
    room.status === "playing" &&
    !room.roundStartedAt &&
    action.round === room.currentRound
  ) {
    if (host) room.hostReadyRound = room.currentRound;
    else room.guestReadyRound = room.currentRound;
    if (
      room.hostReadyRound === room.currentRound &&
      (room.mode === "practice" || room.guestReadyRound === room.currentRound)
    ) {
      room.roundStartedAt = new Date(now + 3000);
      room.roundEndsAt = new Date(now + 3000 + DUEL_ROUND_MS);
    }
  }
  if (
    action.type === "answer" &&
    action.round === room.currentRound &&
    answerWindowOpen(room, now) &&
    Number.isInteger(action.answerIndex) &&
    action.answerIndex >= 0 &&
    action.answerIndex < 4
  ) {
    const answeredRound = host
      ? room.hostAnsweredRound
      : room.guestAnsweredRound;
    if (answeredRound !== room.currentRound) {
      const question = (room.questions as unknown as DuelQuestion[])[
        room.currentRound
      ];
      const points =
        question.correctIndex === action.answerIndex
          ? calculateDuelPoints(room.roundEndsAt!.getTime() - now)
          : 0;
      if (host) {
        room.hostAnsweredRound = room.currentRound;
        room.hostRoundPoints = points;
        room.hostScore += points;
      } else {
        room.guestAnsweredRound = room.currentRound;
        room.guestRoundPoints = points;
        room.guestScore += points;
      }
      advance(room, now);
    }
  }
  if (action.type === "rematch" && room.status === "finished") {
    if (host) room.hostRematch = true;
    else room.guestRematch = true;
    if (room.hostRematch && (room.mode === "practice" || room.guestRematch)) {
      room.questions = action.questions as unknown as Prisma.JsonValue;
      room.matchNumber++;
      room.currentRound = 0;
      room.status = "playing";
      room.hostScore = 0;
      room.guestScore = 0;
      room.hostRoundPoints = 0;
      room.guestRoundPoints = 0;
      room.hostAnsweredRound = -1;
      room.guestAnsweredRound = -1;
      room.hostReadyRound = -1;
      room.guestReadyRound = -1;
      room.hostRematch = false;
      room.guestRematch = false;
      room.roundHistory = [];
      room.roundStartedAt = null;
      room.roundEndsAt = null;
      room.roundResolvedAt = null;
      room.roundWinnerId = null;
      room.expiresAt = new Date(now + 7200000);
    }
  }
  return room;
}
