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
//
// On the control computer, each program with health_report in site.json may leave a note on
// yesterday in <state>/health-note.json: { "day": "<YYYY-MM-DD>", "text": "..." }. The summary adds
// the note under the job lines. A computer with no jobs still posts a note. The program writes
// the note, so the text is untrusted: it is cut to 1,500 characters, and no mention or link in it
// pings anyone. A note for another day, a note older than 36 hours, or a file that doesn't parse
// adds nothing.
import fs from "node:fs";
import { STATUS_DIR, readStatuses } from "../kit/job-status.mjs";
import { clusterTz } from "./actions.mjs";
import { addDays } from "./usage.mjs";

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

export const NOTE_MAX = 1500;
export const NOTE_MAX_AGE = 36 * HOUR;
const NOTE_FILE_MAX = 64 * 1024;

/**
 * A note's text, safe to post: Slack reads <...> as a mention, a channel ping or a link, so each
 * angle bracket becomes a look-alike that Slack shows as text. Control characters other than line
 * breaks and tabs go. The text is cut to NOTE_MAX characters, the last one an ellipsis.
 */
export function cleanNote(text) {
  const t = String(text).replace(/</g, "\u2039").replace(/>/g, "\u203a").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
  const chars = [...t];
  return chars.length > NOTE_MAX ? chars.slice(0, NOTE_MAX - 1).join("") + "\u2026" : t;
}

/**
 * A program's note on a day, as { name, day, text }, or null. The file is read without following a
 * link, and only when it is a plain file of at most 64 KB changed within NOTE_MAX_AGE.
 */
export function readNote(service, day, now) {
  let fd;
  try {
    fd = fs.openSync(`${service.state}/health-note.json`, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.size > NOTE_FILE_MAX || now - st.mtimeMs > NOTE_MAX_AGE) return null;
    const j = JSON.parse(fs.readFileSync(fd, "utf8"));
    if (!j || j.day !== day || typeof j.text !== "string") return null;
    const text = cleanNote(j.text);
    return text ? { name: service.name, day, text } : null;
  } catch { return null; } finally { if (fd !== undefined) fs.closeSync(fd); }
}

/** A note's lines in the summary. */
export const noteText = (n) => `*Note from ${n.name} for ${n.day}:*\n${n.text}`;

/**
 * Posts the summary when it is due. state is the updater's state: summaryDay, the last day it
 * posted, and summarySince, when it first ran here. Returns "none", "not due", "posted" or "failed".
 *   services: the programs with health_report (usage-export.mjs healthServices), on the control computer
 *   tz: the cluster's time zone
 */
export async function dailySummary({ env, state, post, now = Date.now(), dir = STATUS_DIR, installed = (label) => fs.existsSync(`/Library/LaunchDaemons/${label}.plist`), log = (line) => console.log(line), services = [], tz = clusterTz(env) }) {
  const jobs = JOBS.filter((j) => installed(j.label));
  if (!jobs.length && !services.length) return "none";
  if (jobs.length) state.summarySince ??= now;
  const { due, day } = summaryDue(state, now, tz);
  if (!due) return "not due";
  const notes = services.map((s) => readNote(s, addDays(day, -1), now)).filter(Boolean).map(noteText);
  // Without jobs and without a note, nothing posts, and a note written later this day still posts.
  if (!jobs.length && !notes.length) return "none";
  const text = [
    ...(jobs.length ? [summaryText({ computer: env.COMPUTER || "this computer", jobs, statuses: readStatuses(dir), now, tz, since: state.summarySince })] : []),
    ...notes,
  ].join("\n\n");
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
