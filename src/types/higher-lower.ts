export type HigherLowerLocale = "pl" | "en";
export type HigherLowerChoice = "higher" | "lower";
export type HigherLowerStatus = "guessing" | "revealed" | "finished";
export type HigherLowerOutcome = "correct" | "equal" | "wrong";

export interface HigherLowerMovieView {
  id: number;
  title: string;
  year: number;
  backdropPath: string;
  runtime: number | null;
}

export interface HigherLowerGameView {
  round: number;
  score: number;
  status: HigherLowerStatus;
  left: HigherLowerMovieView & { runtime: number };
  right: HigherLowerMovieView;
  outcome: HigherLowerOutcome | null;
}

export type HigherLowerRequest =
  | { action: "start"; locale: HigherLowerLocale }
  | { action: "answer"; locale: HigherLowerLocale; token: string; choice: HigherLowerChoice }
  | { action: "resume"; locale: HigherLowerLocale; token: string }
  | { action: "next"; locale: HigherLowerLocale; token: string };

export interface HigherLowerResponse {
  token: string;
  game: HigherLowerGameView;
}

/** The full snapshot is only imported by server modules, never by game UI. */
export interface HigherLowerCatalogMovie {
  id: number;
  titles: { pl: string; en: string };
  year: number;
  runtime: number;
  backdropPath: string;
  voteCount: number;
}
