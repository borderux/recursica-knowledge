import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { issue, loadKeys, revoke, taskKey, taskSecret, verify } from "./keys.mjs";

const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gwkeys-"));

test("an agent key belongs to one agent, and the gateway keeps only its hash", () => {
  const d = dir();
  const betty = issue(d, "betty");
  const barb = issue(d, "barb");
  assert.match(betty, /^ccg_[0-9a-f]{48}$/);
  assert.doesNotMatch(fs.readFileSync(path.join(d, "agent-keys.json"), "utf8"), new RegExp(betty));
  assert.deepEqual(verify(betty, loadKeys(d), ""), { agent: "betty", task: null });
  assert.deepEqual(verify(barb, loadKeys(d), ""), { agent: "barb", task: null });
  assert.equal(verify("ccg_" + "0".repeat(48), loadKeys(d), ""), null);
  assert.throws(() => issue(d, "Not A Handle"));
});

test("a task key names its agent and task, and ends with the agent's key", () => {
  const d = dir();
  issue(d, "porter");
  const secret = taskSecret(d);
  assert.equal(taskSecret(d), secret, "the signing secret is made once");
  const k = taskKey(secret, loadKeys(d), "porter", "tk_123");
  assert.deepEqual(verify(k, loadKeys(d), secret), { agent: "porter", task: "tk_123" });
  // A changed task in the key breaks the signature.
  const [, sig] = k.split(".");
  const forged = `cct_${Buffer.from(JSON.stringify({ a: "porter", t: "tk_999" })).toString("base64url")}.${sig}`;
  assert.equal(verify(forged, loadKeys(d), secret), null);
  // A new agent key, or a revoke, ends the agent's task keys.
  issue(d, "porter");
  assert.equal(verify(k, loadKeys(d), secret), null);
  const k2 = taskKey(secret, loadKeys(d), "porter", "tk_123");
  assert.equal(revoke(d, "porter"), true);
  assert.equal(verify(k2, loadKeys(d), secret), null);
});

test("revoking one agent's key leaves the other agents' keys working", () => {
  const d = dir();
  const a = issue(d, "betty"), b = issue(d, "barb");
  revoke(d, "betty");
  assert.equal(verify(a, loadKeys(d), ""), null);
  assert.deepEqual(verify(b, loadKeys(d), ""), { agent: "barb", task: null });
});
