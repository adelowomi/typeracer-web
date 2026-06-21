import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

interface GameCard {
  to: string;
  key: string;
  name: string;
  tagline: string;
  players: string;
  art: string;
  accent: string;
}

const TOOLS: GameCard[] = [
  {
    to: "/tools/dice",
    key: "dice",
    name: "dice roller",
    tagline: "roll the dice — or settle who goes first with a high-roll shootout.",
    players: "utility",
    accent: "#c4b5fd",
    art: "⚄",
  },
  {
    to: "/tools/timer",
    key: "timer",
    name: "countdown timer",
    tagline: "set a timer for turns, breaks, or speed rounds. beeps when it hits zero.",
    players: "utility",
    accent: "#67e8f9",
    art: "⏲",
  },
  {
    to: "/tools/groups",
    key: "groups",
    name: "group shuffler",
    tagline: "drop in names or a headcount and split everyone into random teams.",
    players: "utility",
    accent: "#f0abfc",
    art: "⧉",
  },
];

const GAMES: GameCard[] = [
  {
    to: "/race",
    key: "race",
    name: "type race",
    tagline: "race friends to the end of a passage. fastest accurate typist wins.",
    players: "1–10 players",
    accent: "#7dd3fc",
    art: ">>>",
  },
  {
    to: "/hangman",
    key: "hangman",
    name: "hangman",
    tagline: "guess the word as a team before the figure is complete.",
    players: "teams",
    accent: "#fca5a5",
    art: "_ _ _",
  },
  {
    to: "/xo",
    key: "xo",
    name: "x and o",
    tagline: "classic tic-tac-toe, head to head. three in a row takes it.",
    players: "2 players",
    accent: "#bef264",
    art: "X · O",
  },
  {
    to: "/train",
    key: "train",
    name: "trainer",
    tagline: "solo typing practice. track your wpm and accuracy over time.",
    players: "solo",
    accent: "#fde68a",
    art: "⌨",
  },
];

export function Landing() {
  const { user, logout } = useAuth();

  return (
    <div className="terminal-window landing">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">arcade ~ pick a game</span>
        <span className="terminal-stats">
          {user ? (
            <>
              <span className="muted">{user.displayName}</span>
              <button onClick={logout} className="link-button">log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-link">login</Link>
              <span className="muted"> · </span>
              <Link to="/register" className="auth-link">register</Link>
            </>
          )}
        </span>
      </div>
      <div className="terminal-body">
        <pre className="ascii">{ART}</pre>
        <p className="prompt">
          <span className="prompt-prefix">$</span>
          {user ? ` welcome back, ${user.displayName} — what are we playing?` : " pick a game to get started"}
        </p>

        <div className="games-grid">
          {GAMES.map((game) => (
            <Link
              key={game.key}
              to={game.to}
              className="game-card"
              style={{ ["--game-accent" as string]: game.accent }}
            >
              <div className="game-card-head">
                <span className="game-art" aria-hidden>{game.art}</span>
                <span className="game-players">{game.players}</span>
              </div>
              <strong className="game-name">{game.name}</strong>
              <span className="muted game-tagline">{game.tagline}</span>
              <span className="game-cta">play →</span>
            </Link>
          ))}
        </div>

        <h3 className="section-head">// tools</h3>
        <div className="games-grid">
          {TOOLS.map((tool) => (
            <Link
              key={tool.key}
              to={tool.to}
              className="game-card"
              style={{ ["--game-accent" as string]: tool.accent }}
            >
              <div className="game-card-head">
                <span className="game-art" aria-hidden>{tool.art}</span>
                <span className="game-players">{tool.players}</span>
              </div>
              <strong className="game-name">{tool.name}</strong>
              <span className="muted game-tagline">{tool.tagline}</span>
              <span className="game-cta">open →</span>
            </Link>
          ))}
        </div>

        <p className="muted footer-links">
          {user && <><Link to="/me/rooms">// my rooms</Link>{" · "}</>}
          {user && <><Link to="/me/training">// my training</Link>{" · "}</>}
          <Link to="/leaderboard">// global leaderboard</Link>
        </p>
      </div>
    </div>
  );
}

const ART = `   __ _      ____ _ _ __ ___   ___  ___
  / _\` |    / _\` | '_ \` _ \\ / _ \\/ __|
 | (_| |   | (_| | | | | | |  __/\\__ \\
  \\__, |    \\__,_|_| |_| |_|\\___||___/
   __/ |
  |___/   pick your game`;
