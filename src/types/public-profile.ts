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

export interface ComparedMovieRating extends ProfileMovie {
  viewerRating: number;
  otherRating: number;
  gap: number;
}

export interface TasteComparison {
  score: number | null;
  sharedRatingCount: number;
  sharedMovies: ProfileMovie[];
  averageRatingGap: number | null;
  agreementCount: number | null;
  differenceCount: number | null;
  ratingDetailsVisible: boolean;
  similarRatings: ComparedMovieRating[];
  differentRatings: ComparedMovieRating[];
}

export interface ProfileComparisonResponse {
  comparison: TasteComparison;
  suggestions: MediaDetails[];
}
