import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useHangman } from "./HangmanProvider";

export function HangmanLobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, connectionId, error, assignToTeam, renameTeam, startMatch, leaveRoom } = useHangman();
  const [editTeam, setEditTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room) navigate("/hangman", { replace: true });
  }, [room, navigate]);

  useEffect(() => {
    if (room && (room.status === "Playing" || room.status === "WordSelection")) {
      navigate(`/hangman/room/${code}/play`);
    }
  }, [room, code, navigate]);

  if (!room) return null;

  const isHost = room.hostConnectionId === connectionId;
  const me = room.players.find((p) => p.connectionId === connectionId);

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/hangman?code=${room.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    await startMatch();
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/hangman", { replace: true });
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">hangman ~ lobby ~ {room.code}</span>
      </div>
      <div className="terminal-body">
        <div className="invite-row">
          <div>
            <div className="muted">{room.name ?? "invite code"}</div>
            <div className="invite-code">{room.code}</div>
          </div>
          <button onClick={copyInvite} className="ghost">{copied ? "copied ✓" : "copy link"}</button>
          <button onClick={handleLeave} className="ghost danger">leave</button>
        </div>

        <section>
          <h3>// settings</h3>
          <p className="muted small">
            mode: {room.teamMode.toLowerCase()} · category: {room.category} · difficulty: {room.difficulty.toLowerCase()} ·
            best of {room.bestOf} · turn: {room.turnSeconds}s
          </p>
        </section>

        <section>
          <h3>// teams ({room.teams.length})</h3>
          <div className="team-grid">
            {room.teams.map((team) => {
              const roster = room.players.filter((p) => p.teamId === team.id);
              const onThisTeam = me?.teamId === team.id;
              return (
                <div key={team.id} className={`team-panel ${onThisTeam ? "active" : ""}`}>
                  <div className="team-header" style={{ borderLeftColor: team.color }}>
                    {editTeam === team.id ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        renameTeam(team.id, editName);
                        setEditTeam(null);
                      }}>
                        <input
                          autoFocus
                          value={editName}
                          maxLength={32}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => setEditTeam(null)}
                        />
                      </form>
                    ) : (
                      <strong onClick={() => { if (isHost) { setEditTeam(team.id); setEditName(team.name); } }}>
                        {team.name}
                      </strong>
                    )}
                    <span className="muted small">{roster.length}/5</span>
                  </div>
                  <ul className="team-roster">
                    {roster.map((p) => (
                      <li key={p.connectionId}>
                        <span className="racer-dot" style={{ background: p.color }} />
                        <span>{p.nickname}</span>
                        {p.connectionId === room.hostConnectionId && <span className="badge">host</span>}
                        {p.connectionId === connectionId && <span className="badge you">you</span>}
                      </li>
                    ))}
                    {roster.length === 0 && <li className="muted">— empty —</li>}
                  </ul>
                  {!onThisTeam && (
                    <button onClick={() => assignToTeam(team.id)} className="ghost small">
                      join this team
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {isHost ? (
          <button className="primary" disabled={room.players.filter(p => p.teamId).length < 2} onClick={handleStart}>
            start_match()
          </button>
        ) : (
          <p className="muted">waiting for host to start the match…</p>
        )}

        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
      </div>
    </div>
  );
}
