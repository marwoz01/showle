import type { MediaDetails } from "@/types";

export type MovieChoiceRole = "host" | "guest";
export type MovieChoiceStatus = "waiting" | "preferences" | "voting" | "matched" | "exhausted";

export interface MovieChoicePreferences {
  genres: string[];
  excludedGenres: string[];
  maxRuntime: number | null;
  providerIds: number[];
}

export interface MovieChoiceVote {
  movieId: number;
  liked: boolean;
}

export interface MovieChoiceRoomView {
  code: string;
  status: MovieChoiceStatus;
  you: MovieChoiceRole;
  players: { role: MovieChoiceRole; name: string; ready: boolean; votedCount: number }[];
  /** Only the requesting participant's preferences and votes are returned. */
  preferences: MovieChoicePreferences | null;
  votes: MovieChoiceVote[];
  movies: MediaDetails[];
  match: MediaDetails | null;
  batch: number;
  revision: number;
  preparing: boolean;
  generationError: "no_results" | "service_unavailable" | null;
  expiresAt: string;
}

export type MovieChoiceRequest =
  | { action: "create"; name: string; locale: "pl" | "en" }
  | { action: "join"; code: string; name: string }
  | { action: "preferences"; code: string; preferences: MovieChoicePreferences; batch: number }
  | { action: "vote"; code: string; movieId: number; liked: boolean; batch: number }
  | { action: "reset"; code: string; batch: number };

export type MovieChoiceErrorCode =
  | "invalid_input" | "invalid_action" | "invalid_code" | "invalid_name" | "invalid_preferences"
  | "invalid_batch" | "invalid_vote" | "invalid_json" | "body_too_large" | "invalid_origin"
  | "room_not_found" | "room_full" | "not_ready" | "batch_changed" | "already_voted" | "preparing"
  | "host_only" | "room_limit_reached" | "rate_limited" | "no_results" | "service_unavailable";

export interface MovieChoiceErrorResponse {
  error: MovieChoiceErrorCode;
}
