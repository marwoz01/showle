import { ComparisonField } from "@/types";
import ComparisonCell from "./ComparisonCell";

interface ComparisonTableProps {
  comparison: ComparisonField[];
}

export default function ComparisonTable({ comparison }: ComparisonTableProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {comparison.map((field) => (
        <ComparisonCell
          key={field.label}
          label={field.label}
          value={field.guessValue}
          status={field.status}
          direction={field.direction}
        />
      ))}
    </div>
  );
}
