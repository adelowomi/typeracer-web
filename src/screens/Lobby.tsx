import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRace } from "../race/RaceProvider";
import {
  CODE_LANGUAGES,
  RACE_MODES,
  TEXT_LENGTHS,
  type CodeLanguage,
  type TextLength,
  type TextSourceKind,
} from "../race/types";

const SOURCES: { kind: TextSourceKind; label: string; subtitle: string }[] = [
  { kind: "Quotes", label: "quotes", subtitle: "famous lines & passages" },
  { kind: "RandomSentences", label: "random", subtitle: "generated sentences" },
  { kind: "Code", label: "code", subtitle: "snippets with whitespace" },
  { kind: "Custom", label: "custom", subtitle: "paste your own text" },
];

export function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room,
    phase,
    connectionId,
    error,
    setTextSource,
    setRaceMode,
    startRace,
    leaveRoom,
  } = useRace();
  const [language, setLanguage] = useState<CodeLanguage>("python");
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (phase === "countdown" || phase === "racing") {
      navigate(`/room/${code}/race`);
    }
  }, [phase, code, navigate]);

  if (!room) return null;

  const isHost = room.hostConnectionId === connectionId;
  const currentKind = room.textSource.kind;
  const currentLength = room.textSource.length;
  const currentMode = room.mode;

  const copyInvite = async () => {
    const url = `${window.location.origin}/?code=${room.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSourcePick = async (kind: TextSourceKind) => {
    if (!isHost) return;
    await setTextSource({
      kind,
      language: kind === "Code" ? language : null,
      length: currentLength,
    });
  };

  const handleLanguageChange = async (lang: CodeLanguage) => {
    setLanguage(lang);
    if (isHost && currentKind === "Code") {
      await setTextSource({ kind: "Code", language: lang, length: currentLength });
    }
  };

  const handleLengthChange = async (length: TextLength) => {
    if (!isHost) return;
    await setTextSource({
      kind: currentKind,
      language: currentKind === "Code" ? language : null,
      length,
    });
  };

  const handleModeChange = async (mode: string) => {
    if (!isHost) return;
    await setRaceMode(mode);
  };

  const canStart =
    isHost &&
    room.racers.length >= 1 &&
    (currentKind !== "Custom" || customText.trim().length >= 50);

  const handleStart = async () => {
    await startRace(currentKind === "Custom" ? customText.trim() : undefined);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/", { replace: true });
  };

  return (
    <div className="terminal-window lobby">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">lobby ~ /room/{room.code}</span>
      </div>
      <div className="terminal-body">
        <div className="invite-row">
          <div>
            <div className="muted">{room.name ? room.name : "invite code"}</div>
            <div className="invite-code">{room.code}</div>
          </div>
          <button onClick={copyInvite} className="ghost">
            {copied ? "copied ✓" : "copy link"}
          </button>
          <button onClick={handleLeave} className="ghost danger">
            leave
          </button>
        </div>

        <section>
          <h3>// racers ({room.racers.length}/5)</h3>
          <ul className="racer-list">
            {room.racers.map((r) => (
              <li key={r.connectionId}>
                <span className="racer-dot" style={{ background: r.color }} />
                <span>{r.nickname}</span>
                {r.connectionId === room.hostConnectionId && (
                  <span className="badge">host</span>
                )}
                {r.connectionId === connectionId && <span className="badge you">you</span>}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>// race mode</h3>
          <div className="source-grid four">
            {RACE_MODES.map((m) => (
              <button
                key={m.value}
                className={`source-card ${currentMode === m.value ? "selected" : ""}`}
                disabled={!isHost}
                onClick={() => handleModeChange(m.value)}
              >
                <strong>{m.label}</strong>
                <span className="muted">{m.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>// text source</h3>
          <div className="source-grid">
            {SOURCES.map((s) => (
              <button
                key={s.kind}
                className={`source-card ${currentKind === s.kind ? "selected" : ""}`}
                disabled={!isHost}
                onClick={() => handleSourcePick(s.kind)}
              >
                <strong>{s.label}</strong>
                <span className="muted">{s.subtitle}</span>
              </button>
            ))}
          </div>

          {currentKind === "Code" && (
            <div className="language-picker">
              <span className="muted">language:</span>
              {CODE_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`pill ${language === lang ? "selected" : ""}`}
                  disabled={!isHost}
                  onClick={() => handleLanguageChange(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}

          {currentKind !== "Custom" && (
            <div className="language-picker">
              <span className="muted">length:</span>
              {TEXT_LENGTHS.map((l) => (
                <button
                  key={l.value}
                  className={`pill ${currentLength === l.value ? "selected" : ""}`}
                  disabled={!isHost}
                  onClick={() => handleLengthChange(l.value)}
                  title={l.sub}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {currentKind === "Custom" && isHost && (
            <div className="custom-text">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="paste 50–1500 characters of text here…"
                maxLength={1500}
                rows={4}
              />
              <span className="muted">
                {customText.trim().length} / 1500 (min 50)
              </span>
            </div>
          )}
        </section>

        {isHost ? (
          <button
            className="primary"
            disabled={!canStart}
            onClick={handleStart}
          >
            start_race()
          </button>
        ) : (
          <p className="muted">waiting for host to start the race…</p>
        )}

        {error && (
          <p className="error">
            <span className="prompt-prefix">!</span> {error}
          </p>
        )}
      </div>
    </div>
  );
}
