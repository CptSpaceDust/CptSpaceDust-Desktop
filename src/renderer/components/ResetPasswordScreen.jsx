import { useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
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
    <main className="auth-layout auth-layout-recovery">
      <section className="auth-panel auth-panel-centered">
        <div className="auth-card auth-reset-card">
          <div className="brand-lockup">
            <span className="brand-orbit">
              <BrandMark />
            </span>
            <div>
              <strong>CrewDeck</strong>
              <small>Private community desktop</small>
            </div>
          </div>
          <header className="auth-heading">
            <div className="auth-icon">
              <KeyRound />
            </div>
            <div>
              <span className="eyebrow">Secure recovery</span>
              <h2>Choose a new password</h2>
              <p className="auth-mode-copy">
                Make it memorable for you and difficult for anyone else to
                guess.
              </p>
            </div>
          </header>
          <div className="auth-recovery-note">
            <ShieldCheck />
            <span>
              <strong>Your reset link was verified</strong>
              <small>You can safely finish changing your password here.</small>
            </span>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                minLength="6"
                placeholder="At least 6 characters"
                autoComplete="new-password"
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
                placeholder="Type it again"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            {message && (
              <p className="form-message" role="status">
                {message === "Password updated." && <CheckCircle2 />}
                {message}
              </p>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
