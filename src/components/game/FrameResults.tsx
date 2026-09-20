"use client";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { Trophy } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import type { DuelRoomView } from "@/types/duel";
import type { FrameRoomController } from "@/hooks/useFrameRoom";
import { FRAME_ACTION_CLASS as actionClass } from "@/constants/frame-ui";
export default function FrameResults({ room, game, solo }: { room: DuelRoomView; game: FrameRoomController; solo: boolean }) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const { pending, me, request, leave } = game;
  return (
        <section className="soft-panel mx-auto max-w-3xl rounded-3xl p-7 text-center sm:p-10">
          <Trophy className="mx-auto mb-5 text-match-partial" size={36} />
          <h1 className="text-3xl font-semibold">
            {solo
              ? copy.practiceFinished
              : room.winner === "draw"
                ? t.duel.draw
                : room.winner === room.you
                  ? t.duel.youWon
                  : t.duel.youLost}
          </h1>
          {solo && (
            <p className="mt-3 text-muted">
              {copy.correctCount(
                room.history.filter((round) => round.hostPoints > 0).length,
              )}
            </p>
          )}
          <div className={`mt-7 grid gap-4 ${solo ? "" : "sm:grid-cols-2"}`}>
            {room.players.map((player) => (
              <div key={player.role} className="soft-card rounded-2xl p-5">
                <p className="text-sm text-muted">{normalizeDisplayText(player.name)}</p>
                <p className="mt-2 text-3xl font-bold text-accent-purple">
                  {t.duel.points(player.score)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-7 text-left">
            <h2 className="mb-3 text-sm font-semibold text-muted">
              {copy.breakdown}
            </h2>
            {room.history.map((round, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 border-t border-white/5 py-3 text-sm"
              >
                <span className="min-w-0">
                  {index + 1}. {normalizeDisplayText(round.title)}{" "}
                  <span className="text-muted">({round.year})</span>
                </span>
                <b className="shrink-0 text-accent-purple">
                  {t.duel.points(
                    room.you === "host" ? round.hostPoints : round.guestPoints,
                  )}
                </b>
              </div>
            ))}
          </div>
          {!solo &&
            room.players.some(
              (player) => player.role !== room.you && player.rematch,
            ) && (
              <p role="status" className="mt-4 text-sm text-muted">
                {copy.rematchRequested}
              </p>
            )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              disabled={pending || Boolean(me?.rematch)}
              className={actionClass}
              onClick={() =>
                void request(`/api/duel/rooms/${room.code}/action`, {
                  type: "rematch",
                  match: room.matchNumber,
                  locale,
                })
              }
            >
              {solo
                ? copy.newPractice
                : me?.rematch
                  ? copy.rematchWaiting
                  : copy.rematch}
            </button>
            <button
              onClick={leave}
              className="rounded-xl bg-white/5 px-5 py-3 text-sm"
            >
              {t.duel.backToModes}
            </button>
          </div>
        </section>
  );
}
