import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useXo } from "./XoProvider";

export function XoLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, connectionId, error, chooseSide, startGame, leaveRoom } = useXo();
  const [copied, setCopied] = useState(false);
  const [spectateCopied, setSpectateCopied] = useState(false);

  useEffect(() => { if (!room) navigate("/xo", { replace: true }); }, [room, navigate]);
  useEffect(() => {
    if (room && (room.status === "InGame" || room.status === "GameResults")) navigate(`/xo/room/${code}/play`);
  }, [room, code, navigate]);

  if (!room) return null;
  const isHost = room.hostConnectionId === connectionId;
  const me = room.players.find((p) => p.connectionId === connectionId);
  const xPlayer = room.players.find((p) => p.side === "X");
  const oPlayer = room.players.find((p) => p.side === "O");

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/xo?code=${room.code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const copySpectate = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/xo/room/${room.code}/spectate`);
    setSpectateCopied(true); setTimeout(() => setSpectateCopied(false), 2000);
  };
  const handleLeave = async () => { await leaveRoom(); navigate("/xo", { replace: true }); };

  const sideCard = (side: "X" | "O", player: typeof xPlayer) => {
    const mine = me?.side === side;
    return (
      <div className={`team-panel ${mine ? "active" : ""}`}>
        <div className="team-header" style={{ borderLeftColor: side === "X" ? "#7dd3fc" : "#fca5a5" }}>
          <strong>{side}</strong>
          <span className="muted small">{player ? player.nickname : "open"}</span>
        </div>
        {player ? (
          <p className="muted small">{player.connectionId === connectionId ? "you" : ""}</p>
        ) : (
          <button className="ghost small" onClick={() => chooseSide(side)} disabled={!me}>take {side}</button>
        )}
      </div>
    );
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">x and o ~ lobby ~ {room.code}</span>
      </div>
      <div className="terminal-body">
        <div className="invite-row">
          <div>
            <div className="muted">{room.name ?? "invite code"}</div>
            <div className="invite-code">{room.code}</div>
          </div>
          <button onClick={copy} className="ghost">{copied ? "copied ✓" : "copy link"}</button>
          <button onClick={copySpectate} className="ghost">{spectateCopied ? "copied ✓" : "spectate link"}</button>
          <button onClick={handleLeave} className="ghost danger">leave</button>
        </div>

        <section>
          <h3>// settings</h3>
          <p className="muted small">variant: {room.variant.toLowerCase()} · best of {room.bestOf} · move: {room.moveSeconds}s</p>
        </section>

        <section>
          <h3>// players</h3>
          <div className="team-grid">
            {sideCard("X", xPlayer)}
            {sideCard("O", oPlayer)}
          </div>
        </section>

        {room.spectators.length > 0 && (
          <section>
            <h3>// spectators ({room.spectators.length})</h3>
            <ul className="team-roster">
              {room.spectators.map((s) => (
                <li key={s.connectionId}>
                  <span className="racer-dot" style={{ background: s.color }} />
                  <span>{s.nickname}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isHost ? (
          <button className="primary" disabled={!xPlayer || !oPlayer} onClick={startGame}>
            start_game()
          </button>
        ) : (
          <p className="muted">waiting for host to start…</p>
        )}

        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
      </div>
    </div>
  );
}
