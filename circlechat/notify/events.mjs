// The CircleChat events the Slack notifier (notify.mjs) can post, and site.json's choice of events
// (notify.events). No dependencies: kit/render.mjs checks site.json with this file too.
//
// Two events never go to the stack's channel: comment_mention and chat_mention. Each goes as a
// Slack DM to each mentioned person with a Slack ID, and to no one else. A person's Slack ID is the
// ID the person verified in CircleChat (Settings → Profile), or else the ID on site.json's
// notify.people list, during the switch to verified IDs.
import crypto from "node:crypto";

// Each event name, in the order the README's table lists the events.
export const EVENTS = [
  "task_created", "task_assigned", "task_unassigned", "task_review", "task_done", "task_blocked",
  "task_status_other", "task_progress_100", "task_archived", "comment", "comment_mention",
  "reply_dropped", "task_stalled", "post_rejected", "approval_pending", "chat_mention",
  "container_stopped",
];
// The events a stack gets without notify.events: a mention of a person, an approval, a task that
// waits for a review, an agent reply that never reached a person, and a turn container stopped
// past its deadline.
export const QUIET_DEFAULT = ["comment_mention", "approval_pending", "task_review", "reply_dropped", "post_rejected", "container_stopped"];
// The events that go as a DM to each mentioned person.
export const DM_EVENTS = ["comment_mention", "chat_mention"];

// A person's email address in site.json: letters, digits and . _ % + - only. kit/render.mjs checks
// cloud_approvers with the same pattern.
export const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

// The config check's messages for notify.events and notify.people.
export function validateNotify(notify = {}) {
  const errs = [];
  const ev = notify.events;
  if (ev !== undefined && ev !== "all") {
    if (!Array.isArray(ev)) errs.push('notify.events must be "all" or a list of event names, such as ["comment_mention", "approval_pending"]');
    else for (const e of ev) if (!EVENTS.includes(e)) errs.push(`notify.events: "${e}" is not an event. The events are ${EVENTS.join(", ")}`);
  }
  const people = notify.people;
  if (people === undefined) return errs;
  if (!Array.isArray(people)) return [...errs, 'notify.people must be a list of { "email", "slack_user" }'];
  const seen = new Set();
  people.forEach((p, i) => {
    const where = `notify.people[${i}]`;
    if (typeof p !== "object" || p === null) { errs.push(`${where} must be an object with email and slack_user`); return; }
    const extra = Object.keys(p).filter((k) => !["email", "slack_user"].includes(k));
    if (extra.length) errs.push(`${where}: ${extra.join(", ")} is not a setting. Use email and slack_user`);
    if (typeof p.email !== "string" || !EMAIL.test(p.email)) errs.push(`${where}.email must be the person's CircleChat email address`);
    else if (seen.has(p.email.toLowerCase())) errs.push(`${where}.email: ${p.email} is on the list twice`);
    else seen.add(p.email.toLowerCase());
    if (typeof p.slack_user !== "string" || !/^[UW][A-Z0-9]{6,}$/.test(p.slack_user)) errs.push(`${where}.slack_user must be a Slack user ID, such as U0123ABCD`);
  });
  return errs;
}

// The events as the NOTIFY_EVENTS line in tenant.env: each chosen event, comma-separated.
export const eventsLine = (notify = {}) => (notify.events === "all" ? EVENTS : notify.events ?? QUIET_DEFAULT).join(",");
// The people as the NOTIFY_PEOPLE line in tenant.env: email=slack_user, comma-separated.
export const peopleLine = (notify = {}) => (notify.people ?? []).map((p) => `${p.email.toLowerCase()}=${p.slack_user}`).join(",");

// NOTIFY_EVENTS, read back. Unset: the quiet default, for a stack whose setup predates the setting.
export const parseEvents = (line) => new Set(line === undefined ? QUIET_DEFAULT : String(line).split(",").map((e) => e.trim()).filter(Boolean));
// NOTIFY_PEOPLE, read back: email (lowercase) -> Slack user ID.
export function parsePeople(line = "") {
  const m = new Map();
  for (const pair of String(line).split(",")) {
    const i = pair.lastIndexOf("=");
    if (i > 0) m.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1).trim());
  }
  return m;
}

// The event for one row of CircleChat's task_activity, or null for a change the notifier never posts.
export function activityEvent(kind, payload = {}) {
  if (kind === "created") return "task_created";
  if (kind === "assigned") return "task_assigned";
  if (kind === "unassigned") return "task_unassigned";
  if (kind === "archived") return "task_archived";
  if (kind === "progress_changed") return Number(payload.to) >= 100 ? "task_progress_100" : null;
  if (kind === "status_changed") return { review: "task_review", done: "task_done", blocked: "task_blocked" }[payload.to] ?? "task_status_other";
  return null;
}

// The DMs for one mention. mentions: the member IDs the comment or message mentions. who: member
// ID -> { kind, handle, email, slackUser }, where slackUser is the ID the person verified in
// CircleChat. people: parsePeople's map, from notify.people. A verified ID wins, and notify.people
// is the fallback. Returns the DMs to send, each with the person's Slack user ID, and the handle of
// each mentioned person with no Slack ID. The author never gets a DM about the author's own mention.
export function mentionDms({ mentions = [], author, who, people }) {
  const dms = [], skipped = [];
  for (const id of new Set(mentions)) {
    const w = who.get(id);
    if (!w || w.kind !== "user" || id === author) continue;
    const slackUser = w.slackUser || people.get(String(w.email ?? "").toLowerCase());
    if (slackUser) dms.push({ slackUser, handle: w.handle });
    else skipped.push(w.handle);
  }
  return { dms, skipped };
}

// The text of a mention DM. With details off, the DM names no task, conversation or author, and
// holds none of the text: Slack is an outside company.
//   where: "task" or "chat"; place: the Slack link to the task or the channel; body: the text
export function mentionText({ where, details, by, place, body, ccUrl = "" }) {
  if (!details) return `:bell: You were mentioned ${where === "task" ? "on a task" : "in a conversation"} in CircleChat${ccUrl ? ` (<${ccUrl}|open CircleChat>)` : ""}.`;
  const text = String(body ?? "").replace(/\s+/g, " ").slice(0, 400);
  return `❓ ${by} mentioned you ${where === "task" ? "on" : "in"} ${place}: ${text}`;
}

// The channel note for an approval that waits for a person. With details off, the note names no
// agent and no action.
export function approvalText({ details, handle, action, ccUrl = "" }) {
  const base = String(ccUrl || "").replace(/\/$/, "");
  const where = base ? ` <${base}/approvals|Open the approvals>.` : "";
  if (!details) return `🔐 An agent waits for approval in CircleChat.${where}`;
  const what = String(action ?? "").replace(/[<>&]/g, "").replace(/\s+/g, " ").slice(0, 200);
  return `🔐 @${handle} (agent) waits for approval: ${what}.${where}`;
}

// The channel note for a turn container the CircleChat bridge stopped because it ran past its
// deadline plus the stop grace. CircleChat records each one in turn_container_stops. The note
// names the agent and the container, never a task or a conversation, so it is the same with
// details off.
export function containerStopText({ handle, container, overdueMs }) {
  const plain = (s) => String(s ?? "").replace(/[^a-z0-9_.-]/gi, "");
  const min = Math.max(1, Math.round(Number(overdueMs) / 60_000) || 1);
  const who = plain(handle) ? `@${plain(handle)}'s` : "An agent's";
  return `🛑 ${who} turn container \`${plain(container)}\` was still running ${min} min past its deadline, so CircleChat stopped it.`;
}

// What one task comment or one chat message sends: the channel post (null for none) and the DMs.
// A mention goes only as a DM, never in the stack's channel.
//   source: "task" (a task comment) or "chat" (a message in a channel); events: parseEvents' set;
//   row: { member_id, body_md, mentions, kind } (kind: the conversation's kind, for a chat message);
//   by: the author's name; place: the Slack link to the task or the channel
export function notesFor({ source, events, details, row, by, place, who, people, ccUrl = "" }) {
  const isPerson = (id) => who.get(id)?.kind === "user";
  const body = String(row.body_md ?? "").replace(/\s+/g, " ").slice(0, 400);
  const channel = source === "task" && events.has("comment") ? `💬 ${by} on ${place}: ${body}` : null;
  const event = source === "task" ? "comment_mention" : "chat_mention";
  const mentionsPerson = (row.mentions || []).some(isPerson) && !(source === "chat" && row.kind === "dm");
  if (!events.has(event) || !mentionsPerson) return { channel, dms: [], skipped: [], event };
  const { dms, skipped } = mentionDms({ mentions: row.mentions, author: row.member_id, who, people });
  const text = mentionText({ where: source, details, by, place, body: row.body_md, ccUrl });
  return { channel, dms: dms.map((d) => ({ ...d, text })), skipped, event };
}

// The config check's warnings for site.json's notify block. A warning never stops the setup.
export function notifyWarnings(notify = {}) {
  return (notify.people ?? []).length
    ? ["notify.people is a fallback during the switch to Slack IDs that each person verifies in CircleChat, under Settings → Profile. A verified ID wins. A later kit release removes notify.people."]
    : [];
}

// The Slack ID check (CircleChat's docs/slack-dms.md). The notifier makes each code, and
// CircleChat stores only the salt and the hash, SHA-256 of "<salt>:<code>" in hex.
export const CODE_TTL_MS = 10 * 60_000;
export const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
export const newSalt = () => crypto.randomBytes(16).toString("hex");
export const hashCode = (salt, code) => crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");

// The DM with the code. The DM names the CircleChat account and address, so a person who never
// asked for a code knows to ignore the DM.
export function codeText({ code, handle, ccUrl = "" }) {
  const where = ccUrl ? ` on ${String(ccUrl).replace(/\/$/, "")}` : "";
  return `Your CircleChat code is *${code}*. The code links this Slack account to @${handle}${where}, and works for 10 minutes. If you didn't ask for a code, ignore this message.`;
}
