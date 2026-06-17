import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { RaceTextPanel } from "../components/RaceTextPanel";
import { useTypingEngine } from "../race/useTypingEngine";
import {
  CODE_LANGUAGES,
  RACE_MODES,
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

const COUNTDOWN_MS = 1500;

export function Training() {
  const { user, token } = useAuth();

  const [source, setSource] = useState<SoloSource>("Quotes");
  const [length, setLength] = useState<TextLength>("Medium");
  const [language, setLanguage] = useState<CodeLanguage>("python");
  const [mode, setMode] = useState<RaceMode>("Completion");
  const [targetWpm, setTargetWpm] = useState<number | "">(60);
  const [targetAccuracy, setTargetAccuracy] = useState<number | "">(95);

  const [phase, setPhase] = useState<Phase>("setup");
  const [fetched, setFetched] = useState<FetchedText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finalWpm, setFinalWpm] = useState<number | null>(null);
  const [finalAcc, setFinalAcc] = useState<number | null>(null);
  const [targetMet, setTargetMet] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedRun, setSavedRun] = useState<string | null>(null);

  const wantsTargetWpm = mode === "Speed" || mode === "Combined";
  const wantsTargetAccuracy = mode === "Accuracy" || mode === "Combined";

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
      const result = await api<FetchedText>(`/text?${query.toString()}`);
      setFetched(result);
      setPhase("ready");
      // brief "ready" beat then start
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
    onProgress: () => {},
    onFinish: async (wpm, accuracy) => {
      setFinalWpm(wpm);
      setFinalAcc(accuracy);
      setPhase("finished");

      const targetW = wantsTargetWpm && typeof targetWpm === "number" ? targetWpm : null;
      const targetA = wantsTargetAccuracy && typeof targetAccuracy === "number" ? targetAccuracy / 100 : null;
      const met = computeTargetMet(mode, targetW, targetA, wpm, accuracy);
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

  const liveTargetProgress = useMemo(() => {
    if (phase !== "racing") return null;
    if (mode === "Speed" && typeof targetWpm === "number") {
      return Math.min(100, (engine.wpm / targetWpm) * 100);
    }
    if (mode === "Accuracy" && typeof targetAccuracy === "number") {
      return Math.min(100, (engine.accuracy / (targetAccuracy / 100)) * 100);
    }
    return null;
  }, [phase, mode, targetWpm, targetAccuracy, engine.wpm, engine.accuracy]);

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
            <section>
              <h3>// goal</h3>
              <div className="source-grid four">
                {RACE_MODES.map((m) => (
                  <button
                    key={m.value}
                    className={`source-card ${mode === m.value ? "selected" : ""}`}
                    onClick={() => setMode(m.value)}
                  >
                    <strong>{m.label}</strong>
                    <span className="muted">{m.sub}</span>
                  </button>
                ))}
              </div>
              {(wantsTargetWpm || wantsTargetAccuracy) && (
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
                    </label>
                  )}
                  {wantsTargetAccuracy && (
                    <label className="field">
                      <span className="field-label">target accuracy (%)</span>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={targetAccuracy}
                        onChange={(e) => setTargetAccuracy(e.target.value ? Number(e.target.value) : "")}
                      />
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
            </section>

            <button className="primary" onClick={handleStart} disabled={busy}>
              {busy ? "loading…" : "begin_session()"}
            </button>

            {!user && (
              <p className="muted">
                <Link to="/login">log in</Link> to save your sessions and track progress.
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
              <Stat label="goal" value={mode.toLowerCase()} />
            </div>
            <RaceTextPanel
              text={fetched.text}
              charIndex={engine.charIndex}
              wrong={engine.wrong}
            />
            {liveTargetProgress !== null && (
              <div className="target-bar">
                <div className="muted" style={{ marginBottom: 4 }}>target progress</div>
                <div className="racer-bar">
                  <div className="racer-bar-fill" style={{ width: `${liveTargetProgress}%`, background: liveTargetProgress >= 100 ? "var(--accent)" : "var(--cursor)" }} />
                </div>
              </div>
            )}
          </>
        )}

        {phase === "finished" && fetched && finalWpm !== null && finalAcc !== null && (
          <div className="finished-block">
            {targetMet !== null && (
              <p className={targetMet ? "target-hit" : "target-miss"}>
                {targetMet ? "✓ target hit" : "× target not met"}
              </p>
            )}
            {savedRun && <p className="muted">saved to your training history.</p>}
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
