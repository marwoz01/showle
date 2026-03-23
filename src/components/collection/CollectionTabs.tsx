"use client";

import { useTranslation } from "@/i18n";
import { Eye, Bookmark, Trophy } from "lucide-react";

export type CollectionTab = "watched" | "watchlist" | "rankings";

interface CollectionTabsProps {
  active: CollectionTab;
  onChange: (tab: CollectionTab) => void;
  counts?: { watched: number; watchlist: number; rankings: number };
}

const TABS: { key: CollectionTab; icon: React.FC<{ size?: number }> }[] = [
  { key: "watched", icon: Eye },
  { key: "watchlist", icon: Bookmark },
  { key: "rankings", icon: Trophy },
];

export default function CollectionTabs({
  active,
  onChange,
  counts,
}: CollectionTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 rounded-xl border border-white/6 bg-white/3 p-1">
      {TABS.map(({ key, icon: Icon }) => {
        const isActive = active === key;
        const count = counts?.[key];

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent-purple/15 text-accent-purple"
                : "text-muted hover:bg-white/4 hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">
              {t.collection.tabs[key]}
            </span>
            {count !== undefined && count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isActive ? "bg-accent-purple/20" : "bg-white/6"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
