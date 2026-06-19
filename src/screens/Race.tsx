import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRace } from "../race/RaceProvider";
import { useTypingEngine } from "../race/useTypingEngine";
import { RaceTextPanel } from "../components/RaceTextPanel";
import { RacerRow } from "../components/RacerRow";

export function Race() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room,
    phase,
    countdown,
    raceStartedAt,
    raceText,
    connectionId,
    reportProgress,
    finishRace,
  } = useRace();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (phase === "finished") {
      navigate(`/room/${code}/results`);
    }
    if (phase === "lobby" || phase === "idle") {
      navigate(`/room/${code}`);
    }
  }, [phase, code, navigate]);

  const engine = useTypingEngine({
    text: raceText,
    startedAt: raceStartedAt,
    onProgress: reportProgress,
    onFinish: finishRace,
    allowSkipWrong: room?.mode === "Speed",
  });

  if (!room) return null;

  return (
    <div className="terminal-window race">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">race ~ /room/{room.code}</span>
        <span className="terminal-stats">
          {Math.round(engine.wpm)} wpm · {Math.round(engine.accuracy * 100)}%
        </span>
      </div>
      <div className="terminal-body">
        {phase === "countdown" && countdown !== null && (
          <div className="countdown">
            <span>{countdown}</span>
            <p className="muted">get ready…</p>
          </div>
        )}

        {phase === "racing" && (
          <RaceTextPanel
            text={raceText}
            charIndex={engine.charIndex}
            wrong={engine.wrong}
          />
        )}

        <div className="racer-rows">
          {room.racers.map((r) => (
            <RacerRow
              key={r.connectionId}
              racer={r}
              textLength={raceText.length || room.text.length}
              isYou={r.connectionId === connectionId}
            />
          ))}
        </div>

        {phase === "racing" && (
          <p className="muted hint">
            type to race · paste is blocked · backspace fixes mistakes
          </p>
        )}
      </div>
    </div>
  );
}
