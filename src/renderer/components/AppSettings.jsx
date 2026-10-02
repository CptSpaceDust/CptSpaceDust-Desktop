import { useEffect, useState } from "react";
import { Download, LockKeyhole, RefreshCw, TimerReset } from "lucide-react";
import { Field, PageHeader } from "./ui";
import { UpdateVisual } from "./UpdateVisual";

export default function AppSettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    timeoutMinutes: 5,
  });
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [update, setUpdate] = useState({
    status: "idle",
    currentVersion: "",
    message: "",
  });
  useEffect(() => {
    window.desktop.appLock.getState().then(setSettings);
  }, []);
  useEffect(() => {
    window.desktop.updater.getState().then(setUpdate);
    return window.desktop.updater.onState(setUpdate);
  }, []);
  async function save(event) {
    event.preventDefault();
    if (pin !== confirm) return setMessage("The new PIN entries do not match.");
    const result = await window.desktop.appLock.setPin(pin, current);
    setMessage(result.ok ? "App lock enabled." : result.error);
    if (result.ok) {
      setSettings(result.settings);
      setCurrent("");
      setPin("");
      setConfirm("");
    }
  }
  async function disable() {
    const result = await window.desktop.appLock.disable(current);
    setMessage(result.ok ? "App lock disabled." : result.error);
    if (result.ok) setSettings(result.settings);
  }
  async function setTimeoutMinutes(value) {
    const result = await window.desktop.appLock.setTimeout(Number(value));
    if (result.ok) setSettings(result.settings);
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Desktop settings"
        title="Privacy & app lock"
        description="Keep community messages private whenever you step away."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="section-icon">
            <LockKeyhole />
          </div>
          <h2>App lock with PIN</h2>
          <p>
            The PIN never leaves this computer and is stored as a salted one-way
            hash.
          </p>
          <form onSubmit={save}>
            {settings.enabled && (
              <Field label="Current PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  value={current}
                  onChange={(e) =>
                    setCurrent(e.target.value.replace(/\D/g, ""))
                  }
                  required
                />
              </Field>
            )}
            <Field label="New PIN">
              <input
                type="password"
                inputMode="numeric"
                minLength="4"
                maxLength="8"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
              />
            </Field>
            <Field label="Confirm PIN">
              <input
                type="password"
                inputMode="numeric"
                minLength="4"
                maxLength="8"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                required
              />
            </Field>
            <div className="button-row">
              <button className="button primary">
                {settings.enabled ? "Change PIN" : "Enable app lock"}
              </button>
              {settings.enabled && (
                <button
                  className="button danger"
                  type="button"
                  onClick={disable}
                >
                  Disable
                </button>
              )}
            </div>
          </form>
          {message && <p className="form-message">{message}</p>}
        </section>
        <section className="panel settings-panel">
          <div className="section-icon">
            <TimerReset />
          </div>
          <h2>Automatic locking</h2>
          <p>
            The app always locks when minimized. Choose how long it can stay in
            the background.
          </p>
          <Field label="Background timeout">
            <select
              value={settings.timeoutMinutes}
              disabled={!settings.enabled}
              onChange={(e) => setTimeoutMinutes(e.target.value)}
            >
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </Field>
          <button
            className="button secondary"
            disabled={!settings.enabled}
            onClick={() => window.desktop.appLock.lockNow()}
          >
            Lock now
          </button>
        </section>
        <section className="panel settings-panel">
          <div className="section-icon">
            <Download />
          </div>
          <h2>App updates</h2>
          <p>
            The installed app checks for new releases automatically and
            downloads them in the background.
          </p>
          <div className="update-version">
            Installed version <strong>{update.currentVersion || "—"}</strong>
          </div>
          {["downloading", "ready", "installing"].includes(update.status) && <UpdateVisual update={update} />}
          <p
            className={
              update.status === "error" ? "form-message" : "micro-copy"
            }
          >
            {update.message ||
              "Updates are checked after startup and every four hours."}
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              disabled={["checking", "downloading"].includes(update.status)}
              onClick={() => window.desktop.updater.check()}
            >
              <RefreshCw />
              Check now
            </button>
            {update.status === "ready" && (
              <button
                className="button primary"
                onClick={() => window.desktop.updater.install()}
              >
                <Download />
                Restart & install
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
