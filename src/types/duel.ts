export type DuelStatus = "waiting" | "playing" | "finished";
export type DuelRole = "host" | "guest";

export interface DuelPlayerView {
  role: DuelRole;
  name: string;
  score: number;
  roundPoints: number;
  answered: boolean;
  answerIndex: number | null;
  ready: boolean;
  rematch: boolean;
}

export interface DuelQuestionView {
  imagePath: string;
  options: { title: string; year: number }[];
  correctIndex?: number;
}

export interface DuelRoomView {
  code: string;
  mode: "duel" | "practice";
  matchNumber: number;
  serverNow: string;
  roundStartsAt: string | null;
  history: {
    title: string;
    year: number;
    hostPoints: number;
    guestPoints: number;
  }[];
  status: DuelStatus;
  you: DuelRole;
  players: DuelPlayerView[];
  currentRound: number;
  totalRounds: number;
  roundEndsAt: string | null;
  roundResolvedAt: string | null;
  roundWinner: DuelRole | null;
  winner: DuelRole | "draw" | null;
  question: DuelQuestionView | null;
  nextFramePath: string | null;
}
