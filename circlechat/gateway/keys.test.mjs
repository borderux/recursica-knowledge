import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { DRILL_MAX_MINUTES, ENDED, REGISTRY, checkKey, drillKey, issue, liveKeys, loadKeys, makeTaskKey, readTaskKey, recordKey, revoke, revokeKey, revokeTask, startGrace, taskKey, taskKeyState, taskSecret, verify, writeState } from "./keys.mjs";

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
  const who = verify(k, loadKeys(d), secret);
  assert.deepEqual([who.agent, who.task, who.v, who.kind], ["porter", "tk_123", 2, null]);
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

const H = 3_600_000, T0 = 1_800_000_000_000;
const porterDir = () => { const d = dir(); issue(d, "porter"); return { d, secret: taskSecret(d) }; };
const check = (k, d, secret, state = {}) => checkKey(k, loadKeys(d), secret, { now: T0, ...state });

test("a task key lasts 4 hours, never past the job's limit, and names the job's limit", () => {
  const { d, secret } = porterDir();
  const m = makeTaskKey(secret, loadKeys(d), "porter", "tk_1", { now: T0 });
  assert.equal(m.expiresAt, T0 + 4 * H);
  assert.equal(m.limitAt, T0 + 96 * H);
  assert.match(m.id, /^[0-9a-f]{16}$/);
  assert.deepEqual([readTaskKey(m.key).exp, readTaskKey(m.key).lim], [(T0 + 4 * H) / 1000, (T0 + 96 * H) / 1000]);
  assert.ok(check(m.key, d, secret, { now: T0 + 4 * H - 1000 }).who);
  assert.equal(check(m.key, d, secret, { now: T0 + 4 * H }).error, "key_expired");
  // A renewal near the limit ends at the limit.
  const late = makeTaskKey(secret, loadKeys(d), "porter", "tk_1", { now: T0 + 94 * H, limitAt: m.limitAt, id: m.id });
  assert.deepEqual([late.expiresAt, late.id], [m.limitAt, m.id]);
});

test("revoking one key ends the key's renewals, and revoking a task ends only the task's keys so far", () => {
  const { d, secret } = porterDir();
  const a = makeTaskKey(secret, loadKeys(d), "porter", "tk_a", { now: T0 });
  const renewed = makeTaskKey(secret, loadKeys(d), "porter", "tk_a", { now: T0 + H, limitAt: a.limitAt, id: a.id });
  const b = makeTaskKey(secret, loadKeys(d), "porter", "tk_b", { now: T0 });
  revokeKey(d, a.id, T0 + 2 * H);
  const st = { ...taskKeyState(d), now: T0 + 2 * H };
  assert.equal(checkKey(a.key, loadKeys(d), secret, st).error, "key_revoked");
  assert.equal(checkKey(renewed.key, loadKeys(d), secret, st).error, "key_revoked");
  assert.ok(checkKey(b.key, loadKeys(d), secret, st).who, "another task's key still works");
  revokeTask(d, "tk_b", T0 + 2 * H);
  const st2 = { ...taskKeyState(d), now: T0 + 2 * H };
  assert.equal(checkKey(b.key, loadKeys(d), secret, st2).error, "key_revoked");
  const after = makeTaskKey(secret, loadKeys(d), "porter", "tk_b", { now: T0 + 3 * H });
  assert.ok(checkKey(after.key, loadKeys(d), secret, { ...st2, now: T0 + 3 * H }).who, "a key made after the revoke works");
  const barb = issue(d, "barb");
  assert.deepEqual(verify(barb, loadKeys(d), ""), { agent: "barb", task: null }, "agent keys are untouched");
});

test("a closed task's keys end, and a drill key, which has no real task, does not depend on tasks", () => {
  const { d, secret } = porterDir();
  const k = taskKey(secret, loadKeys(d), "porter", "tk_done", { now: T0 });
  writeState(d, ENDED, { tk_done: new Date(T0).toISOString() });
  assert.equal(checkKey(k, loadKeys(d), secret, { ...taskKeyState(d), now: T0 }).error, "task_closed");
  const drill = drillKey(d, "porter", "node-a", 15, T0);
  assert.equal(drill.kind, "drill");
  assert.equal(drill.expiresAt, T0 + 15 * 60_000);
  assert.match(drill.task, /^drill-node-a-\d+$/);
  assert.equal(check(drill.key, d, secret).who.kind, "drill");
  assert.equal(check(drill.key, d, secret, { now: T0 + 15 * 60_000 }).error, "key_expired");
  assert.equal(drillKey(d, "porter", "node-a", DRILL_MAX_MINUTES, T0).expiresAt, T0 + 4 * H);
  assert.throws(() => drillKey(d, "porter", "node-a", DRILL_MAX_MINUTES + 1, T0), /1 to 240 minutes/);
  assert.throws(() => drillKey(d, "porter", "../x", 15, T0), /not a node name/);
});

test("a key from before the upgrade works only until the grace time", () => {
  const { d, secret } = porterDir();
  const payload = Buffer.from(JSON.stringify({ a: "porter", t: "tk_old" })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${payload}.${loadKeys(d).porter.sha256}`).digest("base64url");
  const v1 = `cct_${payload}.${sig}`;
  assert.equal(check(v1, d, secret).error, "key_expired", "no grace time: no old key");
  assert.equal(startGrace(d, T0), T0 + 4 * H);
  assert.equal(startGrace(d, T0 + H), T0 + 4 * H, "the grace time is set once");
  assert.equal(checkKey(v1, loadKeys(d), secret, { ...taskKeyState(d), now: T0 + H }).who.v, 1);
  assert.equal(checkKey(v1, loadKeys(d), secret, { ...taskKeyState(d), now: T0 + 4 * H }).error, "key_expired");
});

test("the router's record lists live keys, drops old ones, and every state file is the owner's only", () => {
  const { d, secret } = porterDir();
  startGrace(d, T0);
  const m = makeTaskKey(secret, loadKeys(d), "porter", "tk_1", { now: T0 });
  recordKey(d, m, "porter", T0);
  assert.deepEqual(liveKeys(d, T0 + H).map((k) => [k.id, k.agent, k.task]), [[m.id, "porter", "tk_1"]]);
  assert.deepEqual(liveKeys(d, T0 + 5 * H), []);
  recordKey(d, makeTaskKey(secret, loadKeys(d), "porter", "tk_2", { now: T0 + 30 * H }), "porter", T0 + 30 * H);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(path.join(d, REGISTRY), "utf8")).keys).length, 1, "a key that ended a day ago is dropped");
  revokeTask(d, "tk_1", T0);
  for (const f of fs.readdirSync(d)) if (f.endsWith(".json")) assert.equal(fs.statSync(path.join(d, f)).mode & 0o077, 0, f);
});

test("keys.mjs prints a drill key as JSON and refuses a key id it cannot use", () => {
  const { d } = porterDir();
  const cli = (...a) => spawnSync(process.execPath, [new URL("./keys.mjs", import.meta.url).pathname, ...a], { encoding: "utf8" });
  const r = cli("drill", d, "porter", "node-a");
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.match(j.key, /^cct_/);
  assert.match(j.task, /^drill-node-a-/);
  assert.ok(Date.parse(j.expires_at) - Date.now() <= 15 * 60_000);
  assert.equal(cli("drill", d, "porter", "node-a", "241").status, 2);
  assert.equal(cli("revoke-key", d, "not-an-id").status, 2);
  assert.equal(cli("revoke-key", d, j.id).status, 0);
  assert.equal(cli("tasks", d).stdout.trim(), "No task key is live.");
});
