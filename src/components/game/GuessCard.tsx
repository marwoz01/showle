"use client";

import Image from "next/image";
import { GuessResult } from "@/types";
import { useTranslation } from "@/i18n";
import ComparisonTable from "@/components/game/ComparisonTable";
import { Film, UserRound } from "lucide-react";

interface GuessCardProps {
  result: GuessResult;
}

export default function GuessCard({ result }: GuessCardProps) {
  const { t } = useTranslation();
  const cast = result.guess.cast?.slice(0, 2) ?? [];
  const hasDirector =
    result.guess.director && result.guess.director !== "Unknown";

  return (
    <div
      className={`animate-guess-card-in rounded-2xl border p-4 sm:p-5 ${
        result.isCorrect
          ? "border-match-exact/40 bg-match-exact/5 shadow-lg shadow-match-exact/5"
          : "border-white/6 bg-card"
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-white/8 bg-white/4 shadow-md shadow-black/30">
          {result.guess.posterPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${result.guess.posterPath}`}
              alt={result.guess.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted/50">
              <Film size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/6 text-xs font-bold text-muted">
              #{result.attemptNumber}
            </span>
            <span className="font-semibold text-foreground">
              {result.guess.title}
            </span>
            <span className="text-sm text-muted">({result.guess.year})</span>
            {result.isCorrect && (
              <span className="ml-auto rounded-md bg-match-exact/20 px-2 py-0.5 text-xs font-semibold text-match-exact">
                {t.game.correct}
              </span>
            )}
          </div>

          {(hasDirector || cast.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="mt-4 border-t border-white/6 pt-4">
        <ComparisonTable comparison={result.comparison} />
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
    <div className="flex min-w-0 max-w-48 items-center gap-2 rounded-full border border-white/6 bg-white/3 py-1 pl-1 pr-2.5">
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/6">
        {profilePath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${profilePath}`}
            alt={name}
            fill
            sizes="28px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/60">
            <UserRound size={14} />
          </div>
        )}
      </div>
      <span className="min-w-0 leading-tight">
        <span className="block text-[9px] uppercase tracking-wider text-muted/60">
          {label}
        </span>
        <span className="block truncate text-[11px] font-semibold text-foreground/90">
          {name}
        </span>
      </span>
    </div>
  );
}
