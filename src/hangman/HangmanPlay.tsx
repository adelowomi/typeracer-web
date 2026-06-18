import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useHangman } from "./HangmanProvider";
import { HangmanArt } from "./HangmanArt";

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export function HangmanPlay() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, connectionId, lastRoundEnded, lastMatchEnded, turnSecondsRemaining, guessLetter, leaveRoom, error, clearMatchEnded } = useHangman();

  useEffect(() => {
    if (!room) navigate("/hangman", { replace: true });
  }, [room, navigate]);

  useEffect(() => {
    if (lastMatchEnded) {
      // Stay on play screen but show match overlay
    }
  }, [lastMatchEnded]);

  useEffect(() => {
    if (room && room.status === "Lobby") {
      navigate(`/hangman/room/${code}`);
    }
  }, [room, code, navigate]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key.length === 1 && key >= "a" && key <= "z") {
        e.preventDefault();
        guessLetter(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [guessLetter]);

  const me = useMemo(() => room?.players.find((p) => p.connectionId === connectionId), [room, connectionId]);
  const myTeamId = me?.teamId;
  const activeTurn = room?.currentRound?.activeTurn ?? null;
  const isMyTurn = activeTurn?.playerConnectionId === connectionId;
  const isMyTeamTurn = activeTurn?.teamId === myTeamId;

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/hangman", { replace: true });
  };

  if (!room) return null;

  return (
    <div className="terminal-window hangman-play">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">hangman ~ {room.code}</span>
        <span className="terminal-stats">
          {room.currentRound && <>category: {room.currentRound.category} · {room.currentRound.difficulty.toLowerCase()}</>}
        </span>
      </div>
      <div className="terminal-body">
        {room.currentRound?.activeTurn && (
          <TurnBanner
            room={room}
            connectionId={connectionId}
            turnSecondsRemaining={turnSecondsRemaining}
          />
        )}
        {room.currentRound && (
          <div className="board-grid" style={{ gridTemplateColumns: `repeat(${room.currentRound.boards.length}, 1fr)` }}>
            {room.currentRound.boards.map((board) => {
              const team = room.teams.find((t) => t.id === board.teamId);
              const isMy = board.teamId === myTeamId;
              const teamActive = activeTurn?.teamId === board.teamId;
              const activePlayer = teamActive ? room.players.find(p => p.connectionId === activeTurn?.playerConnectionId) : null;
              const redacted = board.redacted;
              return (
                <div key={board.teamId} className={`team-board ${isMy ? "mine" : ""} ${teamActive ? "active-turn" : ""} ${redacted ? "redacted" : ""}`} style={{ borderColor: team?.color }}>
                  <div className="team-board-head">
                    <strong style={{ color: team?.color }}>{team?.name ?? "—"}</strong>
                    <span className="muted small">{board.wrongCount}/{board.maxWrong}</span>
                    {board.solved && <span className="badge you">SOLVED</span>}
                    {redacted && <span className="badge absent-badge">hidden</span>}
                  </div>
                  <HangmanArt wrong={board.wrongCount} />
                  <div className={`masked-word ${redacted ? "blurred" : ""}`}>
                    {board.mask.split("").map((c, i) => (
                      <span key={i} className={c === "_" ? "ch blank" : c === " " ? "ch space" : "ch filled"}>
                        {c === "_" ? "_" : c === " " ? "·" : redacted ? "★" : c}
                      </span>
                    ))}
                  </div>
                  <div className="guessed">
                    {!redacted && board.guessedLetters.length > 0 && <span className="muted small">guessed: {board.guessedLetters.join(" ")}</span>}
                    {redacted && <span className="muted small">opponent's letters hidden</span>}
                  </div>
                  {teamActive && activePlayer && (
                    <p className="muted small">
                      {activePlayer.connectionId === connectionId ? "your turn — type a letter" : `${activePlayer.nickname}'s turn`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="keyboard">
          {LETTERS.map((l) => {
            const myBoard = room.currentRound?.boards.find((b) => b.teamId === myTeamId);
            const used = myBoard?.guessedLetters.includes(l) ?? false;
            return (
              <button
                key={l}
                className={`key ${used ? "used" : ""} ${isMyTurn ? "playable" : ""}`}
                onClick={() => guessLetter(l)}
                disabled={used || !isMyTurn}
              >
                {l}
              </button>
            );
          })}
        </div>

        {isMyTeamTurn && !isMyTurn && (
          <p className="muted small hint">your team is up — wait for your turn</p>
        )}

        {lastRoundEnded && room.status === "RoundResults" && (() => {
          const winner = lastRoundEnded.winnerTeamId
            ? room.teams.find((t) => t.id === lastRoundEnded.winnerTeamId)
            : null;
          const youWon = winner && winner.id === myTeamId;
          return (
            <div className="finished-block round-result">
              <p className="screen-title">
                {winner
                  ? <>// <strong style={{ color: winner.color }}>{winner.name}</strong> wins this round{youWon ? " 🏆" : ""}</>
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
              {room.roundsPlayed < room.bestOf && <p className="muted small">next round starting…</p>}
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
            <div className="actions-row">
              <button className="primary" onClick={() => { clearMatchEnded(); navigate(`/hangman/room/${code}`); }}>
                back to lobby
              </button>
              <button className="ghost danger" onClick={handleLeave}>leave</button>
            </div>
          </div>
        )}

        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
      </div>
    </div>
  );
}

interface TurnBannerProps {
  room: NonNullable<ReturnType<typeof useHangman>["room"]>;
  connectionId: string | null;
  turnSecondsRemaining: number | null;
}

function TurnBanner({ room, connectionId, turnSecondsRemaining }: TurnBannerProps) {
  const turn = room.currentRound?.activeTurn;
  if (!turn) return null;
  const team = room.teams.find((t) => t.id === turn.teamId);
  const player = room.players.find((p) => p.connectionId === turn.playerConnectionId);
  const yours = turn.playerConnectionId === connectionId;
  const danger = (turnSecondsRemaining ?? room.turnSeconds) <= 5;
  return (
    <div className={`turn-banner ${yours ? "yours" : ""} ${danger ? "danger" : ""}`}>
      <div className="turn-banner-side">
        <span className="racer-dot" style={{ background: team?.color ?? "var(--accent)" }} />
        <span>
          <strong style={{ color: team?.color ?? "var(--fg)" }}>{team?.name ?? "—"}</strong>
          <span className="muted small"> · {player?.nickname ?? "—"}{yours ? " (you)" : ""}</span>
        </span>
      </div>
      <div className="turn-timer">
        {turnSecondsRemaining ?? room.turnSeconds}s
      </div>
    </div>
  );
}
