"use client";

import { Hint } from "@/types";
import { MAX_ATTEMPTS } from "@/constants";
import { useTranslation } from "@/i18n";
import { Lightbulb, Lock } from "@/components/ui/icons";

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
    <div className="rounded-[1.75rem] bg-[linear-gradient(145deg,#25252a,#18181c)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_20px_45px_rgba(0,0,0,.22)]">
      <div className="relative overflow-hidden rounded-[1.4rem] bg-[#151518] p-4">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent-purple/9 blur-3xl" />
        <header className="relative mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-purple/12 text-accent-purple shadow-[inset_0_1px_0_rgba(255,255,255,.055)]">
              <Lightbulb size={16} />
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
              {t.hints.title}
            </h3>
          </div>
          <span className="rounded-full bg-white/[.045] px-2.5 py-1 text-[10px] font-semibold text-muted">
            {revealedHints.length}/{totalHints}
          </span>
        </header>

        <div className="relative grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1">
          {revealedHints.map((hint) => (
            <div
              key={hint.id}
              className="animate-hint-reveal flex min-h-16 items-start gap-3 rounded-2xl bg-accent-purple/8 px-3.5 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_8px_18px_rgba(0,0,0,.13)]"
            >
              <span className="animate-hint-bulb mt-0.5 text-accent-purple">
                <Lightbulb size={16} />
              </span>
              <span className="leading-relaxed text-foreground/90">{hint.content}</span>
            </div>
          ))}

          {Array.from(
            { length: Math.min(lockedCount, MAX_ATTEMPTS - revealedHints.length) },
            (_, i) => (
              <div
                key={`locked-${i}`}
                className="flex h-16 items-center gap-3 rounded-2xl bg-white/[.028] px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,.035)]"
              >
                <span className="text-muted/35">
                  <Lock size={16} />
                </span>
                <span className="font-medium tracking-wider text-muted/35">???</span>
                <span className="ml-auto text-[10px] font-semibold text-muted/20">
                  {String(revealedHints.length + i + 1).padStart(2, "0")}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
