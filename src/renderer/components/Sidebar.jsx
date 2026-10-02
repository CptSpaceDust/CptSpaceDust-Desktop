import {
  Cake,
  CalendarDays,
  Heart,
  Lightbulb,
  LockKeyhole,
  LogOut,
  ScrollText,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar } from "./ui";

const groups = [
  {
    label: "Community",
    items: [
      ["guidelines", "Guidelines", ScrollText],
      ["introductions", "Introductions", Sparkles],
      ["crew", "Crew Directory", UserRound],
      ["birthdays", "Birthdays", Cake],
      ["collabs", "Collab Board", Users],
      ["ideas", "Ideas Board", Lightbulb],
    ],
  },
  { label: "Connect", items: [["meetups", "Meetup Calendar", CalendarDays]] },
  { label: "Captain", items: [["support", "Support the Captain", Heart]] },
];

export default function Sidebar({ page, setPage, profile, onLogout, unread }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <strong>CptSpaceDust</strong>
      </div>
      <nav>
        {profile?.rank?.toLowerCase() === "captain" && <button className={page === "captain" ? "nav-item active" : "nav-item"} onClick={() => setPage("captain")}><LockKeyhole /><span>Captain Panel</span></button>}
        {groups.map((group) => (
          <section className="nav-group" key={group.label}>
            <span>{group.label}</span>
            {group.items.map(([id, label, Icon]) => (
              <button
                className={page === id ? "nav-item active" : "nav-item"}
                onClick={() => setPage(id)}
                key={id}
              >
                <Icon />
                <span>{label}</span>
                {id === "notifications" && unread > 0 && (
                  <b>{unread > 99 ? "99+" : unread}</b>
                )}
              </button>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button
          className={
            page === "profile" ? "profile-chip active" : "profile-chip"
          }
          onClick={() => setPage("profile")}
        >
          <Avatar profile={profile} size={40} />
          <span>
            <strong>{profile?.username || "Crew member"}</strong>
            <small>{profile?.rank || "Crew"}</small>
          </span>
          <Settings />
        </button>
        <div className="footer-actions">
          <button onClick={() => setPage("settings")} title="App settings">
            <LockKeyhole />
          </button>
          <button onClick={onLogout} title="Sign out">
            <LogOut />
          </button>
        </div>
      </div>
    </aside>
  );
}
