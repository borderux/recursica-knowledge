#!/usr/bin/env node
// Each scheduled job's last result, one small file per job, for the morning summary
// (cluster/daily-summary.mjs). The RecursicaChat server's backup, the stack's backup and their
// restore tests write one at the end of each run, as root:
//
//   node job-status.mjs <job> ok|failed "<detail>"
//
// It writes <dir>/<job>.json: { "ok": true, "at": <ms>, "detail": "snapshot 1a2b3c4d, 120 files" }.
// The folder is JOB_STATUS_DIR, or /var/lib/agent-cluster/jobs. The detail is a short line about the
// run, never a secret or a file's contents. A job never fails because its status could not be
// written: the script logs why and exits 0, and the summary then reports the job as late.
import fs from "node:fs";
import path from "node:path";

export const STATUS_DIR = "/var/lib/agent-cluster/jobs";
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function writeStatus(dir, job, ok, detail = "", now = Date.now()) {
  if (!NAME.test(job)) throw new Error(`not a job name: ${job}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  const file = path.join(dir, `${job}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ ok: Boolean(ok), at: now, detail: String(detail).replace(/\s+/g, " ").trim().slice(0, 300) }) + "\n", { mode: 0o644 });
  fs.renameSync(tmp, file);
  return file;
}

/** Each job's last status, by job name; a file that can't be read is left out. */
export function readStatuses(dir) {
  const out = {};
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return out; }
  for (const n of names) {
    const m = /^([a-z0-9][a-z0-9-]*)\.json$/.exec(n);
    if (!m) continue;
    try {
      const s = JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"));
      if (typeof s.ok === "boolean" && Number.isFinite(s.at)) out[m[1]] = { ok: s.ok, at: s.at, detail: String(s.detail ?? "") };
    } catch {}
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [job, result, detail = ""] = process.argv.slice(2);
  if (!job || !["ok", "failed"].includes(result)) {
    console.error("usage: job-status.mjs <job> ok|failed \"<detail>\"");
    process.exit(0);
  }
  try {
    writeStatus(process.env.JOB_STATUS_DIR || STATUS_DIR, job, result === "ok", detail);
    console.log(`status: ${job} ${result}`);
  } catch (e) {
    console.error(`status: could not record ${job} ${result}: ${e.message}`);
  }
}
