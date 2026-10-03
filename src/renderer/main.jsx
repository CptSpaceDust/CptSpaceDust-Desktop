import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./space-glass.css";

if (!window.desktop) {
  window.desktop = {
    notify: () => {},
    openExternal: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    onNavigate: () => () => {},
    onDeepLink: () => () => {},
    updater: {
      getState: async () => ({
        status: "unavailable",
        currentVersion: "development",
        message: "Updates are available in packaged builds.",
      }),
      check: async () => ({ status: "unavailable" }),
      install: async () => ({ ok: false }),
      onState: () => () => {},
    },
    appLock: {
      getState: async () => ({
        loading: false,
        locked: false,
        enabled: false,
        timeoutMinutes: 5,
      }),
      setPin: async () => ({
        ok: false,
        error: "App lock is available in the desktop build.",
      }),
      disable: async () => ({
        ok: true,
        settings: { enabled: false, timeoutMinutes: 5 },
      }),
      verify: async () => ({ ok: true }),
      setTimeout: async () => ({ ok: true }),
      lockNow: async () => ({ ok: false }),
      onState: () => () => {},
    },
  };
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
