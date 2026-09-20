"use client";
import { useEffect, type RefObject } from "react";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import type { DuelRoomView } from "@/types/duel";
interface Props {
  room: DuelRoomView | null; playerId: string; solo: boolean;
  accept: (view: DuelRoomView) => void; clockOffset: RefObject<number>;
  setNow: (value: number) => void; setError: (value: string) => void;
}
export function useFramePolling({ room, playerId, solo, accept, clockOffset, setNow, setError }: Props) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
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
    setError,
  ]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const timer = setInterval(
      () => setNow(Date.now() + clockOffset.current),
      100,
    );
    return () => clearInterval(timer);
  }, [room?.status, clockOffset, setNow]);

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
  }, [room?.code, room?.matchNumber, room?.currentRound, room?.roundStartsAt, room?.status, room?.question, playerId, accept, t.duel.serverError, clockOffset, setError]);

}
