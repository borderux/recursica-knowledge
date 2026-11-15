#!/usr/bin/env node
// Prints the port job's task key, for Claude Code (apiKeyHelper), git and gh. A task key lasts 4
// hours. When the key has less than an hour left, this script asks the gateway for a new key for
// the same task (POST /task-key/renew). The gateway renews a key only while the key's task is open
// and the key has not ended or been revoked, and never past the job's 96-hour limit.
//
// The job keeps the newest key in /work/task-key, so a restart of the job (jobd) uses the newest
// key. jobd's folder for the jobs is the computer owner's only. When the gateway refuses to renew,
// /work/key-ended holds the reason, for the job's report.
//
// The first run takes jobd's key from JOB_TASK_KEY (run.sh). Settings: ANTHROPIC_BASE_URL (the
// gateway), TASK_KEY_FILE (for the tests).
import fs from "node:fs";
import path from "node:path";

const FILE = process.env.TASK_KEY_FILE ?? "/work/task-key";
const RENEW_BEFORE_MS = 3_600_000;
const gateway = process.env.ANTHROPIC_BASE_URL ?? "";

const read = () => { try { return fs.readFileSync(FILE, "utf8").trim(); } catch { return ""; } };
// jobd runs as another user than the job, and reads the key for a restart.
const save = (key) => { fs.writeFileSync(`${FILE}.new`, `${key}\n`, { mode: 0o644 }); fs.renameSync(`${FILE}.new`, FILE); };
const endOf = (key) => { try { return JSON.parse(Buffer.from(key.slice(4, key.indexOf(".")), "base64url").toString("utf8")).exp * 1000 || null; } catch { return null; } };

let key = read();
if (!key) {
  key = process.env.JOB_TASK_KEY ?? "";
  if (!key) { console.error("Porter job: no task key"); process.exit(1); }
  save(key);
}
const ends = endOf(key);
if (ends && ends - Date.now() < RENEW_BEFORE_MS && gateway) {
  try {
    const r = await fetch(`${gateway}/task-key/renew`, { method: "POST", headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30_000) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.key) { key = j.key; save(key); }
    else {
      const why = j.error?.type ?? String(r.status);
      console.error(`Porter job: the gateway did not renew the task key: ${why}`);
      // A refusal is final. A network error is not: the next run tries again.
      if (r.status >= 400 && r.status < 500) fs.writeFileSync(path.join(path.dirname(FILE), "key-ended"), `${why}: ${j.error?.message ?? ""}\n`);
    }
  } catch (e) { console.error(`Porter job: the task key renewal failed: ${e.message}`); }
}
process.stdout.write(`${key}\n`);
