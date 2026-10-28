#!/usr/bin/env node
// Gateway keys: what an agent or a job shows the model gateway. A gateway key is not a cloud key:
// the gateway holds the cloud keys, and a gateway key only lets its holder ask the gateway.
//
//   agent key  ccg_<random>, one per agent. setup-agent.sh puts the agent's key in the agent's
//              Hermes home. The gateway keeps only the key's SHA-256 hash, in agent-keys.json.
//   task key   cct_<payload>.<signature>, one per agent and task. Porter gets one from the gateway
//              (POST /task-key) and hands the key to the port job. The signature covers the agent
//              key's hash, so revoking or replacing an agent's key also ends the agent's task keys.
//
//   node keys.mjs issue <state dir> <handle>    prints a new key for the agent, and records its hash
//   node keys.mjs keep <state dir> <handle>     reads a key on stdin; records it if it is the agent's key,
//                                               or prints a new key when it is not
//   node keys.mjs revoke <state dir> <handle>   ends the agent's key and every task key the agent holds
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

const sign = (secret, payload, agentHash) => crypto.createHmac("sha256", secret).update(`${payload}.${agentHash}`).digest("base64url");

export function taskKey(secret, keys, handle, task) {
  const rec = keys[handle];
  if (!rec) throw new Error(`agent ${handle} has no gateway key`);
  const payload = b64(JSON.stringify({ a: handle, t: task }));
  return `cct_${payload}.${sign(secret, payload, rec.sha256)}`;
}

// Who a key belongs to: { agent, task } (task null for an agent key), or null for an unknown key.
export function verify(token, keys, secret) {
  if (typeof token !== "string") return null;
  if (token.startsWith("ccg_")) {
    const h = sha256(token);
    for (const [agent, rec] of Object.entries(keys)) {
      if (rec.sha256.length === h.length && crypto.timingSafeEqual(Buffer.from(rec.sha256), Buffer.from(h))) return { agent, task: null };
    }
    return null;
  }
  const m = /^cct_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  let p;
  try { p = JSON.parse(Buffer.from(m[1], "base64url").toString("utf8")); } catch { return null; }
  const rec = keys[p?.a];
  if (!rec || typeof p.t !== "string") return null;
  const want = Buffer.from(sign(secret, m[1], rec.sha256));
  const got = Buffer.from(m[2]);
  return want.length === got.length && crypto.timingSafeEqual(want, got) ? { agent: p.a, task: p.t } : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, dir, handle] = process.argv.slice(2);
  if (!["issue", "keep", "revoke"].includes(cmd) || !dir || !handle) {
    console.error("usage: keys.mjs issue|keep|revoke <state dir> <handle>"); process.exit(2);
  }
  if (cmd === "revoke") {
    console.error(revoke(dir, handle) ? `Gateway key of ${handle} revoked, with every task key of ${handle}.` : `${handle} had no gateway key.`);
  } else if (cmd === "issue") {
    process.stdout.write(issue(dir, handle));
  } else {
    const old = fs.readFileSync(0, "utf8").trim();
    const who = old ? verify(old, loadKeys(dir), "") : null;
    process.stdout.write(who?.agent === handle && who.task === null ? old : issue(dir, handle));
  }
}
