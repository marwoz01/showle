export type MediaType = "movie" | "series";

export interface MediaDetails {
  id: number;
  title: string;
  type: MediaType;
  year: number;
  genres: string[];
  country: string;
  director: string;
  runtime: number; // minutes (movie) or seasons count (series)
  budget: number; // in millions USD, 0 if unknown
  popularity: number;
  rating: number;
  posterPath: string;
  overview: string;
  tagline?: string;
}

export type MatchStatus = "exact" | "partial" | "miss";
export type Direction = "up" | "down" | null;

export interface ComparisonField {
  label: string;
  guessValue: string;
  answerValue: string;
  status: MatchStatus;
  direction?: Direction;
}

export interface GuessResult {
  guess: MediaDetails;
  comparison: ComparisonField[];
  isCorrect: boolean;
  attemptNumber: number;
}

export interface Hint {
  id: number;
  type:
    | "director_letter"
    | "director"
    | "genre"
    | "decade"
    | "country"
    | "trivia"
    | "director_initials"
    | "cast"
    | "title_reveal";
  content: string;
  revealedAt: number;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  challengeId: number;
  type: MediaType;
  guesses: GuessResult[];
  hints: Hint[];
  status: GameStatus;
  startedAt: number;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>;
  averageGuesses: number;
}

export type GameMode = "daily-movie" | "daily-series" | "unlimited";
