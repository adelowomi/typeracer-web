import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import {
  HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel,
} from "@microsoft/signalr";
import { API_BASE_URL } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type {
  GameEndedDto, MoveMadeDto, SeriesEndedDto, XoRoomDto,
} from "./types";

interface XoState {
  room: XoRoomDto | null;
  connectionId: string | null;
  lastGameEnded: GameEndedDto | null;
  lastSeriesEnded: SeriesEndedDto | null;
  drawOfferedBy: { connectionId: string; nickname: string } | null;
  moveSecondsRemaining: number | null;
  error: string | null;
}

interface XoContextValue extends XoState {
  createRoom: (req: { name: string | null; variant: string; bestOf: number; moveSeconds: number }) => Promise<XoRoomDto>;
  joinRoom: (code: string, nickname: string | null, asSpectator: boolean) => Promise<XoRoomDto>;
  chooseSide: (side: "X" | "O") => Promise<void>;
  setVariant: (variant: string) => Promise<void>;
  startGame: () => Promise<void>;
  makeMove: (row: number, col: number, metaIdx: number | null) => Promise<void>;
  resign: () => Promise<void>;
  offerDraw: () => Promise<void>;
  acceptDraw: () => Promise<void>;
  declineDraw: () => Promise<void>;
  sendChat: (message: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
  clearSeriesEnded: () => void;
}

const INITIAL: XoState = {
  room: null, connectionId: null, lastGameEnded: null, lastSeriesEnded: null,
  drawOfferedBy: null, moveSecondsRemaining: null, error: null,
};

const Ctx = createContext<XoContextValue | null>(null);

export function XoProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<XoState>(INITIAL);
  const connRef = useRef<HubConnection | null>(null);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const ensure = useCallback(async (): Promise<HubConnection> => {
    if (connRef.current && connRef.current.state === HubConnectionState.Connected) return connRef.current;
    const conn = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hub/xo`, { accessTokenFactory: () => tokenRef.current ?? "" })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    conn.on("RoomState", (room: XoRoomDto) => setState((s) => ({ ...s, room })));
    conn.on("PlayerLeft", () => {});
    conn.on("GameStarted", (g: { boards: string[]; metaBoard: string | null; nextSide: "x"|"o"; activeMeta: number | null; moveDeadlineAt: string }) => {
      setState((s) => ({
        ...s,
        lastGameEnded: null,
        lastSeriesEnded: null,
        room: s.room?.currentGame
          ? { ...s.room, currentGame: { ...s.room.currentGame, ...g, winningLine: null, status: "InProgress" } }
          : s.room,
      }));
    });
    conn.on("MoveMade", (m: MoveMadeDto) => {
      setState((s) => {
        if (!s.room?.currentGame) return s;
        return {
          ...s,
          room: { ...s.room, currentGame: {
            ...s.room.currentGame,
            boards: m.boards,
            metaBoard: m.metaBoard,
            nextSide: m.nextSide,
            activeMeta: m.activeMeta,
            winningLine: m.winningLine ?? s.room.currentGame.winningLine,
          } },
        };
      });
    });
    conn.on("MoveTick", (n: number) => setState((s) => ({ ...s, moveSecondsRemaining: n })));
    conn.on("TurnTimedOut", () => setState((s) => ({ ...s, moveSecondsRemaining: 0 })));
    conn.on("GameEnded", (g: GameEndedDto) => setState((s) => ({ ...s, lastGameEnded: g, moveSecondsRemaining: null })));
    conn.on("SeriesEnded", (se: SeriesEndedDto) => setState((s) => ({ ...s, lastSeriesEnded: se })));
    conn.on("DrawOffered", (d: { byConnection: string; byNickname: string }) =>
      setState((s) => ({ ...s, drawOfferedBy: { connectionId: d.byConnection, nickname: d.byNickname } })));
    conn.on("DrawDeclined", () => setState((s) => ({ ...s, drawOfferedBy: null })));
    conn.onclose(() => setState((s) => ({ ...s, connectionId: null })));

    await conn.start();
    connRef.current = conn;
    setState((s) => ({ ...s, connectionId: conn.connectionId ?? null }));
    return conn;
  }, []);

  const createRoom = useCallback(async (req: any) => {
    const c = await ensure();
    try {
      const room = await c.invoke<XoRoomDto>("CreateRoom", req);
      setState((s) => ({ ...s, room, error: null, connectionId: c.connectionId ?? s.connectionId, lastGameEnded: null, lastSeriesEnded: null }));
      return room;
    } catch (err) {
      const m = errorMessage(err);
      setState((s) => ({ ...s, error: m }));
      throw err;
    }
  }, [ensure]);

  const joinRoom = useCallback(async (code: string, nickname: string | null, asSpectator: boolean) => {
    const c = await ensure();
    try {
      const room = await c.invoke<XoRoomDto>("JoinRoom", { code, nickname, asSpectator });
      setState((s) => ({ ...s, room, error: null, connectionId: c.connectionId ?? s.connectionId, lastGameEnded: null, lastSeriesEnded: null }));
      return room;
    } catch (err) {
      const m = errorMessage(err);
      setState((s) => ({ ...s, error: m }));
      throw err;
    }
  }, [ensure]);

  const wrap = (fn: () => Promise<void>) => async () => {
    try { await fn(); } catch (err) { setState((s) => ({ ...s, error: errorMessage(err) })); }
  };

  const chooseSide = useCallback(async (side: "X" | "O") => {
    if (!connRef.current) return;
    try { await connRef.current.invoke("ChooseSide", side); } catch (e) { setState((s) => ({ ...s, error: errorMessage(e) })); }
  }, []);
  const setVariant = useCallback(async (variant: string) => {
    if (!connRef.current) return;
    try { await connRef.current.invoke("SetVariant", variant); } catch (e) { setState((s) => ({ ...s, error: errorMessage(e) })); }
  }, []);
  const startGame = useCallback(wrap(async () => { await connRef.current!.invoke("StartGame"); }), []);
  const makeMove = useCallback(async (row: number, col: number, metaIdx: number | null) => {
    if (!connRef.current) return;
    try { await connRef.current.invoke("MakeMove", { row, col, metaIdx }); } catch (e) { setState((s) => ({ ...s, error: errorMessage(e) })); }
  }, []);
  const resign = useCallback(wrap(async () => { await connRef.current!.invoke("Resign"); }), []);
  const offerDraw = useCallback(wrap(async () => { await connRef.current!.invoke("OfferDraw"); }), []);
  const acceptDraw = useCallback(wrap(async () => { await connRef.current!.invoke("AcceptDraw"); }), []);
  const declineDraw = useCallback(wrap(async () => { await connRef.current!.invoke("DeclineDraw"); }), []);
  const sendChat = useCallback(async (message: string) => {
    if (!connRef.current) return;
    try { await connRef.current.invoke("SendChat", message); } catch (e) { setState((s) => ({ ...s, error: errorMessage(e) })); }
  }, []);
  const leaveRoom = useCallback(async () => {
    if (!connRef.current) return;
    try { await connRef.current.invoke("LeaveRoom"); } catch {}
    setState(() => ({ ...INITIAL, connectionId: connRef.current?.connectionId ?? null }));
  }, []);
  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);
  const clearSeriesEnded = useCallback(() => setState((s) => ({ ...s, lastSeriesEnded: null, lastGameEnded: null })), []);

  useEffect(() => () => { connRef.current?.stop().catch(() => {}); }, []);

  const value = useMemo<XoContextValue>(() => ({
    ...state, createRoom, joinRoom, chooseSide, setVariant, startGame, makeMove,
    resign, offerDraw, acceptDraw, declineDraw, sendChat, leaveRoom, clearError, clearSeriesEnded,
  }), [state, createRoom, joinRoom, chooseSide, setVariant, startGame, makeMove,
       resign, offerDraw, acceptDraw, declineDraw, sendChat, leaveRoom, clearError, clearSeriesEnded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useXo(): XoContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useXo must be used within XoProvider");
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
