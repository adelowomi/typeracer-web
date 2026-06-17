import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useRace } from "../race/RaceProvider";

const GUEST_NICKNAME_KEY = "typeracer.guest.nickname";

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRoom, joinRoom, error, clearError } = useRace();
  const [params] = useSearchParams();
  const [guestNickname, setGuestNickname] = useState<string>(
    () => localStorage.getItem(GUEST_NICKNAME_KEY) ?? "",
  );
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const rememberGuest = (value: string) => {
    setGuestNickname(value);
    localStorage.setItem(GUEST_NICKNAME_KEY, value);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    clearError();
    setBusy("create");
    try {
      const room = await createRoom({
        nickname: null,
        name: roomName.trim() || null,
      });
      navigate(`/room/${room.code}`);
    } catch {
      // surfaced via context
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const nickname = user ? user.displayName : guestNickname.trim();
    if (!nickname || !joinCode.trim()) return;
    setBusy("join");
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase(), user ? null : guestNickname.trim());
      navigate(`/room/${room.code}`);
    } catch {
      // surfaced via context
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="terminal-window landing">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">typeracer ~ session</span>
        <span className="terminal-stats">
          {user ? (
            <Link to="/me/rooms" className="auth-link">{user.displayName}</Link>
          ) : (
            <><Link to="/login" className="auth-link">login</Link> · <Link to="/register" className="auth-link">register</Link></>
          )}
        </span>
      </div>
      <div className="terminal-body">
        <pre className="ascii">{ART}</pre>
        <p className="prompt">
          <span className="prompt-prefix">$</span>
          {user ? ` welcome back, ${user.displayName}` : " who's racing?"}
        </p>

        {!user && (
          <label className="field">
            <span className="field-label">nickname (guest)</span>
            <input
              type="text"
              maxLength={24}
              placeholder="enter handle"
              value={guestNickname}
              onChange={(e) => rememberGuest(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <div className="actions">
          <form onSubmit={handleCreate} className="action-card">
            <h3>// host a room</h3>
            {user ? (
              <>
                <p>persistent room owned by you. friends can rejoin anytime.</p>
                <label className="field">
                  <span className="field-label">room name (optional)</span>
                  <input
                    type="text"
                    maxLength={80}
                    placeholder="lunch break"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </label>
                <button type="submit" className="primary" disabled={busy !== null}>
                  {busy === "create" ? "creating…" : "create_room()"}
                </button>
              </>
            ) : (
              <>
                <p>log in to create a persistent room with leaderboards.</p>
                <Link to="/login" className="primary-link">login →</Link>
              </>
            )}
          </form>

          <form onSubmit={handleJoin} className="action-card">
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
            <button
              type="submit"
              disabled={
                !joinCode.trim() ||
                (!user && !guestNickname.trim()) ||
                busy !== null
              }
            >
              {busy === "join" ? "joining…" : "join_room()"}
            </button>
          </form>
        </div>

        <p className="muted">
          <Link to="/leaderboard">// global leaderboard</Link>
        </p>

        {error && (
          <p className="error">
            <span className="prompt-prefix">!</span> {error}
          </p>
        )}
      </div>
    </div>
  );
}

const ART = `   __
  / /___  ______  ___  _________ _________ _____
 / __/ / / / __ \\/ _ \\/ ___/ __ \`/ ___/ _ \\/ ___/
/ /_/ /_/ / /_/ /  __/ /  / /_/ / /__/  __/ /
\\__/\\__, / .___/\\___/_/   \\__,_/\\___/\\___/_/
   /____/_/                                    `;
