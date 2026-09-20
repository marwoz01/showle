"use client";

import { useRef } from "react";
import { useTranslation } from "@/i18n";
import { Eye, Bookmark, Trophy } from "@/components/ui/icons";
import type { CollectionTab, CollectionCounts } from "@/types/collection";

interface CollectionTabsProps {
  id: string;
  active: CollectionTab;
  onChange: (tab: CollectionTab) => void;
  counts?: CollectionCounts;
}
const TABS = [
  { key: "watched", icon: Eye },
  { key: "watchlist", icon: Bookmark },
  { key: "rankings", icon: Trophy },
] as const;

export default function CollectionTabs({
  id,
  active,
  onChange,
  counts,
}: CollectionTabsProps) {
  const { t } = useTranslation();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div
      role="tablist"
      aria-label={t.collection.title}
      className="grid grid-cols-3 gap-1 rounded-xl border border-white/6 bg-white/3 p-1"
    >
      {TABS.map(({ key, icon: Icon }, index) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`${id}-${key}-tab`}
          aria-selected={active === key}
          aria-controls={`${id}-${key}-panel`}
          tabIndex={active === key ? 0 : -1}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          onClick={() => onChange(key)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowRight"
                ? (index + 1) % 3
                : event.key === "ArrowLeft"
                  ? (index + 2) % 3
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : null;
            if (next === null) return;
            event.preventDefault();
            // Manual activation avoids starting a network request for every arrow key.
            buttons.current[next]?.focus();
          }}
          className={`flex min-h-12 min-w-0 flex-wrap items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent-purple sm:gap-2 sm:text-sm ${active === key ? "bg-accent-purple/15 text-accent-purple" : "text-muted hover:bg-white/4"}`}
        >
          <Icon size={16} />
          <span>{t.collection.tabs[key]}</span>
          {counts && (
            <span className="rounded-full bg-white/6 px-1.5 text-[10px]">
              {counts[key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
