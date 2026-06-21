import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type Phase = "idle" | "running" | "paused" | "done";

const PRESETS: { label: string; ms: number }[] = [
  { label: "1:00", ms: 60_000 },
  { label: "3:00", ms: 180_000 },
  { label: "5:00", ms: 300_000 },
  { label: "10:00", ms: 600_000 },
];

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // three short rising blips
    [0, 0.25, 0.5].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 660 + i * 220;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* audio not available — visual cue still fires */
  }
}

export function CountdownTimer() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(300_000);

  const deadlineRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const configuredMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

  const stopTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  useEffect(() => () => stopTick(), []);

  // While idle the display mirrors the configured inputs; once started it tracks `remaining`.
  const displayMs = phase === "idle" ? configuredMs : remaining;

  const runUntil = useCallback((deadline: number) => {
    deadlineRef.current = deadline;
    stopTick();
    tickRef.current = window.setInterval(() => {
      const left = (deadlineRef.current ?? 0) - Date.now();
      if (left <= 0) {
        stopTick();
        deadlineRef.current = null;
        setRemaining(0);
        setPhase("done");
        beep();
      } else {
        setRemaining(left);
      }
    }, 200);
  }, []);

  const start = () => {
    if (configuredMs <= 0) return;
    setRemaining(configuredMs);
    setPhase("running");
    runUntil(Date.now() + configuredMs);
  };

  const pause = () => {
    stopTick();
    deadlineRef.current = null;
    setPhase("paused");
  };

  const resume = () => {
    setPhase("running");
    runUntil(Date.now() + remaining);
  };

  const reset = () => {
    stopTick();
    deadlineRef.current = null;
    setPhase("idle");
    setRemaining(configuredMs);
  };

  const applyPreset = (ms: number) => {
    stopTick();
    deadlineRef.current = null;
    setHours(Math.floor(ms / 3_600_000));
    setMinutes(Math.floor((ms % 3_600_000) / 60_000));
    setSeconds(Math.floor((ms % 60_000) / 1000));
    setPhase("idle");
    setRemaining(ms);
  };

  const editable = phase === "idle";

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">tools ~ timer</span>
        <span className="terminal-stats">
          <Link to="/" className="auth-link">home</Link>
        </span>
      </div>
      <div className="terminal-body">
        <div className={`timer-display ${phase === "done" ? "done" : ""} ${phase === "running" && displayMs <= 10_000 ? "urgent" : ""}`}>
          {format(displayMs)}
        </div>

        {phase === "done" && <p className="prompt"><span className="prompt-prefix">!</span> time's up</p>}

        {editable && (
          <>
            <section>
              <h3>// set duration</h3>
              <div className="timer-inputs">
                <label className="field">
                  <span className="field-label">hours</span>
                  <input type="number" min={0} max={23} value={hours}
                    onChange={(e) => setHours(clamp(parseInt(e.target.value, 10), 0, 23))} />
                </label>
                <label className="field">
                  <span className="field-label">minutes</span>
                  <input type="number" min={0} max={59} value={minutes}
                    onChange={(e) => setMinutes(clamp(parseInt(e.target.value, 10), 0, 59))} />
                </label>
                <label className="field">
                  <span className="field-label">seconds</span>
                  <input type="number" min={0} max={59} value={seconds}
                    onChange={(e) => setSeconds(clamp(parseInt(e.target.value, 10), 0, 59))} />
                </label>
              </div>
            </section>

            <section>
              <h3>// quick set</h3>
              <div className="language-picker">
                {PRESETS.map((p) => (
                  <button key={p.label} className="pill" onClick={() => applyPreset(p.ms)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <div className="actions-row">
          {phase === "idle" && (
            <button className="primary" onClick={start} disabled={configuredMs <= 0}>
              start()
            </button>
          )}
          {phase === "running" && (
            <button className="ghost" onClick={pause}>pause</button>
          )}
          {phase === "paused" && (
            <button className="primary" onClick={resume}>resume</button>
          )}
          {(phase === "running" || phase === "paused" || phase === "done") && (
            <button className="ghost danger" onClick={reset}>reset</button>
          )}
        </div>

        <p className="muted footer-links">
          <Link to="/tools/dice">// dice roller</Link>
          {" · "}<Link to="/">// back to games</Link>
        </p>
      </div>
    </div>
  );
}
