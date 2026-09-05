import { ComparisonField } from "@/types";
import ComparisonCell from "./ComparisonCell";

interface ComparisonTableProps {
  comparison: ComparisonField[];
}

export default function ComparisonTable({ comparison }: ComparisonTableProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 2xl:grid-cols-5">
      {comparison.map((field, index) => (
        <ComparisonCell
          key={field.label}
          label={field.label}
          value={field.guessValue}
          status={field.status}
          direction={field.direction}
          revealIndex={index}
        />
      ))}
    </div>
  );
}
