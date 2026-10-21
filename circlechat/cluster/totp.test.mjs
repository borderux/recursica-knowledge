import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { totp, verify, base32Encode, base32Decode, newSecret, Lockout } from "./totp.mjs";

// RFC 6238, appendix B: the SHA-1 secret "12345678901234567890", 8 digits.
test("matches the RFC 6238 test values", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(totp(secret, 59_000, 30, 8), "94287082");
  assert.equal(totp(secret, 1111111109_000, 30, 8), "07081804");
  assert.equal(totp(secret, 20000000000_000, 30, 8), "65353130");
});

test("base32 round-trips", () => {
  const b = Buffer.from([0, 1, 2, 250, 251, 255, 7]);
  assert.deepEqual(base32Decode(base32Encode(b)), b);
});

test("accepts the current code and one step of drift, refuses others", () => {
  const s = newSecret(), now = 1_800_000_000_000;
  assert.equal(verify(s, totp(s, now), now), true);
  assert.equal(verify(s, totp(s, now - 30_000), now), true);
  assert.equal(verify(s, totp(s, now - 90_000), now), false);
  assert.equal(verify(s, "12345", now), false);
  assert.equal(verify(s, "abcdef", now), false);
});

test("three wrong codes lock the buttons for an hour", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lock-")), "l.json");
  const l = new Lockout(file);
  const t = 1_000_000;
  assert.equal(l.fail("U1", t), false);
  assert.equal(l.fail("U1", t + 1), false);
  assert.equal(l.fail("U1", t + 2), true);
  assert.equal(l.locked("U1", t + 3), true);
  assert.equal(l.locked("U1", t + 3600_003), false);
  assert.equal(l.locked("U2", t), false);
});
