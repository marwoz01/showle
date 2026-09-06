"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import type { DuelPlayerView, DuelRoomView } from "@/types/duel";

gsap.registerPlugin(useGSAP);

export default function FrameScoreboard({ room }: { room: DuelRoomView }) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const own = room.players.find((player) => player.role === room.you)!;
  const opponent = room.players.find((player) => player.role !== room.you);
  const difference = own.score - (opponent?.score ?? 0);
  return (
    <div className="shrink-0 space-y-1.5" data-testid="frame-scoreboard">
      <div className="flex items-center justify-between gap-3 text-[11px] text-muted sm:text-xs">
        <span>{t.duel.round(room.currentRound + 1, room.totalRounds)}</span>
        {opponent && (
          <span>
            {difference === 0
              ? copy.tiedScore
              : difference > 0
                ? copy.aheadBy(difference)
                : copy.behindBy(-difference)}
          </span>
        )}
      </div>
      <div className={`grid gap-2 ${opponent ? "grid-cols-2" : "grid-cols-1"}`}>
        <PlayerScore player={own} own room={room} />
        {opponent && <PlayerScore player={opponent} own={false} room={room} />}
      </div>
    </div>
  );
}

function PlayerScore({
  player,
  own,
  room,
}: {
  player: DuelPlayerView;
  own: boolean;
  room: DuelRoomView;
}) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const root = useRef<HTMLDivElement>(null);
  const total = useRef<HTMLSpanElement>(null);
  const token = useRef<HTMLSpanElement>(null);
  const gain = player.roundPoints;
  const score = player.score;
  const roundKey = `${room.code}:${room.matchNumber}:${room.currentRound}`;
  const resolvedAt = room.roundResolvedAt;
  const serverNow = room.serverNow;
  const format = (value: number) => Math.round(value).toLocaleString(locale);

  useGSAP(
    () => {
      const counter = total.current;
      const flying = token.current;
      if (!counter || !flying) return;
      const settle = () => {
        counter.textContent = format(score);
        flying.textContent = `+${format(gain)}`;
        gsap.set(flying, { autoAlpha: 0, x: 0, y: 0, scale: 1 });
      };
      const media = gsap.matchMedia();
      media.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          settle();
          // Don't replay an old reward after restoration or hide the authoritative total.
          if (
            context.conditions?.reduce ||
            !resolvedAt ||
            gain <= 0 ||
            document.hidden ||
            Date.parse(serverNow) - Date.parse(resolvedAt) > 1200
          )
            return;
          counter.textContent = format(score - gain);
          flying.textContent = "+0";
          const from = flying.getBoundingClientRect();
          const to = counter.getBoundingClientRect();
          const x = to.x + to.width / 2 - (from.x + from.width / 2);
          const y = to.y + to.height / 2 - (from.y + from.height / 2);
          const values = { gain: 0, total: score - gain };
          const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
          timeline
            .set(flying, { autoAlpha: 1, scale: 0.85 })
            .to(flying, { scale: 1, duration: 0.2 }, 0)
            .to(
              values,
              {
                gain,
                duration: 0.45,
                onUpdate: () => {
                  flying.textContent = `+${format(values.gain)}`;
                },
              },
              0,
            )
            .to(
              flying,
              { x, y, scale: 0.6, duration: 0.45, ease: "power2.inOut" },
              0.58,
            )
            .to(flying, { autoAlpha: 0, duration: 0.12 }, 0.93)
            .to(
              values,
              {
                total: score,
                duration: 0.25,
                onUpdate: () => {
                  counter.textContent = format(values.total);
                },
              },
              0.85,
            )
            .fromTo(
              counter,
              { scale: 1 },
              { scale: 1.14, duration: 0.13, repeat: 1, yoyo: true },
              0.95,
            );
          return () => {
            counter.textContent = format(score);
          };
        },
      );
      return () => media.revert();
    },
    {
      scope: root,
      dependencies: [roundKey, resolvedAt, score, gain, locale],
      revertOnUpdate: true,
    },
  );

  return (
    <div
      ref={root}
      className={`relative flex min-w-0 items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${own ? "bg-accent-purple/12" : "bg-cyan-400/10"}`}
      data-player-role={player.role}
    >
      <div className="min-w-0">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${own ? "text-accent-purple" : "text-cyan-300"}`}
        >
          {own ? copy.you : copy.opponent}
        </p>
        <p
          className="truncate text-xs font-medium sm:text-sm"
          title={player.name}
        >
          {player.name}
        </p>
      </div>
      <div
        className={`shrink-0 text-right ${own ? "text-accent-purple" : "text-cyan-300"}`}
        aria-label={`${player.name}: ${t.duel.points(score)}`}
      >
        <span
          ref={total}
          aria-hidden="true"
          className="inline-block text-xl font-bold tabular-nums sm:text-2xl"
          data-testid={`score-${player.role}`}
        >
          {format(score)}
        </span>
        <span aria-hidden="true" className="ml-1 text-[10px] text-muted">
          {copy.pointsShort}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-full z-30 mt-6 flex justify-center sm:mt-8"
      >
        <span
          ref={token}
          className={`invisible rounded-full px-4 py-2 text-2xl font-bold tabular-nums shadow-sm ${own ? "bg-[#2d1c52] text-[#bb9dff]" : "bg-[#10383f] text-cyan-200"}`}
          data-testid={`gain-${player.role}`}
        >
          +{format(gain)}
        </span>
      </div>
    </div>
  );
}
