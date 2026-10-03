const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("desktop enhancements cover notifications, drafts, reminders, and privacy", () => {
  const preferences = read("src", "renderer", "lib", "preferences.js");
  const enhancements = read(
    "src",
    "renderer",
    "components",
    "DesktopEnhancements.jsx",
  );
  const settings = read("src", "renderer", "components", "AppSettings.jsx");
  const mayuLoader = read("src", "renderer", "components", "MayuLoader.jsx");
  const messages = read("src", "renderer", "pages", "MessagesPageV2.jsx");
  const profile = read(
    "src",
    "renderer",
    "pages",
    "EnhancedCommunityPages.jsx",
  );

  assert.match(preferences, /quietHours/);
  assert.match(preferences, /mutedConversations/);
  assert.match(preferences, /markAllConversationsRead/);
  assert.match(preferences, /saveDraft/);
  assert.match(settings, /Lock after no activity/);
  assert.match(enhancements, /Meetup starting soon/);
  assert.match(enhancements, /What’s Changed/);
  assert.match(settings, /Appearance & motion/);
  assert.match(settings, /Press Enter to send/);
  assert.match(settings, /Show Mayu on loading screens/);
  assert.match(preferences, /glassIntensity/);
  assert.match(preferences, /enterToSend/);
  assert.match(preferences, /showMayuLoaders/);
  assert.match(mayuLoader, /mayu-walk-6\.png/);
  assert.match(mayuLoader, /src=\{walkFrames\[frame\]\}/);
  assert.doesNotMatch(mayuLoader, /backgroundImage/);
  assert.match(messages, /Search messages/);
  assert.match(profile, /Report a concern/);
});

test("community meetup times convert into a real instant", async () => {
  const { communityDateTime } = await import("../src/renderer/lib/time.js");
  const winter = communityDateTime("2026-01-10", "12:00");
  const summer = communityDateTime("2026-07-10", "12:00");
  assert.equal(winter.toISOString(), "2026-01-10T19:00:00.000Z");
  assert.equal(summer.toISOString(), "2026-07-10T18:00:00.000Z");
});
