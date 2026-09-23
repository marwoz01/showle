"use client";

import { useUser } from "@clerk/nextjs";
import { useGemWallet } from "@/hooks/useGemWallet";
import GemRewardCelebration from "@/components/game/GemRewardCelebration";

export default function DailyGemReward({ dateKey, animate = false }: { dateKey: string; animate?: boolean }) {
  const { user, isSignedIn } = useUser();
  const { wallet } = useGemWallet();
  const reward = wallet?.transactions.find((entry) => entry.amount > 0 && (
    entry.rewardKey === `daily:${dateKey}` ||
    (entry.dateKey === dateKey && entry.reason === "win_reward")
  ));
  if (!animate || !isSignedIn || !user || !reward) return null;
  return <GemRewardCelebration key={`${user.id}:${reward.id}`} reward={reward} />;
}
