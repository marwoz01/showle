import type { MediaDetails } from "@/types";
import type { MovieChoiceState } from "@/lib/movie-choice-engine";
import type { MovieChoicePreferences } from "@/types/movie-choice";

export const movieChoiceNow = Date.parse("2026-09-21T12:00:00Z");
export const movieChoicePreferences: MovieChoicePreferences = { genres: ["Comedy"], excludedGenres: [], maxRuntime: 120, providerIds: [8] };
export const movieChoiceMovies: MediaDetails[] = [1, 2, 3].map((id) => ({
  id, title: `Film ${id}`, type: "movie", year: 2020, genres: ["Comedy"], country: "US", director: "Director",
  leadActor: "Actor", runtime: 90, budget: 10, popularity: 50, rating: 7, posterPath: `/poster-${id}.jpg`, overview: "A film.",
}));

export function movieChoiceRoomFixture(overrides: Partial<MovieChoiceState> = {}): MovieChoiceState {
  return {
    code: "ABCDEF", status: "waiting", locale: "pl", hostId: "host-secret", hostName: "Host", guestId: null, guestName: null,
    hostPreferences: null, guestPreferences: null, hostVotes: [], guestVotes: [], movies: [], excludedMovieIds: [],
    matchMovieId: null, batch: 1, revision: 1, generationToken: null, generationStartedAt: null, generationError: null,
    generationAttempts: 0, createdAt: new Date(movieChoiceNow), updatedAt: new Date(movieChoiceNow),
    expiresAt: new Date(movieChoiceNow + 86_400_000), ...overrides,
  };
}
