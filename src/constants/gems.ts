import type { ProfileBadge } from "@/types/profile";

export const DAILY_PARTICIPATION_REWARD = 5;

export const BADGE_GEM_REWARDS: Record<ProfileBadge["id"], number> = {
  "first-film": 25,
  "film-collector": 100,
  "daily-first-win": 25,
  "daily-streak-7": 100,
  "year-expert": 100,
};

export const RATED_COLLECTION_MILESTONES = [
  { target: 10, amount: 25 },
  { target: 25, amount: 60 },
  { target: 100, amount: 150 },
] as const;

export const HIGHER_LOWER_MILESTONES = [
  { target: 25, amount: 75 },
  { target: 50, amount: 150 },
] as const;

export const GEM_REWARD_KEYS = [
  ...Object.keys(BADGE_GEM_REWARDS).map((id) => `badge:${id}`),
  ...RATED_COLLECTION_MILESTONES.map(({ target }) => `rated:${target}`),
  ...HIGHER_LOWER_MILESTONES.map(({ target }) => `higher-lower:${target}`),
];
