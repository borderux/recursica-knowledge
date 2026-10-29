// Authenticator codes (TOTP, RFC 6238): the 6-digit codes an authenticator app shows, which change
// every 30 seconds. Built on node:crypto only.
import crypto from "node:crypto";
import fs from "node:fs";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, value = 0; const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("not base32");
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export function totp(secret, timeMs = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(timeMs / 1000 / step);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, "0");
}

// Accept the code for now, the step before, or the step after (clock drift), compared in
// constant time.
export function verify(secret, code, timeMs = Date.now()) {
  const given = String(code ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(given)) return false;
  let ok = false;
  for (const d of [-1, 0, 1]) {
    const want = totp(secret, timeMs + d * 30_000);
    if (crypto.timingSafeEqual(Buffer.from(want), Buffer.from(given))) ok = true;
  }
  return ok;
}

export function newSecret() { return base32Encode(crypto.randomBytes(20)); }

export function otpauthUri(secret, account, issuer = "Agent cluster") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

// Three wrong codes from one person lock the two-factor buttons for an hour.
export class Lockout {
  constructor(file, limit = 3, windowMs = 3600_000) { this.file = file; this.limit = limit; this.windowMs = windowMs; }
  read() { try { return JSON.parse(fs.readFileSync(this.file, "utf8")); } catch { return {}; } }
  write(s) { fs.writeFileSync(this.file, JSON.stringify(s), { mode: 0o600 }); }
  locked(user, now = Date.now()) {
    const u = this.read()[user];
    return Boolean(u?.until && u.until > now);
  }
  fail(user, now = Date.now()) {
    const s = this.read();
    const u = s[user] ?? { fails: [] };
    u.fails = u.fails.filter((t) => now - t < this.windowMs).concat(now);
    if (u.fails.length >= this.limit) { u.until = now + this.windowMs; u.fails = []; }
    s[user] = u; this.write(s);
    return Boolean(u.until && u.until > now);
  }
  succeed(user) { const s = this.read(); delete s[user]; this.write(s); }
}
