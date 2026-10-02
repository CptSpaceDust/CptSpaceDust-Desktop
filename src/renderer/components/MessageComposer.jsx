import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "../lib/supabase";
import { shouldSendOnEnter } from "../lib/messageBehavior.mjs";

export const activeConversation = { current: null };

export function FormattedMessage({ children }) {
  const source = String(children ?? "");
  const parts = [];
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\|\|([^|\n]+)\|\|/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    parts.push(source.slice(cursor, match.index));
    parts.push(
      match[1] !== undefined ? (
        <strong key={match.index}>
          <em>{match[1]}</em>
        </strong>
      ) : match[2] !== undefined ? (
        <em key={match.index}>{match[2]}</em>
      ) : (
        <strong key={match.index}>{match[3]}</strong>
      ),
    );
    cursor = match.index + match[0].length;
  }
  parts.push(source.slice(cursor));
  return <span className="formatted-message">{parts}</span>;
}

export function MessageReplyQuote({
  message,
  messages,
  people,
  className = "message-reply-quote",
}) {
  if (!message.is_reply && !message.reply_to_id) return null;
  const original = messages.find((item) => item.id === message.reply_to_id);
  const author =
    original && people.find((person) => person.id === original.sender_id);
  return (
    <blockquote className={className}>
      <strong>
        {original
          ? `Replying to ${author?.username || "Former member"}`
          : "Original message unavailable"}
      </strong>
      <span>
        {original ? (
          <FormattedMessage>{original.content}</FormattedMessage>
        ) : (
          "Deleted or expired"
        )}
      </span>
    </blockquote>
  );
}

export function MessageNotices() {
  return (
    <aside className="message-notices">
      <p>
        <strong>Message Retention</strong> Messages are automatically deleted
        after 5 days due to storage limits. This applies to all conversations.
      </p>
      <p>
        <strong>Auto deleted messages cannot be recovered</strong> After the
        retention period, the Captain cannot restore deleted messages.
      </p>
    </aside>
  );
}

export default function MessageComposer({
  id,
  group = false,
  user,
  people,
  placeholder,
  onSend,
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [typers, setTypers] = useState({});
  const channelRef = useRef(null);
  const inputRef = useRef(null);
  const sendingRef = useRef(false);
  const lastInput = useRef(0);
  const draftRef = useRef("");
  useEffect(() => {
    let alive = true,
      ready = false;
    const context = { id, group };
    activeConversation.current = context;
    setDraft("");
    draftRef.current = "";
    setTypers({});
    const channel = supabase.channel(
      group ? `group-chat-${id}` : `conversation-${id}`,
      { config: { private: true } },
    );
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const sender = group ? payload?.userId : payload?.user_id;
      if (!alive || !sender || sender === user.id) return;
      setTypers((previous) => ({
        ...previous,
        [sender]: payload.typing ? Date.now() + 3000 : 0,
      }));
    });
    let lastSent = 0,
      wasTyping = false;
    const sendTyping = (typing) => {
      if (
        !ready ||
        (typing && wasTyping && Date.now() - lastSent < 700) ||
        (!typing && !wasTyping)
      )
        return;
      lastSent = Date.now();
      wasTyping = typing;
      channel
        .send({
          type: "broadcast",
          event: "typing",
          payload: group
            ? { userId: user.id, typing }
            : { user_id: user.id, typing },
        })
        .catch(() => {});
    };
    channelRef.current = sendTyping;
    supabase.realtime
      .setAuth()
      .then(() => {
        if (alive)
          channel.subscribe((status) => {
            ready = status === "SUBSCRIBED";
          });
      })
      .catch(() => {});
    const timer = setInterval(() => {
      sendTyping(
        Boolean(draftRef.current.trim()) &&
          Date.now() - lastInput.current < 2500,
      );
      setTypers((previous) =>
        Object.fromEntries(
          Object.entries(previous).filter(([, expiry]) => expiry > Date.now()),
        ),
      );
    }, 1000);
    return () => {
      sendTyping(false);
      alive = false;
      clearInterval(timer);
      channelRef.current = null;
      if (activeConversation.current === context)
        activeConversation.current = null;
      supabase.removeChannel(channel);
    };
  }, [id, group, user.id]);
  const names = Object.keys(typers)
    .filter(
      (key) =>
        typers[key] > Date.now() && people.some((person) => person.id === key),
    )
    .map(
      (key) =>
        people.find((person) => person.id === key)?.username || "Someone",
    );
  async function submit(event) {
    event.preventDefault();
    if (sendingRef.current || !draft.trim()) return;
    sendingRef.current = true;
    setBusy(true);
    try {
      if ((await onSend(event)) !== false) {
        setDraft("");
        draftRef.current = "";
        channelRef.current?.(false);
      }
    } finally {
      sendingRef.current = false;
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }
  return (
    <>
      <div className="desktop-typing" role="status" aria-live="polite">
        {names.length > 1
          ? "Many people typing…"
          : names.length
            ? `${names[0]} is typing…`
            : ""}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          ref={inputRef}
          name="message"
          rows="1"
          maxLength="900"
          value={draft}
          disabled={busy}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            draftRef.current = event.target.value;
            lastInput.current = Date.now();
            channelRef.current?.(Boolean(event.target.value.trim()));
          }}
          onBlur={() => {
            lastInput.current = 0;
            channelRef.current?.(false);
          }}
          onKeyDown={(event) => {
            if (shouldSendOnEnter(event.nativeEvent)) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
        />
        <button
          className="send-button"
          disabled={busy || !draft.trim()}
          aria-label="Send message"
        >
          <Send />
        </button>
      </form>
      <details className="message-format-help">
        <summary>Message formatting · {draft.length} / 900</summary>
        <p>
          <code>*italic*</code> · <code>||bold||</code> ·{" "}
          <code>**bold italic**</code>
        </p>
        <p>Enter to send · Shift+Enter for a new line</p>
      </details>
    </>
  );
}
