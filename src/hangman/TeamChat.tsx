import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useHangman } from "./HangmanProvider";

interface Props {
  variant?: "panel" | "sidebar";
}

export function TeamChat({ variant = "panel" }: Props) {
  const { room, connectionId, chatMessages, sendChat } = useHangman();
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const me = useMemo(
    () => room?.players.find((p) => p.connectionId === connectionId),
    [room, connectionId],
  );
  const myTeamId = me?.teamId ?? null;
  const myTeam = useMemo(
    () => (myTeamId ? room?.teams.find((t) => t.id === myTeamId) : null),
    [room, myTeamId],
  );

  // Server already filters to teammates, but defend in depth in case stale messages survive.
  const visible = useMemo(
    () => (myTeamId ? chatMessages.filter((m) => m.teamId === myTeamId) : []),
    [chatMessages, myTeamId],
  );

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [visible.length]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setDraft("");
  };

  if (!myTeamId) {
    return (
      <div className={`team-chat ${variant}`}>
        <div className="team-chat-head muted small">// team chat — join a team to talk</div>
      </div>
    );
  }

  return (
    <div className={`team-chat ${variant}`}>
      <div className="team-chat-head">
        <span className="muted small">// team chat</span>
        <span style={{ color: myTeam?.color }}>{myTeam?.name ?? ""}</span>
      </div>
      <div ref={scrollerRef} className="team-chat-scroller">
        {visible.length === 0 && (
          <p className="muted small empty">no messages yet — say hi</p>
        )}
        {visible.map((m) => {
          const isYou = m.playerConnectionId === connectionId;
          return (
            <div key={m.id} className={`team-chat-msg ${isYou ? "you" : ""}`}>
              <span className="team-chat-author">{isYou ? "you" : m.nickname}</span>
              <span className="team-chat-body">{m.message}</span>
            </div>
          );
        })}
      </div>
      <form className="team-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          maxLength={240}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="message your team…"
        />
        <button type="submit" className="ghost small" disabled={!draft.trim()}>send</button>
      </form>
    </div>
  );
}
