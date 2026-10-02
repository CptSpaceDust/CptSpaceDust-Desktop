import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import CaptainPage from "../../src/renderer/pages/CaptainPage";
import { CrewPage, MeetupsPage } from "../../src/renderer/pages/EnhancedCommunityPages";
import Sidebar from "../../src/renderer/components/Sidebar";
import { FormattedMessage } from "../../src/renderer/components/MessageComposer";
import "../../src/renderer/styles.css";
const profile = { id: "captain", username: "CptSpaceDust", rank: "Captain" };
function Preview() {
  const [page, setPage] = useState("crew");
  return <div className="app-shell"><Sidebar profile={profile} page={page} setPage={setPage} onLogout={() => {}} /><main className="main-shell">
    <div className="panel" style={{margin:24,padding:16}}>Formatting check: <FormattedMessage>*Italic* ||bold|| **both**</FormattedMessage></div>
    {page === "captain" ? <CaptainPage user={profile} profile={profile} /> : page === "meetups" ? <MeetupsPage user={profile} profile={profile} /> : page === "crew" ? <CrewPage onViewProfile={() => setPage("profile")} /> : <div className="page"><h1>{page === "settings" ? "App settings" : "Profile"}</h1></div>}
  </main></div>;
}
createRoot(document.getElementById("root")).render(<Preview />);
