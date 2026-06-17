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
  CreateRoomRequest,
  RaceResultDto,
  RaceStartedPayload,
  RacerDto,
  RacerProgressPayload,
  RoomDto,
  TextSourceDto,
} from "./types";

type Phase = "idle" | "lobby" | "countdown" | "racing" | "finished";

interface RaceState {
  phase: Phase;
  room: RoomDto | null;
  countdown: number | null;
  raceStartedAt: number | null;
  raceText: string;
  results: RaceResultDto[];
  error: string | null;
  connectionId: string | null;
}

interface RaceContextValue extends RaceState {
  createRoom: (request: CreateRoomRequest) => Promise<RoomDto>;
  joinRoom: (code: string, nickname: string | null) => Promise<RoomDto>;
  leaveRoom: () => Promise<void>;
  setTextSource: (source: TextSourceDto) => Promise<void>;
  setRaceMode: (mode: string) => Promise<void>;
  startRace: (customText?: string) => Promise<void>;
  reportProgress: (charIndex: number, wpm: number, accuracy: number) => void;
  finishRace: (wpm: number, accuracy: number) => Promise<void>;
  clearError: () => void;
}

const RaceContext = createContext<RaceContextValue | null>(null);

const INITIAL_STATE: RaceState = {
  phase: "idle",
  room: null,
  countdown: null,
  raceStartedAt: null,
  raceText: "",
  results: [],
  error: null,
  connectionId: null,
};

export function RaceProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<RaceState>(INITIAL_STATE);
  const connectionRef = useRef<HubConnection | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const ensureConnection = useCallback(async (): Promise<HubConnection> => {
    if (
      connectionRef.current &&
      connectionRef.current.state === HubConnectionState.Connected
    ) {
      return connectionRef.current;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hub/race`, {
        accessTokenFactory: () => tokenRef.current ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("RoomState", (room: RoomDto) => {
      setState((s) => ({
        ...s,
        room,
        phase: mapPhase(room.status),
      }));
    });

    connection.on("RacerJoined", (racer: RacerDto) => {
      setState((s) => {
        if (!s.room) return s;
        if (s.room.racers.some((r) => r.connectionId === racer.connectionId)) return s;
        return { ...s, room: { ...s.room, racers: [...s.room.racers, racer] } };
      });
    });

    connection.on("RacerLeft", (connectionId: string) => {
      setState((s) => {
        if (!s.room) return s;
        return {
          ...s,
          room: {
            ...s.room,
            racers: s.room.racers.filter((r) => r.connectionId !== connectionId),
          },
        };
      });
    });

    connection.on("CountdownTick", (n: number) => {
      setState((s) => ({ ...s, phase: "countdown", countdown: n }));
    });

    connection.on("RaceStarted", (payload: RaceStartedPayload) => {
      setState((s) => ({
        ...s,
        phase: "racing",
        countdown: null,
        raceStartedAt: Date.parse(payload.startedAt),
        raceText: payload.text,
        results: [],
        room: s.room ? { ...s.room, status: "Racing", text: payload.text } : s.room,
      }));
    });

    connection.on("RacerProgress", (payload: RacerProgressPayload) => {
      setState((s) => {
        if (!s.room) return s;
        return {
          ...s,
          room: {
            ...s.room,
            racers: s.room.racers.map((r) =>
              r.connectionId === payload.connectionId
                ? {
                    ...r,
                    charIndex: payload.charIndex,
                    wpm: payload.wpm,
                    accuracy: payload.accuracy,
                    finishedAt: payload.finishedAt ?? r.finishedAt,
                  }
                : r,
            ),
          },
        };
      });
    });

    connection.on("RaceFinished", (results: RaceResultDto[]) => {
      setState((s) => ({
        ...s,
        phase: "finished",
        results,
        room: s.room ? { ...s.room, status: "Finished" } : s.room,
      }));
    });

    connection.onclose(() => {
      setState((s) => ({ ...s, connectionId: null }));
    });

    await connection.start();
    connectionRef.current = connection;
    setState((s) => ({ ...s, connectionId: connection.connectionId ?? null }));
    return connection;
  }, []);

  const createRoom = useCallback(
    async (request: CreateRoomRequest): Promise<RoomDto> => {
      const connection = await ensureConnection();
      try {
        const room = await connection.invoke<RoomDto>("CreateRoom", request);
        setState((s) => ({
          ...s,
          room,
          phase: mapPhase(room.status),
          error: null,
          connectionId: connection.connectionId ?? s.connectionId,
        }));
        return room;
      } catch (err) {
        const message = errorMessage(err);
        setState((s) => ({ ...s, error: message }));
        throw err;
      }
    },
    [ensureConnection],
  );

  const joinRoom = useCallback(
    async (code: string, nickname: string | null): Promise<RoomDto> => {
      const connection = await ensureConnection();
      try {
        const room = await connection.invoke<RoomDto>("JoinRoom", code, nickname);
        setState((s) => ({
          ...s,
          room,
          phase: mapPhase(room.status),
          error: null,
          connectionId: connection.connectionId ?? s.connectionId,
        }));
        return room;
      } catch (err) {
        const message = errorMessage(err);
        setState((s) => ({ ...s, error: message }));
        throw err;
      }
    },
    [ensureConnection],
  );

  const leaveRoom = useCallback(async () => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("LeaveRoom");
    } catch {
      // ignore
    }
    setState(() => ({ ...INITIAL_STATE, connectionId: connectionRef.current?.connectionId ?? null }));
  }, []);

  const setTextSource = useCallback(async (source: TextSourceDto) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("SetTextSource", source);
    } catch (err) {
      setState((s) => ({ ...s, error: errorMessage(err) }));
    }
  }, []);

  const setRaceMode = useCallback(async (mode: string) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("SetRaceMode", mode);
    } catch (err) {
      setState((s) => ({ ...s, error: errorMessage(err) }));
    }
  }, []);

  const startRace = useCallback(async (customText?: string) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("StartRace", customText ?? null);
    } catch (err) {
      setState((s) => ({ ...s, error: errorMessage(err) }));
    }
  }, []);

  const reportProgress = useCallback((charIndex: number, wpm: number, accuracy: number) => {
    if (!connectionRef.current || connectionRef.current.state !== HubConnectionState.Connected) return;
    connectionRef.current.send("ReportProgress", charIndex, wpm, accuracy).catch(() => {});
  }, []);

  const finishRace = useCallback(async (wpm: number, accuracy: number) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("FinishRace", wpm, accuracy);
    } catch (err) {
      setState((s) => ({ ...s, error: errorMessage(err) }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  useEffect(() => {
    return () => {
      connectionRef.current?.stop().catch(() => {});
    };
  }, []);

  const value = useMemo<RaceContextValue>(
    () => ({
      ...state,
      createRoom,
      joinRoom,
      leaveRoom,
      setTextSource,
      setRaceMode,
      startRace,
      reportProgress,
      finishRace,
      clearError,
    }),
    [state, createRoom, joinRoom, leaveRoom, setTextSource, setRaceMode, startRace, reportProgress, finishRace, clearError],
  );

  return <RaceContext.Provider value={value}>{children}</RaceContext.Provider>;
}

export function useRace(): RaceContextValue {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRace must be used within a RaceProvider");
  return ctx;
}

function mapPhase(status: RoomDto["status"]): Phase {
  switch (status) {
    case "Lobby":
      return "lobby";
    case "Countdown":
      return "countdown";
    case "Racing":
      return "racing";
    case "Finished":
      return "finished";
    default:
      return "idle";
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const match = err.message.match(/HubException: (.+?)(?:\s+HResult|$)/);
    if (match) return match[1];
    return err.message;
  }
  return "Something went wrong";
}
