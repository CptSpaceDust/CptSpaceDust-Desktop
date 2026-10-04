import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  addMeetupAvailability,
  cancelMeetup,
  createMeetup,
  deleteMeetupAvailability,
  getMeetupAvailability,
  getMeetups,
  getProfiles,
  respondToMeetup,
  restrictionMessage,
} from "../lib/data";
import { useLoader } from "../lib/hooks";
import { formatMeetupLocal, localTimeZoneName } from "../lib/time";
import { confirmInApp } from "../components/InAppDialog";
import {
  Empty,
  ErrorState,
  Field,
  Loading,
  Modal,
  PageHeader,
} from "../components/ui";

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const minutes = (value) => {
  const [hours, mins] = String(value || "0:0")
    .split(":")
    .map(Number);
  return hours * 60 + mins;
};
const personName = (profiles, id) =>
  profiles.find((person) => person.id === id)?.username || "Crew member";
const involves = (item, ids) =>
  ids.some((id) => id && (item.user_id === id || item.with_user_id === id));

function AvailabilityModal({ user, rows, onClose, onSaved }) {
  const [allDay, setAllDay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mine = rows.filter((item) => item.user_id === user.id);
  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await addMeetupAvailability(user.id, {
        block_date: form.get("date"),
        all_day: allDay,
        start_time: form.get("start"),
        end_time: form.get("end"),
      });
      event.currentTarget.reset();
      setAllDay(true);
      await onSaved();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(item) {
    await deleteMeetupAvailability(item.id, user.id);
    await onSaved();
  }
  return (
    <Modal title="Configure off days" onClose={onClose}>
      <div className="availability-layout">
        <form className="availability-form" onSubmit={save}>
          <p className="micro-copy">
            Block a whole day or only the hours when you will not be online.
            Times use Mountain Time. Other crew members see availability, never
            the reason.
          </p>
          <Field label="Date">
            <input
              name="date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
            />
            <span>Unavailable all day</span>
          </label>
          {!allDay && (
            <div className="form-grid">
              <Field label="Unavailable from">
                <input name="start" type="time" required />
              </Field>
              <Field label="Until">
                <input name="end" type="time" required />
              </Field>
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Add off time"}
          </button>
          {message && <p className="form-message">{message}</p>}
        </form>
        <section className="availability-list">
          <h3>Your upcoming off time</h3>
          {!mine.length && (
            <p className="micro-copy">No off days configured.</p>
          )}
          {mine.map((item) => (
            <article key={item.id}>
              <div>
                <strong>
                  {new Date(`${item.block_date}T12:00:00`).toLocaleDateString(
                    undefined,
                    { weekday: "short", month: "short", day: "numeric" },
                  )}
                </strong>
                <span>
                  {item.all_day
                    ? "All day"
                    : `${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}`}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                title="Remove off time"
                onClick={() => remove(item)}
              >
                <Trash2 />
              </button>
            </article>
          ))}
        </section>
      </div>
    </Modal>
  );
}

export default function MeetupsPage({ user, profile }) {
  const meetupLoader = useLoader(getMeetups, []);
  const profileLoader = useLoader(getProfiles, []);
  const availabilityLoader = useLoader(getMeetupAvailability, []);
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selected, setSelected] = useState(null);
  const [showFormHint, setShowFormHint] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const formHeadingRef = useRef(null);
  const meetups = meetupLoader.data || [];
  const profiles = profileLoader.data || [];
  const availability = availabilityLoader.data || [];
  const people = profiles.filter((person) => person.id !== user.id);
  const selectedProfile = profiles.find(
    (person) => person.id === selectedPerson,
  );
  const captainApprovalRequired =
    selectedProfile?.rank?.toLowerCase() === "captain";
  const myMeetups = meetups.filter(
    (item) => item.user_id === user.id || item.with_user_id === user.id,
  );
  const selectedIds = [user.id, selectedPerson].filter(Boolean);
  const approved = meetups.filter((item) => item.status === "approved");
  const selectedBlocks = availability.filter(
    (item) =>
      item.block_date === selected && selectedIds.includes(item.user_id),
  );
  const loading =
    meetupLoader.loading || profileLoader.loading || availabilityLoader.loading;
  const error =
    meetupLoader.error || profileLoader.error || availabilityLoader.error;

  async function reloadAll() {
    await Promise.all([
      meetupLoader.reload(),
      profileLoader.reload(),
      availabilityLoader.reload(),
    ]);
  }

  useEffect(() => {
    setSelected(null);
    setShowFormHint(false);
  }, [selectedPerson]);
  useEffect(() => {
    if (!selected || loading || !formHeadingRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShowFormHint(false),
      { threshold: 0.5 },
    );
    observer.observe(formHeadingRef.current);
    return () => observer.disconnect();
  }, [selected, loading]);

  const dayState = (key) => {
    const blocks = availability.filter(
      (item) => item.block_date === key && selectedIds.includes(item.user_id),
    );
    const scheduled = approved.some(
      (item) => item.meetup_date === key && involves(item, selectedIds),
    );
    if (blocks.some((item) => item.all_day)) return "offline";
    if (scheduled) return "scheduled";
    if (blocks.length) return "partial";
    return "open";
  };

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      if (!selectedPerson) throw new Error("Choose a crew member first.");
      if (!selected || ["offline", "scheduled"].includes(dayState(selected)))
        throw new Error("Please select an open day.");
      const start = minutes(form.get("time"));
      const end = start + Number(form.get("duration")) * 60;
      if (end > 24 * 60)
        throw new Error("Choose a start time that ends before midnight.");
      const overlap = availability.some(
        (item) =>
          item.block_date === selected &&
          selectedIds.includes(item.user_id) &&
          (item.all_day ||
            (start < minutes(item.end_time) && end > minutes(item.start_time))),
      );
      if (overlap)
        throw new Error(
          "That time overlaps unavailable hours. Choose another time.",
        );
      const blocked = await restrictionMessage(user.id, "meetups");
      if (blocked) throw new Error(blocked);
      const result = await createMeetup(user.id, {
        with_user_id: selectedPerson,
        meetup_date: selected,
        start_time: form.get("time"),
        duration: Number(form.get("duration")),
        message: String(form.get("message") || "").trim(),
        vrc_username: String(form.get("vrc")).trim(),
        meetup_type: form.get("type"),
        additional_participants: String(form.get("participants") || "").trim(),
        time_flexibility: form.get("flexibility"),
      });
      setMessage(
        captainApprovalRequired
          ? "Invitation sent. After the Captain accepts, they can give final approval."
          : `Invitation sent. The meetup will be confirmed when ${selectedProfile?.username || "they"} accepts.`,
      );
      setSelected(null);
      await reloadAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(item) {
    if (
      !(await confirmInApp("This meetup request will be removed.", {
        title: "Cancel meetup request?",
        confirmLabel: "Cancel request",
      }))
    )
      return;
    await cancelMeetup(item.id, user.id);
    setMessage("Your meetup request was removed.");
    await reloadAll();
  }

  async function respond(item, response) {
    setBusy(true);
    try {
      await respondToMeetup(item.id, response);
      setMessage(
        response === "accepted"
          ? "Invitation accepted. It is ready for Captain approval."
          : "Invitation declined.",
      );
      await reloadAll();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  const firstDay = currentMonth.getDay();
  const days = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="page meetup-page">
      <PageHeader
        eyebrow="Meetup calendar"
        title="Plan time together"
        description={`Choose a crew member, compare availability, and send an invitation. Times use Mountain Time and are also shown in your local zone (${localTimeZoneName()}).`}
        action={
          <div className="header-actions">
            <button
              className="button secondary"
              onClick={() => setAvailabilityOpen(true)}
            >
              <CalendarOff /> Configure off days
            </button>
            <button
              className="icon-button refresh-button"
              title="Refresh meetups"
              onClick={reloadAll}
            >
              <RefreshCw />
            </button>
          </div>
        }
      />
      {message && <p className="form-message meetup-message">{message}</p>}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={String(error)} retry={reloadAll} />
      ) : (
        <>
          <section className="panel meetup-person-picker">
            <div>
              <span className="eyebrow">Step 1</span>
              <h2>Who are you meeting?</h2>
              <p>The calendar changes to show both people’s availability.</p>
            </div>
            <Field label="Crew member">
              <select
                value={selectedPerson}
                onChange={(event) => setSelectedPerson(event.target.value)}
              >
                <option value="">Choose someone…</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.username} · {person.rank || "Crew"}
                  </option>
                ))}
              </select>
            </Field>
          </section>
          <section className="panel calendar-card">
            <header>
              <button
                className="icon-button"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronLeft />
              </button>
              <h2>
                {currentMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                className="icon-button"
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      1,
                    ),
                  )
                }
              >
                <ChevronRight />
              </button>
            </header>
            <div className="calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {cells.map((day, index) => {
                if (!day)
                  return (
                    <span
                      className="calendar-day empty"
                      key={`empty-${index}`}
                    />
                  );
                const date = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day,
                );
                const key = dateKey(date);
                const state = dayState(key);
                const past = date < today;
                const disabled =
                  past ||
                  !selectedPerson ||
                  state === "offline" ||
                  state === "scheduled";
                const labels = {
                  offline: "Offline",
                  partial: "Partly off",
                  scheduled: "Meetup set",
                  open: "Open",
                };
                return (
                  <button
                    key={key}
                    disabled={disabled}
                    aria-label={`${key}: ${past ? "Unavailable" : labels[state]}`}
                    className={`calendar-day ${state} ${selected === key ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(key);
                      setShowFormHint(true);
                    }}
                  >
                    <strong>{day}</strong>
                    {!past && selectedPerson && <span>{labels[state]}</span>}
                  </button>
                );
              })}
            </div>
            <div className="calendar-color-legend">
              <span className="open">Open</span>
              <span className="offline">Offline all day</span>
              <span className="partial">Some hours offline</span>
              <span className="scheduled">Already has a meetup</span>
            </div>
            {!selectedPerson && (
              <p className="calendar-prompt">
                Choose a crew member to open the calendar.
              </p>
            )}
          </section>
          {selected && showFormHint && (
            <button
              type="button"
              className="meetup-form-hint"
              onClick={() =>
                formHeadingRef.current?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                  block: "start",
                })
              }
            >
              <ArrowDown />
              <span>Scroll down to finish your meetup request</span>
            </button>
          )}
          <section className="my-meetups-section">
            <h2 className="section-title">My Meetups & Invitations</h2>
            {myMeetups.length ? (
              <div className="timeline">
                {myMeetups.map((item) => {
                  const invited = item.with_user_id === user.id;
                  const otherId = invited ? item.user_id : item.with_user_id;
                  return (
                    <article
                      className="panel meetup-card meetup-request-details"
                      key={item.id}
                    >
                      <div className="date-tile">
                        <strong>
                          {new Date(`${item.meetup_date}T12:00:00`).getDate()}
                        </strong>
                        <span>
                          {new Date(
                            `${item.meetup_date}T12:00:00`,
                          ).toLocaleDateString(undefined, { month: "short" })}
                        </span>
                      </div>
                      <div>
                        <div className="card-meta">
                          <span className={`status ${item.status}`}>
                            {item.status}
                          </span>
                          <span>
                            {item.start_time?.slice(0, 5)} · {item.duration}h
                          </span>
                        </div>
                        <h3>
                          {invited ? "Invitation from" : "Meetup with"}{" "}
                          {personName(profiles, otherId)}
                        </h3>
                        <p>
                          {item.meetup_type || "VRChat meetup"} ·{" "}
                          {item.message || "No notes."}
                        </p>
                        <p className="meetup-local-time">
                          Your time:{" "}
                          {formatMeetupLocal(item.meetup_date, item.start_time)}
                        </p>
                        {item.with_user_id && (
                          <small>Invitation: {item.invitee_status}</small>
                        )}
                        {invited &&
                          item.status === "pending" &&
                          item.invitee_status === "pending" && (
                            <div className="button-row">
                              <button
                                className="button primary"
                                disabled={busy}
                                onClick={() => respond(item, "accepted")}
                              >
                                <Check /> Accept
                              </button>
                              <button
                                className="button danger"
                                disabled={busy}
                                onClick={() => respond(item, "declined")}
                              >
                                <X /> Decline
                              </button>
                            </div>
                          )}
                        {!invited && item.status === "pending" && (
                          <button
                            className="button danger compact-button"
                            onClick={() => cancel(item)}
                          >
                            Cancel request
                          </button>
                        )}
                        {item.status === "denied" && item.admin_reason && (
                          <p className="meetup-denial">{item.admin_reason}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty
                title="No meetups yet"
                body="Choose a crew member and an open day to send an invitation."
              />
            )}
          </section>
          {selected && (
            <form className="panel meetup-request-form" onSubmit={submit}>
              <div className="meetup-form-heading" ref={formHeadingRef}>
                <span>📅</span>
                <div>
                  <h2>Invite {personName(profiles, selectedPerson)}</h2>
                  <p>
                    {new Date(`${selected}T12:00:00`).toLocaleDateString(
                      undefined,
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
              {selectedBlocks.length > 0 && (
                <div className="meetup-off-hours">
                  <strong>Unavailable times that day</strong>
                  {selectedBlocks.map((item) => (
                    <span key={item.id}>
                      {personName(profiles, item.user_id)}:{" "}
                      {item.all_day
                        ? "all day"
                        : `${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)}`}
                    </span>
                  ))}
                </div>
              )}
              <section>
                <h3>Meetup time</h3>
                <div className="form-grid">
                  <Field label="Preferred start time">
                    <input
                      name="time"
                      type="time"
                      min="08:00"
                      max="23:00"
                      required
                    />
                  </Field>
                  <Field label="Duration">
                    <select name="duration" defaultValue="1">
                      {[1, 2, 3, 4, 5].map((hours) => (
                        <option key={hours} value={hours}>
                          {hours} {hours === 1 ? "hour" : "hours"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </section>
              <section>
                <h3>VRChat details</h3>
                <div className="form-grid">
                  <Field label="Your VRChat username">
                    <input
                      name="vrc"
                      defaultValue={profile?.vrchat || ""}
                      required
                    />
                  </Field>
                  <Field label="Meetup type">
                    <select name="type" defaultValue="" required>
                      <option value="" disabled>
                        Choose a meetup type…
                      </option>
                      <option>Gaming</option>
                      <option>World Exploration</option>
                      <option>Hanging Out / Chatting</option>
                      <option>Watching Something</option>
                      <option>Working on a Project</option>
                      <option>Other</option>
                    </select>
                  </Field>
                </div>
              </section>
              <section>
                <h3>Details</h3>
                <Field label="Additional participant usernames" hint="Optional">
                  <textarea name="participants" rows="3" />
                </Field>
                <Field label="Scheduling flexibility">
                  <select name="flexibility" defaultValue="exact">
                    <option value="exact">Exact time only</option>
                    <option value="30">±30 minutes is okay</option>
                    <option value="60">±1 hour is okay</option>
                  </select>
                </Field>
                <Field label="Message" hint="Optional">
                  <textarea name="message" rows="4" />
                </Field>
              </section>
              <div className="meetup-warning">
                <strong>What happens next</strong>
                <p>
                  {personName(profiles, selectedPerson)} receives an invitation.{" "}
                  {captainApprovalRequired
                    ? "Because this request includes the Captain, they also have the final approval."
                    : "When they accept, the meetup is confirmed automatically—Captain approval is not needed."}
                </p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy ? "Sending…" : "Send meetup invitation"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {availabilityOpen && (
        <AvailabilityModal
          user={user}
          rows={availability}
          onClose={() => setAvailabilityOpen(false)}
          onSaved={availabilityLoader.reload}
        />
      )}
    </div>
  );
}
