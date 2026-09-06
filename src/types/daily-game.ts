import type { CastMember, GameStatus, GuessResult, Hint, MediaDetails } from "@/types";

export interface DailyGameView {
  dateKey: string;
  status: GameStatus;
  guesses: GuessResult[];
  hints: Hint[];
  answer: MediaDetails | null;
  revealedPeople: { directorProfilePath?: string; cast?: CastMember[] };
}
