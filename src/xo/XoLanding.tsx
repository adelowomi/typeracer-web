import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useXo } from "./XoProvider";
import { VARIANT_INFO, type XoVariant } from "./types";

const VARIANTS: XoVariant[] = ["Classic3", "Big4", "Gomoku7", "Ultimate"];

export function XoLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRoom, joinRoom, error, clearError } = useXo();
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [variant, setVariant] = useState<XoVariant>("Classic3");
  const [bestOf, setBestOf] = useState(3);
  const [moveSeconds, setMoveSeconds] = useState(15);
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    clearError();
    setBusy("create");
    try {
      const room = await createRoom({ name: name.trim() || null, variant, bestOf, moveSeconds });
      navigate(`/xo/room/${room.code}`);
    } catch {} finally { setBusy(null); }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!joinCode.trim()) return;
    setBusy("join");
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase(), null, false);
      navigate(`/xo/room/${room.code}`);
    } catch {} finally { setBusy(null); }
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">x and o ~ lobby setup</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <pre className="ascii">{ART}</pre>

        {!user && (
          <div className="error">
            <span className="prompt-prefix">!</span> log in to host a room. <Link to="/login">login →</Link>
          </div>
        )}

        <div className="actions">
          <form className="action-card" onSubmit={handleCreate}>
            <h3>// host a room</h3>
            <label className="field">
              <span className="field-label">room name (optional)</span>
              <input type="text" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} disabled={!user} placeholder="couch tournament" />
            </label>
            <section>
              <h3>// variant</h3>
              <div className="source-grid four">
                {VARIANTS.map((v) => (
                  <button
                    type="button"
                    key={v}
                    className={`source-card ${variant === v ? "selected" : ""}`}
                    onClick={() => setVariant(v)}
                    disabled={!user}
                  >
                    <strong>{VARIANT_INFO[v].label}</strong>
                    <span className="muted">{VARIANT_INFO[v].sub}</span>
                  </button>
                ))}
              </div>
            </section>
            <div className="target-row">
              <label className="field">
                <span className="field-label">best of</span>
                <input type="number" min={1} max={7} step={2} value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} disabled={!user} />
              </label>
              <label className="field">
                <span className="field-label">move seconds</span>
                <input type="number" min={5} max={120} value={moveSeconds} onChange={(e) => setMoveSeconds(Number(e.target.value))} disabled={!user} />
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
              <input type="text" maxLength={6} placeholder="XXXXX" value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase", letterSpacing: "0.2em" }} />
            </label>
            <button type="submit" disabled={!joinCode.trim() || busy !== null}>
              {busy === "join" ? "joining…" : "join_room()"}
            </button>
          </form>
        </div>

        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
      </div>
    </div>
  );
}

const ART = `       _   _      _____         _____
 _ __ | |_(_) ___| ____|___    | __  )   _____
| '_ \\| __| |/ __|  _| / _ \\   |  _ \\  / _   \\
| | | | |_| | (__| |__| (_) |  | |_) || (_) |
|_| |_|\\__|_|\\___|_____\\___/   |____/  \\___/`;
