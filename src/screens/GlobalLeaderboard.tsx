import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface LeaderEntry {
  userId: string;
  displayName: string;
  wpm: number;
  accuracy: number;
}

export function GlobalLeaderboard() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<LeaderEntry[]>("/leaderboard/global?take=50")
      .then(setEntries)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">leaderboard ~ global</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <h2 className="screen-title">// global leaderboard</h2>
        <p className="muted">top wpm across all rooms</p>
        {error && <p className="error">{error}</p>}
        <ol className="rank-list">
          {entries.length === 0 && !error && <p className="muted">no races yet.</p>}
          {entries.map((e, i) => (
            <li key={e.userId}>
              <span className="rank">{i + 1}</span>
              <span className="result-name">{e.displayName}</span>
              <span className="result-stat">{Math.round(e.wpm)} wpm</span>
              <span className="result-stat muted">{Math.round(e.accuracy * 100)}%</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
