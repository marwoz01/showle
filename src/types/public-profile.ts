import type { MediaDetails } from "@/types";
import type { ProfileBadge, ProfileMovie, ProfileSummary } from "@/types/profile";

export interface PublicProfile {
  publicSlug: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  favoriteMovies: ProfileMovie[];
  watchedCount: number;
  totalMinutes: number;
  daily: ProfileSummary["daily"];
  higherLowerBest: number;
  badges: Pick<ProfileBadge, "id">[];
}

export interface TasteComparison {
  score: number | null;
  sharedRatingCount: number;
  sharedMovies: ProfileMovie[];
}

export interface ProfileComparisonResponse {
  comparison: TasteComparison;
  suggestions: MediaDetails[];
}
