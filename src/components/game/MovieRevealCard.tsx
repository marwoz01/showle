"use client";

import { GuessResult } from "@/types";
import { useTranslation } from "@/i18n";
import { Film } from "lucide-react";

interface MovieRevealCardProps {
  guesses: GuessResult[];
}

export default function MovieRevealCard({ guesses }: MovieRevealCardProps) {
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

  const sub = (value: string | undefined) =>
    value ? <span className="text-match-exact">{value}</span> : <span className="text-muted/40">?</span>;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-card">
      <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-start sm:gap-6">
        {/* Poster placeholder — hidden until the answer is revealed at game end */}
        <div className="flex shrink-0 justify-center sm:justify-start">
          <div className="flex h-72 w-48 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/3 text-muted/30">
            <Film size={56} strokeWidth={1.5} />
          </div>
        </div>

        {/* Details — slots fill in as exact matches happen */}
        <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
          <h3 className="text-2xl font-bold text-muted/40">???</h3>
          <p className="mt-1 text-sm text-muted">
            {sub(year)} <span className="text-muted/40">&middot;</span>{" "}
            {sub(director)} <span className="text-muted/40">&middot;</span>{" "}
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

          {/* Secondary slots — line up with the per-guess comparison grid below */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <SlotRow label={t.comparison.country} value={country} />
            <SlotRow label={t.comparison.leadActor} value={leadActor} />
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
