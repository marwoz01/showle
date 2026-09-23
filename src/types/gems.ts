export interface GemTransaction {
  id: string;
  amount: number;
  reason: string;
  dateKey: string | null;
  createdAt: string;
  rewardKey: string | null;
}

export interface GemsWallet {
  balance: number;
  streakFreezes: number;
  transactions: GemTransaction[];
  earnedRewardKeys: string[];
}
