"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Clock3,
  Film,
  LoaderCircle,
  Swords,
  Trophy,
} from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import type { DuelRoomView } from "@/types/duel";
import FrameScoreboard from "@/components/game/FrameScoreboard";

function storageGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* Keep playing in memory. */
  }
}

export default function FrameGame({ solo = false }: { solo?: boolean }) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<DuelRoomView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<{
    key: string;
    index: number;
  } | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [failedKey, setFailedKey] = useState("");
  const [imageRetry, setImageRetry] = useState(0);
  const [now, setNow] = useState(Date.now());
  const frameRef = useRef<HTMLDivElement>(null);
  const [rewardLayer, setRewardLayer] = useState<HTMLDivElement | null>(null);
  const clockOffset = useRef(0);
  const busy = useRef(false);
  const scope = useRef(0);
  const latest = useRef(0);
  const autoReady = useRef("");
  const storageKey = solo ? "showle-practice-room" : "showle-duel-room";

  const accept = useCallback(
    (view: DuelRoomView) => {
      const timestamp = Date.parse(view.serverNow);
      if (timestamp < latest.current) return;
      latest.current = timestamp;
      clockOffset.current = timestamp - Date.now();
      setNow(timestamp);
      setRoom(view);
      setCode(view.code);
      setError("");
      storageSet(storageKey, view.code);
    },
    [storageKey],
  );

  useEffect(() => {
    const id = storageGet("showle-duel-player") ?? crypto.randomUUID();
    storageSet("showle-duel-player", id);
    setPlayerId(id);
    setName(storageGet("showle-duel-name") ?? "");
    const invite = new URLSearchParams(window.location.search)
      .get("code")
      ?.trim()
      .toUpperCase();
    const savedCode = storageGet(storageKey);
    if (!solo && invite && /^[A-Z0-9]{6}$/.test(invite)) {
      setCode(invite);
      if (savedCode !== invite) return;
    }
    if (!savedCode) return;
    const ac = new AbortController();
    fetch(`/api/duel/rooms/${savedCode}`, {
      headers: { "x-duel-player": id },
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("expired");
        return response.json() as Promise<DuelRoomView>;
      })
      .then((view) => {
        if (!ac.signal.aborted) accept(view);
      })
      .catch(() => {
        if (!ac.signal.aborted) storageSet(storageKey, "");
      });
    return () => ac.abort();
  }, [accept, solo, storageKey]);

  useEffect(() => {
    if (!room?.code || !playerId || (solo && room.status === "finished"))
      return;
    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/api/duel/rooms/${room.code}`, {
          headers: { "x-duel-player": playerId },
          signal: ac.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(response.status === 404 ? "expired" : "load");
        const view: DuelRoomView = await response.json();
        if (!ac.signal.aborted) accept(view);
      } catch (issue) {
        if (!ac.signal.aborted)
          setError(
            issue instanceof Error && issue.message === "expired"
              ? copy.unavailable
              : t.duel.serverError,
          );
      } finally {
        if (!ac.signal.aborted)
          timer = setTimeout(poll, room.status === "finished" ? 1800 : 900);
      }
    };
    timer = setTimeout(poll, 900);
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [
    room?.code,
    room?.status,
    playerId,
    accept,
    solo,
    copy.unavailable,
    t.duel.serverError,
  ]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const timer = setInterval(
      () => setNow(Date.now() + clockOffset.current),
      100,
    );
    return () => clearInterval(timer);
  }, [room?.status]);

  useEffect(() => {
    if (!room?.roundStartsAt || room.status !== "playing" || room.question || !playerId) return;
    const ac = new AbortController();
    // Request the newly released clue at the deadline, not one polling interval later.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/duel/rooms/${room.code}`, {
          headers: { "x-duel-player": playerId }, cache: "no-store", signal: ac.signal,
        });
        if (!response.ok) throw new Error("load");
        const view: DuelRoomView = await response.json();
        if (!ac.signal.aborted) accept(view);
      } catch {
        if (!ac.signal.aborted) setError(t.duel.serverError);
      }
    }, Math.max(0, Date.parse(room.roundStartsAt) - Date.now() - clockOffset.current));
    return () => { clearTimeout(timer); ac.abort(); };
  }, [room?.code, room?.matchNumber, room?.currentRound, room?.roundStartsAt, room?.status, room?.question, playerId, accept, t.duel.serverError]);

  const request = useCallback(
    async (path: string, body: object) => {
      if (busy.current || !playerId) return;
      busy.current = true;
      setPending(true);
      setError("");
      const currentScope = scope.current;
      try {
        const response = await fetch(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-duel-player": playerId,
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok || !data?.code)
          throw new Error(data?.error ?? "server_error");
        if (currentScope === scope.current) accept(data);
        return true;
      } catch (issue) {
        if (currentScope !== scope.current) return;
        const key = issue instanceof Error ? issue.message : "server_error";
        const messages: Record<string, string> = {
          invalid_player: t.duel.invalidPlayer,
          invalid_code: t.duel.invalidCode,
          room_not_found: copy.unavailable,
          room_full: t.duel.roomFull,
          rate_limited: t.duel.rateLimited,
        };
        setError(messages[key] ?? t.duel.serverError);
        setSelected(null);
        return false;
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [accept, copy.unavailable, playerId, t],
  );

  const roundKey = room
    ? `${room.code}:${room.matchNumber}:${room.currentRound}`
    : "";
  const me = room?.players.find((player) => player.role === room.you);
  const ready = useCallback(async () => {
    if (!room || room.status !== "playing" || room.roundStartsAt || me?.ready) return;
    const success = await request(`/api/duel/rooms/${room.code}/action`, {
      type: "ready",
      round: room.currentRound,
      match: room.matchNumber,
    });
    if (!success) autoReady.current = "";
  }, [room, me?.ready, request]);
  useEffect(() => {
    if (
      room?.status === "playing" &&
      room.currentRound > 0 &&
      !room.roundStartsAt &&
      !me?.ready &&
      !pending &&
      !error &&
      autoReady.current !== roundKey
    ) {
      autoReady.current = roundKey;
      ready();
    }
  }, [
    room?.status,
    room?.currentRound,
    room?.roundStartsAt,
    roundKey,
    me?.ready,
    pending,
    error,
    ready,
  ]);

  function enter(action: "create" | "join") {
    const cleanName = solo ? copy.practiceTitle : name.trim();
    if (!cleanName) {
      setError(t.duel.invalidPlayer);
      return;
    }
    if (action === "join" && !/^[A-Z0-9]{6}$/.test(code)) {
      setError(t.duel.invalidCode);
      return;
    }
    storageSet("showle-duel-name", name.trim());
    void request("/api/duel/rooms", {
      action,
      name: cleanName,
      code,
      playerId,
      locale,
      mode: solo ? "practice" : "duel",
    });
  }
  function leave() {
    scope.current++;
    latest.current = 0;
    autoReady.current = "";
    storageSet(storageKey, "");
    setRoom(null);
    setCode("");
    setError("");
    setSelected(null);
    router.push("/play");
  }
  async function shareInvite() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/play/duel?code=${room.code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setError(t.common.genericError);
    }
  }
  const actionClass =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-default disabled:opacity-50";
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
    <div
      className={`mx-auto max-w-6xl ${room?.status === "playing" ? "frame-game--playing flex flex-col gap-3" : "space-y-5"}`}
    >
      {room?.status === "playing" ? (
        <button
          onClick={leave}
          className="inline-flex w-fit shrink-0 items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {t.duel.back}
        </button>
      ) : (
        <Link
          href="/play"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {t.duel.back}
        </Link>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-match-miss/10 p-4 text-sm text-match-miss"
        >
          <p>{error}</p>
          {room && (
            <button onClick={leave} className="underline">
              {t.duel.backToModes}
            </button>
          )}
        </div>
      )}
      {!room ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="soft-card rounded-3xl p-8 sm:p-10">
            {solo ? (
              <Film className="mb-6 text-accent-purple" size={32} />
            ) : (
              <Swords className="mb-6 text-accent-purple" size={32} />
            )}
            <h1 className="text-4xl font-semibold sm:text-5xl">
              {solo ? copy.practiceTitle : t.duel.title}
            </h1>
            <p className="mt-5 max-w-xl leading-relaxed text-muted">
              {solo ? copy.practiceDesc : t.duel.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {[t.duel.sixRounds, t.duel.fourAnswers, `10 ${copy.seconds}`].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/5 px-3 py-2 text-xs text-muted"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          </section>
          <section className="soft-panel flex flex-col justify-center gap-4 rounded-3xl p-7">
            {!solo && (
              <>
                <label htmlFor="player-name" className="text-sm text-muted">
                  {t.duel.nameLabel}
                </label>
                <input
                  id="player-name"
                  maxLength={24}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t.duel.namePlaceholder}
                  className="rounded-xl bg-white/5 p-3.5 outline-accent-purple"
                />
              </>
            )}
            <button
              disabled={pending || !playerId}
              onClick={() => enter("create")}
              className={actionClass}
            >
              {pending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : null}
              {solo ? copy.practiceAction : t.duel.createRoom}
            </button>
            {!solo && (
              <>
                <p className="text-center text-xs text-muted">{t.duel.or}</p>
                <label htmlFor="room-code" className="text-sm text-muted">
                  {t.duel.roomCode}
                </label>
                <input
                  id="room-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, ""),
                    )
                  }
                  className="rounded-xl bg-white/5 p-3.5 text-center text-lg tracking-widest outline-accent-purple"
                />
                <button
                  disabled={pending || !playerId}
                  onClick={() => enter("join")}
                  className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {t.duel.joinRoom}
                </button>
              </>
            )}
          </section>
        </div>
      ) : room.status === "waiting" ? (
        <section className="soft-panel mx-auto max-w-2xl rounded-3xl p-8 text-center sm:p-12">
          <Swords className="mx-auto mb-6 text-accent-purple" size={36} />
          <h1 className="text-3xl font-semibold">{t.duel.waitingTitle}</h1>
          <p className="mt-3 text-muted">{t.duel.waitingDesc}</p>
          <p className="mt-8 text-xs text-muted">{t.duel.inviteCode}</p>
          <p className="mt-2 text-4xl font-bold tracking-[.2em]">{room.code}</p>
          <button
            onClick={() => void shareInvite()}
            className={`${actionClass} mt-6`}
          >
            {copied ? <Check size={17} /> : <Clipboard size={17} />}
            {copied ? t.duel.copied : copy.inviteLink}
          </button>
          <p className="mt-6 text-sm text-muted">
            {room.players[0].name} · {copy.guestWaiting}
          </p>
          <button onClick={leave} className="mt-5 text-xs text-muted underline">
            {t.duel.backToModes}
          </button>
        </section>
      ) : room.status === "finished" ? (
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
                <p className="text-sm text-muted">{player.name}</p>
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
                  {index + 1}. {round.title}{" "}
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
      ) : (
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
                    src={`https://image.tmdb.org/t/p/w1280${room.question.imagePath}`}
                    alt={t.duel.chooseAnswer}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1000px"
                    priority
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
                      <LoaderCircle role="status" aria-label={copy.loadingFrame} className="animate-spin text-accent-purple" size={32} />
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
                          aria-label={copy.countdown}
                          className="text-7xl font-bold tabular-nums text-accent-purple"
                        >
                          3
                        </p>
                      )
                    ) : (
                      <>
                        <h2 className="text-2xl font-semibold">
                          {copy.prepare}
                        </h2>
                        <p className="frame-stage__instructions max-w-md text-sm text-muted">
                          {solo ? copy.practiceDesc : copy.readyHint}
                        </p>
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
                  <span className="flex shrink-0 items-center gap-2 tabular-nums">
                    <Clock3 size={16} />
                    {Math.ceil(remaining / 1000)}s
                  </span>
                </div>
                {resolved &&
                  !solo &&
                  room.players.some((player) => !player.answered) && (
                    <p className="mb-2 text-[11px] text-muted">
                      {room.players
                        .filter((player) => !player.answered)
                        .map((player) =>
                          player.role === room.you ? copy.you : player.name,
                        )
                        .join(", ")}{" "}
                      · {copy.noAnswer}
                    </p>
                  )}
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-accent-purple transition-[width] duration-100 motion-reduce:transition-none"
                    style={{ width: `${remaining / 100}%` }}
                  />
                </div>
              </div>
              <div
                className="grid grid-cols-2 auto-rows-fr gap-2 p-3 sm:gap-3 sm:p-5"
                data-testid="frame-answers"
              >
                {(room.question?.options ?? Array.from({ length: 4 }, () => ({ title: "", year: 0 }))).map((option, index) => (
                  <button
                    key={index}
                    title={
                      room.question && startsAt && countdown === 0
                        ? `${option.title} (${option.year})`
                        : undefined
                    }
                    aria-label={
                      !room.question || !startsAt || countdown > 0
                        ? String.fromCharCode(65 + index)
                        : undefined
                    }
                    disabled={!playable || Boolean(me?.answered) || pending}
                    onClick={() => {
                      setSelected({ key: roundKey, index });
                      void request(`/api/duel/rooms/${room.code}/answer`, {
                        answerIndex: index,
                        round: room.currentRound,
                        match: room.matchNumber,
                      });
                    }}
                    className={`frame-answer flex min-h-24 min-w-0 flex-col justify-between gap-2 rounded-2xl px-3 py-3 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple sm:px-4 sm:text-sm ${resolved && room.question?.correctIndex === index ? "bg-match-exact/15 text-match-exact" : selectedIndex === index ? (resolved ? "bg-match-miss/15 text-match-miss" : "bg-accent-purple/20 text-foreground") : "bg-white/5 text-foreground hover:enabled:bg-white/10"}`}
                  >
                    {room.question && startsAt && countdown === 0 ? (
                      <span className="line-clamp-3 leading-snug">
                        {option.title}{" "}
                        <span className="text-[10px] font-normal text-muted sm:text-xs">
                          ({option.year})
                        </span>
                      </span>
                    ) : (
                      <span aria-hidden="true" className="text-muted/30">
                        {String.fromCharCode(65 + index)}
                      </span>
                    )}
                    <span
                      className="flex min-h-4 w-full gap-1"
                      data-testid={`answer-players-${index}`}
                    >
                      {resolved &&
                        room.players
                          .filter((player) => player.answerIndex === index)
                          .map((player) => (
                            <span
                              key={player.role}
                              title={player.name}
                              className={`min-w-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${player.role === room.you ? "bg-accent-purple/20 text-[#bb9dff]" : "bg-cyan-400/15 text-cyan-200"}`}
                            >
                              {player.role === room.you
                                ? copy.you
                                : player.name}
                            </span>
                          ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
