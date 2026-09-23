"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gem } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useGemRewardAnimation } from "@/hooks/useGemRewardAnimation";
import type { GemTransaction } from "@/types/gems";

export default function GemRewardCelebration({ reward }: { reward: GemTransaction }) {
  const root = useRef<HTMLDivElement>(null);
  const [finished, setFinished] = useState(false);
  const complete = useCallback(() => setFinished(true), []);
  const { t, locale } = useTranslation();
  const label = reward.reason === "win_reward" ? t.gems.dailyReward : t.gems.participationReward;
  const particleCount = Math.min(24, reward.amount);
  useGemRewardAnimation(root, reward, locale, complete);
  if (finished || typeof document === "undefined") return null;

  return createPortal(
    <div ref={root} data-gem-reward={reward.id} className="pointer-events-none invisible fixed inset-0 z-[100] overflow-hidden">
      <p role="status" className="sr-only">{label}. {t.gems.currency}: +{reward.amount.toLocaleString(locale)}</p>
      <div data-reward-backdrop className="absolute inset-0 bg-background/70" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-6" aria-hidden="true">
        <div data-reward-counter className="relative text-center">
          <div className="absolute inset-0 -z-10 rounded-full bg-gem-blue/15 blur-3xl" />
          <Gem size={44} strokeWidth={1.5} fill="currentColor" fillOpacity={0.12} className="mx-auto mb-2 text-gem-blue" />
          <p data-reward-count className="font-display text-[clamp(5rem,20vw,9rem)] font-bold leading-none tracking-tight text-gem-blue tabular-nums">+0</p>
          <p className="mt-5 text-sm font-medium text-foreground/85 sm:text-base">{label}</p>
        </div>
      </div>
      {Array.from({ length: particleCount }, (_, index) => (
        <span key={index} data-reward-particle className="invisible absolute left-1/2 top-1/2 text-gem-blue will-change-transform" aria-hidden="true">
          <Gem size={28} strokeWidth={1.7} fill="currentColor" fillOpacity={0.25} />
        </span>
      ))}
    </div>,
    document.body,
  );
}
