"use client";

import { GuessResult } from "@/types";
import { useTranslation } from "@/i18n";
import ComparisonTable from "./ComparisonTable";

interface GuessCardProps {
  result: GuessResult;
}

export default function GuessCard({ result }: GuessCardProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-2xl border p-5 ${
        result.isCorrect
          ? "border-match-exact/30 bg-match-exact/5"
          : "border-white/6 bg-[#12121e]"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
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

      {/* Comparison grid */}
      <ComparisonTable comparison={result.comparison} />
    </div>
  );
}
