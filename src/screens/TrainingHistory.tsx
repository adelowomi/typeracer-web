import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

interface TrainingRun {
  id: string;
  textSourceKind: string;
  language: string | null;
  length: string;
  mode: string;
  targetWpm: number | null;
  targetAccuracy: number | null;
  wpm: number;
  accuracy: number;
  durationSeconds: number;
  characterCount: number;
  targetMet: boolean;
  finishedAt: string;
}

interface TrainingStats {
  runs: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  targetsHit: number;
  trend: Array<{ at: string; wpm: number; accuracy: number }>;
}

export function TrainingHistory() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [runs, setRuns] = useState<TrainingRun[] | null>(null);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      navigate("/login", { replace: true });
      return;
    }
    Promise.all([
      api<TrainingRun[]>("/training/runs?take=50", { token }),
      api<TrainingStats>("/training/stats", { token }),
    ])
      .then(([r, s]) => {
        setRuns(r);
        setStats(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user, token, navigate]);

  const sparkPath = useMemo(() => {
    if (!stats || stats.trend.length < 2) return null;
    const pts = stats.trend;
    const w = 320;
    const h = 60;
    const minWpm = Math.min(...pts.map((p) => p.wpm));
    const maxWpm = Math.max(...pts.map((p) => p.wpm));
    const range = Math.max(1, maxWpm - minWpm);
    const stepX = w / Math.max(1, pts.length - 1);
    return pts
      .map((p, i) => {
        const x = i * stepX;
        const y = h - ((p.wpm - minWpm) / range) * (h - 4) - 2;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [stats]);

  if (!user) return null;

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">trainer ~ history</span>
        <span className="terminal-stats">
          <Link to="/train" className="auth-link">train</Link>
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <h2 className="screen-title">// {user.displayName} · training</h2>

        {error && <p className="error">{error}</p>}

        {stats && (
          <div className="stat-strip">
            <Stat label="runs" value={stats.runs.toString()} />
            <Stat label="best wpm" value={Math.round(stats.bestWpm).toString()} />
            <Stat label="avg wpm" value={Math.round(stats.avgWpm).toString()} />
            <Stat label="accuracy" value={`${Math.round(stats.avgAccuracy * 100)}%`} />
            <Stat label="targets hit" value={stats.targetsHit.toString()} />
          </div>
        )}

        {sparkPath && (
          <div className="sparkline-wrap">
            <span className="muted">// wpm trend (last 50)</span>
            <svg viewBox="0 0 320 60" preserveAspectRatio="none" className="sparkline">
              <path d={sparkPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
            </svg>
          </div>
        )}

        <h3>// recent runs</h3>
        {!runs && !error && <p className="muted">loading…</p>}
        {runs && runs.length === 0 && (
          <p className="muted">no sessions yet — <Link to="/train">start training →</Link></p>
        )}
        {runs && runs.length > 0 && (
          <table className="stats-table">
            <thead>
              <tr>
                <th>when</th>
                <th>mode</th>
                <th>source</th>
                <th>len</th>
                <th>wpm</th>
                <th>acc</th>
                <th>target</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="muted">{new Date(r.finishedAt).toLocaleString()}</td>
                  <td>{r.mode.toLowerCase()}</td>
                  <td>{r.textSourceKind === "RandomSentences" ? "random" : r.textSourceKind.toLowerCase()}{r.language ? `:${r.language}` : ""}</td>
                  <td>{r.length.toLowerCase()}</td>
                  <td>{Math.round(r.wpm)}</td>
                  <td>{Math.round(r.accuracy * 100)}%</td>
                  <td>{r.targetWpm || r.targetAccuracy ? (r.targetMet ? "✓" : "×") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
