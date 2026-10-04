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
  assert.match(settings, /Appearance & accessibility/);
  assert.match(settings, /Calls & audio/);
  assert.match(settings, /Send test notification/);
  assert.doesNotMatch(settings, /Show Mayu on loading screens/);
  assert.doesNotMatch(settings, /<h2>Messages<\/h2>/);
  assert.match(preferences, /glassIntensity/);
  assert.match(preferences, /enterToSend/);
  assert.match(preferences, /audioInputDeviceId/);
  assert.match(preferences, /desktopNotifications/);
  assert.match(mayuLoader, /mayu-walk-6\.png/);
  assert.match(mayuLoader, /src=\{walkFrames\[frame\]\}/);
  assert.doesNotMatch(mayuLoader, /backgroundImage/);
  assert.match(messages, /Search messages/);
  assert.match(profile, /Report a concern/);
});

test("notifications stay synchronized and app flows avoid native popups", () => {
  const app = read("src", "renderer", "App.jsx");
  const notifications = read(
    "src",
    "renderer",
    "pages",
    "NotificationsPage.jsx",
  );
  const community = read("src", "renderer", "pages", "CommunityPagesV2.jsx");
  const enhanced = read(
    "src",
    "renderer",
    "pages",
    "EnhancedCommunityPages.jsx",
  );
  const messages = read("src", "renderer", "pages", "MessagesPageV2.jsx");
  const dialog = read("src", "renderer", "components", "InAppDialog.jsx");
  const combined = [notifications, community, enhanced, messages].join("\n");

  assert.match(app, /notifications-changed/);
  assert.match(notifications, /notifications-changed/);
  assert.doesNotMatch(app, /setUnread\(0\)/);
  assert.doesNotMatch(combined, /\b(?:alert|confirm|prompt)\s*\(/);
  assert.match(combined, /confirmInApp/);
  assert.match(dialog, /<Modal/);
});

test("closing the desktop window keeps realtime notifications running in the tray", () => {
  const main = read("src", "main.js");
  const settings = read("src", "renderer", "components", "AppSettings.jsx");

  assert.match(main, /new Tray\(ICON_PATH\)/);
  assert.match(main, /label: "Open CptSpaceDust"/);
  assert.match(main, /label: "Quit CptSpaceDust"/);
  assert.match(main, /mainWindow\.on\("close", \(event\) =>/);
  assert.match(
    main,
    /event\.preventDefault\(\);\s+lockApp\(\);\s+mainWindow\.hide\(\);/,
  );
  assert.match(main, /backgroundThrottling: false/);
  assert.match(main, /app\.on\("before-quit"/);
  assert.doesNotMatch(main, /window-all-closed", \(\) => app\.quit/);
  assert.match(settings, /Windows\s+notification area/);
});

test("community meetup times convert into a real instant", async () => {
  const { communityDateTime } = await import("../src/renderer/lib/time.js");
  const winter = communityDateTime("2026-01-10", "12:00");
  const summer = communityDateTime("2026-07-10", "12:00");
  assert.equal(winter.toISOString(), "2026-01-10T19:00:00.000Z");
  assert.equal(summer.toISOString(), "2026-07-10T18:00:00.000Z");
});
