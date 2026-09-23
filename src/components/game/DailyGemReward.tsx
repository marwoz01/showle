"use client";

import { Gem } from "lucide-react";
import { useGemWallet } from "@/hooks/useGemWallet";
import { useTranslation } from "@/i18n";

export default function DailyGemReward({ dateKey }: { dateKey: string }) {
  const { wallet } = useGemWallet();
  const { t, locale } = useTranslation();
  const reward = wallet?.transactions.find((entry) => entry.amount > 0 && (
    entry.rewardKey === `daily:${dateKey}` ||
    (entry.dateKey === dateKey && entry.reason === "win_reward")
  ));
  if (!reward) return null;
  return <div className="px-6 pt-5" aria-live="polite">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-gem-blue/25 bg-gem-blue/10 px-4 py-3 text-sm">
      <Gem size={22} className="text-gem-blue" aria-hidden="true" />
      <span className="font-semibold text-gem-blue" aria-label={`${t.gems.currency}: +${reward.amount.toLocaleString(locale)}`}>+{reward.amount.toLocaleString(locale)}</span>
      <span className="text-foreground">{reward.reason === "win_reward" ? t.gems.dailyReward : t.gems.participationReward}</span>
      <span className="ml-auto text-xs text-gem-blue">{t.gems.credited}</span>
    </div>
  </div>;
}
