import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

interface RoomSummary {
  id: string;
  code: string;
  name: string | null;
  ownerDisplayName: string;
  createdAt: string;
  lastActiveAt: string;
  raceCount: number;
}

interface MyStats {
  races: number;
  wins: number;
  avgWpm: number;
  bestWpm: number;
  avgAccuracy: number;
}

export function MyRooms() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) {
      navigate("/login", { replace: true });
      return;
    }
    Promise.all([
      api<RoomSummary[]>("/rooms/mine", { token }),
      api<MyStats>("/me/stats", { token }),
    ])
      .then(([r, s]) => {
        setRooms(r);
        setStats(s);
      })
      .catch((e) => setError(e.message));
  }, [token, user, navigate]);

  if (!user) return null;

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">~ /me/rooms</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
          <button onClick={logout} className="link-button">log out</button>
        </span>
      </div>
      <div className="terminal-body">
        <h2 className="screen-title">// {user.displayName}</h2>
        {stats && (
          <div className="stat-strip">
            <Stat label="races" value={stats.races.toString()} />
            <Stat label="wins" value={stats.wins.toString()} />
            <Stat label="best wpm" value={Math.round(stats.bestWpm).toString()} />
            <Stat label="avg wpm" value={Math.round(stats.avgWpm).toString()} />
            <Stat label="accuracy" value={`${Math.round(stats.avgAccuracy * 100)}%`} />
          </div>
        )}

        <h3>// rooms i own</h3>
        {error && <p className="error">{error}</p>}
        {!rooms && !error && <p className="muted">loading…</p>}
        {rooms && rooms.length === 0 && (
          <p className="muted">no rooms yet — <Link to="/race">create your first room</Link></p>
        )}
        {rooms && rooms.length > 0 && (
          <ul className="room-list">
            {rooms.map((r) => (
              <li key={r.id}>
                <div>
                  <div className="room-name">{r.name ?? r.code}</div>
                  <div className="muted">
                    {r.code} · {r.raceCount} race{r.raceCount === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="room-actions">
                  <Link to={`/room/${r.code}`} className="primary-link">join →</Link>
                  <Link to={`/room/${r.code}/leaderboard`}>leaderboard</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
