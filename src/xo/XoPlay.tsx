import { useEffect, useMemo, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useXo } from "./XoProvider";
import { VARIANT_INFO } from "./types";

export function XoPlay() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room, connectionId, lastGameEnded, lastSeriesEnded, moveSecondsRemaining,
    makeMove, resign, offerDraw, acceptDraw, declineDraw, drawOfferedBy,
    leaveRoom, error, clearSeriesEnded, startGame,
  } = useXo();

  useEffect(() => { if (!room) navigate("/xo", { replace: true }); }, [room, navigate]);
  useEffect(() => {
    if (room && room.status === "Lobby") navigate(`/xo/room/${code}`);
  }, [room, code, navigate]);

  const me = useMemo(() => room?.players.find((p) => p.connectionId === connectionId), [room, connectionId]);
  const mySide = me?.side === "X" ? "x" : me?.side === "O" ? "o" : null;
  const game = room?.currentGame ?? null;
  const myTurn = !!game && !!mySide && game.nextSide === mySide && game.status === "InProgress";
  const info = room ? VARIANT_INFO[room.variant] : null;

  const handleCell = (boardIdx: number, row: number, col: number) => {
    if (!myTurn) return;
    if (!game) return;
    if (game.variant === "Ultimate") {
      if (game.activeMeta !== null && game.activeMeta !== boardIdx) return;
      makeMove(row, col, boardIdx);
    } else {
      makeMove(row, col, null);
    }
  };

  if (!room || !info) return null;

  const renderBoard = (boardStr: string, boardIdx: number, size: number, winningLine: number[] | null, dimmed: boolean) => {
    const cells: ReactElement[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const ch = boardStr[idx] ?? '.';
        const isWin = winningLine?.includes(idx) ?? false;
        cells.push(
          <button
            key={`${boardIdx}-${r}-${c}`}
            className={`xo-cell ${ch === 'x' ? 'x' : ch === 'o' ? 'o' : ''} ${isWin ? 'win' : ''}`}
            onClick={() => handleCell(boardIdx, r, c)}
            disabled={!myTurn || ch !== '.' || dimmed || game?.status !== "InProgress"}
          >
            {ch === '.' ? '' : ch.toUpperCase()}
          </button>
        );
      }
    }
    return (
      <div className={`xo-grid ${dimmed ? 'dimmed' : ''}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {cells}
      </div>
    );
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">x and o ~ {room.code}</span>
        <span className="terminal-stats">
          {game?.status === "InProgress" && (
            <>turn: <strong style={{ color: game.nextSide === 'x' ? '#7dd3fc' : '#fca5a5' }}>{game.nextSide.toUpperCase()}</strong>
            {moveSecondsRemaining !== null && <> · {moveSecondsRemaining}s</>}</>
          )}
        </span>
      </div>
      <div className="terminal-body">
        <div className="score-strip">
          <div className="score-side x">X · {room.players.find(p => p.side === 'X')?.nickname ?? '—'}</div>
          <div className="score-value">{room.scoreX} — {room.scoreO}</div>
          <div className="score-side o">{room.players.find(p => p.side === 'O')?.nickname ?? '—'} · O</div>
        </div>

        {game && (
          <>
            {game.variant === "Ultimate" ? (
              <div className="ultimate-meta">
                {Array.from({ length: 9 }).map((_, i) => {
                  const dimmed = game.activeMeta !== null && game.activeMeta !== i;
                  return (
                    <div key={i} className={`ultimate-sub ${dimmed ? 'dimmed' : 'active'}`}>
                      {renderBoard(game.boards[i], i, 3, null, dimmed)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="single-board">
                {renderBoard(game.boards[0], 0, info.size, game.winningLine, false)}
              </div>
            )}
          </>
        )}

        {myTurn && game?.status === "InProgress" && (
          <p className="muted small hint">your move ({mySide?.toUpperCase()})</p>
        )}

        {drawOfferedBy && me?.side !== "None" && drawOfferedBy.connectionId !== connectionId && (
          <div className="finished-block">
            <p className="muted">{drawOfferedBy.nickname} offered a draw.</p>
            <div className="actions-row">
              <button className="primary" onClick={acceptDraw}>accept</button>
              <button className="ghost" onClick={declineDraw}>decline</button>
            </div>
          </div>
        )}

        {game?.status === "InProgress" && mySide && (
          <div className="actions-row">
            <button className="ghost" onClick={offerDraw}>offer draw</button>
            <button className="ghost danger" onClick={resign}>resign</button>
          </div>
        )}

        {lastGameEnded && room.status === "GameResults" && (
          <div className="finished-block">
            <p className="screen-title">
              // game over —{" "}
              {lastGameEnded.winner === " " || !lastGameEnded.winner.trim()
                ? "draw"
                : (
                  <strong style={{ color: lastGameEnded.winner === "x" ? "#7dd3fc" : "#fca5a5" }}>
                    {lastGameEnded.winner.toUpperCase()} wins
                  </strong>
                )} ({lastGameEnded.reason.toLowerCase()})
            </p>
            <p className="muted small">next game starting…</p>
          </div>
        )}

        {lastSeriesEnded && (
          <div className="finished-block">
            <p className="screen-title">// series over</p>
            <p>
              <strong style={{ color: lastSeriesEnded.winner === "x" ? "#7dd3fc" : "#fca5a5" }}>
                {lastSeriesEnded.winner.trim() ? `${lastSeriesEnded.winner.toUpperCase()} wins` : "drawn series"}
              </strong>
              {" "}({lastSeriesEnded.scoreX}–{lastSeriesEnded.scoreO})
            </p>
            <div className="actions-row">
              <button className="primary" onClick={async () => { clearSeriesEnded(); await startGame(); }}>
                rematch
              </button>
              <button className="ghost danger" onClick={async () => { await leaveRoom(); navigate("/xo", { replace: true }); }}>
                leave
              </button>
            </div>
          </div>
        )}

        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
      </div>
    </div>
  );
}
