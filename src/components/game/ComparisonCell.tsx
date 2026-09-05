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

const statusDots: Record<MatchStatus, string> = {
  exact: "bg-match-exact shadow-[0_0_9px_rgba(0,230,118,.65)]",
  partial: "bg-match-partial shadow-[0_0_9px_rgba(255,193,7,.6)]",
  miss: "bg-match-miss shadow-[0_0_9px_rgba(255,82,82,.55)]",
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
          className="comparison-tile-face col-start-1 row-start-1 flex min-h-19 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-white/[.035] px-3 py-3 text-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_9px_22px_rgba(0,0,0,.16)]"
        >
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {label}
          </span>
          <span className="text-sm font-bold">?</span>
        </div>

        <div
          className={`comparison-tile-face comparison-tile-back relative col-start-1 row-start-1 flex min-h-19 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,.055),0_9px_22px_rgba(0,0,0,.2)] ${statusColors[status]}`}
        >
          <span
            aria-hidden="true"
            className={`absolute left-3 top-3 h-1.5 w-1.5 rounded-full ${statusDots[status]}`}
          />
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
