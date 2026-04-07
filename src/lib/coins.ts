export const COIN_REWARDS: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
  4: 25,
  5: 20,
  6: 15,
};

export function getWinReward(attemptCount: number): number {
  return COIN_REWARDS[attemptCount] ?? 10;
}

export const STREAK_MILESTONES: Record<number, number> = {
  5: 25,
  10: 50,
  25: 100,
  50: 200,
  100: 500,
};

export const COST_HINT = 60;
export const COST_EXTRA_ATTEMPT = 40;
export const COST_STREAK_FREEZE = 200;
export const MAX_EXTRA_ATTEMPTS = 3;
export const MAX_STREAK_FREEZES = 2;
