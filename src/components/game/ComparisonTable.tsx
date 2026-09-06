import { ComparisonField } from "@/types";
import ComparisonCell from "./ComparisonCell";

interface ComparisonTableProps {
  comparison: ComparisonField[];
}

export default function ComparisonTable({ comparison }: ComparisonTableProps) {
  return (
    <div className="comparison-grid">
      {comparison.map((field, index) => {
        const centerLastRow = comparison.length === 9 && index === 5;

        return (
          <div
            key={field.label}
            className={`min-w-0 ${
              centerLastRow ? "comparison-second-row" : ""
            }`}
          >
            <ComparisonCell
              label={field.label}
              value={field.guessValue}
              status={field.status}
              direction={field.direction}
              revealIndex={index}
            />
          </div>
        );
      })}
    </div>
  );
}
