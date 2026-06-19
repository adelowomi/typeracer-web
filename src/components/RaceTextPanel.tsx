import { useMemo } from "react";

interface Props {
  text: string;
  charIndex: number;
  wrong: boolean;
  /** Indices in `text` whose typed input was wrong but skipped past (Speed mode). */
  wrongIndices?: ReadonlySet<number>;
}

export function RaceTextPanel({ text, charIndex, wrong, wrongIndices }: Props) {
  const current = text[charIndex] ?? "";
  const rest = text.slice(charIndex + 1);

  const style = useMemo(() => {
    const len = text.length;
    // surface area scales with text length
    // short (~50): font 22, min-height 140
    // medium (~200): font 18, min-height 240
    // long (~800+): font 16, min-height 420
    const fontSize = clamp(26 - len / 80, 15, 24);
    const minHeight = clamp(120 + len * 0.55, 140, 480);
    const lineHeight = clamp(1.6 + len / 4000, 1.5, 1.95);
    const padding = clamp(16 + len / 80, 16, 36);
    return {
      fontSize: `${fontSize}px`,
      minHeight: `${minHeight}px`,
      lineHeight: lineHeight.toString(),
      padding: `${padding}px ${padding + 4}px`,
    };
  }, [text]);

  const typed = useMemo(() => {
    if (charIndex === 0) return null;
    const wrongs = wrongIndices ?? EMPTY;
    if (wrongs.size === 0) {
      // Fast path: no skipped errors — render the whole prefix in one green span.
      return <span className="typed">{text.slice(0, charIndex)}</span>;
    }
    // Build runs of consecutive correct / wrong characters and render each as its own
    // span so the skipped errors light up red while the surrounding correct chars stay green.
    const runs: { wrong: boolean; chars: string }[] = [];
    for (let i = 0; i < charIndex; i++) {
      const isWrong = wrongs.has(i);
      const last = runs[runs.length - 1];
      if (last && last.wrong === isWrong) {
        last.chars += text[i];
      } else {
        runs.push({ wrong: isWrong, chars: text[i] });
      }
    }
    return (
      <>
        {runs.map((run, i) => (
          <span key={i} className={run.wrong ? "typed-wrong" : "typed"}>
            {run.chars}
          </span>
        ))}
      </>
    );
  }, [text, charIndex, wrongIndices]);

  return (
    <pre className="race-text" style={style}>
      {typed}
      <span className={`current ${wrong ? "wrong" : ""}`}>
        {current === "\n" ? "↵\n" : current === " " ? "·" : current}
      </span>
      <span className="rest">{rest}</span>
      <span className="caret" />
    </pre>
  );
}

const EMPTY: ReadonlySet<number> = new Set();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
