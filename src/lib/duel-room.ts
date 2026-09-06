import { prisma } from "@/lib/prisma";
import { DUEL_ROUNDS, type DuelQuestion } from "@/lib/duel";
import { transitionRoom, type RoomAction } from "@/lib/duel-engine";
import type { DuelRoom, Prisma } from "@prisma/client";
import type { DuelRole, DuelRoomView } from "@/types/duel";

export async function getDuelRoomView(
  code: string,
  playerId: string,
  action: RoomAction = { type: "tick" },
): Promise<DuelRoomView | null> {
  // Reject outsiders before they can queue on a room's advisory lock.
  const member = await prisma.duelRoom.findFirst({
    where: { code, expiresAt: { gt: new Date() }, OR: [{ hostId: playerId }, { guestId: playerId }] },
    select: { code: true },
  });
  if (!member) return null;
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"duel:" + code}))`;
      const saved = await tx.duelRoom.findUnique({ where: { code } });
      if (
        !saved ||
        saved.expiresAt.getTime() <= Date.now() ||
        (saved.hostId !== playerId && saved.guestId !== playerId)
      )
        return null;
      const room = transitionRoom(saved, playerId, action);
      if (JSON.stringify(room) !== JSON.stringify(saved)) {
        const {
          code: _code,
          createdAt: _created,
          updatedAt: _updated,
          ...data
        } = room;
        void _code;
        void _created;
        void _updated;
        await tx.duelRoom.update({
          where: { code },
          data: {
            ...data,
            questions: data.questions as Prisma.InputJsonValue,
            roundHistory: data.roundHistory as Prisma.InputJsonValue,
          },
        });
      }
      return serializeRoom(room, playerId);
    },
    { timeout: 15000 },
  );
}

export function serializeRoom(room: DuelRoom, playerId: string, now = Date.now()): DuelRoomView {
  const question = (room.questions as unknown as DuelQuestion[])[
    room.currentRound
  ];
  const resolved = Boolean(room.roundResolvedAt);
  const you: DuelRole = room.hostId === playerId ? "host" : "guest";
  const winner =
    room.status !== "finished"
      ? null
      : room.hostScore === room.guestScore
        ? "draw"
        : room.hostScore > room.guestScore
          ? "host"
          : "guest";
  return {
    code: room.code,
    mode: room.mode === "practice" ? "practice" : "duel",
    matchNumber: room.matchNumber,
    status: room.status as DuelRoomView["status"],
    you,
    serverNow: new Date(now).toISOString(),
    roundStartsAt: room.roundStartedAt?.toISOString() ?? null,
    history:
      room.status === "finished"
        ? (room.roundHistory as DuelRoomView["history"])
        : [],
    players: [
      {
        role: "host",
        name: room.hostName,
        score: room.hostScore - (!resolved ? room.hostRoundPoints : 0),
        roundPoints: resolved ? room.hostRoundPoints : 0,
        answered: room.hostAnsweredRound === room.currentRound,
        answerIndex:
          room.hostAnsweredRound === room.currentRound &&
          (resolved || you === "host")
            ? (room.hostAnswerIndex ?? null)
            : null,
        ready: room.hostReadyRound === room.currentRound,
        rematch: room.hostRematch,
      },
      ...(room.guestId && room.guestName
        ? [
            {
              role: "guest" as const,
              name: room.guestName,
              score: room.guestScore - (!resolved ? room.guestRoundPoints : 0),
              roundPoints: resolved ? room.guestRoundPoints : 0,
              answered: room.guestAnsweredRound === room.currentRound,
              answerIndex:
                room.guestAnsweredRound === room.currentRound &&
                (resolved || you === "guest")
                  ? (room.guestAnswerIndex ?? null)
                  : null,
              ready: room.guestReadyRound === room.currentRound,
              rematch: room.guestRematch,
            },
          ]
        : []),
    ],
    currentRound: room.currentRound,
    totalRounds: DUEL_ROUNDS,
    roundEndsAt: room.roundEndsAt?.toISOString() ?? null,
    roundResolvedAt: room.roundResolvedAt?.toISOString() ?? null,
    roundWinner: room.roundWinnerId
      ? room.roundWinnerId === room.hostId
        ? "host"
        : "guest"
      : null,
    winner,
    // A readable image is a clue even without its answer options.
    nextFramePath: null,
    question:
      room.status === "waiting" || !question || !room.roundStartedAt || room.roundStartedAt.getTime() > now
        ? null
        : {
            imagePath: question.imagePath,
            options: question.options.map(({ title, year }) => ({
              title,
              year,
            })),
            ...(resolved ? { correctIndex: question.correctIndex } : {}),
          },
  };
}

export function normalizeDuelCode(value: unknown): string {
  return typeof value === "string" && /^[a-z0-9]{6}$/i.test(value.trim())
    ? value.trim().toUpperCase()
    : "";
}
export function normalizePlayerId(value: unknown): string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(value)
    ? value
    : "";
}
export function normalizePlayerName(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, 24)
    : "";
}
