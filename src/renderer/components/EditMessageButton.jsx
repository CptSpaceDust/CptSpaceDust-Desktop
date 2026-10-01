import { useState } from "react";
import { Edit3 } from "lucide-react";
import { Modal, Field } from "./ui";
import { editMessage } from "../lib/data";

export default function EditMessageButton({ message, userId, onSaved, saveMessage = editMessage }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function close() {
    if (!busy) setOpen(false);
  }
  async function save(event) {
    event.preventDefault();
    const value = content.trim();
    if (!value || value.length > 900) {
      setError("Messages must be 1–900 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await saveMessage(message.id, userId, value);
      if (!result)
        throw new Error("Unable to edit this message. It may have expired.");
      onSaved(value);
      setOpen(false);
    } catch (exception) {
      setError(exception.message || "Unable to save your message.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        title="Edit"
        aria-label="Edit message"
        onClick={() => {
          setContent(message.content);
          setError("");
          setOpen(true);
        }}
      >
        <Edit3 />
      </button>
      {open && (
        <Modal title="Edit message" onClose={close}>
          <form onSubmit={save} className="stack-form message-edit-form">
            <Field label="Message">
              <textarea
                autoFocus
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={900}
                rows={5}
                required
                disabled={busy}
              />
            </Field>
            <small>{content.length}/900 characters</small>
            {error && (
              <p className="form-message" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={close}
              >
                Cancel
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={busy || !content.trim()}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
