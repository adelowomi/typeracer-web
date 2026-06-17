interface Props {
  text: string;
  charIndex: number;
  wrong: boolean;
}

export function RaceTextPanel({ text, charIndex, wrong }: Props) {
  const typed = text.slice(0, charIndex);
  const current = text[charIndex] ?? "";
  const rest = text.slice(charIndex + 1);

  return (
    <pre className="race-text">
      <span className="typed">{typed}</span>
      <span className={`current ${wrong ? "wrong" : ""}`}>
        {current === "\n" ? "↵\n" : current === " " ? "·" : current}
      </span>
      <span className="rest">{rest}</span>
      <span className="caret" />
    </pre>
  );
}
