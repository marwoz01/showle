"use client";

import Link from "next/link";
import { Film, LoaderCircle, Swords } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import experience from "@/i18n/experience";
import type { DuelInvitation } from "@/lib/duel-invite";

interface FrameGameEntryProps {
  solo: boolean;
  invitation: DuelInvitation;
  name: string;
  code: string;
  pending: boolean;
  initialized: boolean;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onEnter: (action: "create" | "join") => void;
}

export default function FrameGameEntry({
  solo, invitation, name, code, pending, initialized, onNameChange, onCodeChange, onEnter,
}: FrameGameEntryProps) {
  const { t, locale } = useTranslation();
  const copy = experience[locale];
  const invited = !solo && invitation.status === "valid";
  const disabled = pending || !initialized;
  const actionClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-default disabled:opacity-50";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="soft-card rounded-3xl p-8 sm:p-10">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-accent-purple/15 text-accent-purple">
          {solo ? <Film size={28} /> : <Swords size={28} />}
        </div>
        <h1 className="text-4xl font-semibold sm:text-5xl">
          {solo ? copy.practiceTitle : invited ? t.duel.invitationTitle : t.duel.title}
        </h1>
        <p className="mt-5 max-w-xl leading-relaxed text-muted">
          {solo ? copy.practiceDesc : invited ? t.duel.invitationDesc : t.duel.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {[t.duel.sixRounds, t.duel.fourAnswers, `10 ${copy.seconds}`].map((label) => (
            <span key={label} className="rounded-full bg-white/5 px-3 py-2 text-xs text-muted">
              {label}
            </span>
          ))}
        </div>
      </section>
      <form
        aria-label={invited ? t.duel.joinRoom : solo ? copy.practiceTitle : t.duel.title}
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) onEnter(!solo && (invited || code) ? "join" : "create");
        }}
        className="soft-panel flex min-w-0 flex-col justify-center gap-4 rounded-3xl p-7"
      >
        {invited && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-purple/10 px-4 py-3 text-accent-purple">
            <span className="text-sm">{t.duel.roomCode}</span>
            <span className="font-mono text-lg font-semibold tracking-widest">{invitation.code}</span>
          </div>
        )}
        {!solo && invitation.status === "invalid" && (
          <p role="alert" className="rounded-xl bg-match-miss/10 p-3 text-sm text-match-miss">
            {t.duel.invalidInvitation}
          </p>
        )}
        {!solo && (
          <>
            <label htmlFor="player-name" className="text-sm text-muted">{t.duel.nameLabel}</label>
            <input
              id="player-name"
              name="playerName"
              autoComplete="nickname"
              maxLength={24}
              required
              disabled={disabled}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={t.duel.namePlaceholder}
              className="min-w-0 rounded-xl bg-white/5 p-3.5 outline-accent-purple disabled:opacity-50"
            />
          </>
        )}
        <button
          type={solo || invited ? "submit" : "button"}
          disabled={disabled}
          onClick={solo || invited ? undefined : () => onEnter("create")}
          className={actionClass}
        >
          {pending && <LoaderCircle size={18} className="animate-spin" />}
          {pending ? t.duel.connecting : solo ? copy.practiceAction : invited ? t.duel.joinRoom : t.duel.createRoom}
        </button>
        {invited ? (
          <Link href="/play/duel" className="py-2 text-center text-sm text-muted hover:text-foreground">
            {t.duel.otherRoom}
          </Link>
        ) : !solo && (
          <>
            <p className="text-center text-xs text-muted">{t.duel.or}</p>
            <label htmlFor="room-code" className="text-sm text-muted">{t.duel.roomCode}</label>
            <input
              id="room-code"
              name="roomCode"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={6}
              disabled={disabled}
              value={code}
              onChange={(event) => onCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder={t.duel.roomCodePlaceholder}
              className="min-w-0 rounded-xl bg-white/5 p-3.5 text-center text-lg tracking-widest outline-accent-purple"
            />
            <button
              type="submit"
              disabled={disabled || code.length !== 6}
              className="min-h-12 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {t.duel.joinRoom}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
