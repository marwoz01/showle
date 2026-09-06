"use client";

import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import type { Direction, MatchStatus } from "@/types";

interface CompactClue {
  label: string;
  value: string;
  status?: MatchStatus;
  direction?: Direction;
}

const colors: Record<MatchStatus, string> = {
  exact: "bg-match-exact/8 text-match-exact",
  partial: "bg-match-partial/8 text-match-partial",
  miss: "bg-match-miss/8 text-match-miss",
};
const symbols: Record<MatchStatus, string> = { exact: "✓", partial: "≈", miss: "×" };

export default function CompactClues({ fields }: { fields: CompactClue[] }) {
  const { t } = useTranslation();
  return (
    <dl className="grid grid-cols-2 gap-2 min-[360px]:grid-cols-3" data-compact-clues>
      {fields.map((field) => (
        <div key={field.label} className={`flex min-h-24 min-w-0 flex-col rounded-2xl p-2.5 ${field.status ? colors[field.status] : "bg-white/4 text-muted"}`}>
          <dt className="flex min-h-7 items-start justify-between gap-1 text-[10px] font-medium uppercase leading-3.5 tracking-wide">
            <span>{field.label}</span>
            {field.status && <span aria-hidden="true" className="text-xs">{symbols[field.status]}</span>}
          </dt>
          <dd className="mt-1 text-xs font-semibold leading-4 [overflow-wrap:anywhere]">
            {normalizeDisplayText(field.value)}
            {field.status && <span className="sr-only">. {t.game.mobile[field.status]}</span>}
          </dd>
          {field.direction && (
            <dd className="mt-auto pt-1 text-right text-sm leading-4">
              <span aria-hidden="true">{field.direction === "up" ? "↑" : "↓"}</span>
              <span className="sr-only">{field.direction === "up" ? t.game.mobile.higher : t.game.mobile.lower}</span>
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
