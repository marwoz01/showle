"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import type { DuelRoomView } from "@/types/duel";
import { getDuelResumeCode, NO_DUEL_INVITATION, type DuelInvitation } from "@/lib/duel-invite";
import { useFramePolling } from "@/hooks/useFramePolling";
import { synchronizeDuelClock } from "@/lib/duel-clock";
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

export function useFrameRoom(solo: boolean, invitation: DuelInvitation) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState(!solo && invitation.status === "valid" ? invitation.code : "");
  const [room, setRoom] = useState<DuelRoomView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(true);
  const [selected, setSelected] = useState<{ key: string; index: number } | null>(null);
  const [now, setNow] = useState(Date.now());
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
      const clock = synchronizeDuelClock(
        timestamp,
        Date.now(),
        latest.current === 0 ? null : clockOffset.current,
      );
      latest.current = timestamp;
      clockOffset.current = clock.offset;
      setNow(clock.now);
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
    const savedCode = getDuelResumeCode(solo ? NO_DUEL_INVITATION : invitation, storageGet(storageKey));
    if (!savedCode) {
      setRestoring(false);
      return;
    }
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
      })
      .finally(() => {
        if (!ac.signal.aborted) setRestoring(false);
      });
    return () => ac.abort();
  }, [accept, invitation, solo, storageKey]);

  useFramePolling({ room, playerId, solo, accept, clockOffset, setNow, setError });
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
    ) { autoReady.current = roundKey; void ready(); }
  }, [room?.status, room?.currentRound, room?.roundStartsAt, roundKey, me?.ready, pending, error, ready]);

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
  return { room, playerId, name, code, pending, error, restoring, selected, now, roundKey, me,
    setName, setCode, setSelected, enter, leave, ready, request };
}
export type FrameRoomController = ReturnType<typeof useFrameRoom>;
