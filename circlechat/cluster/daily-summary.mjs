// The morning summary: once a day, at the first hourly updater run from 07:00 in the cluster's time
// zone, the cluster's channel gets one post on this computer's scheduled jobs. Most jobs post only
// when something goes wrong, so a quiet channel could mean "all fine" or "posting is broken". With a
// summary each morning, a quiet channel means all fine, and a missing summary means posting broke.
//
// Each job records its last result (kit/job-status.mjs): the RecursicaChat server's backup at 03:30
// and the stack's backup at 04:00 with their snapshots, and the two monthly restore tests. A job is
// late once its last result is older than its interval plus 3 hours. A job with no result yet is
// late only once the summary has waited that long since it first ran on this computer.
//
// Only the jobs installed on this computer are listed (their LaunchDaemon). A computer with none
// posts no summary. A post that fails is logged, and the next hourly run tries again.
import fs from "node:fs";
import { STATUS_DIR, readStatuses } from "../kit/job-status.mjs";
import { clusterTz } from "./actions.mjs";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
export const SUMMARY_HOUR = 7;
export const GRACE = 3 * HOUR;

export const JOBS = [
  { job: "recursicachat-backup", label: "io.recursica.recursicachat-backup", name: "RecursicaChat backup", every: DAY },
  { job: "stack-backup", label: "io.recursica.stack-backup", name: "Stack files backup", every: DAY },
  { job: "recursicachat-restore-test", label: "io.recursica.recursicachat-restore-test", name: "RecursicaChat restore test", every: 31 * DAY },
  { job: "stack-restore-test", label: "io.recursica.stack-restore-test", name: "Stack files restore test", every: 31 * DAY },
];

/** The day (YYYY-MM-DD) and the hour (0-23) in the time zone. */
export function localParts(now, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(now))
      .map((x) => [x.type, x.value]),
  );
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/** Whether the summary is due: from the hour on, once a day. */
export function summaryDue(state, now, tz, hour = SUMMARY_HOUR) {
  const { day, hour: h } = localParts(now, tz);
  return { due: h >= hour && state.summaryDay !== day, day };
}

/** A run's time: the time alone within the last 20 hours, else with the date. */
export function when(at, now, tz) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
  if (now - at < 20 * HOUR) return time;
  return `${new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(at))}, ${time}`;
}

/** One job's line, and whether the job is fine. */
export function jobLine(j, s, now, tz, since) {
  if (!s) {
    if (now - since < j.every + GRACE) return { ok: true, line: `:white_circle: ${j.name}: no run recorded yet` };
    return { ok: false, line: `:warning: ${j.name}: no run recorded since ${when(since, now, tz)}` };
  }
  if (now - s.at > j.every + GRACE) return { ok: false, line: `:warning: ${j.name} didn't run on time: last run ${when(s.at, now, tz)}${s.ok ? "" : ", which failed"}` };
  if (!s.ok) return { ok: false, line: `:x: ${j.name} failed at ${when(s.at, now, tz)}: ${s.detail || "no detail"}` };
  return { ok: true, line: `:white_check_mark: ${j.name}: ${when(s.at, now, tz)}${s.detail ? `, ${s.detail}` : ""}` };
}

export function summaryText({ computer, jobs, statuses, now, tz, since }) {
  const lines = jobs.map((j) => jobLine(j, statuses[j.job], now, tz, since));
  const bad = lines.filter((l) => !l.ok).length;
  const head = bad
    ? `:sunrise: Morning check on ${computer}: ${bad} of ${jobs.length} jobs need a look.`
    : `:sunrise: Morning check on ${computer}: nothing needs a look.`;
  return [head, ...lines.map((l) => l.line)].join("\n");
}

/**
 * Posts the summary when it is due. state is the updater's state: summaryDay, the last day it
 * posted, and summarySince, when it first ran here. Returns "none", "not due", "posted" or "failed".
 */
export async function dailySummary({ env, state, post, now = Date.now(), dir = STATUS_DIR, installed = (label) => fs.existsSync(`/Library/LaunchDaemons/${label}.plist`), log = (line) => console.log(line) }) {
  const jobs = JOBS.filter((j) => installed(j.label));
  if (!jobs.length) return "none";
  state.summarySince ??= now;
  const tz = clusterTz(env);
  const { due, day } = summaryDue(state, now, tz);
  if (!due) return "not due";
  const text = summaryText({ computer: env.COMPUTER || "this computer", jobs, statuses: readStatuses(dir), now, tz, since: state.summarySince });
  const r = await Promise.resolve()
    .then(() => post(text))
    .catch((e) => ({ ok: false, error: e.message }));
  if (r?.ok) {
    state.summaryDay = day;
    log("daily summary: posted");
    return "posted";
  }
  log(`daily summary: the post failed (${r?.error ?? "no answer"}); the next hourly run tries again`);
  return "failed";
}
