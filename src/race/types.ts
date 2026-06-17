export type RoomStatus = "Lobby" | "Countdown" | "Racing" | "Finished";

export type TextSourceKind = "Quotes" | "RandomSentences" | "Code" | "Custom";
export type TextLength = "Short" | "Medium" | "Long";
export type RaceMode = "Completion" | "Speed" | "Accuracy" | "Combined";

export interface TextSourceDto {
  kind: TextSourceKind;
  language: string | null;
  length: TextLength;
  noPunctuation?: boolean;
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
  mode: RaceMode;
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
  score: number;
}

export interface CreateRoomRequest {
  nickname: string | null;
  name: string | null;
}

export const CODE_LANGUAGES = ["python", "javascript", "typescript", "csharp"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const TEXT_LENGTHS: { value: TextLength; label: string; sub: string }[] = [
  { value: "Short", label: "short", sub: "40–120 chars · sprint" },
  { value: "Medium", label: "medium", sub: "120–280 chars · standard" },
  { value: "Long", label: "long", sub: "280+ chars · endurance" },
];

export const RACE_MODES: { value: RaceMode; label: string; sub: string }[] = [
  { value: "Completion", label: "completion", sub: "first to finish wins" },
  { value: "Speed", label: "speed", sub: "highest WPM wins" },
  { value: "Accuracy", label: "accuracy", sub: "most accurate wins" },
  { value: "Combined", label: "combined", sub: "wpm × accuracy" },
];
