import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRace } from "../race/RaceProvider";
import { RaceTextPanel } from "../components/RaceTextPanel";
import { RacerRow } from "../components/RacerRow";

export function Spectate() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room,
    phase,
    countdown,
    raceText,
    results,
    spectate,
    leaveSpectate,
    error,
  } = useRace();
  const [joining, setJoining] = useState(true);

  useEffect(() => {
    if (!code) return;
    let active = true;
    setJoining(true);
    spectate(code)
      .catch(() => {})
      .finally(() => {
        if (active) setJoining(false);
      });
    return () => {
      active = false;
      leaveSpectate();
    };
    // spectate/leaveSpectate are stable callbacks; re-run only when the code changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const text = raceText || room?.text || "";

  // Sort racers by progress so the spectator board reads like a live leaderboard.
  const ranked = useMemo(() => {
    if (!room) return [];
    return [...room.racers].sort((a, b) => {
      if (!!a.finishedAt !== !!b.finishedAt) return a.finishedAt ? -1 : 1;
      return b.charIndex - a.charIndex;
    });
  }, [room]);

  // Highlight the leader's progress in the text panel.
  const leaderIndex = useMemo(
    () => room?.racers.reduce((max, r) => Math.max(max, r.charIndex), 0) ?? 0,
    [room],
  );

  const handleLeave = async () => {
    await leaveSpectate();
    navigate("/race");
  };

  const medal = (pos: number) =>
    pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : ` ${pos}`;

  return (
    <div className="terminal-window race">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">spectating ~ /room/{code}</span>
        <span className="terminal-stats">
          <span className="badge spectator">👁 spectator</span>
          <button onClick={handleLeave} className="link-button">leave</button>
        </span>
      </div>
      <div className="terminal-body">
        {joining && !room && <p className="muted">// connecting to room {code}…</p>}

        {error && (
          <p className="error">
            <span className="prompt-prefix">!</span> {error}{" "}
            <Link to="/race">go back</Link>
          </p>
        )}

        {room && (
          <>
            {(phase === "lobby" || phase === "idle") && (
              <p className="muted">
                // waiting in the lobby — the race hasn't started yet. sit tight, the board
                will come alive when the host hits start.
              </p>
            )}

            {phase === "countdown" && countdown !== null && (
              <div className="countdown">
                <span>{countdown}</span>
                <p className="muted">race starting…</p>
              </div>
            )}

            {(phase === "racing" || phase === "finished") && text && (
              <RaceTextPanel text={text} charIndex={leaderIndex} wrong={false} />
            )}

            <div className="racer-rows">
              {ranked.map((r, i) => (
                <RacerRow
                  key={r.connectionId}
                  racer={r}
                  textLength={text.length || room.text.length}
                  isYou={false}
                  position={phase === "finished" ? i + 1 : undefined}
                />
              ))}
            </div>

            {phase === "finished" && results.length > 0 && (
              <ol className="results-list">
                {results.map((r) => (
                  <li key={r.connectionId}>
                    <span className="medal">{medal(r.position)}</span>
                    <span className="result-name">{r.nickname}</span>
                    <span className="result-stat">{Math.round(r.wpm)} wpm</span>
                    <span className="result-stat muted">{Math.round(r.accuracy * 100)}%</span>
                    <span className="result-stat muted">
                      {r.durationSeconds ? `${r.durationSeconds.toFixed(1)}s` : "—"}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <p className="muted hint">
              👁 watching live · {room.spectatorCount} spectator
              {room.spectatorCount === 1 ? "" : "s"} · you can't type from here
            </p>
          </>
        )}
      </div>
    </div>
  );
}
