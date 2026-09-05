import { ComparisonField } from "@/types";
import ComparisonCell from "./ComparisonCell";

interface ComparisonTableProps {
  comparison: ComparisonField[];
}

export default function ComparisonTable({ comparison }: ComparisonTableProps) {
  return (
    <div className="grid auto-rows-[7rem] grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-10">
      {comparison.map((field, index) => {
        const centerLastRow = comparison.length === 9 && index === 5;

        return (
          <div
            key={field.label}
            className={`min-w-0 xl:col-span-2 ${
              centerLastRow ? "xl:col-start-2" : ""
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
