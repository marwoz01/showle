import { prisma } from "@/lib/prisma";
import {
  DUEL_REVEAL_MS,
  DUEL_ROUND_MS,
  DUEL_ROUNDS,
  type DuelQuestion,
} from "@/lib/duel";
import type { DuelRole, DuelRoomView } from "@/types/duel";

export async function getDuelRoomView(
  code: string,
  playerId: string,
): Promise<DuelRoomView | null> {
  let room = await prisma.duelRoom.findUnique({ where: { code } });
  if (!room || (room.hostId !== playerId && room.guestId !== playerId)) {
    return null;
  }

  if (room.status === "playing") {
    const now = Date.now();

    if (!room.roundResolvedAt && room.roundEndsAt && room.roundEndsAt.getTime() <= now) {
      await prisma.duelRoom.updateMany({
        where: {
          code,
          status: "playing",
          currentRound: room.currentRound,
          roundResolvedAt: null,
        },
        data: { roundResolvedAt: new Date() },
      });
      room = (await prisma.duelRoom.findUnique({ where: { code } })) ?? room;
    }

    if (
      room.roundResolvedAt &&
      room.roundResolvedAt.getTime() + DUEL_REVEAL_MS <= now
    ) {
      const isLastRound = room.currentRound >= DUEL_ROUNDS - 1;
      const nextRoundAt = new Date();

      await prisma.duelRoom.updateMany({
        where: {
          code,
          status: "playing",
          currentRound: room.currentRound,
          roundResolvedAt: room.roundResolvedAt,
        },
        data: isLastRound
          ? { status: "finished" }
          : {
              currentRound: { increment: 1 },
              roundWinnerId: null,
              roundResolvedAt: null,
              roundStartedAt: nextRoundAt,
              roundEndsAt: new Date(nextRoundAt.getTime() + DUEL_ROUND_MS),
            },
      });
      room = (await prisma.duelRoom.findUnique({ where: { code } })) ?? room;
    }
  }

  return serializeRoom(room, playerId);
}

function serializeRoom(
  room: NonNullable<Awaited<ReturnType<typeof prisma.duelRoom.findUnique>>>,
  playerId: string,
): DuelRoomView {
  const questions = room.questions as unknown as DuelQuestion[];
  const question = questions[room.currentRound];
  const resolved = Boolean(room.roundResolvedAt);
  const you: DuelRole = room.hostId === playerId ? "host" : "guest";
  const roundWinner: DuelRole | null = room.roundWinnerId
    ? room.roundWinnerId === room.hostId
      ? "host"
      : "guest"
    : null;

  let winner: DuelRoomView["winner"] = null;
  if (room.status === "finished") {
    winner =
      room.hostScore === room.guestScore
        ? "draw"
        : room.hostScore > room.guestScore
          ? "host"
          : "guest";
  }

  return {
    code: room.code,
    status: room.status as DuelRoomView["status"],
    you,
    players: [
      {
        role: "host",
        name: room.hostName,
        score: room.hostScore,
        answered: room.hostAnsweredRound === room.currentRound,
      },
      ...(room.guestId && room.guestName
        ? [
            {
              role: "guest" as const,
              name: room.guestName,
              score: room.guestScore,
              answered: room.guestAnsweredRound === room.currentRound,
            },
          ]
        : []),
    ],
    currentRound: room.currentRound,
    totalRounds: DUEL_ROUNDS,
    roundEndsAt: room.roundEndsAt?.toISOString() ?? null,
    roundResolvedAt: room.roundResolvedAt?.toISOString() ?? null,
    roundWinner,
    winner,
    question:
      room.status === "waiting" || !question
        ? null
        : {
            imagePath: question.imagePath,
            options: question.options.map(({ title, year }) => ({ title, year })),
            ...(resolved ? { correctIndex: question.correctIndex } : {}),
          },
  };
}

export function normalizeDuelCode(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
    : "";
}

export function normalizePlayerId(value: unknown): string {
  return typeof value === "string" && value.length >= 8 && value.length <= 100
    ? value
    : "";
}

export function normalizePlayerName(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, 24)
    : "";
}
