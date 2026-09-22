import type { ActivityVisibility } from "@/types/social";

export interface ProfileMovie {
  id: number;
  title: string;
  year: number;
  posterPath: string;
}

export interface ProfilePreferences {
  genres: string[];
  excludedGenres: string[];
  providerIds: number[];
  maxRuntime: number | null;
}

export interface ProfileDetails {
  displayName: string;
  bio: string;
  isPublic: boolean;
  activityVisibility: ActivityVisibility;
  publicSlug: string;
  avatarUrl: string | null;
  favoriteMovies: ProfileMovie[];
  preferences: ProfilePreferences;
  locale: "pl" | "en";
}

export interface ProfileSummary {
  watchedCount: number;
  watchlistCount: number;
  totalMinutes: number;
  averageRating: number | null;
  favoriteGenres: { genre: string; count: number }[];
  daily: {
    gamesPlayed: number;
    gamesWon: number;
    currentStreak: number;
    maxStreak: number;
    averageGuesses: number;
  };
  higherLowerBest: number;
}

export interface ProfileActivity {
  kind: "watched" | "watchlist" | "rating" | "game";
  id: string;
  title: string;
  posterPath: string;
  date: string;
  rating?: number | null;
  won?: boolean;
}

export interface ProfileBadge {
  id: "first-film" | "film-collector" | "daily-first-win" | "daily-streak-7" | "year-expert";
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface ProfileResponse {
  profile: ProfileDetails;
  summary: ProfileSummary;
  activity: ProfileActivity[];
  badges: ProfileBadge[];
}
