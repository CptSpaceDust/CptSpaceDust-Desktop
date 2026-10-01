const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("group messaging uses the website tables and voice-call context", () => {
  const data = read("src", "renderer", "lib", "data.js");
  const page = read("src", "renderer", "pages", "MessagesPageV2.jsx");
  for (const table of ["group_conversations", "group_members", "group_messages"]) assert.match(data, new RegExp(`from\\(\\"${table}\\"\\)`));
  assert.match(data, /create_group_chat/);
  assert.match(data, /leave_group_chat/);
  assert.match(page, /Group Messages/);
  assert.match(page, /group_conversation_id/);
  assert.match(page, /groupId: contextId/);
});

test("packaged app is wired to publish and consume GitHub releases", () => {
  const pkg = JSON.parse(read("package.json"));
  const main = read("src", "main.js");
  const workflow = read(".github", "workflows", "release.yml");
  assert.equal(pkg.dependencies["electron-updater"], "6.8.9");
  assert.deepEqual(pkg.build.publish[0], { provider: "github", owner: "CptSpaceDust", repo: "CptSpaceDust-Desktop", releaseType: "release" });
  assert.match(main, /checkForUpdates/);
  assert.match(main, /quitAndInstall/);
  assert.match(workflow, /--publish never/);
  assert.match(workflow, /gh release upload/);
  assert.match(workflow, /dist\/latest\.yml/);
});
