"use client";
import { normalizeDisplayText } from "@/lib/typography";

import Image from "next/image";
import { GuessResult } from "@/types";
import { useTranslation } from "@/i18n";
import ComparisonTable from "@/components/game/ComparisonTable";
import { Film, UserRound } from "@/components/ui/icons";

interface GuessCardProps {
  result: GuessResult;
}

export default function GuessCard({ result }: GuessCardProps) {
  const { t } = useTranslation();
  const cast = result.guess.cast?.slice(0, 2) ?? [];
  const hasDirector =
    result.guess.director && result.guess.director !== "Unknown";

  return (
    <div className="soft-panel animate-guess-card-in rounded-[2rem] p-2 sm:p-2.5">
      <div className="grid items-stretch gap-2 2xl:grid-cols-[300px_minmax(0,1fr)]">
        <section className="soft-card flex h-full flex-col rounded-[1.55rem] p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-white/4 shadow-[0_12px_28px_rgba(0,0,0,.42)]">
              {result.guess.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${result.guess.posterPath}`}
                  alt={normalizeDisplayText(result.guess.title)}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted/50">
                  <Film size={20} />
                </div>
              )}
            </div>

            <div className="flex min-h-24 min-w-0 flex-1 items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2b2b30] text-xs font-bold text-muted shadow-[inset_0_1px_0_rgba(255,255,255,.07)]">
                  #{result.attemptNumber}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-3 min-h-15 font-display text-base font-semibold leading-5 text-foreground">
                  {normalizeDisplayText(result.guess.title)}
                </h3>
                <div className="mt-1 flex min-h-6 items-center justify-between gap-2">
                  <p className="text-sm text-muted">({result.guess.year})</p>
                  {result.isCorrect && (
                    <span className="truncate rounded-full bg-match-exact/12 px-2 py-1 text-[10px] font-semibold text-match-exact shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
                      {t.game.correct}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(hasDirector || cast.length > 0) && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3 2xl:grid-cols-1">
              {hasDirector && (
                <PersonChip
                  label={t.comparison.director}
                  name={result.guess.director}
                  profilePath={result.guess.directorProfilePath}
                />
              )}
              {cast.map((member) => (
                <PersonChip
                  key={member.name}
                  label={t.result.cast}
                  name={member.name}
                  profilePath={member.profilePath}
                />
              ))}
            </div>
          )}
        </section>

        <section className="soft-card relative overflow-hidden rounded-[1.55rem] p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-purple/7 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="comparison-region relative">
            <ComparisonTable comparison={result.comparison} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PersonChip({
  label,
  name,
  profilePath,
}: {
  label: string;
  name: string;
  profilePath?: string;
}) {
  return (
    <div className="flex h-10 min-w-0 w-full items-center gap-2 rounded-full bg-[#2a2a2f] pl-1 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,.065),0_5px_12px_rgba(0,0,0,.12)]">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/6 shadow-inner">
        {profilePath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${profilePath}`}
            alt={normalizeDisplayText(name)}
            fill
            sizes="32px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/60">
            <UserRound size={14} />
          </div>
        )}
      </div>
      <span className="min-w-0 leading-tight">
        <span className="block text-[9px] uppercase tracking-wider text-muted/55">
          {label}
        </span>
        <span className="block truncate text-[11px] font-semibold text-foreground/90">
          {normalizeDisplayText(name)}
        </span>
      </span>
    </div>
  );
}
