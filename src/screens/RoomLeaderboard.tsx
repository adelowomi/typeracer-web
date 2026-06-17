import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

interface LeaderEntry {
  userId: string;
  displayName: string;
  wpm: number;
  accuracy: number;
  at: string;
}

interface AggregateEntry {
  userId: string;
  displayName: string;
  races: number;
  wins: number;
  avgWpm: number;
  bestWpm: number;
  avgAccuracy: number;
}

interface RaceHistory {
  id: string;
  textSourceKind: string;
  language: string | null;
  finishedAt: string;
  durationSeconds: number | null;
  results: Array<{
    userId: string | null;
    nickname: string;
    position: number;
    wpm: number;
    accuracy: number;
  }>;
}

interface RoomMeta {
  code: string;
  name: string | null;
  ownerDisplayName: string;
}

type Tab = "top" | "stats" | "recent";

export function RoomLeaderboard() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<RoomMeta | null>(null);
  const [tab, setTab] = useState<Tab>("top");
  const [top, setTop] = useState<LeaderEntry[]>([]);
  const [stats, setStats] = useState<AggregateEntry[]>([]);
  const [recent, setRecent] = useState<RaceHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    Promise.all([
      api<RoomMeta>(`/rooms/${code}`),
      api<LeaderEntry[]>(`/rooms/${code}/leaderboard/top`),
      api<AggregateEntry[]>(`/rooms/${code}/leaderboard/stats`),
      api<RaceHistory[]>(`/rooms/${code}/races?take=20`),
    ])
      .then(([m, t, s, r]) => {
        setRoom(m);
        setTop(t);
        setStats(s);
        setRecent(r);
      })
      .catch((e) => setError(e.message));
  }, [code]);

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">leaderboard ~ /room/{code}</span>
        <span className="terminal-stats">
          <Link to={`/room/${code}`} className="auth-link">join lobby</Link>
        </span>
      </div>
      <div className="terminal-body">
        <h2 className="screen-title">// {room?.name ?? code}</h2>
        {room && <p className="muted">hosted by {room.ownerDisplayName}</p>}

        {error && <p className="error">{error}</p>}

        <div className="tabs">
          <button className={`tab ${tab === "top" ? "active" : ""}`} onClick={() => setTab("top")}>top wpm</button>
          <button className={`tab ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>stats</button>
          <button className={`tab ${tab === "recent" ? "active" : ""}`} onClick={() => setTab("recent")}>recent</button>
        </div>

        {tab === "top" && (
          <ol className="rank-list">
            {top.length === 0 && <p className="muted">no races yet.</p>}
            {top.map((e, i) => (
              <li key={e.userId}>
                <span className="rank">{i + 1}</span>
                <span className="result-name">{e.displayName}</span>
                <span className="result-stat">{Math.round(e.wpm)} wpm</span>
                <span className="result-stat muted">{Math.round(e.accuracy * 100)}%</span>
              </li>
            ))}
          </ol>
        )}

        {tab === "stats" && (
          <table className="stats-table">
            <thead>
              <tr>
                <th>player</th>
                <th>races</th>
                <th>wins</th>
                <th>best</th>
                <th>avg</th>
                <th>acc</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.userId}>
                  <td>{s.displayName}</td>
                  <td>{s.races}</td>
                  <td>{s.wins}</td>
                  <td>{Math.round(s.bestWpm)}</td>
                  <td>{Math.round(s.avgWpm)}</td>
                  <td>{Math.round(s.avgAccuracy * 100)}%</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr><td colSpan={6} className="muted">no stats yet.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {tab === "recent" && (
          <div className="recent-races">
            {recent.length === 0 && <p className="muted">no races yet.</p>}
            {recent.map((race) => (
              <div key={race.id} className="recent-race">
                <div className="recent-race-head">
                  <span className="muted">
                    {race.textSourceKind}{race.language ? ` · ${race.language}` : ""} · {new Date(race.finishedAt).toLocaleString()}
                  </span>
                </div>
                <ol className="rank-list compact">
                  {race.results.map((r) => (
                    <li key={`${race.id}-${r.position}`}>
                      <span className="rank">{r.position}</span>
                      <span className="result-name">{r.nickname}</span>
                      <span className="result-stat">{Math.round(r.wpm)} wpm</span>
                      <span className="result-stat muted">{Math.round(r.accuracy * 100)}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
