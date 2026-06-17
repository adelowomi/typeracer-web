import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, displayName.trim());
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="terminal-window auth-window">
      <div className="terminal-titlebar">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">auth ~ register</span>
      </div>
      <form className="terminal-body" onSubmit={submit}>
        <p className="prompt"><span className="prompt-prefix">$</span> create an account</p>
        <label className="field">
          <span className="field-label">display name</span>
          <input type="text" required maxLength={64} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">password</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "creating…" : "register()"}
        </button>
        {error && <p className="error"><span className="prompt-prefix">!</span> {error}</p>}
        <p className="muted">
          already have an account? <Link to="/login">log in</Link>
        </p>
      </form>
    </div>
  );
}
