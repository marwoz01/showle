"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/i18n";
import { movieChoiceRoomCopy, movieChoiceErrorMessage } from "@/i18n/movie-choice-room";
import { useMovieChoiceRoom } from "@/hooks/useMovieChoiceRoom";
import { ArrowLeft, ArrowRight, Check, Film, Loader2, RefreshCw, Sparkles, User } from "@/components/ui/icons";
import MovieChoiceInvite from "@/components/recommend/MovieChoiceInvite";
import MovieChoicePreferencesForm from "@/components/recommend/MovieChoicePreferences";
import MovieChoiceFilm from "@/components/recommend/MovieChoiceFilm";
import type { MovieChoicePreferences } from "@/types/movie-choice";

const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-purple px-5 py-3 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-accent-purple disabled:opacity-40";
const inputClass = "min-h-12 w-full rounded-xl bg-white/5 px-4 py-3 text-base outline-accent-purple placeholder:text-muted";

export default function MovieChoiceRoom({ initialCode, invalidInvitation = false }: { initialCode: string | null; invalidInvitation?: boolean }) {
  const { locale } = useTranslation();
  const c = movieChoiceRoomCopy[locale];
  const { room, loading, pending, error, send, refresh, forget } = useMovieChoiceRoom(initialCode, invalidInvitation);
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode ?? "");
  const [editingBatch, setEditingBatch] = useState<number | null>(null);
  const me = room?.players.find(player => player.role === room.you);
  const film = room?.movies.find(movie => !room.votes.some(vote => vote.movieId === movie.id));
  const message = error || room?.generationError;
  const choosing = room?.status === "waiting" || room?.status === "preferences";

  async function savePreferences(preferences: MovieChoicePreferences) {
    if (room && await send({ action: "preferences", code: room.code, batch: room.batch, preferences })) setEditingBatch(null);
  }

  async function nextBatch() {
    if (room && await send({ action: "reset", code: room.code, batch: room.batch })) setEditingBatch(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-5">
      <header>
        <Link href="/recommend" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={17} />{c.back}</Link>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{c.title}</h1>
        <p className="mt-3 text-sm text-muted sm:text-base">{c.subtitle}</p>
      </header>

      {message && <div role="alert" className="rounded-xl border border-match-partial/20 bg-match-partial/5 p-4 text-sm leading-6">
        <p>{movieChoiceErrorMessage(message, locale)}</p>
        {message !== "no_results" && room && <button type="button" disabled={pending} className="mt-2 min-h-11 font-semibold text-accent-purple underline disabled:opacity-50"
          onClick={() => room.generationError && room.preferences ? void savePreferences(room.preferences) : void refresh()}>{c.retry}</button>}
      </div>}

      {loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted"><Loader2 size={20} className="animate-spin" />{c.loading}</div> : !room ? (
        <section className="soft-card space-y-6 rounded-2xl p-5 sm:p-8">
          <p className="text-sm leading-6 text-muted">{c.entryHelp}</p>
          <label className="block space-y-2 text-sm font-semibold" htmlFor="choice-name">{c.name}
            <input id="choice-name" value={name} maxLength={24} autoComplete="nickname" disabled={pending} onChange={event => setName(event.target.value)} placeholder={c.namePlaceholder} className={inputClass} />
          </label>
          {!initialCode && <button type="button" disabled={pending || !name.trim()} className={`${primary} w-full`} onClick={() => void send({ action: "create", name: name.trim(), locale })}>
            {pending ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}{c.create}
          </button>}
          <form className={`space-y-3 ${initialCode ? "" : "border-t border-white/6 pt-5"}`} onSubmit={event => {
            event.preventDefault();
            if (name.trim() && /^[A-Z0-9]{6}$/.test(code)) void send({ action: "join", code, name: name.trim() });
          }}>
            {!initialCode && <p className="text-sm font-semibold">{c.or}</p>}
            <label htmlFor="choice-code" className="block text-xs text-muted">{c.code}</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input id="choice-code" value={code} maxLength={6} pattern="[A-Za-z0-9]{6}" autoCapitalize="characters" autoComplete="off" spellCheck={false} disabled={pending}
                onChange={event => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())} placeholder={c.codePlaceholder} className={`${inputClass} min-w-0 font-display tracking-[0.18em] sm:flex-1`} />
              <button type="submit" disabled={pending || !name.trim() || !/^[A-Z0-9]{6}$/.test(code)} className={initialCode ? primary : secondary}>{c.join}</button>
            </div>
          </form>
          {initialCode && <button type="button" disabled={pending || !name.trim()} className={`${secondary} w-full`} onClick={() => void send({ action: "create", name: name.trim(), locale })}>{c.startOver}</button>}
        </section>
      ) : <>
        <div className="grid grid-cols-2 gap-3" aria-label={c.title}>
          {room.players.map(player => <div key={player.role} className="flex min-w-0 items-center gap-3 rounded-xl bg-white/4 p-3 sm:p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-purple/15 text-accent-purple"><User size={18} /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{player.name}{player.role === room.you ? ` · ${c.you}` : ""}</p>
              <p className="mt-1 text-xs text-muted">{room.status === "voting" ? `${player.votedCount} / ${room.movies.length}` : player.ready ? c.ready : c.choosing}</p>
            </div>
            {player.ready && choosing && <Check size={15} className="ml-auto shrink-0 text-match-exact" />}
          </div>)}
          {room.players.length === 1 && <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-muted">{c.waitingForGuest}</div>}
        </div>

        {room.status === "waiting" && <MovieChoiceInvite key={room.code} code={room.code} />}

        {choosing && (room.preparing ? <div role="status" className="soft-card flex min-h-48 items-center justify-center gap-3 rounded-2xl p-6 text-sm text-muted"><Loader2 size={20} className="animate-spin" />{c.preparing}</div>
          : !me?.ready || editingBatch === room.batch ? <MovieChoicePreferencesForm key={`${room.code}:${room.batch}`} initial={room.preferences} disabled={pending} onSubmit={preferences => void savePreferences(preferences)} />
          : <section className="soft-card rounded-2xl p-6 text-center sm:p-8">
            <Check size={28} className="mx-auto mb-4 text-match-exact" />
            <h2 className="font-display text-xl font-semibold">{c.savedTitle}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{c.savedHelp}</p>
            <button type="button" disabled={pending} onClick={() => setEditingBatch(room.batch)} className={`${secondary} mt-5`}>{c.edit}</button>
          </section>)}

        {room.status === "voting" && (film ? <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted"><p>{c.privateVotes}</p><span className="shrink-0 tabular-nums">{room.votes.length + 1} / {room.movies.length}</span></div>
          <MovieChoiceFilm movie={film} pending={pending} onVote={liked => void send({ action: "vote", code: room.code, batch: room.batch, movieId: film.id, liked })} />
        </section> : <section className="soft-card rounded-2xl p-8 text-center" role="status">
          <Check size={30} className="mx-auto mb-4 text-accent-purple" />
          <h2 className="font-display text-xl font-semibold">{c.finishedTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{c.finishedHelp}</p>
        </section>)}

        {room.status === "matched" && room.match && <section className="space-y-5">
          <div className="text-center" role="status"><Sparkles size={30} className="mx-auto mb-3 text-match-exact" /><h2 className="font-display text-2xl font-semibold">{c.matchedTitle}</h2><p className="mt-2 text-sm text-muted">{c.matchedHelp}</p></div>
          <MovieChoiceFilm key={room.match.id} movie={room.match} matched />
        </section>}

        {room.status === "exhausted" && <section className="soft-card rounded-2xl p-8 text-center" role="status"><Film size={30} className="mx-auto mb-4 text-muted" /><h2 className="font-display text-xl font-semibold">{c.exhaustedTitle}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{c.exhaustedHelp}</p></section>}

        {(room.status === "matched" || room.status === "exhausted") && (room.you === "host" ? <button type="button" disabled={pending} onClick={() => void nextBatch()} className={`${primary} w-full`}><RefreshCw size={17} />{room.status === "matched" ? c.another : c.newBatch}</button> : <p className="text-center text-sm text-muted">{c.hostResets}</p>)}
        <p className="text-right"><button type="button" disabled={pending} onClick={() => { forget(); setEditingBatch(null); setCode(""); }} className="min-h-11 text-xs text-muted underline hover:text-foreground disabled:opacity-40">{c.startOver}</button></p>
      </>}
    </div>
  );
}
