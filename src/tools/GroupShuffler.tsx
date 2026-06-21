import { useState } from "react";
import { Link } from "react-router-dom";

type InputMode = "names" | "count";
type SplitMode = "groups" | "size";

const GROUP_COLORS = [
  "#7dd3fc", "#fca5a5", "#bef264", "#fde68a", "#c4b5fd",
  "#f0abfc", "#fdba74", "#86efac", "#67e8f9", "#fda4af",
];
const GROUP_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function shuffle<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function GroupShuffler() {
  const [inputMode, setInputMode] = useState<InputMode>("names");
  const [namesText, setNamesText] = useState("");
  const [count, setCount] = useState(10);

  const [splitMode, setSplitMode] = useState<SplitMode>("groups");
  const [numGroups, setNumGroups] = useState(2);
  const [groupSize, setGroupSize] = useState(2);

  const [groups, setGroups] = useState<string[][] | null>(null);
  const [nonce, setNonce] = useState(0);

  const parsedNames = namesText
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter(Boolean);

  const people =
    inputMode === "names"
      ? parsedNames
      : Array.from({ length: clampInt(count, 1, 500) }, (_, i) => `Person ${i + 1}`);

  const canShuffle = people.length >= 2;

  const doShuffle = () => {
    if (!canShuffle) return;
    const shuffled = shuffle(people);

    let buckets: string[][];
    if (splitMode === "groups") {
      const g = clampInt(numGroups, 1, shuffled.length);
      buckets = Array.from({ length: g }, () => [] as string[]);
      // Round-robin keeps group sizes balanced (differ by at most one).
      shuffled.forEach((person, i) => buckets[i % g].push(person));
    } else {
      const s = clampInt(groupSize, 1, shuffled.length);
      buckets = [];
      for (let i = 0; i < shuffled.length; i += s) {
        buckets.push(shuffled.slice(i, i + s));
      }
    }
    setGroups(buckets);
    setNonce((n) => n + 1);
  };

  const copyResult = async () => {
    if (!groups) return;
    const text = groups
      .map((g, i) => `Group ${GROUP_LABELS[i] ?? i + 1}\n${g.map((m) => `  - ${m}`).join("\n")}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">tools ~ group shuffler</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <div className="tool-tabs">
          <button className={`pill ${inputMode === "names" ? "selected" : ""}`} onClick={() => setInputMode("names")}>
            by names
          </button>
          <button className={`pill ${inputMode === "count" ? "selected" : ""}`} onClick={() => setInputMode("count")}>
            by headcount
          </button>
        </div>

        {inputMode === "names" ? (
          <section>
            <h3>// people ({parsedNames.length})</h3>
            <div className="custom-text">
              <textarea
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder={"one name per line (or comma-separated)\nada\nlinus\ngrace\n…"}
                rows={6}
              />
              <span className="muted">{parsedNames.length} name{parsedNames.length === 1 ? "" : "s"} entered</span>
            </div>
          </section>
        ) : (
          <section>
            <h3>// how many people</h3>
            <label className="field">
              <span className="field-label">headcount</span>
              <input
                type="number"
                min={2}
                max={500}
                value={count}
                onChange={(e) => setCount(clampInt(parseInt(e.target.value, 10), 1, 500))}
              />
            </label>
            <p className="muted small">no names? they'll be labelled Person 1 … Person {clampInt(count, 1, 500)}.</p>
          </section>
        )}

        <section>
          <h3>// split</h3>
          <div className="tool-tabs">
            <button className={`pill ${splitMode === "groups" ? "selected" : ""}`} onClick={() => setSplitMode("groups")}>
              into N groups
            </button>
            <button className={`pill ${splitMode === "size" ? "selected" : ""}`} onClick={() => setSplitMode("size")}>
              groups of N
            </button>
          </div>
          {splitMode === "groups" ? (
            <label className="field">
              <span className="field-label">number of groups</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, people.length)}
                value={numGroups}
                onChange={(e) => setNumGroups(clampInt(parseInt(e.target.value, 10), 1, 100))}
              />
            </label>
          ) : (
            <label className="field">
              <span className="field-label">people per group</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, people.length)}
                value={groupSize}
                onChange={(e) => setGroupSize(clampInt(parseInt(e.target.value, 10), 1, 100))}
              />
            </label>
          )}
        </section>

        <button className="primary" onClick={doShuffle} disabled={!canShuffle}>
          {groups ? "reshuffle()" : "shuffle()"}
        </button>
        {!canShuffle && <p className="muted small">add at least 2 people to shuffle.</p>}

        {groups && (
          <>
            <div className="group-head-row">
              <h3>// {groups.length} group{groups.length === 1 ? "" : "s"}</h3>
              <button className="link-button" onClick={copyResult}>copy</button>
            </div>
            <div className="group-grid" key={nonce}>
              {groups.map((members, i) => (
                <div
                  className="group-card"
                  key={i}
                  style={{ ["--group-accent" as string]: GROUP_COLORS[i % GROUP_COLORS.length] }}
                >
                  <div className="group-card-head">
                    <strong>group {GROUP_LABELS[i] ?? i + 1}</strong>
                    <span className="muted small">{members.length}</span>
                  </div>
                  <ul className="group-members">
                    {members.map((m, j) => (
                      <li key={j}>
                        <span className="member-dot" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="muted footer-links">
          <Link to="/tools/dice">// dice roller</Link>
          {" · "}<Link to="/tools/timer">// countdown timer</Link>
          {" · "}<Link to="/">// back to games</Link>
        </p>
      </div>
    </div>
  );
}
