import { useMemo } from "react";

interface Props {
  text: string;
  charIndex: number;
  wrong: boolean;
}

export function RaceTextPanel({ text, charIndex, wrong }: Props) {
  const typed = text.slice(0, charIndex);
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

  return (
    <pre className="race-text" style={style}>
      <span className="typed">{typed}</span>
      <span className={`current ${wrong ? "wrong" : ""}`}>
        {current === "\n" ? "↵\n" : current === " " ? "·" : current}
      </span>
      <span className="rest">{rest}</span>
      <span className="caret" />
    </pre>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
