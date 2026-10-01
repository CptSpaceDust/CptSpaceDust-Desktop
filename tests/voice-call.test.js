const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("desktop voice calls include screen sharing and full room controls", () => {
  const main = read("src", "main.js");
  const preload = read("src", "preload.js");
  const page = read("src", "renderer", "pages", "MessagesPageV2.jsx");
  assert.match(main, /setDisplayMediaRequestHandler/);
  assert.match(main, /desktopCapturer\.getSources/);
  assert.match(main, /audio: "loopback"/);
  assert.match(preload, /screen-share:list-sources/);
  assert.match(page, /setScreenShareEnabled\(true/);
  assert.match(page, /systemAudio: "include"/);
  assert.match(page, /RoomEvent\.ActiveSpeakersChanged/);
  assert.match(page, /RoomEvent\.AudioPlaybackStatusChanged/);
  assert.match(page, /ScreenShareTile/);
  assert.match(page, /playCallTone\("join"\)/);
  assert.match(page, /playCallTone\("leave"\)/);
});

test("sidebar branding is reduced to the website name", () => {
  const sidebar = read("src", "renderer", "components", "Sidebar.jsx");
  assert.match(sidebar, /<strong>CptSpaceDust<\/strong>/);
  assert.doesNotMatch(sidebar, /Community Desktop/);
  assert.doesNotMatch(sidebar, /<Rocket/);
});
