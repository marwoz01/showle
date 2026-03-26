"use client";

import { useTranslation } from "@/i18n";

type StatusFilter = "all" | "won" | "lost";

interface HistoryFiltersProps {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}

const FILTERS: StatusFilter[] = ["all", "won", "lost"];

export default function HistoryFilters({ value, onChange }: HistoryFiltersProps) {
  const { t } = useTranslation();

  const labels: Record<StatusFilter, string> = {
    all: t.history.filterAll,
    won: t.history.filterWon,
    lost: t.history.filterLost,
  };

  return (
    <div className="flex rounded-lg border border-white/6 bg-white/3 p-1">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === filter
              ? "bg-white/10 text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {labels[filter]}
        </button>
      ))}
    </div>
  );
}
