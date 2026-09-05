import type { CSSProperties } from "react";
import { MatchStatus, Direction } from "@/types";
import { ArrowUp } from "lucide-react";

interface ComparisonCellProps {
  label: string;
  value: string;
  status: MatchStatus;
  direction?: Direction;
  revealIndex: number;
}

const statusColors: Record<MatchStatus, string> = {
  exact:
    "bg-[radial-gradient(circle_at_top,rgba(0,230,118,.13),rgba(255,255,255,.035)_72%)] text-match-exact",
  partial:
    "bg-[radial-gradient(circle_at_top,rgba(255,193,7,.13),rgba(255,255,255,.035)_72%)] text-match-partial",
  miss:
    "bg-[radial-gradient(circle_at_top,rgba(255,82,82,.12),rgba(255,255,255,.035)_72%)] text-match-miss",
};

export default function ComparisonCell({
  label,
  value,
  status,
  direction,
  revealIndex,
}: ComparisonCellProps) {
  const style = {
    "--reveal-delay": `${120 + revealIndex * 85}ms`,
  } as CSSProperties;

  return (
    <div
      className="comparison-tile h-28 min-w-0"
      data-status={status}
      style={style}
    >
      <div className="comparison-tile-inner grid h-full">
        <div
          aria-hidden="true"
          className="comparison-tile-face col-start-1 row-start-1 flex h-full w-full flex-col items-start justify-center overflow-hidden rounded-2xl bg-white/[.035] px-4 py-3 text-left text-muted/40"
        >
          <span className="flex min-h-7 items-end text-[10px] font-medium uppercase leading-3.5 tracking-wider">
            {label}
          </span>
          <span className="mt-1 min-h-8 text-sm font-bold">?</span>
        </div>

        <div
          className={`comparison-tile-face comparison-tile-back relative col-start-1 row-start-1 flex h-full w-full flex-col items-start justify-center overflow-hidden rounded-2xl px-4 py-3 text-left ${statusColors[status]}`}
        >
          <span className="flex min-h-7 items-end text-[10px] font-medium uppercase leading-3.5 tracking-wider opacity-60">
            {label}
          </span>
          <span
            className="mt-1 line-clamp-3 min-h-8 min-w-0 w-full max-w-full text-left text-xs font-bold leading-tight [overflow-wrap:anywhere]"
            title={value}
          >
            {value}
          </span>
          {direction && (
            <ArrowUp
              size={14}
              className={`comparison-direction absolute bottom-3 right-3 shrink-0 ${direction === "down" ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
