"use client";

import { useTranslation } from "@/i18n";
import { normalizeDisplayText } from "@/lib/typography";
import type { Direction, MatchStatus } from "@/types";

const colors = {
  exact: "bg-[radial-gradient(circle_at_top,rgba(0,230,118,.13),rgba(255,255,255,.035)_72%)] text-match-exact",
  partial: "bg-[radial-gradient(circle_at_top,rgba(255,193,7,.13),rgba(255,255,255,.035)_72%)] text-match-partial",
  miss: "bg-[radial-gradient(circle_at_top,rgba(255,82,82,.12),rgba(255,255,255,.035)_72%)] text-match-miss",
};

export default function DailyMovieMetric({ label, value, status, direction, celebrate = false }: {
  label: string; value?: string; status?: MatchStatus; direction?: Direction; celebrate?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div data-status={status} data-card-celebrate={celebrate && status === "exact"}
      className={`flex min-h-20 min-w-0 flex-col items-center justify-center rounded-2xl px-2.5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.045)] ${status ? colors[status] : "bg-white/[.035] text-muted/40"}`}>
      <dt className="text-[9px] font-medium uppercase leading-3.5 tracking-wider opacity-65">{label}</dt>
      <dd className="mt-1.5 w-full text-sm font-semibold leading-5 [overflow-wrap:anywhere] sm:text-base">
        {normalizeDisplayText(value ?? "?")}
        {status && <span className="sr-only">. {t.game.mobile[status]}</span>}
        {direction && <><span aria-hidden="true" className="ml-1">{direction === "up" ? "↑" : "↓"}</span><span className="sr-only">. {direction === "up" ? t.game.mobile.higher : t.game.mobile.lower}</span></>}
      </dd>
    </div>
  );
}
