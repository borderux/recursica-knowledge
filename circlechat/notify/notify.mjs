// CircleChat → Slack. Polls the database every 30 s, so it survives restarts without missing
// anything: the last activity time it sent is kept in /state/last.json.
//
// Timestamps are kept as Postgres text, microseconds included: a JS Date drops them, and the
// last event would be re-sent on every poll.
//
// Posts: task created / assigned / status changed / done; every comment (marked when it
// @mentions a person); agent posts CircleChat rejected (the silent failures); and once an hour,
// tasks stuck in blocked or in_progress with no activity.
import fs from "node:fs";
import pg from "pg";

const { DATABASE_URL, SLACK_BOT_TOKEN, SLACK_CHANNEL, CC_URL = "", NOTIFY_DETAILS = "on", STACK_NAME = "" } = process.env;
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
save(st); // so a restart picks up from here, not from whenever it restarts

const link = (id, title) => CC_URL ? `<${CC_URL.replace(/\/$/, "")}/board?task=${id}|${title}>` : `*${title}*`;
// With NOTIFY_DETAILS=off (a client stack, by default), Slack gets no task titles or comments:
// one note at most every 10 minutes that CircleChat has new activity.
let lastMinimal = 0;
async function slack(text) {
  if (NOTIFY_DETAILS === "off") {
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

// member id → "@handle" (people) or "@handle (agent)"
const WHO = `
  select m.id, m.kind, coalesce(u.handle, a.handle) as handle
  from members m left join users u on m.kind='user' and u.id=m.ref_id
  left join agents a on m.kind='agent' and a.id=m.ref_id`;
let who = new Map();
async function refreshWho() { who = new Map((await db.query(WHO)).rows.map((r) => [r.id, r])); }
const name = (id) => { const w = who.get(id); return w ? `@${w.handle}${w.kind === "agent" ? " (agent)" : ""}` : "someone"; };
const isPerson = (id) => who.get(id)?.kind === "user";

async function activity() {
  const { rows } = await db.query(
    `select a.ts::text as tst, a.task_id, a.actor_member_id, a.kind, a.payload, t.title
     from task_activity a join tasks t on t.id=a.task_id
     where a.ts > $1::timestamptz and a.kind in ('created','assigned','unassigned','status_changed','progress_changed','archived')
     order by a.ts limit 200`, [st.activity]);
  for (const r of rows) {
    const p = r.payload || {}, by = name(r.actor_member_id), t = link(r.task_id, r.title);
    let msg = null;
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
    const people = (r.mentions || []).filter(isPerson);
    const tag = people.length ? `❓ *needs ${people.map(name).join(", ")}* — ` : "💬 ";
    const body = r.body_md.replace(/\s+/g, " ").slice(0, 400);
    await slack(`${tag}${name(r.member_id)} on ${link(r.task_id, r.title)}: ${body}`);
    st.comments = r.tst; save(st);
  }
}

// Agent output CircleChat refused to post. The heartbeat token leaking is noise; anything else
// is a message somebody was meant to read and never saw.
async function rejected() {
  const { rows } = await db.query(
    `select r.started_at, a.handle, e as err
     from agent_runs r join agents a on a.id=r.agent_id,
     lateral jsonb_array_elements_text(coalesce(r.result_json->'errors','[]'::jsonb)) e
     where r.started_at > $1::timestamptz and e ilike '%rejected%' and e not ilike '%heartbeat_leaked%'
     order by r.started_at limit 50`, [st.runs]);
  for (const r of rows) {
    await slack(`⚠️ @${r.handle} (agent) tried to post, and CircleChat rejected it: ${String(r.err).slice(0, 200)}`);
  }
  const { rows: [m] } = await db.query(`select max(started_at)::text as t from agent_runs where started_at > $1::timestamptz`, [st.runs]);
  if (m?.t) { st.runs = m.t; save(st); }
}

async function stale() {
  if (Date.now() - st.staleAt < 3600_000) return;
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

async function tick() {
  try { await refreshWho(); await activity(); await comments(); await rejected(); await stale(); }
  catch (e) { console.error(new Date().toISOString(), e.message); }
}
console.log("circlechat → slack notifier running");
await tick();
setInterval(tick, 30_000);
