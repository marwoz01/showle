"use client";

import { useRef } from "react";
import { useTranslation } from "@/i18n";
import { MAX_ATTEMPTS } from "@/constants";

export type DailyPanel = "guesses" | "hints" | "revealed";
const panels: DailyPanel[] = ["guesses", "hints", "revealed"];

interface DailyMobileTabsProps {
  id: string;
  active: DailyPanel;
  counts: Record<DailyPanel, number>;
  newHint: boolean;
  onChange: (panel: DailyPanel) => void;
}

export default function DailyMobileTabs({ id, active, counts, newHint, onChange }: DailyMobileTabsProps) {
  const { t } = useTranslation();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={t.game.mobile.navigation} className="grid grid-cols-3 gap-1 rounded-2xl bg-white/4 p-1 lg:hidden">
      {panels.map((panel, index) => (
        <button
          key={panel}
          ref={(element) => { buttons.current[index] = element; }}
          id={`${id}-${panel}-tab`}
          type="button"
          role="tab"
          aria-selected={active === panel}
          aria-controls={`${id}-${panel}-panel`}
          aria-label={panel === "hints" && newHint ? `${t.game.mobile.hints}: ${counts.hints}. ${t.game.mobile.newHint}` : undefined}
          tabIndex={active === panel ? 0 : -1}
          onClick={() => onChange(panel)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight") next = (index + 1) % panels.length;
            else if (event.key === "ArrowLeft") next = (index + panels.length - 1) % panels.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = panels.length - 1;
            else return;
            event.preventDefault();
            onChange(panels[next]);
            buttons.current[next]?.focus({ preventScroll: true });
          }}
          className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${active === panel ? "bg-accent-purple/20 text-foreground" : "text-muted hover:bg-white/5"}`}
        >
          {t.game.mobile[panel]}
          <span className={`flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] tabular-nums ${panel === "hints" && newHint ? "bg-accent-purple text-white" : "bg-white/5"}`}>
            {panel === "guesses" ? `${counts.guesses}/${MAX_ATTEMPTS}` : counts[panel]}
          </span>
        </button>
      ))}
    </div>
  );
}
