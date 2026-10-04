import { useEffect, useState } from "react";
import { AlertTriangle, MessageSquareText } from "lucide-react";
import { Modal } from "./ui";

const DIALOG_EVENT = "crewdeck:dialog";

function requestDialog(options) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(DIALOG_EVENT, {
        detail: { ...options, resolve },
      }),
    );
  });
}

export function confirmInApp(message, options = {}) {
  return requestDialog({
    type: "confirm",
    title: options.title || "Are you sure?",
    message,
    confirmLabel: options.confirmLabel || "Confirm",
    danger: options.danger !== false,
  });
}

export function promptInApp(message, initialValue = "", options = {}) {
  return requestDialog({
    ...options,
    type: "prompt",
    title: options.title || "Enter a value",
    message,
    initialValue,
    confirmLabel: options.confirmLabel || "Continue",
    danger: false,
  });
}

export function InAppDialogHost() {
  const [request, setRequest] = useState(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const open = (event) => {
      setRequest((current) => {
        current?.resolve(current.type === "confirm" ? false : null);
        return event.detail;
      });
      setValue(event.detail.initialValue || "");
    };
    window.addEventListener(DIALOG_EVENT, open);
    return () => window.removeEventListener(DIALOG_EVENT, open);
  }, []);

  if (!request) return null;
  const finish = (result) => {
    request.resolve(result);
    setRequest(null);
  };

  return (
    <Modal
      title={request.title}
      onClose={() => finish(request.type === "confirm" ? false : null)}
    >
      <div className="app-dialog-copy">
        <span className={request.danger ? "danger" : "prompt"}>
          {request.type === "prompt" ? (
            <MessageSquareText />
          ) : (
            <AlertTriangle />
          )}
        </span>
        <p>{request.message}</p>
      </div>
      {request.type === "prompt" && (
        <label className="field">
          <span>{request.inputLabel || "Your answer"}</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={request.maxLength || 1000}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && value.trim()) finish(value.trim());
            }}
          />
        </label>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="button ghost"
          onClick={() => finish(request.type === "confirm" ? false : null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className={request.danger ? "button danger" : "button primary"}
          disabled={request.type === "prompt" && !value.trim()}
          onClick={() =>
            finish(request.type === "prompt" ? value.trim() : true)
          }
        >
          {request.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
