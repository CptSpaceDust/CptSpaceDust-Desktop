import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import BrandMark from "./BrandMark";

export default function LockScreen() {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function unlock(event) {
    event.preventDefault();
    setBusy(true);
    const result = await window.desktop.appLock.verify(pin);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      setPin("");
    }
  }
  return (
    <main className="lock-layout">
      <div className="lock-stars" />
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
          <LockKeyhole />
        </div>
        <span className="eyebrow">Private crew space</span>
        <h1>App locked</h1>
        <p>Enter your local PIN to return to the community.</p>
        <form onSubmit={unlock}>
          <input
            className="pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength="4"
            maxLength="8"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
          />
          {message && <p className="form-message">{message}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Checking…" : "Unlock app"}
          </button>
        </form>
      </section>
    </main>
  );
}
