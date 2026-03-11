"use client";

import { Hint } from "@/types";
import { MAX_ATTEMPTS } from "@/constants";
import { useTranslation } from "@/i18n";

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
    <div className="rounded-2xl border border-white/6 bg-[#12121e] p-5">
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
              <HintIcon />
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
                <LockIcon />
              </span>
              <span className="text-muted/40">???</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function HintIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.75c.57.39.92 1.03.92 1.72V17h6.16v-.53c0-.69.35-1.33.92-1.72A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
