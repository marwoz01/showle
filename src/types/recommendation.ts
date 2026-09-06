import type { CastMember, MediaDetails } from "@/types";

export type RecommendationReaction = "more" | "less";
export interface RecommendationPreference {
  genres: string[];
  excludedGenres: string[];
  yearFrom: number;
  yearTo: number;
  popularity: "any" | "popular" | "medium" | "niche";
  freeformText: string;
  maxRuntime: number | null;
  providerIds: number[];
  referenceMovieId: number | null;
}
export interface RecommendationCandidate {
  tmdbId: number;
  title: string;
  titlePl: string;
  year: number;
  genres: string[];
  overview: string;
  overviewPl: string;
  posterPath: string;
  backdropPath: string;
  director: string;
  leadActor: string;
  country: string;
  countryCode: string;
  runtime: number;
  budget: number;
  voteCount: number;
  rating: number;
  tagline: string | null;
  taglinePl: string | null;
  cast: CastMember[];
  keywords: string[];
  collectionId: number | null;
  providerIds: number[];
  providersUpdatedAt: Date | null;
  similarity: number;
  hasEmbedding: boolean;
  lexicalScore: number;
}
export interface Recommendation {
  movie: MediaDetails;
  justification: string;
}
export interface RecommendationMeta {
  matching: "semantic" | "filters";
  interpretation: "ai" | "local";
  relevance: "ai" | "local";
  partial: boolean;
  personalized: boolean;
}
