export type XoVariant = "Classic3" | "Big4" | "Gomoku7" | "Ultimate";
export type XoRoomStatus = "Lobby" | "InGame" | "GameResults" | "SeriesEnded";
export type XoSide = "None" | "X" | "O";

export interface XoPlayerDto {
  connectionId: string;
  nickname: string;
  color: string;
  userId: string | null;
  side: XoSide;
}

export interface XoGameDto {
  id: string;
  variant: XoVariant;
  boards: string[];
  metaBoard: string | null;
  nextSide: "x" | "o";
  activeMeta: number | null;
  status: "InProgress" | "Won" | "Drawn";
  winnerSide: string;
  winningLine: number[] | null;
  endReason: string | null;
  moveDeadlineAt: string;
}

export interface XoRoomDto {
  code: string;
  name: string | null;
  ownerUserId: string | null;
  hostConnectionId: string;
  variant: XoVariant;
  bestOf: number;
  moveSeconds: number;
  status: XoRoomStatus;
  scoreX: number;
  scoreO: number;
  gamesPlayed: number;
  players: XoPlayerDto[];
  spectators: XoPlayerDto[];
  currentGame: XoGameDto | null;
}

export interface MoveMadeDto {
  side: "x" | "o";
  row: number;
  col: number;
  metaIdx: number | null;
  boards: string[];
  metaBoard: string | null;
  nextSide: "x" | "o";
  activeMeta: number | null;
  winningLine: number[] | null;
}

export interface GameEndedDto {
  winner: string;
  winningLine: number[] | null;
  reason: string;
}

export interface SeriesEndedDto {
  winner: string;
  scoreX: number;
  scoreO: number;
}

export const VARIANT_INFO: Record<XoVariant, { label: string; sub: string; size: number; winLength: number }> = {
  Classic3: { label: "classic 3×3", sub: "3 in a row", size: 3, winLength: 3 },
  Big4: { label: "big 4×4", sub: "4 in a row", size: 4, winLength: 4 },
  Gomoku7: { label: "gomoku 7×7", sub: "5 in a row", size: 7, winLength: 5 },
  Ultimate: { label: "ultimate", sub: "9 sub-boards", size: 3, winLength: 3 },
};
