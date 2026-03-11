import { MatchStatus, Direction } from "@/types";

interface ComparisonCellProps {
  label: string;
  value: string;
  status: MatchStatus;
  direction?: Direction;
}

const statusColors: Record<MatchStatus, string> = {
  exact: "bg-match-exact/15 border-match-exact/30 text-match-exact",
  partial: "bg-match-partial/15 border-match-partial/30 text-match-partial",
  miss: "bg-match-miss/15 border-match-miss/30 text-match-miss",
};

const directionArrow: Record<string, string> = {
  up: "↑",
  down: "↓",
};

export default function ComparisonCell({
  label,
  value,
  status,
  direction,
}: ComparisonCellProps) {
  return (
    <div
      className={`flex min-w-22.5 flex-col items-center gap-1 rounded-xl border px-3 py-2.5 ${statusColors[status]}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold">{value}</span>
        {direction && (
          <span className="text-sm leading-none">{directionArrow[direction]}</span>
        )}
      </div>
    </div>
  );
}
