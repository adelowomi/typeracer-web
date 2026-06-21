import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useHangman } from "./HangmanProvider";
import { HangmanArt } from "./HangmanArt";

export function HangmanSpectate() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room,
    lastRoundEnded,
    lastMatchEnded,
    turnSecondsRemaining,
    nextRoundCountdown,
    spectate,
    leaveSpectate,
    error,
  } = useHangman();
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
    // spectate/leaveSpectate are stable; only re-run on code change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleLeave = async () => {
    await leaveSpectate();
    navigate("/hangman");
  };

  const round = room?.currentRound ?? null;
  const activeTurn = round?.activeTurn ?? null;

  return (
    <div className="terminal-window hangman-play">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">spectating ~ {code}</span>
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
            <Link to="/hangman">go back</Link>
          </p>
        )}

        {room && (
          <>
            {(room.status === "Lobby" || room.status === "WordSelection") && (
              <p className="muted">
                // {room.status === "WordSelection" ? "teams are choosing a word…" : "waiting in the lobby — the match hasn't started yet."}
              </p>
            )}

            {/* scoreboard */}
            <ul className="team-roster spectator-scoreboard">
              {room.teams.map((t) => (
                <li key={t.id}>
                  <span style={{ color: t.color }}>
                    <span className="racer-dot" style={{ background: t.color }} /> {t.name}
                  </span>
                  <span className="muted small">
                    {room.players.filter((p) => p.teamId === t.id).length} player
                    {room.players.filter((p) => p.teamId === t.id).length === 1 ? "" : "s"}
                  </span>
                  <span className="result-stat">{t.score}</span>
                </li>
              ))}
            </ul>

            {round && activeTurn && (() => {
              const team = room.teams.find((t) => t.id === activeTurn.teamId);
              const player = room.players.find((p) => p.connectionId === activeTurn.playerConnectionId);
              const danger = (turnSecondsRemaining ?? room.turnSeconds) <= 5;
              return (
                <div className={`turn-banner ${danger ? "danger" : ""}`}>
                  <div className="turn-banner-side">
                    <span className="racer-dot" style={{ background: team?.color ?? "var(--accent)" }} />
                    <span>
                      <strong style={{ color: team?.color ?? "var(--fg)" }}>{team?.name ?? "—"}</strong>
                      <span className="muted small"> · {player?.nickname ?? "—"} is guessing</span>
                    </span>
                  </div>
                  <div className="turn-timer">{turnSecondsRemaining ?? room.turnSeconds}s</div>
                </div>
              );
            })()}

            {round && (
              <div className="board-grid" style={{ gridTemplateColumns: `repeat(${round.boards.length}, 1fr)` }}>
                {round.boards.map((board) => {
                  const team = room.teams.find((t) => t.id === board.teamId);
                  const teamActive = activeTurn?.teamId === board.teamId;
                  return (
                    <div
                      key={board.teamId}
                      className={`team-board ${teamActive ? "active-turn" : ""} redacted`}
                      style={{ borderColor: team?.color }}
                    >
                      <div className="team-board-head">
                        <strong style={{ color: team?.color }}>{team?.name ?? "—"}</strong>
                        <span className="muted small">{board.wrongCount}/{board.maxWrong}</span>
                        {board.solved && <span className="badge you">SOLVED</span>}
                      </div>
                      <HangmanArt wrong={board.wrongCount} />
                      <div className="masked-word blurred">
                        {board.mask.split("").map((c, i) => (
                          <span key={i} className={c === "_" ? "ch blank" : c === " " ? "ch space" : "ch filled"}>
                            {c === "_" ? "_" : c === " " ? "·" : "★"}
                          </span>
                        ))}
                      </div>
                      <div className="guessed">
                        <span className="muted small">letters hidden from spectators until the round ends</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {lastRoundEnded && room.status === "RoundResults" && (() => {
              const winner = lastRoundEnded.winnerTeamId
                ? room.teams.find((t) => t.id === lastRoundEnded.winnerTeamId)
                : null;
              return (
                <div className="finished-block round-result">
                  <p className="screen-title">
                    {winner
                      ? <>// <strong style={{ color: winner.color }}>{winner.name}</strong> wins this round</>
                      : <>// nobody solved it — draw</>}
                  </p>
                  <p className="word-reveal">the word was <strong style={{ color: "var(--accent)" }}>{lastRoundEnded.word}</strong></p>
                  <ul className="team-roster">
                    {lastRoundEnded.perTeam.map((t) => (
                      <li key={t.teamId}>
                        <span>{t.teamName}</span>
                        <span className={t.solved ? "target-hit" : "target-miss"}>{t.solved ? "✓ solved" : "× lost"}</span>
                        {t.solveSeconds && <span className="muted small">{t.solveSeconds.toFixed(1)}s</span>}
                      </li>
                    ))}
                  </ul>
                  {room.roundsPlayed < room.bestOf && (
                    nextRoundCountdown !== null ? (
                      <div className="next-round-countdown">
                        <span className="muted small">next round in</span>
                        <span className="next-round-number">{nextRoundCountdown}</span>
                      </div>
                    ) : (
                      <p className="muted small">next round starting…</p>
                    )
                  )}
                </div>
              );
            })()}

            {lastMatchEnded && (
              <div className="finished-block">
                <p className="screen-title">// match over</p>
                <ul className="rank-list">
                  {Object.entries(lastMatchEnded.scores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([tid, score], i) => {
                      const team = room.teams.find((t) => t.id === tid);
                      return (
                        <li key={tid}>
                          <span className="rank">{i + 1}</span>
                          <span className="result-name" style={{ color: team?.color }}>{team?.name ?? "—"}</span>
                          <span className="result-stat">{score}</span>
                          {lastMatchEnded.winnerTeamIds.includes(tid) && <span className="badge you">🏆 winner</span>}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            <p className="muted small hint">
              👁 watching live · {room.spectatorCount} spectator
              {room.spectatorCount === 1 ? "" : "s"} · opponents' letters stay hidden until each round ends
            </p>
          </>
        )}
      </div>
    </div>
  );
}
