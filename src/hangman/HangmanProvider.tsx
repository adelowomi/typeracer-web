import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { API_BASE_URL } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type {
  ActiveTurnDto,
  CreateHangmanRoomRequest,
  HangmanRoomDto,
  LetterGuessedDto,
  MatchEndedDto,
  OpponentProgressDto,
  RoundEndedDto,
} from "./types";

export interface ChatMessage {
  id: number;
  teamId: string;
  playerConnectionId: string;
  nickname: string;
  message: string;
  at: number;
}

interface HangmanState {
  room: HangmanRoomDto | null;
  connectionId: string | null;
  lastRoundEnded: RoundEndedDto | null;
  lastMatchEnded: MatchEndedDto | null;
  turnSecondsRemaining: number | null;
  nextRoundCountdown: number | null;
  chatMessages: ChatMessage[];
  error: string | null;
  isSpectator: boolean;
}

interface HangmanContextValue extends HangmanState {
  createRoom: (request: CreateHangmanRoomRequest) => Promise<HangmanRoomDto>;
  joinRoom: (code: string, nickname: string | null) => Promise<HangmanRoomDto>;
  spectate: (code: string) => Promise<HangmanRoomDto>;
  leaveSpectate: () => Promise<void>;
  assignToTeam: (teamId: string) => Promise<void>;
  renameTeam: (teamId: string, name: string) => Promise<void>;
  setWordSource: (source: string, category: string, difficulty: string) => Promise<void>;
  startMatch: () => Promise<void>;
  guessLetter: (letter: string) => Promise<void>;
  sendChat: (message: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
  clearMatchEnded: () => void;
}

const MAX_CHAT_MESSAGES = 100;

const INITIAL: HangmanState = {
  room: null,
  connectionId: null,
  lastRoundEnded: null,
  lastMatchEnded: null,
  turnSecondsRemaining: null,
  nextRoundCountdown: null,
  chatMessages: [],
  error: null,
  isSpectator: false,
};

const HangmanContext = createContext<HangmanContextValue | null>(null);

export function HangmanProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<HangmanState>(INITIAL);
  const connectionRef = useRef<HubConnection | null>(null);
  const tokenRef = useRef<string | null>(null);
  const lastRoomCodeRef = useRef<string | null>(null);
  const lastNicknameRef = useRef<string | null>(null);
  const isSpectatorRef = useRef<boolean>(false);

  useEffect(() => { tokenRef.current = token; }, [token]);

  const ensureConnection = useCallback(async (): Promise<HubConnection> => {
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      return connectionRef.current;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hub/hangman`, { accessTokenFactory: () => tokenRef.current ?? "" })
      .withAutomaticReconnect([0, 1000, 2000, 4000, 8000, 15000, 30000, 30000, 30000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    // Be generous with mobile backgrounding before declaring the connection dead.
    connection.serverTimeoutInMilliseconds = 60_000;
    connection.keepAliveIntervalInMilliseconds = 20_000;

    connection.onreconnected(() => {
      const code = lastRoomCodeRef.current;
      if (!code) return;
      if (isSpectatorRef.current) {
        connection.invoke("JoinAsSpectator", code).catch(() => { /* best effort */ });
        return;
      }
      // Re-call JoinRoom; server detects same UserId and restores the existing slot.
      connection.invoke("JoinRoom", { code, nickname: lastNicknameRef.current })
        .catch(() => { /* ignore — best effort */ });
    });

    connection.on("RoomState", (room: HangmanRoomDto) => {
      setState((s) => ({ ...s, room }));
    });

    connection.on("PlayerJoined", () => {
      // RoomState follows
    });

    connection.on("PlayerLeft", (id: string) => {
      setState((s) => {
        if (!s.room) return s;
        return { ...s, room: { ...s.room, players: s.room.players.filter((p) => p.connectionId !== id) } };
      });
    });

    connection.on("RoundStarted", () => {
      setState((s) => ({ ...s, lastRoundEnded: null, lastMatchEnded: null, turnSecondsRemaining: null, nextRoundCountdown: null }));
    });

    connection.on("NextRoundCountdown", (n: number) => {
      setState((s) => ({ ...s, nextRoundCountdown: n > 0 ? n : null }));
    });

    connection.on("TurnTick", (seconds: number) => {
      setState((s) => ({ ...s, turnSecondsRemaining: seconds }));
    });

    connection.on("LetterGuessed", (payload: LetterGuessedDto) => {
      // We only receive this for OUR team's guesses. Update with the full mask + letter.
      setState((s) => {
        if (!s.room || !s.room.currentRound) return s;
        const boards = s.room.currentRound.boards.map((b) =>
          b.teamId === payload.teamId
            ? {
                ...b,
                mask: payload.mask,
                wrongCount: payload.wrongCount,
                guessedLetters: [...new Set([...b.guessedLetters, payload.letter])],
                redacted: false,
              }
            : b,
        );
        return {
          ...s,
          room: { ...s.room, currentRound: { ...s.room.currentRound, boards } },
        };
      });
    });

    connection.on("OpponentProgress", (payload: OpponentProgressDto) => {
      // The opposing team made a move — we get the blurred mask + wrong count, no letters.
      setState((s) => {
        if (!s.room || !s.room.currentRound) return s;
        const boards = s.room.currentRound.boards.map((b) =>
          b.teamId === payload.teamId
            ? {
                ...b,
                mask: payload.blurredMask,
                wrongCount: payload.wrongCount,
                solved: payload.solved,
                guessedLetters: [],
                redacted: true,
              }
            : b,
        );
        return {
          ...s,
          room: { ...s.room, currentRound: { ...s.room.currentRound, boards } },
        };
      });
    });

    connection.on("TurnAdvanced", (turn: ActiveTurnDto | null) => {
      setState((s) => {
        if (!s.room || !s.room.currentRound) return s;
        return {
          ...s,
          turnSecondsRemaining: null,
          room: { ...s.room, currentRound: { ...s.room.currentRound, activeTurn: turn } },
        };
      });
    });

    connection.on("RoundEnded", (payload: RoundEndedDto) => {
      setState((s) => ({ ...s, lastRoundEnded: payload, turnSecondsRemaining: null }));
    });

    connection.on("MatchEnded", (payload: MatchEndedDto) => {
      setState((s) => ({ ...s, lastMatchEnded: payload }));
    });

    connection.on("Chat", (payload: { teamId: string; playerConnectionId: string; nickname: string; message: string }) => {
      setState((s) => {
        const msg: ChatMessage = {
          id: Date.now() + Math.random(),
          teamId: payload.teamId,
          playerConnectionId: payload.playerConnectionId,
          nickname: payload.nickname,
          message: payload.message,
          at: Date.now(),
        };
        const next = [...s.chatMessages, msg];
        if (next.length > MAX_CHAT_MESSAGES) next.splice(0, next.length - MAX_CHAT_MESSAGES);
        return { ...s, chatMessages: next };
      });
    });

    connection.onclose(() => {
      setState((s) => ({ ...s, connectionId: null }));
    });

    await connection.start();
    connectionRef.current = connection;
    setState((s) => ({ ...s, connectionId: connection.connectionId ?? null }));
    return connection;
  }, []);

  const createRoom = useCallback(async (request: CreateHangmanRoomRequest) => {
    const conn = await ensureConnection();
    try {
      const room = await conn.invoke<HangmanRoomDto>("CreateRoom", request);
      lastRoomCodeRef.current = room.code;
      lastNicknameRef.current = null;
      setState((s) => ({ ...s, room, error: null, connectionId: conn.connectionId ?? s.connectionId, lastRoundEnded: null, lastMatchEnded: null }));
      return room;
    } catch (err) {
      const message = errorMessage(err);
      setState((s) => ({ ...s, error: message }));
      throw err;
    }
  }, [ensureConnection]);

  const joinRoom = useCallback(async (code: string, nickname: string | null) => {
    const conn = await ensureConnection();
    try {
      const room = await conn.invoke<HangmanRoomDto>("JoinRoom", { code, nickname });
      lastRoomCodeRef.current = room.code;
      lastNicknameRef.current = nickname;
      setState((s) => ({ ...s, room, error: null, connectionId: conn.connectionId ?? s.connectionId, lastRoundEnded: null, lastMatchEnded: null }));
      return room;
    } catch (err) {
      const message = errorMessage(err);
      setState((s) => ({ ...s, error: message }));
      throw err;
    }
  }, [ensureConnection]);

  const spectate = useCallback(async (code: string) => {
    const conn = await ensureConnection();
    try {
      const room = await conn.invoke<HangmanRoomDto>("JoinAsSpectator", code);
      lastRoomCodeRef.current = room.code;
      lastNicknameRef.current = null;
      isSpectatorRef.current = true;
      setState((s) => ({ ...s, room, isSpectator: true, error: null, connectionId: conn.connectionId ?? s.connectionId, lastRoundEnded: null, lastMatchEnded: null }));
      return room;
    } catch (err) {
      const message = errorMessage(err);
      setState((s) => ({ ...s, error: message }));
      throw err;
    }
  }, [ensureConnection]);

  const leaveSpectate = useCallback(async () => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("LeaveSpectator"); } catch {}
    lastRoomCodeRef.current = null;
    isSpectatorRef.current = false;
    setState(() => ({ ...INITIAL, connectionId: connectionRef.current?.connectionId ?? null }));
  }, []);

  const assignToTeam = useCallback(async (teamId: string) => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("AssignToTeam", teamId); }
    catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  }, []);

  const renameTeam = useCallback(async (teamId: string, name: string) => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("RenameTeam", teamId, name); }
    catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  }, []);

  const setWordSource = useCallback(async (source: string, category: string, difficulty: string) => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("SetWordSource", source, category, difficulty); }
    catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  }, []);

  const startMatch = useCallback(async () => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("StartMatch"); }
    catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  }, []);

  const guessLetter = useCallback(async (letter: string) => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("GuessLetter", letter); }
    catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  }, []);

  const sendChat = useCallback(async (message: string) => {
    if (!connectionRef.current) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    try { await connectionRef.current.invoke("SendChat", trimmed); }
    catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  }, []);

  const leaveRoom = useCallback(async () => {
    if (!connectionRef.current) return;
    try { await connectionRef.current.invoke("LeaveRoom"); } catch {}
    lastRoomCodeRef.current = null;
    lastNicknameRef.current = null;
    isSpectatorRef.current = false;
    setState(() => ({ ...INITIAL, connectionId: connectionRef.current?.connectionId ?? null }));
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);
  const clearMatchEnded = useCallback(() => setState((s) => ({ ...s, lastMatchEnded: null })), []);

  useEffect(() => {
    return () => { connectionRef.current?.stop().catch(() => {}); };
  }, []);

  const value = useMemo<HangmanContextValue>(() => ({
    ...state,
    createRoom, joinRoom, spectate, leaveSpectate, assignToTeam, renameTeam, setWordSource, startMatch, guessLetter, sendChat, leaveRoom, clearError, clearMatchEnded,
  }), [state, createRoom, joinRoom, spectate, leaveSpectate, assignToTeam, renameTeam, setWordSource, startMatch, guessLetter, sendChat, leaveRoom, clearError, clearMatchEnded]);

  return <HangmanContext.Provider value={value}>{children}</HangmanContext.Provider>;
}

export function useHangman(): HangmanContextValue {
  const ctx = useContext(HangmanContext);
  if (!ctx) throw new Error("useHangman must be used within HangmanProvider");
  return ctx;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const match = err.message.match(/HubException: (.+?)(?:\s+HResult|$)/);
    if (match) return match[1];
    return err.message;
  }
  return "Something went wrong";
}
