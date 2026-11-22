// The morning summary (daily-summary.mjs) and the job results it reads (kit/job-status.mjs), from
// an invented status folder. Nothing here reaches Slack, launchd or a real job.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { GRACE, JOBS, dailySummary, jobLine, summaryDue, summaryText, when } from "./daily-summary.mjs";
import { readStatuses, writeStatus } from "../kit/job-status.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const TZ = "America/New_York";
// 07:10 in New York on the morning after the night's backups
const NOW = Date.parse("2026-11-23T12:10:00Z");
const at = (iso) => Date.parse(iso);
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), "job-status-"));

test("a job's result: written whole, read back by job name; a bad name or file is left out", () => {
  const dir = folder();
  writeStatus(dir, "stack-backup", true, "snapshot 1a2b3c4d,\n 120 files", at("2026-11-23T09:01:00Z"));
  assert.deepEqual(readStatuses(dir), { "stack-backup": { ok: true, at: at("2026-11-23T09:01:00Z"), detail: "snapshot 1a2b3c4d, 120 files" } });
  assert.throws(() => writeStatus(dir, "../escape", true), /not a job name/);
  fs.writeFileSync(path.join(dir, "broken.json"), "{");
  fs.writeFileSync(path.join(dir, "other.txt"), "x");
  assert.deepEqual(Object.keys(readStatuses(dir)), ["stack-backup"]);
  assert.deepEqual(readStatuses(path.join(dir, "missing")), {});
});

test("job-status.mjs from a job: records ok or failed, and never fails the job", () => {
  const dir = folder();
  const run = (...args) => spawnSync(process.execPath, [path.join(here, "../kit/job-status.mjs"), ...args], { env: { ...process.env, JOB_STATUS_DIR: dir }, encoding: "utf8" });
  const ok = run("recursicachat-backup", "ok", "snapshot f5bb9946, 120 archive entries");
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^status: recursicachat-backup ok$/m);
  assert.equal(run("stack-backup", "failed", "at step: restic backup").status, 0);
  const s = readStatuses(dir);
  assert.equal(s["recursicachat-backup"].ok, true);
  assert.equal(s["stack-backup"].ok, false);
  assert.equal(s["stack-backup"].detail, "at step: restic backup");
  const bad = run("Not A Name", "ok");
  assert.equal(bad.status, 0, "a job never fails on its status");
  assert.match(bad.stderr, /could not record/);
  assert.equal(run("stack-backup", "maybe").status, 0);
});

test("due once a day, from 07:00 in the cluster's time zone", () => {
  assert.deepEqual(summaryDue({}, NOW, TZ), { due: true, day: "2026-11-23" });
  assert.equal(summaryDue({ summaryDay: "2026-11-23" }, NOW, TZ).due, false, "posted today already");
  assert.equal(summaryDue({ summaryDay: "2026-11-22" }, NOW, TZ).due, true);
  assert.equal(summaryDue({}, at("2026-11-23T11:59:00Z"), TZ).due, false, "06:59 is too early");
  assert.equal(summaryDue({}, NOW, "Asia/Tokyo").day, "2026-11-23");
  assert.equal(when(at("2026-11-23T08:30:00Z"), NOW, TZ), "03:30");
  assert.equal(when(at("2026-11-01T10:00:00Z"), NOW, TZ), "Nov 1, 05:00");
});

test("each job's line: ran with its detail, failed with why, late, or not run yet", () => {
  const [backup, , restore] = JOBS;
  const since = at("2026-11-20T00:00:00Z");
  assert.deepEqual(jobLine(backup, { ok: true, at: at("2026-11-23T08:30:00Z"), detail: "snapshot f5bb9946, 120 archive entries" }, NOW, TZ, since), {
    ok: true,
    line: ":white_check_mark: RecursicaChat backup: 03:30, snapshot f5bb9946, 120 archive entries",
  });
  assert.deepEqual(jobLine(backup, { ok: false, at: at("2026-11-23T08:31:00Z"), detail: "at step: restic backup" }, NOW, TZ, since), {
    ok: false,
    line: ":x: RecursicaChat backup failed at 03:31: at step: restic backup",
  });
  // a daily job whose last run is more than a day and 3 hours old
  const late = jobLine(backup, { ok: true, at: NOW - backup.every - GRACE - 1, detail: "x" }, NOW, TZ, since);
  assert.equal(late.ok, false);
  assert.match(late.line, /^:warning: RecursicaChat backup didn't run on time: last run Nov 22, 04:09$/);
  assert.match(jobLine(backup, { ok: false, at: NOW - 2 * backup.every, detail: "x" }, NOW, TZ, since).line, /, which failed$/);
  // a monthly restore test 22 days ago is on time
  assert.equal(jobLine(restore, { ok: true, at: at("2026-11-01T10:05:00Z"), detail: "newest backup restored" }, NOW, TZ, since).ok, true);
  // no result yet: fine within the job's interval since the summary began, late after it
  assert.deepEqual(jobLine(restore, undefined, NOW, TZ, since), { ok: true, line: ":white_circle: RecursicaChat restore test: no run recorded yet" });
  assert.deepEqual(jobLine(backup, undefined, NOW, TZ, since), { ok: false, line: ":warning: RecursicaChat backup: no run recorded since Nov 19, 19:00" });
});

test("the summary: a head line that says whether anything needs a look, then one line per job", () => {
  const statuses = {
    "recursicachat-backup": { ok: true, at: at("2026-11-23T08:30:00Z"), detail: "snapshot f5bb9946, 120 archive entries" },
    "stack-backup": { ok: true, at: at("2026-11-23T09:00:00Z"), detail: "snapshot 3e0d9b01, 1852 files" },
    "recursicachat-restore-test": { ok: true, at: at("2026-11-01T10:00:00Z"), detail: "newest backup restored" },
    "stack-restore-test": { ok: true, at: at("2026-11-01T10:30:00Z"), detail: "newest backup restored, 1852 files" },
  };
  const all = summaryText({ computer: "machine-1", jobs: JOBS, statuses, now: NOW, tz: TZ, since: NOW });
  assert.equal(
    all,
    [
      ":sunrise: Morning check on machine-1: nothing needs a look.",
      ":white_check_mark: RecursicaChat backup: 03:30, snapshot f5bb9946, 120 archive entries",
      ":white_check_mark: Stack files backup: 04:00, snapshot 3e0d9b01, 1852 files",
      ":white_check_mark: RecursicaChat restore test: Nov 1, 05:00, newest backup restored",
      ":white_check_mark: Stack files restore test: Nov 1, 05:30, newest backup restored, 1852 files",
    ].join("\n"),
  );
  const one = summaryText({ computer: "machine-1", jobs: JOBS, statuses: { ...statuses, "stack-backup": { ok: false, at: at("2026-11-23T09:00:00Z"), detail: "at step: restic backup" } }, now: NOW, tz: TZ, since: NOW });
  assert.match(one, /^:sunrise: Morning check on machine-1: 1 of 4 jobs need a look\.$/m);
});

test("dailySummary: only the jobs installed here, none on a computer without them, and a failed post tries again next hour", async () => {
  const dir = folder();
  writeStatus(dir, "recursicachat-backup", true, "snapshot f5bb9946, 120 archive entries", at("2026-11-23T08:30:00Z"));
  const env = { CLUSTER_TZ: TZ, COMPUTER: "machine-1" };
  const logs = [];
  const log = (l) => logs.push(l);
  const posts = [];
  const installed = (label) => label === "io.recursica.recursicachat-backup";

  assert.equal(await dailySummary({ env, state: {}, now: NOW, dir, installed: () => false, post: async () => ({ ok: true }), log }), "none");

  const state = {};
  assert.equal(await dailySummary({ env, state, now: NOW, dir, installed, log, post: async (t) => (posts.push(t), { ok: false, error: "channel_not_found" }) }), "failed");
  assert.equal(state.summaryDay, undefined, "not marked as posted");
  assert.match(logs.at(-1), /^daily summary: the post failed \(channel_not_found\); the next hourly run tries again$/);
  assert.equal(await dailySummary({ env, state, now: NOW + 3600_000, dir, installed, log, post: async () => { throw new Error("no answer"); } }), "failed");

  assert.equal(await dailySummary({ env, state, now: NOW + 7200_000, dir, installed, log, post: async (t) => (posts.push(t), { ok: true }) }), "posted");
  assert.equal(state.summaryDay, "2026-11-23");
  assert.equal(logs.at(-1), "daily summary: posted");
  assert.equal(posts.at(-1), ":sunrise: Morning check on machine-1: nothing needs a look.\n:white_check_mark: RecursicaChat backup: 03:30, snapshot f5bb9946, 120 archive entries");
  assert.equal(await dailySummary({ env, state, now: NOW + 3 * 3600_000, dir, installed, log, post: async () => ({ ok: true }) }), "not due", "once a day");
});

test("the updater posts the summary each hour it is due, before it saves its state, and logs that it ran", () => {
  const src = fs.readFileSync(path.join(here, "updater.mjs"), "utf8");
  assert.ok(src.indexOf("dailySummary({ env, state") < src.indexOf("fs.writeFileSync(stateFile"), "the posted day is saved");
  assert.match(src, /console\.log\(`\$\{new Date\(\)\.toISOString\(\)\} updater: done`\)/);
});
