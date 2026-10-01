const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("direct-message reads match the deployed website schema", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "lib", "data.js"), "utf8");
  const getMessages = source.match(/export async function getMessages[\s\S]*?\n}\n/)?.[0] || "";
  assert.match(getMessages, /reply_to_id,is_reply/);
  assert.doesNotMatch(getMessages, /edited_at/);
  assert.match(getMessages, /5 \* 24 \* 60 \* 60 \* 1000/);
});
