"use client";

import { useTranslation } from "@/i18n";
import type { RecommendationReaction } from "@/types/recommendation";

interface Props { selected?: RecommendationReaction; disabled: boolean; onReact: (reaction: RecommendationReaction | null) => void }
export default function RecommendationFeedback({ selected, disabled, onReact }: Props) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {(["more", "less"] as const).map((reaction) => (
        <button type="button" key={reaction} aria-pressed={selected === reaction} disabled={disabled}
          title={selected === reaction ? t.recommendation.clearFeedback : undefined}
          onClick={() => onReact(selected === reaction ? null : reaction)}
          className={`min-h-11 rounded-xl px-2 py-2 text-xs font-medium disabled:opacity-50 ${selected === reaction ? "bg-accent-purple/15 text-accent-purple" : "bg-white/5 text-muted hover:bg-white/10"}`}>
          {reaction === "more" ? t.recommendation.moreLikeThis : t.recommendation.notForMe}
        </button>
      ))}
    </div>
  );
}
