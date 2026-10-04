import { useEffect, useState } from "react";
import { Check, Download, Keyboard, RotateCw } from "lucide-react";
import mayuDesk from "../assets/mayu/mayu-update-desk.png";

export function UpdateVisual({ update }) {
  const percent = Math.min(100, Math.max(0, Number(update.percent) || 0));
  return (
    <div className={`update-flight update-flight-${update.status}`}>
      <div className="update-desk-scene" aria-hidden="true">
        <img src={mayuDesk} alt="" />
        <div className="typing-pulse">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="update-screen-glow" />
      </div>
      <div className="update-copy-row">
        <span className="update-state-icon">
          {update.status === "ready" ? (
            <Check />
          ) : update.status === "downloading" ? (
            <Download />
          ) : (
            <RotateCw />
          )}
        </span>
        <span>
          <strong>
            {update.status === "installing"
              ? "Installing your update"
              : update.status === "ready"
                ? "Ready to install"
                : "Downloading update"}
          </strong>
          <p>
            {update.status === "installing"
              ? "Were getting this updated for you!"
              : update.status === "ready"
                ? `Version ${update.availableVersion} is ready when you are.`
                : `Version ${update.availableVersion || "…"} is downloading safely in the background.`}
          </p>
        </span>
      </div>
      {update.status === "downloading" && (
        <>
          <progress
            max="100"
            value={percent}
            aria-label="Update download progress"
          />
          <small>{Math.round(percent)}% downloaded</small>
        </>
      )}
      <div className="update-safe-note">
        <Keyboard />
        {update.status === "downloading"
          ? "You can keep using the app while the download finishes."
          : update.status === "installing"
            ? "The installer will finish automatically, then reopen the app."
            : "Save anything you are typing before you restart."}
      </div>
    </div>
  );
}

export default function UpdateOverlay() {
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    window.desktop.updater.getState().then(setUpdate);
    return window.desktop.updater.onState(setUpdate);
  }, []);
  if (update?.status !== "installing") return null;
  return (
    <div
      className="update-flight-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Installing update"
    >
      <UpdateVisual update={update} />
    </div>
  );
}
