import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import BrandMark from "./BrandMark";

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setMessage("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Password updated.");
      setTimeout(onDone, 900);
    }
  }
  return (
    <main className="lock-layout">
      <section className="lock-card">
        <div className="brand-lockup centered">
          <span className="brand-orbit">
            <BrandMark />
          </span>
          <div>
            <strong>CrewDeck</strong>
            <small>Private community desktop</small>
          </div>
        </div>
        <div className="lock-icon">
          <KeyRound />
        </div>
        <span className="eyebrow">Secure recovery</span>
        <h1>Choose a new password</h1>
        <form onSubmit={submit}>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              minLength="6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              minLength="6"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
