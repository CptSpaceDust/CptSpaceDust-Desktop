import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { read, requireCaptain } from "../lib/captain";
import { Avatar, Loading } from "./ui";
import { FormattedMessage, MessageReplyQuote } from "./MessageComposer";

export default function CaptainMessages({
  data,
  user,
  run,
  refreshVersion = 0,
}) {
  const [filter, setFilter] = useState("open");
  const [review, setReview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const detailRef = useRef(null);
  const person = (id) =>
    data.crew?.find((item) => item.id === id) || { username: "Former member" };
  const flags =
    data.flags?.filter((flag) => filter === "all" || flag.status === filter) ||
    [];
  const direct = data.direct || [],
    groups = data.groups || [];
  const title = review?.group
    ? groups.find((item) => item.id === review.id)?.name || "Group conversation"
    : (() => {
        const item = direct.find((item) => item.id === review?.id);
        return item
          ? `${person(item.user_one).username} ↔ ${person(item.user_two).username}`
          : "Direct conversation";
      })();
  useEffect(() => {
    if (!review) return;
    let live = true,
      generation = 0;
    setMessages([]);
    setMembers([]);
    setLoading(true);
    setError("");
    async function load() {
      const token = ++generation;
      try {
        await requireCaptain();
        const rows = await read(
          supabase
            .from(review.group ? "group_messages" : "dm_messages")
            .select("id,sender_id,content,created_at,reply_to_id,is_reply")
            .eq(review.group ? "group_id" : "conversation_id", review.id)
            .order("created_at", { ascending: true })
            .limit(500),
        );
        const groupMembers = review.group
          ? await read(
              supabase
                .from("group_members")
                .select("user_id")
                .eq("group_id", review.id),
            )
          : [];
        if (!live || token !== generation) return;
        const conversation = direct.find((item) => item.id === review.id);
        const ids = review.group
          ? groupMembers.map((item) => item.user_id)
          : [conversation?.user_one, conversation?.user_two].filter(Boolean);
        setMembers([
          ...new Set([...ids, ...rows.map((item) => item.sender_id)]),
        ]);
        setMessages(rows);
      } catch (error) {
        if (live && token === generation) setError(error.message);
      } finally {
        if (live && token === generation) setLoading(false);
      }
    }
    load();
    const channel = supabase
      .channel(`captain-review-${review.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: review.group ? "group_messages" : "dm_messages",
          filter: `${review.group ? "group_id" : "conversation_id"}=eq.${review.id}`,
        },
        load,
      )
      .subscribe();
    return () => {
      live = false;
      supabase.removeChannel(channel);
    };
  }, [review?.id, review?.group, refreshVersion]);
  function open(id, group) {
    setReview({ id, group });
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      }),
    );
  }
  function choice(item, group) {
    const participants = group
      ? [{ username: item.name, avatar: item.avatar_url }]
      : [person(item.user_one), person(item.user_two)];
    return (
      <button
        className={`captain-conversation-choice${review?.id === item.id && review?.group === group ? " active" : ""}`}
        key={item.id}
        onClick={() => open(item.id, group)}
      >
        <span className="captain-conversation-avatars">
          {participants.map((profile, index) => (
            <Avatar key={index} profile={profile} size={36} />
          ))}
        </span>
        <span className="captain-conversation-choice-copy">
          <strong>
            {group
              ? item.name
              : participants.map((profile) => profile.username).join(" ↔ ")}
          </strong>
          <small>Updated {new Date(item.updated_at).toLocaleString()}</small>
        </span>
        <span className="captain-conversation-type">
          {group ? "Group" : "DM"}
        </span>
      </button>
    );
  }
  return (
    <>
      <section className="captain-safety-review">
        <div className="captain-safety-heading">
          <div>
            <h3>
              Conversation safety review <span>({flags.length})</span>
            </h3>
            <p>
              Automated screening surfaces possible hate speech, sexual content,
              bullying, threats, and exposed personal information for Captain
              review.
            </p>
          </div>
          <label>
            Show
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="open">Needs review</option>
              <option value="all">All detected</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
        </div>
        <p className="captain-safety-note">
          Screening can make mistakes. Review the message and its conversation
          context before taking action.
        </p>
        <div className="captain-safety-flags">
          {!flags.length && (
            <p className="captain-safety-empty">No messages need review.</p>
          )}
          {flags.map((flag) => (
            <article
              className={`captain-safety-card${flag.status === "reviewed" ? " reviewed" : ""}`}
              key={flag.id}
            >
              <div className="captain-safety-card-header">
                <strong className="captain-safety-card-title">
                  {person(flag.sender_id).username}
                </strong>
                <span className="captain-safety-kind">
                  {flag.message_kind === "direct" ? "DM" : "Group"}
                </span>
              </div>
              <div className="captain-safety-categories">
                {flag.categories.map((category) => (
                  <span className="captain-safety-category" key={category}>
                    {category}
                  </span>
                ))}
              </div>
              <p className="captain-safety-message">
                <FormattedMessage>{flag.message_content}</FormattedMessage>
              </p>
              <div className="captain-safety-meta">
                {new Date(
                  flag.message_created_at || flag.detected_at,
                ).toLocaleString()}{" "}
                · {flag.status}
              </div>
              <div className="captain-safety-actions">
                <button
                  className="captain-safety-review-button"
                  onClick={() =>
                    open(flag.conversation_id, flag.message_kind === "group")
                  }
                >
                  Open conversation
                </button>
                <button
                  className="captain-safety-review-button"
                  onClick={() =>
                    run(() =>
                      read(
                        supabase
                          .from("message_safety_flags")
                          .update(
                            flag.status === "reviewed"
                              ? {
                                  status: "open",
                                  reviewed_at: null,
                                  reviewed_by: null,
                                }
                              : {
                                  status: "reviewed",
                                  reviewed_at: new Date().toISOString(),
                                  reviewed_by: user.id,
                                },
                          )
                          .eq("id", flag.id)
                          .select("id")
                          .single(),
                      ),
                    )
                  }
                >
                  {flag.status === "reviewed"
                    ? "Reopen review"
                    : "Mark reviewed"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="captain-conversation-layout">
        <div className="captain-conversation-list">
          <h3 className="captain-conversation-heading">Direct conversations</h3>
          {!direct.length && (
            <p className="captain-conversation-empty">
              No direct conversations yet.
            </p>
          )}
          {direct.map((item) => choice(item, false))}
          <h3 className="captain-conversation-heading">Group conversations</h3>
          {!groups.length && (
            <p className="captain-conversation-empty">
              No group conversations yet.
            </p>
          )}
          {groups.map((item) => choice(item, true))}
        </div>
        <div className="captain-conversation-messages" ref={detailRef}>
          {!review ? (
            <p>Select a conversation to review its messages.</p>
          ) : (
            <>
              <div className="captain-review-header">
                <h3>{title}</h3>
                <p>{review.group ? "Group" : "Direct"} conversation</p>
                <div className="captain-review-participants">
                  {members.map((id) => (
                    <span className="captain-review-person" key={id}>
                      <Avatar profile={person(id)} size={28} />
                      {person(id).username}
                    </span>
                  ))}
                </div>
              </div>
              {loading ? (
                <Loading />
              ) : error ? (
                <p role="alert">{error}</p>
              ) : !messages.length ? (
                <p className="captain-review-empty">
                  No retained messages in this conversation.
                </p>
              ) : (
                messages.map((message) => (
                  <article className="captain-review-message" key={message.id}>
                    <Avatar profile={person(message.sender_id)} size={36} />
                    <div className="captain-review-message-body">
                      <div className="captain-review-message-meta">
                        <strong>{person(message.sender_id).username}</strong>
                        <time>
                          {new Date(message.created_at).toLocaleString()}
                        </time>
                      </div>
                      <MessageReplyQuote
                        message={message}
                        messages={messages}
                        people={data.crew || []}
                        className="captain-review-reply"
                      />
                      <p>
                        <FormattedMessage>{message.content}</FormattedMessage>
                      </p>
                    </div>
                  </article>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
