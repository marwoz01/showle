"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Clock3,
  LoaderCircle,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import { DUEL_ROUND_MS } from "@/lib/duel";
import type { DuelRoomView } from "@/types/duel";

type LobbyAction = "create" | "join";

export default function DuelPage() {
  const { t, locale } = useTranslation();
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState<DuelRoomView | null>(null);
  const [pending, setPending] = useState<LobbyAction | "answer" | null>(null);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const savedId = sessionStorage.getItem("showle-duel-player");
    const nextId = savedId || crypto.randomUUID();
    if (!savedId) sessionStorage.setItem("showle-duel-player", nextId);
    setPlayerId(nextId);
    setName(sessionStorage.getItem("showle-duel-name") ?? "");
  }, []);

  useEffect(() => {
    if (!playerId) return;
    const activeCode = sessionStorage.getItem("showle-duel-room");
    if (!activeCode) return;

    fetch(`/api/duel/rooms/${activeCode}`, {
      headers: { "x-duel-player": playerId },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as DuelRoomView;
      })
      .then((activeRoom) => {
        setRoom(activeRoom);
        setCode(activeRoom.code);
      })
      .catch(() => sessionStorage.removeItem("showle-duel-room"));
  }, [playerId]);

  const errorMessage = useCallback(
    (key: string) => {
      const messages: Record<string, string> = {
        invalid_player: t.duel.invalidPlayer,
        invalid_code: t.duel.invalidCode,
        invalid_request: t.duel.invalidCode,
        room_not_found: t.duel.roomNotFound,
        room_full: t.duel.roomFull,
        rate_limited: t.duel.rateLimited,
        server_error: t.duel.serverError,
      };
      return messages[key] ?? t.duel.serverError;
    },
    [t],
  );

  const refreshRoom = useCallback(async () => {
    if (!room?.code || !playerId || room.status === "finished") return;
    try {
      const response = await fetch(`/api/duel/rooms/${room.code}`, {
        headers: { "x-duel-player": playerId },
        cache: "no-store",
      });
      const data = (await response.json()) as DuelRoomView & { error?: string };
      if (!response.ok) throw new Error(data.error);
      setRoom(data);
    } catch (refreshError) {
      const key = refreshError instanceof Error ? refreshError.message : "server_error";
      setError(errorMessage(key));
    }
  }, [errorMessage, playerId, room?.code, room?.status]);

  useEffect(() => {
    if (!room || room.status === "finished") return;
    const interval = window.setInterval(refreshRoom, 850);
    return () => window.clearInterval(interval);
  }, [refreshRoom, room]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [room?.currentRound]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [room?.status]);

  async function enterLobby(action: LobbyAction) {
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanName) {
      setError(t.duel.invalidPlayer);
      return;
    }
    if (action === "join" && cleanCode.length !== 6) {
      setError(t.duel.invalidCode);
      return;
    }

    setPending(action);
    setError("");
    try {
      const response = await fetch("/api/duel/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          playerId,
          name: cleanName,
          code: cleanCode,
          locale,
        }),
      });
      const data = (await response.json()) as DuelRoomView & { error?: string };
      if (!response.ok) throw new Error(data.error);
      sessionStorage.setItem("showle-duel-name", cleanName);
      sessionStorage.setItem("showle-duel-room", data.code);
      setRoom(data);
      setCode(data.code);
    } catch (lobbyError) {
      const key = lobbyError instanceof Error ? lobbyError.message : "server_error";
      setError(errorMessage(key));
    } finally {
      setPending(null);
    }
  }

  async function submitAnswer(answerIndex: number) {
    if (!room || pending || room.status !== "playing") return;
    setSelectedIndex(answerIndex);
    setPending("answer");
    setError("");
    try {
      const response = await fetch(`/api/duel/rooms/${room.code}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-duel-player": playerId,
        },
        body: JSON.stringify({ answerIndex, round: room.currentRound }),
      });
      const data = (await response.json()) as DuelRoomView & { error?: string };
      if (!response.ok) throw new Error(data.error);
      setRoom(data);
    } catch (answerError) {
      const key = answerError instanceof Error ? answerError.message : "server_error";
      setError(errorMessage(key));
      setSelectedIndex(null);
    } finally {
      setPending(null);
    }
  }

  async function copyCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function resetLobby() {
    sessionStorage.removeItem("showle-duel-room");
    setRoom(null);
    setCode("");
    setSelectedIndex(null);
    setError("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/play"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        {t.duel.back}
      </Link>

      {!room ? (
        <LobbySetup
          name={name}
          code={code}
          pending={pending}
          error={error}
          onNameChange={setName}
          onCodeChange={(value) =>
            setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
          }
          onSubmit={enterLobby}
        />
      ) : room.status === "waiting" ? (
        <WaitingRoom room={room} copied={copied} onCopy={copyCode} />
      ) : room.status === "finished" ? (
        <FinishedRoom room={room} onReset={resetLobby} />
      ) : (
        <DuelGame
          room={room}
          now={now}
          selectedIndex={selectedIndex}
          pending={pending === "answer"}
          error={error}
          onAnswer={submitAnswer}
        />
      )}
    </div>
  );
}

function LobbySetup({
  name,
  code,
  pending,
  error,
  onNameChange,
  onCodeChange,
  onSubmit,
}: {
  name: string;
  code: string;
  pending: LobbyAction | "answer" | null;
  error: string;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSubmit: (action: LobbyAction) => void;
}) {
  const { t } = useTranslation();
  const disabled = Boolean(pending);

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_440px]">
      <section className="soft-card relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent-purple/15 blur-3xl" />
        <div className="relative">
          <span className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <Swords size={28} />
          </span>
          <h1 className="max-w-xl font-display text-4xl font-bold text-foreground sm:text-6xl">
            {t.duel.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {t.duel.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[t.duel.badge, t.duel.fourAnswers, t.duel.sixRounds].map((value) => (
              <span
                key={value}
                className="rounded-full bg-white/[.045] px-3 py-1.5 text-xs font-semibold text-foreground/75"
              >
                {value}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="soft-panel rounded-[2rem] p-2">
        <div className="soft-card h-full rounded-[1.55rem] p-6 sm:p-8">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t.duel.nameLabel}
          </label>
          <div className="relative mt-2">
            <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/55" size={18} />
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value.slice(0, 24))}
              placeholder={t.duel.namePlaceholder}
              className="h-13 w-full rounded-xl bg-white/[.045] pl-11 pr-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted/45 focus:shadow-[0_0_0_1px_rgba(124,77,255,.7)]"
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onSubmit("create")}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-purple text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {pending === "create" ? <LoaderCircle className="animate-spin" size={17} /> : <Swords size={17} />}
            {pending === "create" ? t.duel.connecting : t.duel.createRoom}
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted/45">
            <span className="h-px flex-1 bg-white/7" />
            {t.duel.or}
            <span className="h-px flex-1 bg-white/7" />
          </div>

          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t.duel.roomCode}
          </label>
          <input
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder={t.duel.roomCodePlaceholder}
            className="mt-2 h-13 w-full rounded-xl bg-white/[.045] px-4 text-center font-display text-lg font-bold uppercase tracking-[0.3em] text-foreground outline-none transition-shadow placeholder:text-sm placeholder:font-medium placeholder:tracking-[0.12em] placeholder:text-muted/40 focus:shadow-[0_0_0_1px_rgba(124,77,255,.7)]"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSubmit("join")}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/[.07] text-sm font-semibold text-foreground transition-colors hover:bg-white/[.11] disabled:cursor-wait disabled:opacity-60"
          >
            {pending === "join" && <LoaderCircle className="animate-spin" size={17} />}
            {pending === "join" ? t.duel.connecting : t.duel.joinRoom}
          </button>

          {error && <p className="mt-4 text-sm text-match-miss">{error}</p>}
        </div>
      </section>
    </div>
  );
}

function WaitingRoom({
  room,
  copied,
  onCopy,
}: {
  room: DuelRoomView;
  copied: boolean;
  onCopy: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="soft-panel mx-auto max-w-2xl overflow-hidden rounded-[2rem] p-2 text-center">
      <div className="soft-card rounded-[1.55rem] px-6 py-12 sm:px-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple">
          <LoaderCircle className="animate-spin" size={30} />
        </span>
        <h1 className="mt-7 font-display text-3xl font-bold text-foreground">
          {t.duel.waitingTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          {t.duel.waitingDesc}
        </p>

        <div className="mx-auto mt-8 max-w-sm rounded-2xl bg-white/[.045] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/60">
            {t.duel.inviteCode}
          </p>
          <p className="mt-2 font-display text-4xl font-bold tracking-[0.22em] text-foreground">
            {room.code}
          </p>
          <button
            type="button"
            onClick={onCopy}
            className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-accent-purple/15 px-4 py-2 text-sm font-semibold text-accent-purple transition-colors hover:bg-accent-purple/25"
          >
            {copied ? <Check size={16} /> : <Clipboard size={16} />}
            {copied ? t.duel.copied : t.duel.copyCode}
          </button>
        </div>

        <div className="mt-7 flex items-center justify-center gap-3 text-sm text-muted">
          <UserRound size={17} />
          {room.players[0]?.name}
        </div>
      </div>
    </section>
  );
}

function DuelGame({
  room,
  now,
  selectedIndex,
  pending,
  error,
  onAnswer,
}: {
  room: DuelRoomView;
  now: number;
  selectedIndex: number | null;
  pending: boolean;
  error: string;
  onAnswer: (index: number) => void;
}) {
  const { t } = useTranslation();
  const me = room.players.find((player) => player.role === room.you);
  const resolved = Boolean(room.roundResolvedAt);
  const remainingMs = room.roundEndsAt
    ? Math.max(0, new Date(room.roundEndsAt).getTime() - now)
    : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const timerWidth = `${Math.min(100, (remainingMs / DUEL_ROUND_MS) * 100)}%`;
  const feedback = resolved
    ? !me?.answered
      ? t.duel.timeUp
      : me.roundPoints > 0
        ? t.duel.correctAnswer(me.roundPoints)
        : t.duel.wrongAnswer
    : me?.answered
      ? t.duel.answerLocked
      : t.duel.chooseAnswer;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <PlayerScore player={room.players[0]} isYou={room.you === "host"} />
        <div className="flex items-center justify-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted/60">
          <Swords size={17} className="text-accent-purple" />
          {t.duel.round(room.currentRound + 1, room.totalRounds)}
        </div>
        <PlayerScore player={room.players[1]} isYou={room.you === "guest"} reverse />
      </section>

      <section className="soft-panel overflow-hidden rounded-[2rem] p-2">
        <div className="overflow-hidden rounded-[1.55rem] bg-[#0d0d0f]">
          <div className="relative h-[clamp(14rem,46vh,28rem)] w-full overflow-hidden bg-black">
            {room.question && (
              <Image
                key={room.question.imagePath}
                src={`https://image.tmdb.org/t/p/w1280${room.question.imagePath}`}
                alt={t.duel.chooseAnswer}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 900px"
                className="animate-guess-card-in object-cover"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/15" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/80">
                <span>{feedback}</span>
                <span className="flex items-center gap-1.5">
                  <Clock3 size={14} /> {secondsLeft}s
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-accent-purple transition-[width] duration-300"
                  style={{ width: timerWidth }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
            {room.question?.options.map((option, index) => {
              const correct = resolved && room.question?.correctIndex === index;
              const selectedWrong =
                resolved && selectedIndex === index && room.question?.correctIndex !== index;
              const selected = !resolved && selectedIndex === index;
              return (
                <button
                  key={`${option.title}-${option.year}`}
                  type="button"
                  disabled={Boolean(me?.answered) || resolved || pending}
                  onClick={() => onAnswer(index)}
                  className={`min-h-20 rounded-2xl px-5 py-4 text-left transition-all ${
                    correct
                      ? "bg-match-exact/16 text-match-exact shadow-[inset_0_0_0_1px_rgba(0,230,118,.35)]"
                      : selectedWrong
                        ? "bg-match-miss/15 text-match-miss shadow-[inset_0_0_0_1px_rgba(255,82,82,.3)]"
                        : selected
                          ? "bg-accent-purple/18 text-foreground shadow-[inset_0_0_0_1px_rgba(124,77,255,.55)]"
                          : "bg-white/[.045] text-foreground hover:bg-white/[.075] disabled:cursor-default"
                  }`}
                >
                  <span className="text-sm font-semibold">{option.title}</span>
                  <span className="ml-2 text-xs text-current opacity-55">({option.year})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex justify-center gap-2">
        {Array.from({ length: room.totalRounds }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === room.currentRound
                ? "w-8 bg-accent-purple"
                : index < room.currentRound
                  ? "w-4 bg-white/30"
                  : "w-4 bg-white/10"
            }`}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-match-miss">{error}</p>}
    </div>
  );
}

function PlayerScore({
  player,
  isYou,
  reverse = false,
}: {
  player: DuelRoomView["players"][number] | undefined;
  isYou: boolean;
  reverse?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-white/[.04] p-3 ${reverse ? "sm:flex-row-reverse" : ""}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isYou ? "bg-accent-purple/18 text-accent-purple" : "bg-white/6 text-muted"}`}>
        <UserRound size={19} />
      </span>
      <span className={`min-w-0 flex-1 ${reverse ? "sm:text-right" : ""}`}>
        <span className="block truncate text-sm font-semibold text-foreground">
          {player?.name ?? "—"}
        </span>
        <span className="text-xs text-muted">{t.duel.points(player?.score ?? 0)}</span>
      </span>
    </div>
  );
}

function FinishedRoom({ room, onReset }: { room: DuelRoomView; onReset: () => void }) {
  const { t } = useTranslation();
  const result = useMemo(() => {
    if (room.winner === "draw") return t.duel.draw;
    return room.winner === room.you ? t.duel.youWon : t.duel.youLost;
  }, [room.winner, room.you, t]);

  return (
    <section className="soft-panel mx-auto max-w-3xl overflow-hidden rounded-[2rem] p-2 text-center">
      <div className="soft-card rounded-[1.55rem] px-6 py-12 sm:px-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-match-partial/15 text-match-partial">
          <Trophy size={30} />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {t.duel.finished}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground sm:text-5xl">
          {result}
        </h1>

        <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          {room.players.map((player) => (
            <div key={player.role} className="rounded-2xl bg-white/[.045] p-5 text-left">
              <p className="truncate text-sm font-semibold text-foreground">{player.name}</p>
              <p className="mt-1 font-display text-2xl font-bold text-accent-purple">
                {t.duel.points(player.score)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            {t.duel.playAgain}
          </button>
          <Link
            href="/play"
            className="rounded-xl bg-white/[.06] px-5 py-3 text-sm font-semibold text-foreground hover:bg-white/[.1]"
          >
            {t.duel.backToModes}
          </Link>
        </div>
      </div>
    </section>
  );
}
