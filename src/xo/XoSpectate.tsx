import { useEffect, useState, type ReactElement } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useXo } from "./XoProvider";
import { VARIANT_INFO } from "./types";

export function XoSpectate() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room, lastGameEnded, lastSeriesEnded, moveSecondsRemaining,
    joinRoom, leaveRoom, error,
  } = useXo();
  const [joining, setJoining] = useState(true);

  useEffect(() => {
    if (!code) return;
    let active = true;
    joinRoom(code.toUpperCase(), null, true)
      .catch(() => {})
      .finally(() => {
        if (active) setJoining(false);
      });
    return () => {
      active = false;
      leaveRoom();
    };
    // joinRoom/leaveRoom are stable; only re-run on code change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/xo");
  };

  const game = room?.currentGame ?? null;
  const info = room ? VARIANT_INFO[room.variant] : null;

  const renderBoard = (boardStr: string, boardIdx: number, size: number, winningLine: number[] | null) => {
    const cells: ReactElement[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const ch = boardStr[idx] ?? ".";
        const isWin = winningLine?.includes(idx) ?? false;
        cells.push(
          <div
            key={`${boardIdx}-${r}-${c}`}
            className={`xo-cell ${ch === "x" ? "x" : ch === "o" ? "o" : ""} ${isWin ? "win" : ""}`}
          >
            {ch === "." ? "" : ch.toUpperCase()}
          </div>,
        );
      }
    }
    return (
      <div className="xo-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
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
        <span className="terminal-title">spectating ~ {code}</span>
        <span className="terminal-stats">
          <span className="badge spectator">👁 spectator</span>
          <button onClick={handleLeave} className="link-button">leave</button>
        </span>
      </div>
      <div className="terminal-body">
        {joining && !room && <p className="muted">// connecting to room {code}…</p>}

        {error && (
          <p className="error">
            <span className="prompt-prefix">!</span> {error}{" "}
            <Link to="/xo">go back</Link>
          </p>
        )}

        {room && info && (
          <>
            <div className="score-strip">
              <div className="score-side x">X · {room.players.find((p) => p.side === "X")?.nickname ?? "—"}</div>
              <div className="score-value">{room.scoreX} — {room.scoreO}</div>
              <div className="score-side o">{room.players.find((p) => p.side === "O")?.nickname ?? "—"} · O</div>
            </div>

            {game?.status === "InProgress" && (
              <p className="muted small hint">
                turn: <strong style={{ color: game.nextSide === "x" ? "#7dd3fc" : "#fca5a5" }}>{game.nextSide.toUpperCase()}</strong>
                {moveSecondsRemaining !== null && <> · {moveSecondsRemaining}s</>}
              </p>
            )}

            {!game && (room.status === "Lobby" || room.status === "SeriesEnded") && (
              <p className="muted">// waiting for the next game to start…</p>
            )}

            {game && (
              game.variant === "Ultimate" ? (
                <div className="ultimate-meta">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const dimmed = game.activeMeta !== null && game.activeMeta !== i;
                    return (
                      <div key={i} className={`ultimate-sub ${dimmed ? "dimmed" : "active"}`}>
                        {renderBoard(game.boards[i], i, 3, null)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="single-board">
                  {renderBoard(game.boards[0], 0, info.size, game.winningLine)}
                </div>
              )
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
              </div>
            )}

            <p className="muted small hint">
              👁 watching live · {room.spectators.length} spectator
              {room.spectators.length === 1 ? "" : "s"} · you can't make moves from here
            </p>
          </>
        )}
      </div>
    </div>
  );
}
