import type { RacerDto } from "../race/types";

interface Props {
  racer: RacerDto;
  textLength: number;
  isYou: boolean;
  position?: number;
}

export function RacerRow({ racer, textLength, isYou, position }: Props) {
  const pct = textLength === 0 ? 0 : Math.min(100, (racer.charIndex / textLength) * 100);
  const finished = !!racer.finishedAt;

  return (
    <div className={`racer-row ${finished ? "finished" : ""}`}>
      <div className="racer-row-head">
        <span className="racer-dot" style={{ background: racer.color }} />
        <span className="racer-name">{racer.nickname}</span>
        {isYou && <span className="badge you">you</span>}
        {position && <span className="badge position">#{position}</span>}
        <span className="racer-wpm">{Math.round(racer.wpm)} wpm</span>
        <span className="racer-acc">{Math.round(racer.accuracy * 100)}%</span>
      </div>
      <div className="racer-bar">
        <div
          className="racer-bar-fill"
          style={{ width: `${pct}%`, background: racer.color }}
        />
      </div>
    </div>
  );
}
