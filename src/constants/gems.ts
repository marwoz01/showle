import type { ProfileBadge } from "@/types/profile";

export const DAILY_PARTICIPATION_REWARD = 5;

export const BADGE_GEM_REWARDS: Record<ProfileBadge["id"], number> = {
  "first-film": 0,
  "film-collector": 0,
  "daily-first-win": 25,
  "daily-streak-7": 100,
  "year-expert": 100,
};

export const HIGHER_LOWER_MILESTONES = [
  { target: 25, amount: 75 },
  { target: 50, amount: 150 },
] as const;

export const GEM_REWARD_KEYS = [
  ...Object.entries(BADGE_GEM_REWARDS).filter(([, amount]) => amount > 0).map(([id]) => `badge:${id}`),
  ...HIGHER_LOWER_MILESTONES.map(({ target }) => `higher-lower:${target}`),
];
