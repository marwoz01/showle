"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "@/i18n";

interface HeatmapEntry {
  dateKey: string;
  status: string;
  attemptCount: number;
}

interface DayCell {
  dateKey: string;
  iso: string;
  outcome: "none" | "lost" | "won";
  attemptCount: number;
}

const WEEKS = 53;
const DAY_LABELS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKeyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Build a 53-week × 7-day grid ending today, anchored to Monday-start weeks.
function buildGrid(results: HeatmapEntry[]): DayCell[][] {
  const lookup = new Map(results.map((r) => [r.dateKey, r]));

  const today = new Date();
  // Find the Monday of the week containing today (Mon = 0 in our shifted scheme).
  const todayDow = (today.getDay() + 6) % 7;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - todayDow);

  // Start: 52 weeks before the last Monday → 53 columns total.
  const start = new Date(lastMonday);
  start.setDate(lastMonday.getDate() - (WEEKS - 1) * 7);

  const grid: DayCell[][] = [];
  for (let week = 0; week < WEEKS; week++) {
    const column: DayCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(start);
      d.setDate(start.getDate() + week * 7 + dow);
      const iso = dateKeyOf(d);
      const entry = lookup.get(iso);
      const inFuture = d > today;
      column.push({
        dateKey: iso,
        iso,
        outcome: inFuture ? "none" : entry ? (entry.status === "won" ? "won" : "lost") : "none",
        attemptCount: entry?.attemptCount ?? 0,
      });
    }
    grid.push(column);
  }
  return grid;
}

function cellClass(cell: DayCell): string {
  if (cell.outcome === "none") return "bg-white/5";
  if (cell.outcome === "lost") return "bg-match-miss/35";
  // Win — intensity grows with fewer attempts (fewer = better).
  if (cell.attemptCount <= 2) return "bg-match-exact";
  if (cell.attemptCount <= 4) return "bg-match-exact/70";
  return "bg-match-exact/40";
}

export default function GameHeatmap() {
  const { t, locale } = useTranslation();
  const [results, setResults] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/user/heatmap", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.results) setResults(data.results as HeatmapEntry[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const grid = useMemo(() => buildGrid(results), [results]);
  const dayLabels = locale === "pl" ? DAY_LABELS_PL : DAY_LABELS_EN;

  // Compute month labels — first column of each new month gets the label.
  const monthLabels = useMemo(() => {
    const out: { col: number; label: string }[] = [];
    let prevMonth = -1;
    grid.forEach((column, col) => {
      // Use the Monday of this column to detect month change.
      const date = new Date(column[0].iso);
      const m = date.getMonth();
      if (m !== prevMonth) {
        out.push({ col, label: date.toLocaleDateString(locale, { month: "short" }) });
        prevMonth = m;
      }
    });
    return out;
  }, [grid, locale]);

  const won = results.filter((r) => r.status === "won").length;
  const played = results.length;

  return (
    <div className="soft-card rounded-xl p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t.stats.activityTitle}
        </h2>
        {!loading && (
          <p className="text-xs text-muted">
            {t.stats.activitySummary(won, played)}
          </p>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        {/* Single CSS grid: row 1 = month labels, rows 2-8 = day labels + cells.
            Columns scale 1fr each so the heatmap fills the card; min-width keeps
            cells legible on mobile (overflow-x-auto kicks in below threshold). */}
        <div
          className="grid min-w-160 gap-1"
          style={{
            gridTemplateColumns: `1.75rem repeat(${WEEKS}, minmax(0, 1fr))`,
          }}
        >
          {/* Row 1: empty corner + month labels */}
          <div />
          {Array.from({ length: WEEKS }).map((_, col) => {
            const label = monthLabels.find((m) => m.col === col)?.label;
            return (
              <div
                key={`m${col}`}
                className="text-[10px] leading-3 text-muted/60"
              >
                {label ?? ""}
              </div>
            );
          })}

          {/* Rows 2-8: day-of-week label + 53 cells */}
          {Array.from({ length: 7 }).flatMap((_, dow) => [
            <div
              key={`d${dow}`}
              className="self-center text-[10px] text-muted/60"
              style={{ visibility: dow % 2 === 0 ? "visible" : "hidden" }}
            >
              {dayLabels[dow]}
            </div>,
            ...grid.map((column, col) => {
              const cell = column[dow];
              return (
                <div
                  key={`${col}-${dow}`}
                  title={`${cell.iso}${
                    cell.outcome === "won"
                      ? ` — ${t.stats.tooltipWon(cell.attemptCount)}`
                      : cell.outcome === "lost"
                        ? ` — ${t.stats.tooltipLost}`
                        : ""
                  }`}
                  className={`aspect-square rounded-[3px] ${cellClass(cell)}`}
                />
              );
            }),
          ])}
        </div>
      </div>

      {/* Legend — categorical, not a gradient. Wins ordered worse → better (light → dark). */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted/70">
        <LegendItem swatch="bg-white/5" label={t.stats.legendNone} />
        <LegendItem swatch="bg-match-miss/35" label={t.stats.legendLost} />
        <LegendItem swatch="bg-match-exact/40" label={t.stats.legendWonSlow} />
        <LegendItem swatch="bg-match-exact/70" label={t.stats.legendWonMid} />
        <LegendItem swatch="bg-match-exact" label={t.stats.legendWonFast} />
      </div>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-[3px] ${swatch}`} />
      {label}
    </span>
  );
}
