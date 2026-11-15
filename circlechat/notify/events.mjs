// The CircleChat events the Slack notifier (notify.mjs) can post, and site.json's choice of events
// (notify.events). No dependencies: kit/render.mjs checks site.json with this file too.
//
// Two events never go to the stack's channel: comment_mention and chat_mention. Each goes as a
// Slack DM to each mentioned person on site.json's notify.people list, and to no one else.

// Each event name, in the order the README's table lists the events.
export const EVENTS = [
  "task_created", "task_assigned", "task_unassigned", "task_review", "task_done", "task_blocked",
  "task_status_other", "task_progress_100", "task_archived", "comment", "comment_mention",
  "reply_dropped", "task_stalled", "post_rejected", "approval_pending", "chat_mention",
];
// The events a stack gets without notify.events: a mention of a person, an approval, a task that
// waits for a review, and an agent reply that never reached a person.
export const QUIET_DEFAULT = ["comment_mention", "approval_pending", "task_review", "reply_dropped", "post_rejected"];
// The events that go as a DM to each mentioned person.
export const DM_EVENTS = ["comment_mention", "chat_mention"];

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
    // Letters, digits and . _ % + - only: setup-host.sh reads the list from tenant.env, a shell file.
    if (typeof p.email !== "string" || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(p.email)) errs.push(`${where}.email must be the person's CircleChat email address`);
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
// ID -> { kind, handle, email }. people: parsePeople's map. Returns the DMs to send, each with the
// person's Slack user ID, and the handle of each mentioned person not on the list. The author never
// gets a DM about the author's own mention.
export function mentionDms({ mentions = [], author, who, people }) {
  const dms = [], skipped = [];
  for (const id of new Set(mentions)) {
    const w = who.get(id);
    if (!w || w.kind !== "user" || id === author) continue;
    const slackUser = people.get(String(w.email ?? "").toLowerCase());
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
