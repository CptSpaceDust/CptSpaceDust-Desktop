import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";

export function UpdateVisual({ update }) {
  const percent = Math.min(100, Math.max(0, Number(update.percent) || 0));
  return (
    <div className={`update-flight update-flight-${update.status}`}>
      <div className="update-flight-scene" aria-hidden="true">
        <i />
        <i />
        <i />
        <div className="update-flight-rocket">
          <Rocket />
        </div>
        <span />
      </div>
      <strong>
        {update.status === "installing"
          ? "Preparing your next orbit"
          : update.status === "ready"
            ? "Ready for liftoff"
            : "Incoming transmission"}
      </strong>
      <p>
        {update.status === "installing"
          ? "Restarting to install your update…"
          : update.status === "ready"
            ? `Version ${update.availableVersion} is ready.`
            : `Downloading version ${update.availableVersion || "…"}`}
      </p>
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
