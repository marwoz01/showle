"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { BarChart3, Flame, Sparkles, Telescope, Users } from "lucide-react";
import { useTranslation } from "@/i18n";
import { getTodayKey, shiftDateKey } from "@/lib/daily";
import { localizeGenre } from "@/lib/localization";
import type { GameStatus } from "@/types";
import type { DailyDistributionBucket } from "@/lib/daily-summary";
import { MAX_ATTEMPTS } from "@/constants";

gsap.registerPlugin(useGSAP);

interface DailySummaryResponse {
  betterThan: number;
  playerCount: number;
  distribution: DailyDistributionBucket[];
  currentStreak: number | null;
  maxStreak: number | null;
  tomorrow: { decade: number; genre: string | null } | null;
}

interface StoredStreak {
  current: number;
  best: number;
  lastCompletedDate: string;
}

const STREAK_STORAGE_KEY = "showle-daily-streak";
const SPARKS = Array.from({ length: 14 });

function completeLocalStreak(dateKey: string): StoredStreak {
  const fallback: StoredStreak = {
    current: 1,
    best: 1,
    lastCompletedDate: dateKey,
  };

  try {
    const saved = JSON.parse(
      localStorage.getItem(STREAK_STORAGE_KEY) ?? "null",
    ) as StoredStreak | null;
    if (!saved) {
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(fallback));
      return fallback;
    }
    if (saved.lastCompletedDate === dateKey) return saved;

    const current = saved.lastCompletedDate === shiftDateKey(dateKey, -1)
      ? saved.current + 1
      : 1;
    const next = {
      current,
      best: Math.max(saved.best, current),
      lastCompletedDate: dateKey,
    };
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return fallback;
  }
}

export default function DailyCompletionRecap({
  status,
  attempts,
  signedIn,
}: {
  status: GameStatus;
  attempts: number;
  signedIn: boolean;
}) {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const streakNumberRef = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);
  const [localStreak, setLocalStreak] = useState<StoredStreak | null>(null);
  const [summary, setSummary] = useState<DailySummaryResponse | null>(null);
  const dateKey = getTodayKey();

  useEffect(() => {
    setLocalStreak(completeLocalStreak(dateKey));
  }, [dateKey]);

  useEffect(() => {
    const controller = new AbortController();
    let latestRequest = 0;

    async function loadSummary() {
      const requestId = ++latestRequest;
      try {
        const params = new URLSearchParams({
          dateKey,
          status,
          attempts: String(attempts),
        });
        const response = await fetch(`/api/game/daily-summary?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok && requestId === latestRequest) {
          setSummary((await response.json()) as DailySummaryResponse);
        }
      } catch {
        // Local streak and neutral placeholders keep the recap useful offline.
      }
    }

    loadSummary();
    window.addEventListener("game-completed", loadSummary);
    return () => {
      controller.abort();
      window.removeEventListener("game-completed", loadSummary);
    };
  }, [attempts, dateKey, status]);

  const streak = signedIn
    ? summary?.currentStreak ?? null
    : localStreak?.current ?? null;
  const bestStreak = signedIn
    ? summary?.maxStreak ?? null
    : localStreak?.best ?? null;

  useGSAP(
    () => {
      if (streak === null || animatedRef.current) return;
      animatedRef.current = true;

      const media = gsap.matchMedia();
      media.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion);
          if (reduceMotion) {
            gsap.set(
              [".streak-orbit", ".streak-emblem", ".streak-copy", ".recap-card"],
              { autoAlpha: 1, clearProps: "transform" },
            );
            return;
          }

          const timeline = gsap.timeline({
            defaults: { ease: "power3.out" },
          });
          timeline
            .fromTo(
              ".streak-orbit",
              { autoAlpha: 0, scale: 0.35 },
              { autoAlpha: 1, scale: 1, duration: 0.75 },
            )
            .from(
              ".streak-emblem",
              { scale: 0.15, rotation: -24, duration: 0.8, ease: "back.out(2)" },
              "-=0.48",
            )
            .from(
              ".streak-flame",
              { y: 18, scale: 0.4, duration: 0.65, ease: "back.out(2.8)" },
              "-=0.5",
            )
            .fromTo(
              streakNumberRef.current,
              { innerText: Math.max(streak - 1, 0), scale: 1.5 },
              {
                innerText: streak,
                scale: 1,
                snap: { innerText: 1 },
                duration: 0.7,
                ease: "expo.out",
              },
              "-=0.42",
            )
            .from(
              ".streak-spark",
              {
                autoAlpha: 0,
                scale: 0,
                x: 0,
                y: 0,
                duration: 0.75,
                stagger: { amount: 0.28, from: "random" },
                ease: "back.out(2)",
              },
              "-=0.62",
            )
            .from(
              ".streak-copy",
              { autoAlpha: 0, y: 18, duration: 0.45 },
              "-=0.42",
            )
            .from(
              ".recap-card",
              { autoAlpha: 0, y: 24, duration: 0.5, stagger: 0.1 },
              "-=0.22",
            );
        },
        rootRef.current ?? undefined,
      );

      return () => media.revert();
    },
    { scope: rootRef, dependencies: [streak] },
  );

  const maxDistribution = Math.max(
    1,
    ...(summary?.distribution.map((bucket) => bucket.count) ?? [1]),
  );
  const tomorrowGenre = summary?.tomorrow?.genre
    ? localizeGenre(summary.tomorrow.genre, t)
    : null;

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,153,0,.16),transparent_31%),radial-gradient(circle_at_82%_10%,rgba(124,77,255,.18),transparent_34%),#101012] px-5 py-7 sm:px-8 sm:py-9"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="relative grid items-center gap-8 xl:grid-cols-[320px_1fr]">
        <div className="flex items-center gap-5 sm:gap-7 xl:flex-col xl:text-center">
          <div className="streak-orbit relative flex h-32 w-32 shrink-0 items-center justify-center sm:h-40 sm:w-40">
            <div className="absolute inset-2 rounded-full bg-orange-500/15 blur-xl" />
            <div className="absolute inset-0 rounded-full border border-dashed border-orange-300/25" />
            {SPARKS.map((_, index) => {
              const angle = (index / SPARKS.length) * Math.PI * 2;
              const radius = index % 2 === 0 ? 68 : 78;
              return (
                <span
                  key={index}
                  className="streak-spark absolute h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,.9)]"
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                  }}
                />
              );
            })}
            <div className="streak-emblem relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-linear-to-br from-amber-300 via-orange-500 to-rose-600 text-white shadow-[0_18px_55px_rgba(249,115,22,.36),inset_0_1px_0_rgba(255,255,255,.55)] sm:h-28 sm:w-28">
              <Flame className="streak-flame h-14 w-14 fill-white/25 sm:h-16 sm:w-16" strokeWidth={2.4} />
              <span
                ref={streakNumberRef}
                className="absolute text-3xl font-black tracking-tight sm:text-4xl"
              >
                {streak ?? 0}
              </span>
            </div>
          </div>

          <div className="streak-copy min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-amber-300">
              <Sparkles size={13} />
              {t.result.streakExtended}
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {streak === null ? "—" : t.result.dayStreak(streak)}
            </h3>
            <p className="mt-1 text-sm text-white/55">
              {bestStreak === null ? t.result.streakSaved : t.result.bestStreak(bestStreak)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <article className="recap-card flex min-h-52 flex-col justify-between rounded-[1.6rem] bg-white/[.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_16px_45px_rgba(0,0,0,.2)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-white/45">
              <Users size={15} />
              {t.result.yourRanking}
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-emerald-300">
                {summary ? `${summary.betterThan}%` : "—"}
              </p>
              <p className="mt-2 text-sm font-semibold leading-snug text-white">
                {summary
                  ? t.result.betterThan(summary.betterThan)
                  : t.result.calculatingResult}
              </p>
            </div>
            <p className="text-xs text-white/40">
              {summary ? t.result.playersToday(summary.playerCount) : "\u00a0"}
            </p>
          </article>

          <article className="recap-card flex min-h-52 flex-col rounded-[1.6rem] bg-white/[.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_16px_45px_rgba(0,0,0,.2)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-white/45">
              <BarChart3 size={15} />
              {t.result.answerDistribution}
            </div>
            <div className="mt-5 flex flex-1 items-end justify-between gap-1.5">
              {(summary?.distribution ?? Array.from({ length: MAX_ATTEMPTS + 1 }, (_, index) => ({
                key: String(index),
                count: 0,
                attempt: index < MAX_ATTEMPTS ? index + 1 : null,
                percentage: 0,
              }))).map((bucket) => (
                <div key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 text-center">
                  <span className="text-[10px] tabular-nums text-white/35">
                    {summary ? bucket.count : ""}
                  </span>
                  <span
                    className="distribution-bar min-h-1 rounded-full bg-linear-to-t from-violet-600 to-violet-300 shadow-[0_0_14px_rgba(139,92,246,.28)] transition-[height] duration-700"
                    style={{
                      height: summary
                        ? `${Math.max(5, (bucket.count / maxDistribution) * 72)}px`
                        : "5px",
                    }}
                  />
                  <span className="text-[10px] font-semibold text-white/45">
                    {bucket.attempt ?? t.result.missedShort}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="recap-card relative flex min-h-52 flex-col justify-between overflow-hidden rounded-[1.6rem] bg-linear-to-br from-violet-500/18 to-cyan-400/[.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.09),0_16px_45px_rgba(0,0,0,.2)]">
            <Telescope className="absolute -bottom-5 -right-4 h-28 w-28 rotate-[-12deg] text-white/[.055]" strokeWidth={1.2} />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-violet-200/60">
              <Telescope size={15} />
              {t.result.tomorrowTitle}
            </div>
            <div className="relative">
              <p className="text-xl font-bold leading-tight text-white">
                {summary?.tomorrow
                  ? t.result.tomorrowHint(
                      summary.tomorrow.decade,
                      tomorrowGenre ?? t.common.unknown,
                    )
                  : t.result.tomorrowMystery}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                {t.result.comeBackTomorrow}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
