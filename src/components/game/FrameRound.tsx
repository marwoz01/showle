"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { normalizeDisplayText } from "@/lib/typography";
import type { DuelRoomView } from "@/types/duel";
import type { FrameRoomController } from "@/hooks/useFrameRoom";
import FrameScoreboard from "@/components/game/FrameScoreboard";
import FrameAnswers from "@/components/game/FrameAnswers";
import { FRAME_ACTION_CLASS as actionClass } from "@/constants/frame-ui";
export default function FrameRound({ room, game, solo }: { room: DuelRoomView; game: FrameRoomController; solo: boolean }) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const { pending, error, me, now, selected, roundKey, ready } = game;
  const [loadedKey, setLoadedKey] = useState("");
  const [failedKey, setFailedKey] = useState("");
  const [imageRetry, setImageRetry] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const [rewardLayer, setRewardLayer] = useState<HTMLDivElement | null>(null);
  const resolved = Boolean(room?.roundResolvedAt);
  const startsAt = room?.roundStartsAt ? Date.parse(room.roundStartsAt) : null;
  const countdown = startsAt
    ? Math.max(0, Math.ceil((startsAt - now) / 1000))
    : 0;
  const remaining = room?.roundEndsAt
    ? Math.max(0, Math.min(10000, Date.parse(room.roundEndsAt) - now))
    : 10000;
  const playable = Boolean(
    startsAt &&
    countdown === 0 &&
    remaining > 0 &&
    room?.question &&
    loadedKey === roundKey &&
    !resolved,
  );
  const selectedIndex =
    me?.answerIndex ?? (selected?.key === roundKey ? selected.index : null);

  return (
        <div className="relative flex min-h-0 flex-1 flex-col gap-3">
          <FrameScoreboard
            room={room}
            frameRef={frameRef}
            rewardLayer={rewardLayer}
          />
          <div
            ref={setRewardLayer}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30"
          />
          <section className="frame-stage soft-panel overflow-hidden rounded-3xl p-2">
            <div className="frame-stage__inner overflow-hidden rounded-[1.25rem] bg-[#121214]">
              <div
                ref={frameRef}
                className="frame-stage__image relative h-[clamp(14rem,45vh,28rem)] bg-black"
              >
                {room.question && (
                  <Image
                    key={`${roundKey}:${imageRetry}`}
                    unoptimized
                    src={`https://image.tmdb.org/t/p/w780${room.question.imagePath}`}
                    alt={t.duel.chooseAnswer}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1000px"
                    priority
                    fetchPriority="high"
                    className={`object-contain ${startsAt && countdown === 0 ? "visible" : "invisible"}`}
                    onLoad={() => {
                      setLoadedKey(roundKey);
                      setFailedKey("");
                    }}
                    onError={() => setFailedKey(roundKey)}
                  />
                )}
                {(!startsAt || countdown > 0 || loadedKey !== roundKey) && (
                  <div className="frame-stage__intro absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#141418] px-6 text-center">
                    {countdown > 0 ? (
                      <p
                        role="status"
                        aria-live="polite"
                        className="text-7xl font-bold tabular-nums text-accent-purple"
                      >
                        {countdown}
                      </p>
                    ) : failedKey === roundKey ? (
                      <>
                        <p className="text-muted">{copy.frameError}</p>
                        <button
                          className={actionClass}
                          onClick={() => {
                            setFailedKey("");
                            setImageRetry((n) => n + 1);
                          }}
                        >
                          {t.common.tryAgain}
                        </button>
                      </>
                    ) : startsAt ? (
                      <p role="status" className="text-sm text-muted">{copy.loadingFrame}</p>
                    ) : room.currentRound > 0 ? (
                      error ? (
                        <button
                          disabled={pending}
                          onClick={ready}
                          className={actionClass}
                        >
                          {t.common.tryAgain}
                        </button>
                      ) : (
                        <p
                          role="status"
                          className="text-sm text-muted"
                        >
                          {copy.prepare}
                        </p>
                      )
                    ) : (
                      <>
                        <h2 className="text-2xl font-semibold">
                          {copy.prepare}
                        </h2>
                        {solo && (
                          <p className="frame-stage__instructions max-w-md text-sm text-muted">
                            {copy.practiceDesc}
                          </p>
                        )}
                        <button
                          disabled={pending || me?.ready}
                          onClick={ready}
                          className={actionClass}
                        >
                          {me?.ready ? copy.readyWaiting : copy.ready}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="px-3 pt-3 sm:px-5 sm:pt-4">
                <div
                  className="mb-2 flex items-center justify-between gap-2 text-xs sm:text-sm"
                  role="status"
                >
                  <p>
                    {resolved
                      ? !me?.answered
                        ? t.duel.timeUp
                        : me.roundPoints > 0
                          ? t.duel.correctAnswer(me.roundPoints)
                          : t.duel.wrongAnswer
                      : me?.answered
                        ? t.duel.answerLocked
                        : t.duel.chooseAnswer}
                  </p>
                </div>
                {resolved &&
                  !solo &&
                  room.players.some((player) => !player.answered) && (
                    <p className="mb-2 text-[11px] text-muted">
                      {room.players
                        .filter((player) => !player.answered)
                        .map((player) =>
                          player.role === room.you ? copy.you : normalizeDisplayText(player.name),
                        )
                        .join(", ")}{" "}
                      · {copy.noAnswer}
                    </p>
                  )}
                <div
                  role="progressbar"
                  aria-label={copy.remainingTime}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(remaining / 100)}
                  className="h-1.5 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    className="h-full bg-accent-purple transition-[width] duration-100 motion-reduce:transition-none"
                    style={{ width: `${remaining / 100}%` }}
                  />
                </div>
              </div>
              <FrameAnswers room={room} game={game} startsAt={startsAt} countdown={countdown} playable={playable} resolved={resolved} selectedIndex={selectedIndex} />
            </div>
          </section>
        </div>
  );
}
