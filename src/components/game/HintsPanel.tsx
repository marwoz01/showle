"use client";

import { Hint } from "@/types";
import { MAX_ATTEMPTS } from "@/constants";
import { useTranslation } from "@/i18n";
import { Lightbulb, Lock } from "lucide-react";

interface HintsPanelProps {
  revealedHints: Hint[];
  totalHints: number;
}

export default function HintsPanel({
  revealedHints,
  totalHints,
}: HintsPanelProps) {
  const { t } = useTranslation();
  const lockedCount = Math.max(0, totalHints - revealedHints.length);

  return (
    <div className="rounded-2xl border border-white/6 bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">
        {t.hints.title}
      </h3>

      <div className="space-y-2.5">
        {revealedHints.map((hint) => (
          <div
            key={hint.id}
            className="flex items-start gap-3 rounded-lg bg-accent-purple/5 px-3 py-2.5 text-sm"
          >
            <span className="mt-0.5 text-accent-purple">
              <Lightbulb size={16} />
            </span>
            <span className="text-foreground">{hint.content}</span>
          </div>
        ))}

        {Array.from(
          { length: Math.min(lockedCount, MAX_ATTEMPTS - revealedHints.length) },
          (_, i) => (
            <div
              key={`locked-${i}`}
              className="flex items-center gap-3 rounded-lg bg-white/2 px-3 py-2.5 text-sm"
            >
              <span className="text-muted/40">
                <Lock size={16} />
              </span>
              <span className="text-muted/40">???</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
