import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useRace } from "../race/RaceProvider";

const GUEST_NICKNAME_KEY = "typeracer.guest.nickname";

interface RoomSummary {
  id: string;
  code: string;
  name: string | null;
  lastActiveAt: string;
  raceCount: number;
}

export function Landing() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { createRoom, joinRoom, error, clearError } = useRace();
  const [params] = useSearchParams();
  const [guestNickname, setGuestNickname] = useState<string>(
    () => localStorage.getItem(GUEST_NICKNAME_KEY) ?? "",
  );
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState(params.get("code") ?? "");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [myRooms, setMyRooms] = useState<RoomSummary[] | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMyRooms(null);
      return;
    }
    api<RoomSummary[]>("/rooms/mine", { token })
      .then(setMyRooms)
      .catch((e) => setRoomsError(e.message));
  }, [token]);

  const rememberGuest = (value: string) => {
    setGuestNickname(value);
    localStorage.setItem(GUEST_NICKNAME_KEY, value);
  };

  const refreshRooms = () => {
    if (!token) return;
    api<RoomSummary[]>("/rooms/mine", { token })
      .then(setMyRooms)
      .catch((e) => setRoomsError(e.message));
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

  const handleRejoin = async (code: string) => {
    clearError();
    setBusy("join");
    try {
      const room = await joinRoom(code, null);
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
            <>
              <span className="muted">{user.displayName}</span>
              <button onClick={logout} className="link-button">log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-link">login</Link>
              <span className="muted"> · </span>
              <Link to="/register" className="auth-link">register</Link>
            </>
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

        {user && myRooms && myRooms.length > 0 && (
          <section className="my-rooms-block">
            <div className="block-head">
              <h3>// your rooms</h3>
              <button className="link-button" onClick={refreshRooms}>refresh</button>
            </div>
            <ul className="room-list">
              {myRooms.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <div>
                    <div className="room-name">{r.name ?? r.code}</div>
                    <div className="muted">
                      {r.code} · {r.raceCount} race{r.raceCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="room-actions">
                    <button
                      className="primary"
                      disabled={busy !== null}
                      onClick={() => handleRejoin(r.code)}
                    >
                      rejoin →
                    </button>
                    <Link to={`/room/${r.code}/leaderboard`}>stats</Link>
                  </div>
                </li>
              ))}
            </ul>
            {myRooms.length > 5 && (
              <p className="muted">
                <Link to="/me/rooms">see all {myRooms.length} rooms →</Link>
              </p>
            )}
          </section>
        )}

        {user && myRooms && myRooms.length === 0 && (
          <p className="muted">// no rooms yet — host one below</p>
        )}

        {user && roomsError && (
          <p className="error"><span className="prompt-prefix">!</span> could not load your rooms: {roomsError}</p>
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

        <p className="muted footer-links">
          <Link to="/train">// personal trainer</Link>
          {" · "}<Link to="/hangman">// hangman with teams</Link>
          {" · "}<Link to="/xo">// x and o</Link>
          {user && <> · <Link to="/me/rooms">// my rooms</Link></>}
          {user && <> · <Link to="/me/training">// my training</Link></>}
          {" · "}<Link to="/leaderboard">// global leaderboard</Link>
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
