import { useEffect, useState } from "react";
import {
  Bell,
  Download,
  LockKeyhole,
  RefreshCw,
  TimerReset,
  Volume2,
} from "lucide-react";
import { Field, PageHeader } from "./ui";
import { UpdateVisual } from "./UpdateVisual";
import {
  defaultPreferences,
  getPreferences,
  updatePreferences,
} from "../lib/preferences";

export default function AppSettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    timeoutMinutes: 5,
  });
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [update, setUpdate] = useState({
    status: "idle",
    currentVersion: "",
    message: "",
  });
  useEffect(() => {
    window.desktop.appLock.getState().then(setSettings);
    setPreferences(getPreferences());
  }, []);
  function preference(key, value) {
    setPreferences(updatePreferences({ [key]: value }));
  }
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
          <Field label="Lock after no activity">
            <select
              value={preferences.inactivityLockMinutes}
              disabled={!settings.enabled}
              onChange={(event) =>
                preference("inactivityLockMinutes", Number(event.target.value))
              }
            >
              <option value="0">Never</option>
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </Field>
        </section>
        <section className="panel settings-panel">
          <div className="section-icon">
            <Bell />
          </div>
          <h2>Notifications</h2>
          <p>
            Control desktop alerts, sounds, quiet hours, and meetup reminders.
          </p>
          <label className="check-field">
            <input
              type="checkbox"
              checked={preferences.notificationSound}
              onChange={(event) =>
                preference("notificationSound", event.target.checked)
              }
            />
            <span>Play notification sounds</span>
          </label>
          <Field label="Sound volume">
            <div className="settings-range">
              <Volume2 />
              <input
                type="range"
                min="0"
                max="100"
                value={preferences.notificationVolume}
                disabled={!preferences.notificationSound}
                onChange={(event) =>
                  preference("notificationVolume", Number(event.target.value))
                }
              />
              <span>{preferences.notificationVolume}%</span>
            </div>
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={preferences.quietHours}
              onChange={(event) =>
                preference("quietHours", event.target.checked)
              }
            />
            <span>Use quiet hours</span>
          </label>
          {preferences.quietHours && (
            <div className="form-grid">
              <Field label="Quiet from">
                <input
                  type="time"
                  value={preferences.quietStart}
                  onChange={(event) =>
                    preference("quietStart", event.target.value)
                  }
                />
              </Field>
              <Field label="Until">
                <input
                  type="time"
                  value={preferences.quietEnd}
                  onChange={(event) =>
                    preference("quietEnd", event.target.value)
                  }
                />
              </Field>
            </div>
          )}
          <label className="check-field">
            <input
              type="checkbox"
              checked={preferences.meetupReminders}
              onChange={(event) =>
                preference("meetupReminders", event.target.checked)
              }
            />
            <span>Remind me before approved meetups</span>
          </label>
          <Field label="Reminder time">
            <select
              value={preferences.reminderMinutes}
              disabled={!preferences.meetupReminders}
              onChange={(event) =>
                preference("reminderMinutes", Number(event.target.value))
              }
            >
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
            </select>
          </Field>
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
          {["downloading", "ready", "installing"].includes(update.status) && (
            <UpdateVisual update={update} />
          )}
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
