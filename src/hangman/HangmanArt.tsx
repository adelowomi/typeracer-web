const STAGES = [
  `
   ╔═══╗
   ║
   ║
   ║
   ║
═══╩═══`,
  `
   ╔═══╗
   ║   o
   ║
   ║
   ║
═══╩═══`,
  `
   ╔═══╗
   ║   o
   ║   |
   ║
   ║
═══╩═══`,
  `
   ╔═══╗
   ║   o
   ║  /|
   ║
   ║
═══╩═══`,
  `
   ╔═══╗
   ║   o
   ║  /|\\
   ║
   ║
═══╩═══`,
  `
   ╔═══╗
   ║   o
   ║  /|\\
   ║  /
   ║
═══╩═══`,
  `
   ╔═══╗
   ║   x
   ║  /|\\
   ║  / \\
   ║
═══╩═══`,
];

export function HangmanArt({ wrong }: { wrong: number }) {
  const clamped = Math.max(0, Math.min(STAGES.length - 1, wrong));
  return <pre className="hangman-art">{STAGES[clamped]}</pre>;
}
