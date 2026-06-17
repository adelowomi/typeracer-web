import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRace } from "../race/RaceProvider";

export function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, results, connectionId, startRace, leaveRoom, phase } = useRace();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (phase === "countdown" || phase === "racing") {
      navigate(`/room/${code}/race`);
    }
  }, [phase, code, navigate]);

  if (!room) return null;

  const isHost = room.hostConnectionId === connectionId;

  const handleAgain = async () => {
    await startRace();
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/", { replace: true });
  };

  const medal = (pos: number) =>
    pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : ` ${pos}`;

  return (
    <div className="terminal-window results">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">results ~ /room/{room.code}</span>
      </div>
      <div className="terminal-body">
        <h2>// race complete</h2>
        <ol className="results-list">
          {results.map((r) => (
            <li
              key={r.connectionId}
              className={r.connectionId === connectionId ? "you" : ""}
            >
              <span className="medal">{medal(r.position)}</span>
              <span className="result-name">{r.nickname}</span>
              <span className="result-stat">{Math.round(r.wpm)} wpm</span>
              <span className="result-stat muted">
                {Math.round(r.accuracy * 100)}%
              </span>
              <span className="result-stat muted">
                {r.durationSeconds ? `${r.durationSeconds.toFixed(1)}s` : "—"}
              </span>
            </li>
          ))}
        </ol>

        <div className="actions-row">
          {isHost && (
            <button className="primary" onClick={handleAgain}>
              race_again()
            </button>
          )}
          <button className="ghost danger" onClick={handleLeave}>
            leave
          </button>
        </div>
      </div>
    </div>
  );
}
