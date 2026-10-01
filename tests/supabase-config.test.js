const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("desktop Supabase key belongs to the configured project", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "lib", "supabase.js"), "utf8");
  const url = source.match(/const supabaseUrl = "https:\/\/([^.]+)\.supabase\.co"/)?.[1];
  const key = source.match(/const supabaseKey = "([^"]+)"/)?.[1];

  assert.ok(url, "Supabase project reference is missing");
  assert.ok(key, "Supabase public key is missing");

  const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
  assert.equal(payload.iss, "supabase");
  assert.equal(payload.ref, url);
  assert.equal(payload.role, "anon");
});
