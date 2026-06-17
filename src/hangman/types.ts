export type TeamMode = "TeamVsTeam" | "CoOp" | "Tournament";
export type WordSource = "System" | "OpposingTeam" | "HostPaste" | "PlayerPool";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type HangmanRoomStatus = "Lobby" | "WordSelection" | "Playing" | "RoundResults" | "Finished";
export type RoundStatus = "SelectingWord" | "InProgress" | "Won" | "Lost" | "Draw";

export interface TeamDto {
  id: string;
  name: string;
  color: string;
  score: number;
  tournamentScore: number;
  powerUps: Record<string, number>;
}

export interface HangmanPlayerDto {
  connectionId: string;
  nickname: string;
  color: string;
  userId: string | null;
  teamId: string | null;
}

export interface TeamBoardDto {
  teamId: string;
  mask: string;
  guessedLetters: string[];
  wrongCount: number;
  maxWrong: number;
  solved: boolean;
}

export interface ActiveTurnDto {
  teamId: string;
  playerConnectionId: string;
  startedAt: string;
  deadlineAt: string;
}

export interface HangmanRoundDto {
  id: string;
  category: string;
  difficulty: Difficulty;
  source: WordSource;
  status: RoundStatus;
  activeTurn: ActiveTurnDto | null;
  boards: TeamBoardDto[];
}

export interface HangmanRoomDto {
  code: string;
  name: string | null;
  ownerUserId: string | null;
  hostConnectionId: string;
  teamMode: TeamMode;
  wordSource: WordSource;
  category: string;
  difficulty: Difficulty;
  bestOf: number;
  turnSeconds: number;
  powerUpsEnabled: boolean;
  status: HangmanRoomStatus;
  roundsPlayed: number;
  teams: TeamDto[];
  players: HangmanPlayerDto[];
  currentRound: HangmanRoundDto | null;
}

export interface RoundEndedDto {
  word: string;
  perTeam: Array<{
    teamId: string;
    teamName: string;
    solved: boolean;
    wrongCount: number;
    solveSeconds: number | null;
  }>;
}

export interface MatchEndedDto {
  winnerTeamIds: string[];
  scores: Record<string, number>;
}

export interface LetterGuessedDto {
  teamId: string;
  playerConnectionId: string;
  letter: string;
  hit: boolean;
  mask: string;
  wrongCount: number;
}

export interface CreateHangmanRoomRequest {
  name: string | null;
  teamMode: TeamMode;
  wordSource: WordSource;
  category: string;
  difficulty: Difficulty;
  bestOf: number;
  turnSeconds: number;
}

export const HANGMAN_CATEGORIES = ["movies", "code", "animals"] as const;
export const HANGMAN_DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
export const HANGMAN_TEAM_MODES: { value: TeamMode; label: string; sub: string }[] = [
  { value: "TeamVsTeam", label: "team vs team", sub: "head-to-head on the same word" },
  { value: "CoOp", label: "co-op", sub: "one team vs the system" },
  { value: "Tournament", label: "tournament", sub: "best-of multi-round" },
];
