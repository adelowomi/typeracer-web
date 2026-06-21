import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type Mode = "roll" | "first";

const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;
type Sides = (typeof DICE_TYPES)[number];

// Pip layout for a six-sided die: which of the 9 grid cells are filled per value.
const PIP_MAP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function rollOne(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function Die({ value, sides, rolling }: { value: number; sides: number; rolling: boolean }) {
  return (
    <div className={`die ${rolling ? "rolling" : ""}`} aria-label={`die showing ${value}`}>
      {sides === 6 ? (
        <div className="die-pips">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={`pip ${PIP_MAP[value]?.includes(i) ? "on" : ""}`} />
          ))}
        </div>
      ) : (
        <span className="die-number">{value}</span>
      )}
      {sides !== 6 && <span className="die-tag">d{sides}</span>}
    </div>
  );
}

export function DiceRoller() {
  const [mode, setMode] = useState<Mode>("roll");

  // --- roll mode ---
  const [sides, setSides] = useState<Sides>(6);
  const [count, setCount] = useState(2);
  const [values, setValues] = useState<number[]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const animRef = useRef<number | null>(null);

  useEffect(() => () => { if (animRef.current) window.clearInterval(animRef.current); }, []);

  const changeCount = (n: number) => {
    setCount(n);
    setValues((prev) => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push(1);
      return next;
    });
  };

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    if (animRef.current) window.clearInterval(animRef.current);
    animRef.current = window.setInterval(() => {
      setValues((prev) => prev.map(() => rollOne(sides)));
      ticks += 1;
      if (ticks >= 10) {
        if (animRef.current) window.clearInterval(animRef.current);
        animRef.current = null;
        setValues((prev) => prev.map(() => rollOne(sides)));
        setRolling(false);
      }
    }, 60);
  };

  const total = values.reduce((a, b) => a + b, 0);

  // --- who's first mode ---
  const [names, setNames] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<{ name: string; roll: number }[] | null>(null);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  const setName = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  const addName = () => setNames((prev) => (prev.length >= 8 ? prev : [...prev, ""]));
  const removeName = (i: number) =>
    setNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  const decideFirst = () => {
    const players = names.map((n, i) => (n.trim() ? n.trim() : `player ${i + 1}`));
    setPicking(true);
    setWinnerIdx(null);
    let ticks = 0;
    const id = window.setInterval(() => {
      const rolls = players.map((name) => ({ name, roll: rollOne(20) }));
      setResults(rolls);
      ticks += 1;
      if (ticks >= 12) {
        window.clearInterval(id);
        // Final roll — break ties with a fresh roll among the leaders.
        let finalRolls = players.map((name) => ({ name, roll: rollOne(20) }));
        let best = Math.max(...finalRolls.map((r) => r.roll));
        let leaders = finalRolls.filter((r) => r.roll === best);
        let guard = 0;
        while (leaders.length > 1 && guard < 20) {
          finalRolls = finalRolls.map((r) =>
            r.roll === best ? { ...r, roll: rollOne(20) } : r,
          );
          best = Math.max(...finalRolls.map((r) => r.roll));
          leaders = finalRolls.filter((r) => r.roll === best);
          guard += 1;
        }
        setResults(finalRolls);
        setWinnerIdx(finalRolls.findIndex((r) => r.roll === best));
        setPicking(false);
      }
    }, 70);
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">tools ~ dice</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <div className="tool-tabs">
          <button className={`pill ${mode === "roll" ? "selected" : ""}`} onClick={() => setMode("roll")}>
            roll dice
          </button>
          <button className={`pill ${mode === "first" ? "selected" : ""}`} onClick={() => setMode("first")}>
            who goes first?
          </button>
        </div>

        {mode === "roll" && (
          <>
            <section>
              <h3>// dice type</h3>
              <div className="language-picker">
                {DICE_TYPES.map((d) => (
                  <button
                    key={d}
                    className={`pill ${sides === d ? "selected" : ""}`}
                    onClick={() => setSides(d)}
                    disabled={rolling}
                  >
                    d{d}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>// how many</h3>
              <div className="language-picker">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    className={`pill ${count === n ? "selected" : ""}`}
                    onClick={() => changeCount(n)}
                    disabled={rolling}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>

            <div className="dice-tray">
              {values.map((v, i) => (
                <Die key={i} value={v} sides={sides} rolling={rolling} />
              ))}
            </div>

            <div className="dice-total">
              <span className="muted">total</span>
              <strong>{total}</strong>
            </div>

            <button className="primary" onClick={roll} disabled={rolling}>
              {rolling ? "rolling…" : "roll()"}
            </button>
          </>
        )}

        {mode === "first" && (
          <>
            <section>
              <h3>// players</h3>
              <div className="name-list">
                {names.map((n, i) => (
                  <div key={i} className="name-row">
                    <input
                      type="text"
                      maxLength={24}
                      placeholder={`player ${i + 1}`}
                      value={n}
                      onChange={(e) => setName(i, e.target.value)}
                      disabled={picking}
                    />
                    {names.length > 2 && (
                      <button className="ghost small" onClick={() => removeName(i)} disabled={picking}>
                        remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {names.length < 8 && (
                <button className="ghost small" onClick={addName} disabled={picking}>
                  + add player
                </button>
              )}
            </section>

            <button className="primary" onClick={decideFirst} disabled={picking}>
              {picking ? "rolling for it…" : "decide who's first (highest d20)"}
            </button>

            {results && (
              <ul className="roll-results">
                {results.map((r, i) => (
                  <li key={i} className={winnerIdx === i ? "winner" : ""}>
                    <span className="roll-die">{r.roll}</span>
                    <span className="roll-name">{r.name}</span>
                    {winnerIdx === i && <span className="badge you">goes first 🎲</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="muted footer-links">
          <Link to="/tools/timer">// countdown timer</Link>
          {" · "}<Link to="/">// back to games</Link>
        </p>
      </div>
    </div>
  );
}
