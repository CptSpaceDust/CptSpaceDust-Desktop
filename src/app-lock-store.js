const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SETTINGS = Object.freeze({ enabled: false, timeoutMinutes: 5, salt: "", pinHash: "" });

function normalizeSettings(value = {}) {
  const timeout = Number(value.timeoutMinutes);
  return {
    enabled: Boolean(value.enabled && value.salt && value.pinHash),
    timeoutMinutes: [1, 5, 15, 30].includes(timeout) ? timeout : 5,
    salt: typeof value.salt === "string" ? value.salt : "",
    pinHash: typeof value.pinHash === "string" ? value.pinHash : ""
  };
}

function validPin(pin) { return /^\d{4,8}$/.test(String(pin || "")); }
function hashPin(pin, salt) { return crypto.scryptSync(String(pin), salt, 64).toString("hex"); }
function safeEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

class AppLockStore {
  constructor(filePath) { this.filePath = filePath; this.settings = this.read(); }
  read() {
    try { return normalizeSettings(JSON.parse(fs.readFileSync(this.filePath, "utf8"))); }
    catch { return { ...DEFAULT_SETTINGS }; }
  }
  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(this.settings, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporaryPath, this.filePath);
  }
  publicSettings() { return { enabled: this.settings.enabled, timeoutMinutes: this.settings.timeoutMinutes }; }
  verify(pin) {
    if (!this.settings.enabled) return true;
    return validPin(pin) && safeEqual(hashPin(pin, this.settings.salt), this.settings.pinHash);
  }
  setPin(pin, currentPin = "") {
    if (!validPin(pin)) return { ok: false, error: "Choose a PIN containing 4 to 8 digits." };
    if (this.settings.enabled && !this.verify(currentPin)) return { ok: false, error: "The current PIN is incorrect." };
    const salt = crypto.randomBytes(24).toString("hex");
    this.settings = { ...this.settings, enabled: true, salt, pinHash: hashPin(pin, salt) };
    this.save();
    return { ok: true, settings: this.publicSettings() };
  }
  disable(pin) {
    if (this.settings.enabled && !this.verify(pin)) return { ok: false, error: "The current PIN is incorrect." };
    this.settings = { ...this.settings, enabled: false, salt: "", pinHash: "" };
    this.save();
    return { ok: true, settings: this.publicSettings() };
  }
  setTimeoutMinutes(timeoutMinutes) {
    const timeout = Number(timeoutMinutes);
    if (![1, 5, 15, 30].includes(timeout)) return { ok: false, error: "Choose a supported lock timeout." };
    this.settings.timeoutMinutes = timeout;
    this.save();
    return { ok: true, settings: this.publicSettings() };
  }
}

module.exports = { AppLockStore, validPin, hashPin, normalizeSettings };
