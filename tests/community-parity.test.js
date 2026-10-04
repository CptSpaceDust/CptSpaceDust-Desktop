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
  assert.match(
    auth,
    /Authorization:\s*`Bearer \$\{result\.data\.session\.access_token\}`/,
  );
  assert.match(data, /error\?\.context\?\.json/);
  assert.match(data, /manage-support-subscription/);
});
