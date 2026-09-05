"use client";

import Image from "next/image";
import { GuessResult, MediaDetails } from "@/types";
import { useTranslation } from "@/i18n";
import { Film, UserRound } from "lucide-react";

interface MovieRevealCardProps {
  guesses: GuessResult[];
  answer: MediaDetails;
}

export default function MovieRevealCard({
  guesses,
  answer,
}: MovieRevealCardProps) {
  const { t } = useTranslation();

  // For each comparison label, capture the first exact value the player has revealed.
  const solved = new Map<string, string>();
  for (const result of guesses) {
    for (const field of result.comparison) {
      if (field.status === "exact" && !solved.has(field.label)) {
        solved.set(field.label, field.answerValue);
      }
    }
  }

  const year = solved.get(t.comparison.year);
  const director = solved.get(t.comparison.director);
  const runtime = solved.get(t.comparison.runtime);
  const country = solved.get(t.comparison.country);
  const leadActor = solved.get(t.comparison.leadActor);
  const genres = solved.get(t.comparison.genre);
  const budget = solved.get(t.comparison.budget);
  const popularity = solved.get(t.comparison.popularity);
  const rating = solved.get(t.comparison.rating);
  const leadActorMember = leadActor
    ? answer.cast?.find(
        (member) => member.name.toLowerCase() === leadActor.toLowerCase(),
      )
    : undefined;

  const revealedCount = [
    year,
    genres,
    country,
    director,
    leadActor,
    runtime,
    budget,
    popularity,
    rating,
  ].filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#25252a,#18181c)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.09),inset_0_-1px_0_rgba(0,0,0,.45),0_24px_55px_rgba(0,0,0,.25)]">
      <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)]">
        <section className="rounded-[1.55rem] bg-[#202024] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.055),0_10px_28px_rgba(0,0,0,.18)]">
          <div className="mystery-poster relative mx-auto flex aspect-2/3 w-40 items-center justify-center overflow-hidden rounded-[1.35rem] bg-[#121214] text-muted/30 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_35px_rgba(0,0,0,.32)] sm:w-full">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="mystery-poster-scan absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-accent-purple/12 to-transparent" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[.035] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
              <Film size={34} strokeWidth={1.5} />
            </span>
          </div>

          <div
            className="mt-4"
            aria-label={`${t.game.revealed}: ${revealedCount}/9`}
          >
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted/55">
              <span>{t.game.revealed}</span>
              <span className="text-foreground/75">{revealedCount}/9</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-linear-to-r from-accent-purple to-match-exact transition-[width] duration-500"
                style={{ width: `${(revealedCount / 9) * 100}%` }}
              />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[1.55rem] bg-[#0d0d0f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_14px_35px_rgba(0,0,0,.28)] sm:p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-purple/8 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <header className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-purple">
                {t.game.movieCard}
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold tracking-wide text-muted/45">
                ???
              </h3>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[.045] text-xs font-bold text-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
              ?
            </span>
          </header>

          <div className="relative mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
            <InfoSlot label={t.comparison.year} value={year} />
            <InfoSlot label={t.comparison.genre} value={genres} />
            <InfoSlot label={t.comparison.country} value={country} />
            <RevealPerson
              key={director ?? "director-locked"}
              label={t.comparison.director}
              name={director}
              profilePath={director ? answer.directorProfilePath : undefined}
            />
            <RevealPerson
              key={leadActor ?? "actor-locked"}
              label={t.comparison.leadActor}
              name={leadActor}
              profilePath={leadActorMember?.profilePath}
            />
            <InfoSlot label={t.comparison.runtime} value={runtime} />
            <InfoSlot label={t.comparison.budget} value={budget} />
            <InfoSlot label={t.comparison.popularity} value={popularity} />
            <InfoSlot label={t.comparison.rating} value={rating} />
          </div>
        </section>
      </div>
    </div>
  );
}

function RevealPerson({
  label,
  name,
  profilePath,
}: {
  label: string;
  name: string | undefined;
  profilePath: string | undefined;
}) {
  return (
    <div
      className={`flex h-20 min-w-0 items-center gap-2.5 rounded-2xl px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_8px_18px_rgba(0,0,0,.16)] ${
        name
          ? "animate-person-reveal bg-match-exact/8"
          : "bg-white/[.035]"
      }`}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/5">
        {name && profilePath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${profilePath}`}
            alt={name}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/35">
            <UserRound size={18} />
          </div>
        )}
      </div>
      <span className="min-w-0">
        <span className="block text-[9px] uppercase tracking-wider text-muted/60">
          {label}
        </span>
        <span
          className={`block truncate text-xs font-semibold ${name ? "text-match-exact" : "text-muted/40"}`}
        >
          {name ?? "?"}
        </span>
      </span>
    </div>
  );
}

function InfoSlot({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div
      className={`flex h-20 min-w-0 flex-col items-start justify-center gap-1 rounded-2xl px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_8px_18px_rgba(0,0,0,.16)] ${
        value ? "bg-match-exact/8" : "bg-white/[.035]"
      }`}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted/60">
        {label}
      </span>
      <span
        className={`line-clamp-2 w-full max-w-full text-xs font-semibold leading-tight [overflow-wrap:anywhere] ${value ? "text-match-exact" : "text-muted/40"}`}
        title={value}
      >
        {value ?? "?"}
      </span>
    </div>
  );
}
