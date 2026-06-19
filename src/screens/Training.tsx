import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { RaceTextPanel } from "../components/RaceTextPanel";
import { useTypingEngine } from "../race/useTypingEngine";
import {
  CODE_LANGUAGES,
  TEXT_LENGTHS,
  type CodeLanguage,
  type RaceMode,
  type TextLength,
  type TextSourceKind,
} from "../race/types";

type SoloSource = Exclude<TextSourceKind, "Custom">;
type Phase = "setup" | "ready" | "racing" | "finished";

interface FetchedText {
  text: string;
  kind: TextSourceKind;
  language: string | null;
  length: TextLength;
}

interface TrainingStats {
  runs: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
}

const COUNTDOWN_MS = 1500;

const FOCUS_OPTIONS: { mode: RaceMode; label: string; subtitle: string; hint: string }[] = [
  { mode: "Speed", label: "speed", subtitle: "hit a WPM target", hint: "push your top-end speed" },
  { mode: "Accuracy", label: "accuracy", subtitle: "stay above an accuracy target", hint: "type clean, not fast" },
  { mode: "Combined", label: "speed + accuracy", subtitle: "hit both targets at once", hint: "the real-world combo" },
  { mode: "Completion", label: "just practice", subtitle: "no target, no judgement", hint: "warm-up or freeplay" },
];

export function Training() {
  const { user, token } = useAuth();

  const [source, setSource] = useState<SoloSource>("Quotes");
  const [length, setLength] = useState<TextLength>("Medium");
  const [language, setLanguage] = useState<CodeLanguage>("python");
  const [mode, setMode] = useState<RaceMode>("Speed");
  const [targetWpm, setTargetWpm] = useState<number | "">(60);
  const [targetAccuracy, setTargetAccuracy] = useState<number | "">(95);
  const [noPunctuation, setNoPunctuation] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [fetched, setFetched] = useState<FetchedText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finalWpm, setFinalWpm] = useState<number | null>(null);
  const [finalAcc, setFinalAcc] = useState<number | null>(null);
  const [targetMet, setTargetMet] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedRun, setSavedRun] = useState<string | null>(null);
  const [personalBest, setPersonalBest] = useState<TrainingStats | null>(null);

  const wantsTargetWpm = mode === "Speed" || mode === "Combined";
  const wantsTargetAccuracy = mode === "Accuracy" || mode === "Combined";
  const hasTarget = mode !== "Completion";

  // Pre-fill targets from personal best on first load
  useEffect(() => {
    if (!user || !token || hydrated) return;
    setHydrated(true);
    api<TrainingStats>("/training/stats", { token })
      .then((s) => {
        setPersonalBest(s);
        if (s.runs > 0) {
          // Aim a little above personal best for speed; a little above avg for accuracy
          setTargetWpm(Math.max(30, Math.round(s.bestWpm + 5)));
          setTargetAccuracy(Math.min(100, Math.max(85, Math.round(s.avgAccuracy * 100))));
        }
      })
      .catch(() => {
        // ignore — fall back to defaults
      });
  }, [user, token, hydrated]);

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    setFinalWpm(null);
    setFinalAcc(null);
    setSavedRun(null);
    setTargetMet(null);
    try {
      const query = new URLSearchParams({ source, length });
      if (source === "Code") query.set("language", language);
      else if (noPunctuation) query.set("noPunctuation", "true");
      const result = await api<FetchedText>(`/text?${query.toString()}`);
      setFetched(result);
      setPhase("ready");
      setTimeout(() => {
        setStartedAt(Date.now());
        setPhase("racing");
      }, COUNTDOWN_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch text");
    } finally {
      setBusy(false);
    }
  };

  const engine = useTypingEngine({
    text: fetched?.text ?? "",
    startedAt: phase === "racing" ? startedAt : null,
    allowSkipWrong: mode === "Speed",
    onProgress: () => {},
    onFinish: async (wpm, accuracy) => {
      setFinalWpm(wpm);
      setFinalAcc(accuracy);
      setPhase("finished");

      const targetW = wantsTargetWpm && typeof targetWpm === "number" ? targetWpm : null;
      const targetA = wantsTargetAccuracy && typeof targetAccuracy === "number" ? targetAccuracy / 100 : null;
      const met = hasTarget ? computeTargetMet(mode, targetW, targetA, wpm, accuracy) : null;
      setTargetMet(met);

      if (user && token && fetched && startedAt) {
        try {
          const saved = await api<{ id: string }>("/training/runs", {
            method: "POST",
            token,
            body: JSON.stringify({
              textSourceKind: fetched.kind,
              language: fetched.language,
              length: fetched.length,
              mode,
              targetWpm: targetW,
              targetAccuracy: targetA,
              wpm,
              accuracy,
              durationSeconds: (Date.now() - startedAt) / 1000,
              characterCount: fetched.text.length,
            }),
          });
          setSavedRun(saved.id);
          // refresh personal best so subsequent rounds use updated numbers
          api<TrainingStats>("/training/stats", { token }).then(setPersonalBest).catch(() => {});
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to save run");
        }
      }
    },
  });

  const handleRetry = () => {
    setFetched(null);
    setPhase("setup");
    setStartedAt(null);
  };

  const liveTarget = useMemo(() => {
    if (phase !== "racing" || !hasTarget) return null;
    if (mode === "Speed" && typeof targetWpm === "number") {
      return {
        label: `target: ${targetWpm} wpm`,
        progress: Math.min(100, (engine.wpm / targetWpm) * 100),
        current: `${Math.round(engine.wpm)} wpm`,
      };
    }
    if (mode === "Accuracy" && typeof targetAccuracy === "number") {
      return {
        label: `target: ${targetAccuracy}% accuracy`,
        progress: Math.min(100, (engine.accuracy * 100 / targetAccuracy) * 100),
        current: `${Math.round(engine.accuracy * 100)}%`,
      };
    }
    if (mode === "Combined" && typeof targetWpm === "number" && typeof targetAccuracy === "number") {
      const wpmPct = Math.min(100, (engine.wpm / targetWpm) * 100);
      const accPct = Math.min(100, (engine.accuracy * 100 / targetAccuracy) * 100);
      return {
        label: `target: ${targetWpm} wpm + ${targetAccuracy}%`,
        progress: Math.min(wpmPct, accPct),
        current: `${Math.round(engine.wpm)} wpm · ${Math.round(engine.accuracy * 100)}%`,
      };
    }
    return null;
  }, [phase, hasTarget, mode, targetWpm, targetAccuracy, engine.wpm, engine.accuracy]);

  return (
    <div className="terminal-window training">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">trainer ~ solo</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
          {user && <Link to="/me/training" className="auth-link">history</Link>}
        </span>
      </div>
      <div className="terminal-body">
        <h2 className="screen-title">// personal trainer</h2>

        {phase === "setup" && (
          <>
            {personalBest && personalBest.runs > 0 && (
              <p className="muted small">
                // your best: {Math.round(personalBest.bestWpm)} wpm
                {" · "}avg accuracy: {Math.round(personalBest.avgAccuracy * 100)}%
                {" · "}{personalBest.runs} run{personalBest.runs === 1 ? "" : "s"}
              </p>
            )}

            <section>
              <h3>// what are you training?</h3>
              <div className="source-grid four">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    className={`source-card ${mode === opt.mode ? "selected" : ""}`}
                    onClick={() => setMode(opt.mode)}
                  >
                    <strong>{opt.label}</strong>
                    <span className="muted">{opt.subtitle}</span>
                  </button>
                ))}
              </div>
              <p className="muted small">
                {FOCUS_OPTIONS.find((o) => o.mode === mode)?.hint}
              </p>

              {hasTarget && (
                <div className="target-row">
                  {wantsTargetWpm && (
                    <label className="field">
                      <span className="field-label">target wpm</span>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={targetWpm}
                        onChange={(e) => setTargetWpm(e.target.value ? Number(e.target.value) : "")}
                      />
                      {personalBest && personalBest.runs > 0 && (
                        <span className="hint-text">your best is {Math.round(personalBest.bestWpm)} wpm</span>
                      )}
                    </label>
                  )}
                  {wantsTargetAccuracy && (
                    <label className="field">
                      <span className="field-label">target accuracy %</span>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={targetAccuracy}
                        onChange={(e) => setTargetAccuracy(e.target.value ? Number(e.target.value) : "")}
                      />
                      {personalBest && personalBest.runs > 0 && (
                        <span className="hint-text">you average {Math.round(personalBest.avgAccuracy * 100)}%</span>
                      )}
                    </label>
                  )}
                </div>
              )}
            </section>

            <section>
              <h3>// text source</h3>
              <div className="source-grid">
                {(["Quotes", "RandomSentences", "Code"] as SoloSource[]).map((s) => (
                  <button
                    key={s}
                    className={`source-card ${source === s ? "selected" : ""}`}
                    onClick={() => setSource(s)}
                  >
                    <strong>{s === "RandomSentences" ? "random" : s.toLowerCase()}</strong>
                    <span className="muted">
                      {s === "Quotes" ? "famous lines" : s === "RandomSentences" ? "generated sentences" : "code snippets"}
                    </span>
                  </button>
                ))}
              </div>
              {source === "Code" && (
                <div className="language-picker">
                  <span className="muted">language:</span>
                  {CODE_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      className={`pill ${language === lang ? "selected" : ""}`}
                      onClick={() => setLanguage(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
              <div className="language-picker">
                <span className="muted">length:</span>
                {TEXT_LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    className={`pill ${length === l.value ? "selected" : ""}`}
                    onClick={() => setLength(l.value)}
                    title={l.sub}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              {source !== "Code" && (
                <label className="checkbox-row" style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={noPunctuation}
                    onChange={(e) => setNoPunctuation(e.target.checked)}
                  />
                  <span>strip punctuation (letters, numbers, spaces only)</span>
                </label>
              )}
            </section>

            <button className="primary" onClick={handleStart} disabled={busy}>
              {busy ? "loading…" : "begin_session()"}
            </button>

            {!user && (
              <p className="muted">
                <Link to="/login">log in</Link> to save your sessions, track progress, and auto-tune targets.
              </p>
            )}
          </>
        )}

        {phase === "ready" && fetched && (
          <div className="countdown">
            <span>ready</span>
            <p className="muted">start typing when the text appears…</p>
          </div>
        )}

        {(phase === "racing" || phase === "finished") && fetched && (
          <>
            <div className="stat-strip compact">
              <Stat label="wpm" value={Math.round(phase === "finished" ? finalWpm ?? 0 : engine.wpm).toString()} />
              <Stat label="accuracy" value={`${Math.round((phase === "finished" ? finalAcc ?? 0 : engine.accuracy) * 100)}%`} />
              <Stat label="length" value={fetched.length.toLowerCase()} />
              <Stat label="focus" value={focusLabel(mode)} />
            </div>
            <RaceTextPanel
              text={fetched.text}
              charIndex={engine.charIndex}
              wrong={engine.wrong}
              wrongIndices={engine.wrongIndices}
            />
            {liveTarget && (
              <div className="target-bar">
                <div className="target-bar-head">
                  <span className="muted">{liveTarget.label}</span>
                  <span className="muted">{liveTarget.current}</span>
                </div>
                <div className="racer-bar">
                  <div
                    className="racer-bar-fill"
                    style={{
                      width: `${liveTarget.progress}%`,
                      background: liveTarget.progress >= 100 ? "var(--accent)" : "var(--cursor)",
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {phase === "finished" && fetched && finalWpm !== null && finalAcc !== null && (
          <div className="finished-block">
            {hasTarget && targetMet !== null && (
              <TargetReport
                mode={mode}
                targetWpm={typeof targetWpm === "number" ? targetWpm : null}
                targetAccuracy={typeof targetAccuracy === "number" ? targetAccuracy : null}
                wpm={finalWpm}
                accuracy={finalAcc}
                met={targetMet}
              />
            )}

            {personalBest && personalBest.runs > 0 && finalWpm > personalBest.bestWpm && (
              <p className="muted small">🏆 new personal best (+{Math.round(finalWpm - personalBest.bestWpm)} wpm)</p>
            )}

            {savedRun && <p className="muted small">saved to your training history.</p>}

            <div className="actions-row">
              <button className="primary" onClick={handleStart} disabled={busy}>
                another_round()
              </button>
              <button className="ghost" onClick={handleRetry}>change settings</button>
              {user && <Link to="/me/training" className="auth-link">view history →</Link>}
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

function TargetReport({
  mode,
  targetWpm,
  targetAccuracy,
  wpm,
  accuracy,
  met,
}: {
  mode: RaceMode;
  targetWpm: number | null;
  targetAccuracy: number | null;
  wpm: number;
  accuracy: number;
  met: boolean;
}) {
  const lines: { label: string; target: string; actual: string; delta: string; ok: boolean }[] = [];

  if ((mode === "Speed" || mode === "Combined") && targetWpm !== null) {
    const delta = wpm - targetWpm;
    lines.push({
      label: "speed",
      target: `${targetWpm} wpm`,
      actual: `${Math.round(wpm)} wpm`,
      delta: `${delta >= 0 ? "+" : ""}${Math.round(delta)} wpm`,
      ok: wpm >= targetWpm,
    });
  }
  if ((mode === "Accuracy" || mode === "Combined") && targetAccuracy !== null) {
    const actualPct = accuracy * 100;
    const delta = actualPct - targetAccuracy;
    lines.push({
      label: "accuracy",
      target: `${targetAccuracy}%`,
      actual: `${Math.round(actualPct)}%`,
      delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp`,
      ok: actualPct >= targetAccuracy,
    });
  }

  return (
    <div className="target-report">
      <p className={met ? "target-hit" : "target-miss"}>
        {met ? "✓ target hit" : "× target missed"}
      </p>
      <table className="target-table">
        <thead>
          <tr>
            <th></th>
            <th>target</th>
            <th>you</th>
            <th>delta</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.label}>
              <td>{line.label}</td>
              <td>{line.target}</td>
              <td className={line.ok ? "ok" : "miss"}>{line.actual}</td>
              <td className={line.ok ? "ok" : "miss"}>{line.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{coachLine(mode, lines, met)}</p>
    </div>
  );
}

function coachLine(mode: RaceMode, lines: Array<{ label: string; ok: boolean; delta: string }>, met: boolean): string {
  if (met) {
    if (mode === "Speed") return "Nice. Bump the target up 5 wpm and try again.";
    if (mode === "Accuracy") return "Clean run. Try lowering your accuracy target by 1pp next round to push tempo.";
    if (mode === "Combined") return "Both targets nailed. Increase one of them next round.";
  }
  const missed = lines.find((l) => !l.ok);
  if (missed?.label === "speed") return "Close on speed — slow down a hair, focus on rhythm, then push.";
  if (missed?.label === "accuracy") return "Slow down by 5–10% and the errors will fall off.";
  return "Reset, breathe, go again.";
}

function focusLabel(mode: RaceMode): string {
  if (mode === "Speed") return "speed";
  if (mode === "Accuracy") return "accuracy";
  if (mode === "Combined") return "both";
  return "practice";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function computeTargetMet(mode: RaceMode, targetWpm: number | null, targetAccuracy: number | null, wpm: number, accuracy: number): boolean {
  if (mode === "Speed" && targetWpm) return wpm >= targetWpm;
  if (mode === "Accuracy" && targetAccuracy) return accuracy >= targetAccuracy;
  if (mode === "Combined" && targetWpm && targetAccuracy) return wpm >= targetWpm && accuracy >= targetAccuracy;
  return false;
}
