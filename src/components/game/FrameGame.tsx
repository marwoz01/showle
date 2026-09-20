"use client";
import Link from "next/link";
import { preconnect } from "react-dom";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import { ArrowLeft, Swords } from "@/components/ui/icons";
import { normalizeDisplayText } from "@/lib/typography";
import { NO_DUEL_INVITATION, type DuelInvitation } from "@/lib/duel-invite";
import FrameGameEntry from "@/components/game/FrameGameEntry";
import DuelRoomInvite from "@/components/game/DuelRoomInvite";
import FrameResults from "@/components/game/FrameResults";
import FrameRound from "@/components/game/FrameRound";
import { useFrameRoom } from "@/hooks/useFrameRoom";
interface FrameGameProps { solo?: boolean; invitation?: DuelInvitation }
export default function FrameGame({ solo = false, invitation = NO_DUEL_INVITATION }: FrameGameProps) {
  preconnect("https://image.tmdb.org");
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const game = useFrameRoom(solo, invitation);
  const { room, error, pending, playerId, restoring, name, code, setName, setCode, enter, leave } = game;
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
        <FrameGameEntry
          solo={solo}
          invitation={invitation}
          name={name}
          code={code}
          pending={pending}
          initialized={Boolean(playerId) && !restoring}
          onNameChange={setName}
          onCodeChange={setCode}
          onEnter={enter}
        />
      ) : room.status === "waiting" ? (
        <section className="soft-panel mx-auto max-w-2xl rounded-3xl p-8 text-center sm:p-12">
          <Swords className="mx-auto mb-6 text-accent-purple" size={36} />
          <h1 className="text-3xl font-semibold">{t.duel.waitingTitle}</h1>
          <p className="mt-3 text-muted">{t.duel.waitingDesc}</p>
          <DuelRoomInvite key={room.code} code={room.code} />
          <p className="mt-6 text-sm text-muted">
            {normalizeDisplayText(room.players[0].name)} · {copy.guestWaiting}
          </p>
          <button onClick={leave} className="mt-5 text-xs text-muted underline">
            {t.duel.backToModes}
          </button>
        </section>
      ) : room.status === "finished" ? (
        <FrameResults room={room} game={game} solo={solo} />
      ) : (
        <FrameRound room={room} game={game} solo={solo} />
      )}
    </div>
  );
}
