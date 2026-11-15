// CircleChat → Slack. Polls the database every 30 s, so it survives restarts without missing
// anything: the last activity time it sent is kept in /state/last.json.
//
// Timestamps are kept as Postgres text, microseconds included: a JS Date drops them, and the
// last event would be re-sent on every poll.
//
// Each post is one event (events.mjs), and site.json's notify.events chooses the events
// (NOTIFY_EVENTS). The default is quiet: a mention of a person, an approval that waits for a person,
// a task that waits for a review, and an agent reply that never reached a person.
//
// A mention of a person (comment_mention, chat_mention) never goes to the stack's channel. Each goes
// as a Slack DM to each mentioned person on site.json's notify.people list (NOTIFY_PEOPLE), and to
// no one else. A mentioned person not on the list gets nothing. The log names the person's handle
// and never the text.
import fs from "node:fs";
import pg from "pg";
import { droppedNote } from "./drops.mjs";
import { activityEvent, approvalText, notesFor, parseEvents, parsePeople } from "./events.mjs";

const { DATABASE_URL, SLACK_BOT_TOKEN, SLACK_CHANNEL, CC_URL = "", NOTIFY_DETAILS = "on", STACK_NAME = "" } = process.env;
const EVENTS = parseEvents(process.env.NOTIFY_EVENTS);
const PEOPLE = parsePeople(process.env.NOTIFY_PEOPLE);
const on = (event) => EVENTS.has(event);
const details = NOTIFY_DETAILS !== "off";
const STALE_BLOCKED_H = Number(process.env.STALE_BLOCKED_HOURS ?? 24);
const STALE_ACTIVE_H = Number(process.env.STALE_ACTIVE_HOURS ?? 12);
const STATE = "/state/last.json";
if (!DATABASE_URL || !SLACK_BOT_TOKEN || !SLACK_CHANNEL) { console.error("need DATABASE_URL, SLACK_BOT_TOKEN and SLACK_CHANNEL"); process.exit(1); }

const db = new pg.Pool({ connectionString: DATABASE_URL });
const load = () => { try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; } };
const save = (s) => fs.writeFileSync(STATE, JSON.stringify(s));
let st = load();
const now = new Date().toISOString();
st.activity ??= now; st.comments ??= now; st.runs ??= now; st.staleAt ??= 0; st.staleSent ??= {};
// The approvals and chat messages since this notifier first read the state, never older ones.
st.approvals ??= now; st.messages ??= now;
save(st); // so a restart picks up from here, not from whenever it restarts

const link = (id, title) => CC_URL ? `<${CC_URL.replace(/\/$/, "")}/board?task=${id}|${title}>` : `*${title}*`;
// With NOTIFY_DETAILS=off (a client stack, by default), Slack gets no task titles or comments:
// one note at most every 10 minutes that CircleChat has new activity.
// A message written for that case, such as a dropped reply with no conversation named, passes as
// it is (`safe`).
let lastMinimal = 0;
async function slack(text, { safe = false } = {}) {
  if (NOTIFY_DETAILS === "off" && !safe) {
    if (Date.now() - lastMinimal < 600_000) return;
    lastMinimal = Date.now();
    text = `:bell: New task activity in CircleChat${CC_URL ? ` (<${CC_URL}|open CircleChat>)` : ""}.`;
  }
  const r = await fetch("https://slack.com/api/chat.postMessage", { method: "POST",
    headers: { authorization: `Bearer ${SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" },
    // Each message shows the stack's name as the sender (kit/slack.mjs, senderFields).
    body: JSON.stringify({ channel: SLACK_CHANNEL, text, ...(STACK_NAME ? { username: STACK_NAME } : {}) }) });
  const j = await r.json();
  if (!j.ok) throw new Error(`slack: ${j.error}`);
}

// Slack's API, as the bot.
async function slackApi(method, body) {
  const r = await fetch(`https://slack.com/api/${method}`, { method: "POST",
    headers: { authorization: `Bearer ${SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) throw new Error(`slack ${method}: ${j.error}`);
  return j;
}
// A DM from the bot to one person. conversations.open needs the im:write scope, and
// chat.postMessage needs chat:write.
const dmChannels = new Map();
async function dm(slackUser, text) {
  if (!dmChannels.has(slackUser)) dmChannels.set(slackUser, (await slackApi("conversations.open", { users: slackUser })).channel.id);
  await slackApi("chat.postMessage", { channel: dmChannels.get(slackUser), text, ...(STACK_NAME ? { username: STACK_NAME } : {}) });
}
// Sends what one comment or chat message sends (events.mjs, notesFor). A mentioned person not on
// notify.people gets nothing, and the log names the person's handle, never the text.
async function send({ channel, dms, skipped, event }) {
  if (channel) await slack(channel);
  for (const handle of skipped) console.log(new Date().toISOString(), `${event}: no DM for @${handle}, who is not on notify.people`);
  for (const d of dms) await dm(d.slackUser, d.text);
}

// member id → "@handle" (people) or "@handle (agent)", and each person's email for notify.people
const WHO = `
  select m.id, m.kind, coalesce(u.handle, a.handle) as handle, u.email
  from members m left join users u on m.kind='user' and u.id=m.ref_id
  left join agents a on m.kind='agent' and a.id=m.ref_id`;
let who = new Map();
async function refreshWho() { who = new Map((await db.query(WHO)).rows.map((r) => [r.id, r])); }
const name = (id) => { const w = who.get(id); return w ? `@${w.handle}${w.kind === "agent" ? " (agent)" : ""}` : "someone"; };

async function activity() {
  const { rows } = await db.query(
    `select a.ts::text as tst, a.task_id, a.actor_member_id, a.kind, a.payload, t.title
     from task_activity a join tasks t on t.id=a.task_id
     where a.ts > $1::timestamptz and a.kind in ('created','assigned','unassigned','status_changed','progress_changed','archived')
     order by a.ts limit 200`, [st.activity]);
  for (const r of rows) {
    const p = r.payload || {}, by = name(r.actor_member_id), t = link(r.task_id, r.title);
    let msg = null;
    const event = activityEvent(r.kind, p);
    if (!event || !on(event)) { st.activity = r.tst; save(st); continue; }
    if (r.kind === "created") msg = `🆕 ${by} created ${t}`;
    else if (r.kind === "assigned") msg = `👤 ${by} assigned ${[].concat(p.members ?? p.member ?? []).map(name).join(", ") || "someone"} to ${t}`;
    else if (r.kind === "unassigned") msg = `👤 ${by} unassigned ${name(p.member)} from ${t}`;
    else if (r.kind === "status_changed") {
      const icon = { done: "✅", review: "👀", blocked: "⛔", in_progress: "▶️", backlog: "📥" }[p.to] ?? "🔁";
      msg = `${icon} ${t}: ${p.from ?? "?"} → *${p.to ?? "?"}* (by ${by})`;
    } else if (r.kind === "progress_changed" && Number(p.to) >= 100) msg = `💯 ${by} set ${t} to 100%`;
    else if (r.kind === "archived") msg = `🗄️ ${by} archived ${t}`;
    if (msg) await slack(msg);
    st.activity = r.tst; save(st);
  }
}

async function comments() {
  const { rows } = await db.query(
    `select c.ts::text as tst, c.task_id, c.member_id, c.body_md, c.mentions, t.title
     from task_comments c join tasks t on t.id=c.task_id
     where c.ts > $1::timestamptz and c.deleted_at is null order by c.ts limit 200`, [st.comments]);
  for (const r of rows) {
    await send(notesFor({ source: "task", events: EVENTS, details, row: r, by: name(r.member_id), place: link(r.task_id, r.title), who, people: PEOPLE, ccUrl: CC_URL }));
    st.comments = r.tst; save(st);
  }
}

// Each agent reply CircleChat could not use. CircleChat records each one in the run's result_json
// as `dropped`, with the conversation and a reason code, never the text (drops.mjs).
async function dropped() {
  const { rows } = await db.query(
    `select a.id as agent_id, a.handle, d->>'conversationId' as conversation_id, d->>'reason' as reason, c.kind, c.name
     from agent_runs r join agents a on a.id=r.agent_id
     cross join lateral jsonb_array_elements(r.result_json->'dropped') d
     left join conversations c on c.id = d->>'conversationId'
     where r.started_at > $1::timestamptz and jsonb_typeof(r.result_json->'dropped') = 'array'
     order by r.started_at limit 50`, [st.runs]);
  for (const r of rows) {
    const row = { handle: r.handle, agentId: r.agent_id, conversationId: r.conversation_id, kind: r.kind, name: r.name, reason: r.reason };
    await slack(droppedNote(row, { details, ccUrl: CC_URL }), { safe: true });
  }
}

// Agent output CircleChat refused to post, from a CircleChat that records no `dropped` yet. The
// heartbeat token leaking is noise; anything else is a message somebody was meant to read and
// never saw. A run with `dropped` is posted by dropped() instead.
async function rejected() {
  const { rows } = await db.query(
    `select r.started_at, a.handle, e as err
     from agent_runs r join agents a on a.id=r.agent_id,
     lateral jsonb_array_elements_text(coalesce(r.result_json->'errors','[]'::jsonb)) e
     where r.started_at > $1::timestamptz and e ilike '%rejected%' and e not ilike '%heartbeat_leaked%'
       and r.result_json->'dropped' is null
     order by r.started_at limit 50`, [st.runs]);
  for (const r of rows) {
    await slack(`⚠️ @${r.handle} (agent) tried to post, and CircleChat rejected it: ${String(r.err).slice(0, 200)}`);
  }
}

// Both checks read the runs since st.runs, then move it on once.
async function runs() {
  if (on("reply_dropped")) await dropped();
  if (on("post_rejected")) await rejected();
  const { rows: [m] } = await db.query(`select max(started_at)::text as t from agent_runs where started_at > $1::timestamptz`, [st.runs]);
  if (m?.t) { st.runs = m.t; save(st); }
}

async function stale() {
  if (!on("task_stalled") || Date.now() - st.staleAt < 3600_000) return;
  st.staleAt = Date.now();
  const { rows } = await db.query(
    `select t.id, t.title, t.status, coalesce(max(a.ts), t.updated_at) as last,
            array_agg(distinct ta.member_id) filter (where ta.member_id is not null) as assignees
     from tasks t left join task_activity a on a.task_id=t.id
     left join task_assignees ta on ta.task_id=t.id
     where not t.archived and t.status in ('blocked','in_progress')
     group by t.id
     having coalesce(max(a.ts), t.updated_at) < now() - make_interval(hours => case when t.status='blocked' then $1::int else $2::int end)`,
    [STALE_BLOCKED_H, STALE_ACTIVE_H]);
  for (const r of rows) {
    const key = `${r.id}:${r.status}:${new Date(r.last).toISOString()}`;
    if (st.staleSent[r.id] === key) continue; // once per stall, not every hour
    const hrs = Math.round((Date.now() - new Date(r.last)) / 3600_000);
    await slack(`⏰ ${link(r.id, r.title)} has been *${r.status}* for ${hrs}h with no activity (${(r.assignees || []).map(name).join(", ") || "unassigned"})`);
    st.staleSent[r.id] = key; save(st);
  }
}

// Each new approval that still waits for a person, once, in the stack's channel.
async function approvals() {
  const { rows } = await db.query(
    `select p.created_at::text as tst, p.status, p.action, a.handle
     from approvals p left join agents a on a.id=p.agent_id
     where p.created_at > $1::timestamptz order by p.created_at limit 200`, [st.approvals]);
  for (const r of rows) {
    if (on("approval_pending") && r.status === "pending") await slack(approvalText({ details, handle: r.handle ?? "unknown", action: r.action, ccUrl: CC_URL }), { safe: true });
    st.approvals = r.tst; save(st);
  }
}

// Each chat message in a channel that mentions a person: a DM to each mentioned person. A message
// in a DM never reaches Slack.
async function chatMentions() {
  if (!on("chat_mention")) {
    // The event is off: move the read time on, so a later change of the setting sends no old message.
    const { rows: [m] } = await db.query(`select max(ts)::text as t from messages where ts > $1::timestamptz`, [st.messages]);
    if (m?.t) { st.messages = m.t; save(st); }
    return;
  }
  const { rows } = await db.query(
    `select m.ts::text as tst, m.member_id, m.body_md, m.mentions, m.deleted_at, m.conversation_id, c.kind, c.name
     from messages m join conversations c on c.id=m.conversation_id
     where m.ts > $1::timestamptz order by m.ts limit 200`, [st.messages]);
  for (const r of rows) {
    if (!r.deleted_at) {
      const base = CC_URL.replace(/\/$/, ""), label = `#${String(r.name ?? "").replace(/[<>&|]/g, "")}`;
      const place = base ? `<${base}/c/${r.conversation_id}|${label}>` : label;
      await send(notesFor({ source: "chat", events: EVENTS, details, row: r, by: name(r.member_id), place, who, people: PEOPLE, ccUrl: CC_URL }));
    }
    st.messages = r.tst; save(st);
  }
}

async function tick() {
  try { await refreshWho(); await activity(); await comments(); await runs(); await approvals(); await chatMentions(); await stale(); }
  catch (e) { console.error(new Date().toISOString(), e.message); }
}
console.log("circlechat → slack notifier running");
await tick();
setInterval(tick, 30_000);
