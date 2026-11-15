#!/usr/bin/env node
// Gateway keys: what an agent or a job shows the model gateway. A gateway key is not a cloud key:
// the gateway holds the cloud keys, and a gateway key only lets its holder ask the gateway.
//
//   agent key  ccg_<random>, one per agent. setup-agent.sh puts the agent's key in the agent's
//              Hermes home. The gateway keeps only the key's SHA-256 hash, in agent-keys.json.
//   task key   cct_<payload>.<signature>, one per agent and task. Porter gets one from the gateway
//              (POST /task-key) and hands the key to the port job. The signature covers the agent
//              key's hash, so revoking or replacing an agent's key also ends the agent's task keys.
//              A task key ends after TASK_KEY_HOURS, when the key's task closes, or when an admin
//              revokes the key. A running job renews the key (POST /task-key/renew) up to the
//              job's limit, JOB_HOURS after the first key.
//
//   node keys.mjs issue <state dir> <handle>    prints a new key for the agent, and records its hash
//   node keys.mjs keep <state dir> <handle>     reads a key on stdin; records it if it is the agent's key,
//                                               or prints a new key when it is not
//   node keys.mjs revoke <state dir> <handle>   ends the agent's key and every task key the agent holds
//   node keys.mjs tasks <state dir> [handle]    lists the task keys that have not ended: id, agent, task, end
//   node keys.mjs revoke-task <state dir> <task id>   ends every key the task has so far, and nothing else
//   node keys.mjs revoke-key <state dir> <key id>     ends one task key, with every renewal of the key
//   node keys.mjs drill <state dir> <handle> <node> [minutes]
//                                               prints a drill key for check-job.sh as JSON: a key for a
//                                               check job only, which ends after 15 minutes (240 at most)
// Run each command with sudo: only root reads the state folder (setup-host.sh).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const HANDLE = /^[a-z0-9][a-z0-9._-]{0,39}$/;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const b64 = (s) => Buffer.from(s).toString("base64url");

export function loadKeys(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, "agent-keys.json"), "utf8")); } catch { return {}; }
}
function saveKeys(dir, keys) {
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, "agent-keys.json");
  fs.writeFileSync(`${f}.tmp`, JSON.stringify(keys, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(`${f}.tmp`, f);
}

// The secret that signs task keys. Made once per stack, kept beside agent-keys.json.
export function taskSecret(dir) {
  const f = path.join(dir, "task-key.secret");
  if (!fs.existsSync(f)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, crypto.randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
  }
  return fs.readFileSync(f, "utf8").trim();
}

export function issue(dir, handle) {
  if (!HANDLE.test(handle)) throw new Error(`"${handle}" is not an agent handle`);
  const key = `ccg_${crypto.randomBytes(24).toString("hex")}`;
  const keys = loadKeys(dir);
  keys[handle] = { sha256: sha256(key), issued: new Date().toISOString() };
  saveKeys(dir, keys);
  return key;
}

export function revoke(dir, handle) {
  const keys = loadKeys(dir);
  const had = Boolean(keys[handle]);
  delete keys[handle];
  saveKeys(dir, keys);
  return had;
}

// --- task keys -----------------------------------------------------------------------------------
// A task key's payload: { v: 2, a: agent, t: task, id, iat, exp, lim, k? }, times in seconds.
//   id   the key's id. A renewed key keeps the id, so revoking the id ends every renewal.
//   exp  the key's end: TASK_KEY_HOURS after the key was made, and never after lim.
//   lim  the job's limit: JOB_HOURS after the first key. A renewal never moves lim.
//   k    "drill" for a drill key (check-job.sh), which only a check job may use.
// A key from before task keys ended (no v) works only until the gateway's grace time (v1_until).
export const TASK_KEY_HOURS = 4;
export const JOB_HOURS = 96;
export const DRILL_MINUTES = 15;
export const DRILL_MAX_MINUTES = 240;
const HOUR = 3_600_000;
const sec = (ms) => Math.floor(ms / 1000);

// The state files beside agent-keys.json. The router writes REGISTRY and ENDED. An admin writes
// REVOKED with this file's commands. The router and the token service read all three.
export const REGISTRY = "task-keys.json";   // { v1_until, keys: { id: { agent, task, issued, expires, limit } } }
export const ENDED = "ended-tasks.json";    // { task: the time the router saw the task closed }
export const REVOKED = "revoked-task-keys.json";   // { keys: { id: time }, tasks: { task: time } }

const sign = (secret, payload, agentHash) => crypto.createHmac("sha256", secret).update(`${payload}.${agentHash}`).digest("base64url");

// A new task key. Returns { key, id, task, kind, issuedAt, expiresAt, limitAt }, times in ms.
//   ttlMs    how long the key lasts, TASK_KEY_HOURS by default
//   limitAt  the job's limit; a renewal passes the old key's limit
//   id       the key's id; a renewal passes the old key's id
export function makeTaskKey(secret, keys, handle, task, { now = Date.now(), ttlMs = TASK_KEY_HOURS * HOUR, limitAt = now + JOB_HOURS * HOUR, id = crypto.randomBytes(8).toString("hex"), kind = null } = {}) {
  const rec = keys[handle];
  if (!rec) throw new Error(`agent ${handle} has no gateway key`);
  const expiresAt = Math.min(now + ttlMs, limitAt);
  const p = { v: 2, a: handle, t: task, id, iat: sec(now), exp: sec(expiresAt), lim: sec(limitAt), ...(kind ? { k: kind } : {}) };
  const payload = b64(JSON.stringify(p));
  return { key: `cct_${payload}.${sign(secret, payload, rec.sha256)}`, id, task, kind, issuedAt: p.iat * 1000, expiresAt: p.exp * 1000, limitAt: p.lim * 1000 };
}
export const taskKey = (secret, keys, handle, task, opts) => makeTaskKey(secret, keys, handle, task, opts).key;

// A task key's payload, unchecked: for a job that needs the key's end time. Never trust the result.
export function readTaskKey(token) {
  const m = /^cct_([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+$/.exec(String(token ?? ""));
  if (!m) return null;
  try { return JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")); } catch { return null; }
}

// Checks a key. Returns { who } or { error, message }.
//   who    { agent, task: null } for an agent key; for a task key also { id, kind, issuedAt,
//          expiresAt, limitAt, v }
//   error  invalid_key, key_expired, key_revoked or task_closed
//   state  the task key state (taskKeyState()): the time, the grace time, the revoked keys and
//          tasks, and the closed tasks. Without state, only the key's end time counts.
export function checkKey(token, keys, secret, state = null) {
  const invalid = { error: "invalid_key", message: "Unknown or revoked gateway key." };
  if (typeof token !== "string") return invalid;
  if (token.startsWith("ccg_")) {
    const h = sha256(token);
    for (const [agent, rec] of Object.entries(keys)) {
      if (rec.sha256.length === h.length && crypto.timingSafeEqual(Buffer.from(rec.sha256), Buffer.from(h))) return { who: { agent, task: null } };
    }
    return invalid;
  }
  const m = /^cct_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return invalid;
  const p = readTaskKey(token);
  const rec = keys[p?.a];
  if (!rec || typeof p.t !== "string") return invalid;
  const want = Buffer.from(sign(secret, m[1], rec.sha256));
  const got = Buffer.from(m[2]);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return invalid;
  const v2 = p.v === 2;
  const who = { agent: p.a, task: p.t, v: v2 ? 2 : 1, id: v2 ? p.id : null, kind: p.k ?? null,
    issuedAt: v2 ? p.iat * 1000 : null, expiresAt: v2 ? p.exp * 1000 : null, limitAt: v2 ? p.lim * 1000 : null };
  const now = state?.now ?? Date.now();
  if (v2 && now >= who.expiresAt) return { error: "key_expired", message: "The task key has expired. A running job renews the key before the key ends." };
  if (!v2 && !(state?.v1Until && now < state.v1Until)) return { error: "key_expired", message: "The task key is from before the gateway's upgrade. Get a new task key." };
  const revokedTask = state?.revoked?.tasks?.[who.task];
  if ((who.id && state?.revoked?.keys?.[who.id]) || (revokedTask && (!v2 || who.issuedAt <= Date.parse(revokedTask)))) {
    return { error: "key_revoked", message: "An admin revoked the task key." };
  }
  if (who.kind !== "drill" && state?.ended?.[who.task]) return { error: "task_closed", message: `Task ${who.task} is closed, so the task's keys have ended.` };
  return { who };
}

// Who a key belongs to, or null. See checkKey().
export const verify = (token, keys, secret, state) => checkKey(token, keys, secret, state).who ?? null;

// --- task key state ------------------------------------------------------------------------------
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };

// Writes one state file: atomic, readable by the owner only. Run with sudo, the file gets the
// folder's owner, so the folder keeps one owner: root on Linux, the stack's owner on a Mac, where
// the gateway runs in Colima's VM.
export function writeState(dir, name, data) {
  const f = path.join(dir, name);
  fs.writeFileSync(`${f}.tmp`, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  if (process.getuid?.() === 0) { const { uid, gid } = fs.statSync(dir); fs.chownSync(`${f}.tmp`, uid, gid); }
  fs.renameSync(`${f}.tmp`, f);
}

export function taskKeyState(dir, now = Date.now()) {
  const reg = readJson(path.join(dir, REGISTRY), {});
  const revoked = readJson(path.join(dir, REVOKED), {});
  return { now, v1Until: reg.v1_until ? Date.parse(reg.v1_until) : null, ended: readJson(path.join(dir, ENDED), {}),
    revoked: { keys: revoked.keys ?? {}, tasks: revoked.tasks ?? {} } };
}

// taskKeyState(), read again only when a state file changes. Each write replaces the file, so a
// new inode marks a change even within one clock tick.
export function taskStateReader(dir, now = Date.now) {
  let mark = null, state = null;
  return () => {
    const m = [REGISTRY, ENDED, REVOKED].map((n) => { try { const st = fs.statSync(path.join(dir, n)); return `${st.ino}:${st.mtimeMs}:${st.size}`; } catch { return "-"; } }).join("|");
    if (m !== mark) { state = taskKeyState(dir); mark = m; }
    return { ...state, now: now() };
  };
}

// The grace time for keys from before the upgrade: set once, when the upgraded router first starts.
export function startGrace(dir, now = Date.now(), hours = TASK_KEY_HOURS) {
  const reg = readJson(path.join(dir, REGISTRY), {});
  if (reg.v1_until) return Date.parse(reg.v1_until);
  writeState(dir, REGISTRY, { ...reg, v1_until: new Date(now + hours * HOUR).toISOString(), keys: reg.keys ?? {} });
  return now + hours * HOUR;
}

// Records a key the router made or renewed, and drops keys that ended more than a day ago.
export function recordKey(dir, made, agent, now = Date.now()) {
  const reg = readJson(path.join(dir, REGISTRY), {});
  const keys = Object.fromEntries(Object.entries(reg.keys ?? {}).filter(([, k]) => Date.parse(k.expires) > now - 24 * HOUR));
  keys[made.id] = { agent, task: made.task, issued: new Date(made.issuedAt).toISOString(), expires: new Date(made.expiresAt).toISOString(), limit: new Date(made.limitAt).toISOString() };
  writeState(dir, REGISTRY, { ...reg, keys });
}

// The keys that have not ended yet, newest first.
export function liveKeys(dir, now = Date.now()) {
  const reg = readJson(path.join(dir, REGISTRY), {});
  return Object.entries(reg.keys ?? {}).map(([id, k]) => ({ id, ...k })).filter((k) => Date.parse(k.expires) > now).sort((x, y) => y.issued.localeCompare(x.issued));
}

// Revokes one key, with every renewal of the key, or every key a task has so far. A revoked entry
// stays for five days, longer than any key lives (JOB_HOURS).
function revokeEntry(dir, kind, value, now) {
  const r = readJson(path.join(dir, REVOKED), {});
  const keep = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, t]) => Date.parse(t) > now - 120 * HOUR));
  const out = { keys: keep(r.keys), tasks: keep(r.tasks) };
  out[kind][value] = new Date(now).toISOString();
  writeState(dir, REVOKED, out);
}
export const revokeKey = (dir, id, now = Date.now()) => revokeEntry(dir, "keys", id, now);
export const revokeTask = (dir, task, now = Date.now()) => revokeEntry(dir, "tasks", task, now);

// A drill key for check-job.sh: a check job's key for no real task, which ends after `minutes`.
export function drillKey(dir, handle, node, minutes = DRILL_MINUTES, now = Date.now()) {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(node)) throw new Error(`"${node}" is not a node name`);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > DRILL_MAX_MINUTES) throw new Error(`a drill key lasts 1 to ${DRILL_MAX_MINUTES} minutes, not ${minutes}`);
  const end = now + minutes * 60_000;
  return makeTaskKey(taskSecret(dir), loadKeys(dir), handle, `drill-${node}-${sec(now)}`, { now, ttlMs: minutes * 60_000, limitAt: end, kind: "drill" });
}

const USAGE = `usage:
  keys.mjs issue|keep|revoke <state dir> <handle>
  keys.mjs tasks <state dir> [handle]
  keys.mjs revoke-task <state dir> <task id>
  keys.mjs revoke-key <state dir> <key id>
  keys.mjs drill <state dir> <handle> <node> [minutes]`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, dir, arg, arg2, arg3] = process.argv.slice(2);
  const need = { issue: 1, keep: 1, revoke: 1, tasks: 0, "revoke-task": 1, "revoke-key": 1, drill: 2 }[cmd];
  if (need === undefined || !dir || [arg, arg2].slice(0, need).some((a) => !a)) { console.error(USAGE); process.exit(2); }
  if (cmd === "revoke") {
    console.error(revoke(dir, arg) ? `Gateway key of ${arg} revoked, with every task key of ${arg}.` : `${arg} had no gateway key.`);
  } else if (cmd === "issue") {
    process.stdout.write(issue(dir, arg));
  } else if (cmd === "keep") {
    const old = fs.readFileSync(0, "utf8").trim();
    const who = old ? verify(old, loadKeys(dir), "") : null;
    process.stdout.write(who?.agent === arg && who.task === null ? old : issue(dir, arg));
  } else if (cmd === "tasks") {
    const live = liveKeys(dir).filter((k) => !arg || k.agent === arg);
    for (const k of live) console.log(`${k.id}  ${k.agent}  task ${k.task}  ends ${k.expires}  job limit ${k.limit}`);
    if (!live.length) console.log("No task key is live.");
  } else if (cmd === "revoke-task") {
    revokeTask(dir, arg);
    console.error(`Every key task ${arg} has so far is revoked. The agent's key and the agent's other task keys still work.`);
  } else if (cmd === "revoke-key") {
    if (!/^[0-9a-f]{16}$/.test(arg)) { console.error(`"${arg}" is not a task key id. keys.mjs tasks lists the ids.`); process.exit(2); }
    revokeKey(dir, arg);
    console.error(`Task key ${arg} is revoked, with every renewal of the key.`);
  } else {
    try {
      const d = drillKey(dir, arg, arg2, arg3 === undefined ? DRILL_MINUTES : Number(arg3));
      process.stdout.write(JSON.stringify({ key: d.key, id: d.id, task: d.task, expires_at: new Date(d.expiresAt).toISOString() }) + "\n");
    } catch (e) { console.error(e.message); process.exit(2); }
  }
}
