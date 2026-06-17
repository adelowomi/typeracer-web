export type RoomStatus = "Lobby" | "Countdown" | "Racing" | "Finished";

export type TextSourceKind = "Quotes" | "RandomSentences" | "Code" | "Custom";

export interface TextSourceDto {
  kind: TextSourceKind;
  language: string | null;
}

export interface RacerDto {
  connectionId: string;
  nickname: string;
  color: string;
  userId: string | null;
  charIndex: number;
  wpm: number;
  accuracy: number;
  finishedAt: string | null;
}

export interface RoomDto {
  code: string;
  name: string | null;
  ownerUserId: string | null;
  hostConnectionId: string;
  status: RoomStatus;
  textSource: TextSourceDto;
  text: string;
  racers: RacerDto[];
}

export interface RaceStartedPayload {
  text: string;
  startedAt: string;
}

export interface RacerProgressPayload {
  connectionId: string;
  charIndex: number;
  wpm: number;
  accuracy: number;
  finishedAt?: string;
}

export interface RaceResultDto {
  connectionId: string;
  nickname: string;
  position: number;
  wpm: number;
  accuracy: number;
  durationSeconds: number | null;
}

export interface CreateRoomRequest {
  nickname: string | null;
  name: string | null;
}

export const CODE_LANGUAGES = ["python", "javascript", "typescript", "csharp"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];
