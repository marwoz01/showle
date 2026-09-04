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
  exact: "bg-match-exact/15 border-match-exact/30 text-match-exact",
  partial: "bg-match-partial/15 border-match-partial/30 text-match-partial",
  miss: "bg-match-miss/15 border-match-miss/30 text-match-miss",
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
      className="comparison-tile min-w-0"
      data-status={status}
      style={style}
    >
      <div className="comparison-tile-inner grid">
        <div
          aria-hidden="true"
          className="comparison-tile-face col-start-1 row-start-1 flex min-h-16 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-muted/40"
        >
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {label}
          </span>
          <span className="text-sm font-bold">?</span>
        </div>

        <div
          className={`comparison-tile-face comparison-tile-back relative col-start-1 row-start-1 flex min-h-16 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-3 py-2.5 ${statusColors[status]}`}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
            {label}
          </span>
          <div className="flex min-w-0 max-w-full items-center justify-center gap-1">
            <span
              className="min-w-0 text-center text-xs font-bold leading-tight [overflow-wrap:anywhere]"
              title={value}
            >
              {value}
            </span>
            {direction && (
              <ArrowUp
                size={14}
                className={`comparison-direction shrink-0 ${direction === "down" ? "rotate-180" : ""}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
