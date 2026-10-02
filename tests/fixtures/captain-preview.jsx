import React from "react";
import { createRoot } from "react-dom/client";
import CaptainControls from "../../src/renderer/components/CaptainControls";
import { UpdateVisual } from "../../src/renderer/components/UpdateVisual";
import "../../src/renderer/styles.css";
import "../../src/renderer/captain-shared.css";
import "../../src/renderer/captain.css";
import "../../src/renderer/captain-desktop.css";

const data = {
  crew: [{ id: "captain", username: "CptSpaceDust" }, { id: "nova", username: "Nova" }, { id: "luna", username: "Luna" }],
  meetups: [{ id: "meetup", user_id: "nova", meetup_date: "2026-10-04", start_time: "18:30:00", duration: 2, message: "Let's catch up with the crew!", status: "pending" }, { id: "scheduled", user_id: "luna", meetup_date: "2026-10-08", start_time: "17:00:00", duration: 1, message: "Community game night", status: "approved" }],
  friends: [{ id: "friend", name: "Nova", category: "fully", position: 1 }, { id: "friend2", name: "Luna", category: "semi", position: 2 }],
  artists: [{ id: "artist", name: "Starfield Sessions", is_favorite: true, display_order: 0, youtube_channel_id: "demo" }],
  songs: [{ id: "song", name: "A Journey Beyond", artist_id: "artist", display_order: 0 }],
  genres: [{ id: "genre", name: "Electronic", display_order: 0 }, { id: "genre2", name: "Ambient", display_order: 1 }],
  restrictions: [{ user_id: "nova", action: "messaging", expires_at: "2026-10-09T20:00:00Z" }],
  direct: [{ id: "conversation", user_one: "nova", user_two: "luna", updated_at: "2026-10-02T00:00:00Z" }],
  groups: [{ id: "group", name: "Crew Lounge", updated_at: "2026-10-02T00:00:00Z" }],
  flags: [{ id: "flag", sender_id: "nova", message_kind: "direct", conversation_id: "conversation", categories: ["personal information"], message_content: "Example message awaiting Captain review.", status: "open", detected_at: "2026-10-02T00:00:00Z" }],
  settings: { safe_mode: false },
};
const run = async () => true;
createRoot(document.getElementById("root")).render(<><CaptainControls data={data} user={{ id: "captain" }} run={run} onNotice={() => {}} onRefresh={() => {}} /><div style={{ maxWidth: 400, margin: "30px auto" }}><UpdateVisual update={{ status: "downloading", availableVersion: "1.2.2", percent: 64 }} /></div></>);
