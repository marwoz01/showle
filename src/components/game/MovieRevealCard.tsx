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
        solved.set(field.label, field.guessValue);
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

  const sub = (value: string | undefined) =>
    value ? <span className="text-match-exact">{value}</span> : <span className="text-muted/40">?</span>;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-card">
      <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-start sm:gap-6">
        {/* Poster placeholder — hidden until the answer is revealed at game end */}
        <div className="flex shrink-0 justify-center sm:justify-start">
          <div className="mystery-poster relative flex h-72 w-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/3 text-muted/30">
            <div className="mystery-poster-scan absolute inset-y-0 w-20 bg-linear-to-r from-transparent via-accent-purple/10 to-transparent" />
            <Film className="relative" size={56} strokeWidth={1.5} />
          </div>
        </div>

        {/* Details — slots fill in as exact matches happen */}
        <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
          <h3 className="text-2xl font-bold text-muted/40">???</h3>
          <p className="mt-1 text-sm text-muted">
            {sub(year)} <span className="text-muted/40">&middot;</span>{" "}
            {sub(runtime)}
          </p>

          {/* Genre tags — reveal full list when genre matches exactly */}
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {genres ? (
              genres.split(",").map((g) => (
                <span
                  key={g.trim()}
                  className="rounded-full bg-match-exact/15 px-2.5 py-0.5 text-xs font-medium text-match-exact"
                >
                  {g.trim()}
                </span>
              ))
            ) : (
              [0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/3 px-2.5 py-0.5 text-xs font-medium text-muted/40"
                >
                  ?
                </span>
              ))
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          </div>

          {/* Secondary slots — line up with the per-guess comparison grid below */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
            <SlotRow label={t.comparison.country} value={country} />
            <SlotRow label={t.comparison.budget} value={budget} />
            <SlotRow label={t.comparison.popularity} value={popularity} />
            <SlotRow label={t.comparison.rating} value={rating} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/6 px-6 py-3 text-[10px] font-medium uppercase tracking-widest text-muted/60">
        {t.game.movieCard}
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
      className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left ${
        name
          ? "animate-person-reveal border-match-exact/25 bg-match-exact/8"
          : "border-white/6 bg-white/2"
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

function SlotRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted/60">
        {label}
      </span>
      <span
        className={`truncate font-semibold ${value ? "text-match-exact" : "text-muted/40"}`}
      >
        {value ?? "?"}
      </span>
    </div>
  );
}
