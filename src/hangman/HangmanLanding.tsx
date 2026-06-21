import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useHangman } from "./HangmanProvider";
import {
  HANGMAN_CATEGORIES,
  HANGMAN_DIFFICULTIES,
  HANGMAN_TEAM_MODES,
  type Difficulty,
  type TeamMode,
  type WordSource,
} from "./types";

export function HangmanLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRoom, joinRoom, error, clearError } = useHangman();
  const [params] = useSearchParams();

  const [name, setName] = useState("");
  const [teamMode, setTeamMode] = useState<TeamMode>("TeamVsTeam");
  const [wordSource] = useState<WordSource>("System");
  const [category, setCategory] = useState<string>("movies");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [bestOf, setBestOf] = useState(3);
  const [turnSeconds, setTurnSeconds] = useState(25);
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    clearError();
    setBusy("create");
    try {
      const room = await createRoom({
        name: name.trim() || null,
        teamMode,
        wordSource,
        category,
        difficulty,
        bestOf: teamMode === "Tournament" ? bestOf : 1,
        turnSeconds,
      });
      navigate(`/hangman/room/${room.code}`);
    } catch {} finally { setBusy(null); }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!joinCode.trim()) return;
    setBusy("join");
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase(), null);
      navigate(`/hangman/room/${room.code}`);
    } catch {} finally { setBusy(null); }
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">hangman ~ lobby setup</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <pre className="ascii">{ART}</pre>

        {!user && (
          <div className="error">
            <span className="prompt-prefix">!</span> log in to host a hangman room. <Link to="/login">login →</Link>
          </div>
        )}

        <div className="actions">
          <form className="action-card" onSubmit={handleCreate}>
            <h3>// host a room</h3>

            <label className="field">
              <span className="field-label">room name (optional)</span>
              <input type="text" maxLength={80} value={name} placeholder="lunch break"
                onChange={(e) => setName(e.target.value)} disabled={!user} />
            </label>

            <section>
              <h3>// team mode</h3>
              <div className="source-grid">
                {HANGMAN_TEAM_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={`source-card ${teamMode === m.value ? "selected" : ""}`}
                    onClick={() => setTeamMode(m.value)}
                    disabled={!user}
                  >
                    <strong>{m.label}</strong>
                    <span className="muted">{m.sub}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>// category</h3>
              <div className="language-picker">
                {HANGMAN_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pill ${category === c ? "selected" : ""}`}
                    onClick={() => setCategory(c)}
                    disabled={!user}
                  >{c}</button>
                ))}
              </div>
            </section>

            <section>
              <h3>// difficulty</h3>
              <div className="language-picker">
                {HANGMAN_DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`pill ${difficulty === d ? "selected" : ""}`}
                    onClick={() => setDifficulty(d)}
                    disabled={!user}
                  >{d.toLowerCase()}</button>
                ))}
              </div>
            </section>

            <div className="target-row">
              {teamMode === "Tournament" && (
                <label className="field">
                  <span className="field-label">best of</span>
                  <input type="number" min={1} max={7} step={2} value={bestOf}
                    onChange={(e) => setBestOf(Number(e.target.value))} disabled={!user} />
                </label>
              )}
              <label className="field">
                <span className="field-label">turn seconds</span>
                <input type="number" min={10} max={60} value={turnSeconds}
                  onChange={(e) => setTurnSeconds(Number(e.target.value))} disabled={!user} />
              </label>
            </div>

            <button type="submit" className="primary" disabled={!user || busy !== null}>
              {busy === "create" ? "creating…" : "create_room()"}
            </button>
          </form>

          <form className="action-card" onSubmit={handleJoin}>
            <h3>// join a room</h3>
            <label className="field">
              <span className="field-label">code</span>
              <input
                type="text"
                maxLength={6}
                placeholder="XXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}
              />
            </label>
            <button type="submit" disabled={!joinCode.trim() || busy !== null}>
              {busy === "join" ? "joining…" : "join_room()"}
            </button>
            <p className="muted spectate-hint">
              just want to watch?{" "}
              <button
                type="button"
                className="link-button"
                disabled={!joinCode.trim()}
                onClick={() => navigate(`/hangman/room/${joinCode.trim().toUpperCase()}/spectate`)}
              >
                spectate this room →
              </button>
            </p>
          </form>
        </div>

        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
      </div>
    </div>
  );
}

const ART = `   __
  / /_  ____ _____  ____ _____ ___  ____ _____
 / __ \\/ __ \`/ __ \\/ __ \`/ __ \`__ \\/ __ \`/ __ \\
/ / / / /_/ / / / / /_/ / / / / / / /_/ / / / /
\\/ /_/\\__,_/_/ /_/\\__, /_/ /_/ /_/\\__,_/_/ /_/
                /____/                          `;
