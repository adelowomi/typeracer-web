import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useRace } from "../race/RaceProvider";

const NICKNAME_KEY = "typeracer.nickname";

export function Landing() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error, clearError } = useRace();
  const [nickname, setNickname] = useState<string>(
    () => localStorage.getItem(NICKNAME_KEY) ?? "",
  );
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  const remember = (value: string) => {
    setNickname(value);
    localStorage.setItem(NICKNAME_KEY, value);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!nickname.trim()) return;
    setBusy("create");
    try {
      const room = await createRoom(nickname.trim());
      navigate(`/room/${room.code}`);
    } catch {
      // error shown via context
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!nickname.trim() || !joinCode.trim()) return;
    setBusy("join");
    try {
      const room = await joinRoom(joinCode.trim().toUpperCase(), nickname.trim());
      navigate(`/room/${room.code}`);
    } catch {
      // error shown via context
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="terminal-window landing">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">typeracer ~ session</span>
      </div>
      <div className="terminal-body">
        <pre className="ascii">{ART}</pre>
        <p className="prompt">
          <span className="prompt-prefix">$</span> who's racing?
        </p>
        <label className="field">
          <span className="field-label">nickname</span>
          <input
            type="text"
            maxLength={24}
            placeholder="enter handle"
            value={nickname}
            onChange={(e) => remember(e.target.value)}
            autoFocus
          />
        </label>

        <div className="actions">
          <form onSubmit={handleCreate} className="action-card">
            <h3>// host a room</h3>
            <p>generate an invite code and wait for friends.</p>
            <button type="submit" disabled={!nickname.trim() || busy !== null}>
              {busy === "create" ? "creating…" : "create_room()"}
            </button>
          </form>

          <form onSubmit={handleJoin} className="action-card">
            <h3>// join a room</h3>
            <label className="field">
              <span className="field-label">code</span>
              <input
                type="text"
                maxLength={6}
                placeholder="XXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ textTransform: "uppercase", letterSpacing: "0.2em" }}
              />
            </label>
            <button
              type="submit"
              disabled={!nickname.trim() || !joinCode.trim() || busy !== null}
            >
              {busy === "join" ? "joining…" : "join_room()"}
            </button>
          </form>
        </div>

        {error && (
          <p className="error">
            <span className="prompt-prefix">!</span> {error}
          </p>
        )}
      </div>
    </div>
  );
}

const ART = `   __
  / /___  ______  ___  _________ _________ _____
 / __/ / / / __ \\/ _ \\/ ___/ __ \`/ ___/ _ \\/ ___/
/ /_/ /_/ / /_/ /  __/ /  / /_/ / /__/  __/ /
\\__/\\__, / .___/\\___/_/   \\__,_/\\___/\\___/_/
   /____/_/                                    `;
