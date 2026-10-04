import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../src/renderer/", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("sidebar matches the requested website community layout", () => {
  const source = read("components/Sidebar.jsx");
  const labels = [
    "Guidelines",
    "Introductions",
    "Crew Directory",
    "Birthdays",
    "Collab Board",
    "Ideas Board",
  ];
  let previous = -1;
  for (const label of labels) {
    const index = source.indexOf(`\"${label}\"`);
    assert.ok(index > previous, `${label} should appear in order`);
    previous = index;
  }
  assert.doesNotMatch(source, /\[\"messages\",\"Messages\"/);
  assert.doesNotMatch(source, /\[\"notifications\",\"Notifications\"/);
});

test("community parity controls are wired", () => {
  const app = read("App.jsx");
  const pages = read("pages/CommunityPagesV2.jsx");
  const messages = read("pages/MessagesPageV2.jsx");
  const notifications = read("pages/NotificationsPage.jsx");
  assert.match(app, /title=\"Messages\"/);
  assert.doesNotMatch(app, /Live community uplink/);
  assert.match(pages, /Refresh introductions/);
  assert.match(pages, /Refresh ideas/);
  assert.match(pages, /Refresh collaborations/);
  assert.match(messages, /Request to DM/);
  assert.match(notifications, /Clear All/);
});

test("desktop login alerts and support errors mirror the website", () => {
  const auth = read("components/AuthScreen.jsx");
  const data = read("lib/data.js");
  assert.match(auth, /send_login_alert:\s*true/);
  assert.match(auth, /Use your CptSpaceDust account/);
  assert.doesNotMatch(auth, /Create account|signUp\(/);
  assert.match(
    auth,
    /Authorization:\s*`Bearer \$\{result\.data\.session\.access_token\}`/,
  );
  assert.match(data, /error\?\.context\?\.json/);
  assert.match(data, /manage-support-subscription/);
});

test("person-to-person meetup planning includes availability and captain reports", () => {
  const app = read("App.jsx");
  const meetups = read("pages/MeetupsPage.jsx");
  const captain = read("components/CaptainControls.jsx");
  const settings = read("components/AppSettings.jsx");
  assert.match(app, /startupMinimumElapsed/);
  assert.match(meetups, /Who are you meeting\?/);
  assert.match(meetups, /Configure off days/);
  assert.match(meetups, /Offline all day/);
  assert.match(meetups, /Some hours offline/);
  assert.match(meetups, /Already has a meetup/);
  assert.match(meetups, /respondToMeetup/);
  assert.match(captain, /Member Reports/);
  assert.match(captain, /with_user_id/);
  assert.match(captain, /requiresCaptainApproval/);
  assert.match(meetups, /Captain approval is not needed/);
  assert.match(settings, /Increase text and border contrast/);
  assert.doesNotMatch(settings, /Windows notifications are available/);
});
