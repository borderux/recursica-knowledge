// kit/agent-check.mjs against stand-ins: a small CircleChat in this file, with only the routes the
// check uses, and a scripted agent behind it. The stand-in signs the check in as its own account
// and gives a member what CircleChat gives a member: each agent and each run without the
// admin-only fields, and a 403 from each admin-only route. The agent behaves well in one run, and in each other
// run does one thing wrong: a request during a turn is refused, it asks twice, it touches a task in
// review, or its long reply is posted without a file. Nothing here reaches Docker, a model, the
// tailnet or launchd: the server listens on 127.0.0.1 only, on a port the system picks.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { runChecks, apiClient, namesThree, optionsFromEnv, main } from "./agent-check.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const SESSION = "stand-in-session-0123456789abcdef";
const EMAIL = "agent-check@circlechat.example.com";
const PASSWORD = "stand-in-password-0123456789";
const HANDLE = "standin";
const CHECKER = "m_checker";
const AGENT_MEMBER = "m_agent";
const AGENT_ID = "a_standin";
const TURN_MS = 120;

// The limits and the split in the fork's api/src/agents/long-reply.ts, for a chat message.
function splitLongReply(body, max) {
  if (body.length <= max) return { body, file: null };
  const lead = body.trim().split(/\n\s*\n/)[0].slice(0, 400);
  return { body: `${lead}\n\n_The full text (${body.length} characters) is attached as reply.md._`, file: { name: "reply.md", size: body.length } };
}

// What CircleChat shows a member (the fork's api/src/lib/agent-view.ts): an agent's identity, and
// each run's outcome and timing with no error text, prompt or trace.
const PUBLIC_AGENT = ["id", "handle", "name", "avatarColor", "title", "brief", "status", "memberId", "model"];
const publicAgent = (a) => Object.fromEntries(Object.entries(a).filter(([k]) => PUBLIC_AGENT.includes(k)));
const publicRun = (r) => ({ id: r.id, trigger: r.trigger, status: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt, durationSec: null,
  summary: r.status === "failed" ? "The run did not finish." : r.resultJson?.skipped ? "Skipped — nothing to do." : "Finished with no changes." });

// A stand-in CircleChat, with the check's account and one agent. `faults` names what the agent
// gets wrong. `role` is the check's account's role in the workspace.
function standIn(faults = {}, { role = "member" } = {}) {
  let last = 0;
  let seq = 0;
  const now = () => { last = Math.max(Date.now(), last + 1); return new Date(last).toISOString(); };
  const nid = (p) => `${p}_${++seq}`;
  const s = {
    conversations: new Map(),
    messages: [],
    tasks: new Map(),
    runs: [],
    queue: [],
    running: null,
    agent: { id: AGENT_ID, handle: HANDLE, name: "Stand-in", memberId: AGENT_MEMBER, kind: "hermes", configJson: { deliverablesOnly: false }, botToken: "cc_bot_****" },
    role,
    logins: 0,
    logouts: 0,
    denied: [],
  };
  const admin = () => s.role === "admin";
  const deny = (what) => { s.denied.push(what); return 403; };

  // ---- the agent's turns: one at a time, a queue for requests, heartbeats skipped while busy ----
  function enqueue(trigger, ctx = {}) {
    const run = { id: nid("run"), trigger, status: "queued", startedAt: now(), finishedAt: null, errorText: null, resultJson: null, ctx };
    s.runs.push(run);
    setImmediate(() => claim(run));
    return run;
  }
  const heartbeat = (run) => run.trigger === "scheduled" || run.trigger === "ambient";
  function claim(run) {
    if (heartbeat(run) && (s.running || s.queue.length)) {
      Object.assign(run, { status: "ok", resultJson: { skipped: "agent_busy" }, finishedAt: now() });
      return;
    }
    if (s.running || s.queue.length) {
      if (faults.refusesBusy) {
        Object.assign(run, { status: "failed", errorText: "agent_busy: a turn is running", finishedAt: now() });
        return;
      }
      s.queue.push(run);
      return;
    }
    start(run);
  }
  function start(run) {
    s.running = run;
    Object.assign(run, { status: "running", startedAt: now() });
    const seen = snapshot(); // a turn reads the workspace when it starts
    setTimeout(() => {
      try { think(run, seen); } finally {
        Object.assign(run, { status: "ok", finishedAt: now() });
        s.running = null;
        const next = s.queue.shift();
        if (next) start(next);
      }
    }, TURN_MS);
  }
  function snapshot() {
    return {
      tasks: [...s.tasks.values()].map((t) => ({ ...t, comments: [...t.comments], activity: [...t.activity] })),
      messages: [...s.messages],
    };
  }

  // ---- what the agent does with a turn ----
  const mine = (x) => x.memberId === AGENT_MEMBER;
  function settled(t) {
    if (!["review", "done"].includes(t.status)) return false;
    const moved = t.activity.filter((a) => a.kind === "status_changed").map((a) => a.ts).sort().pop() ?? t.createdAt;
    return !t.comments.some((c) => !mine(c) && c.ts > moved);
  }
  function think(run, seen) {
    if (heartbeat(run)) {
      for (const t of seen.tasks) {
        if (!t.assignees.includes(AGENT_MEMBER)) continue;
        const lastComment = t.comments.at(-1);
        if (faults.asksTwice && lastComment && mine(lastComment) && /\?/.test(lastComment.bodyMd)) {
          comment(t.id, AGENT_MEMBER, "Just checking: what should I write about?");
        }
        if (faults.touchesSettled && t.status === "review") comment(t.id, AGENT_MEMBER, "Re-sharing the result.");
      }
      return;
    }
    if (run.ctx.taskId) {
      const t = seen.tasks.find((x) => x.id === run.ctx.taskId);
      if (!t || settled(t)) return;
      const people = t.comments.filter((c) => !mine(c));
      const request = people.at(-1)?.bodyMd ?? t.bodyMd;
      const asked = t.comments.some((c) => mine(c) && /\?/.test(c.bodyMd));
      if (/fruits/.test(request)) comment(t.id, AGENT_MEMBER, "Glimberry, sunplum and moonmelon.");
      else if (/Write something for me/.test(request) && !asked) comment(t.id, AGENT_MEMBER, "What should I write about?");
      else if (asked && people.length) comment(t.id, AGENT_MEMBER, "Here it is: four lines about the sea, in reply.md.");
      return;
    }
    if (run.ctx.messageId) {
      const m = s.messages.find((x) => x.id === run.ctx.messageId);
      if (m && /characters/.test(m.bodyMd)) {
        const text = ["A made-up guide to a garden.", ...Array.from({ length: 12 }, (_, i) => `Part ${i + 1}. ${"Water the beds early and mulch them well. ".repeat(5)}`)].join("\n\n");
        post(m.conversationId, AGENT_MEMBER, text, m.id);
      }
    }
  }

  // ---- the data ----
  function post(conversationId, memberId, bodyMd, parentId = null) {
    let body = bodyMd;
    const attachmentsJson = [];
    if (memberId === AGENT_MEMBER && !faults.longWithoutFile) {
      const split = splitLongReply(bodyMd, s.agent.configJson.deliverablesOnly ? 600 : 2000);
      body = split.body;
      if (split.file) attachmentsJson.push({ key: `u/x/${split.file.name}`, name: split.file.name, contentType: "text/markdown", size: split.file.size, url: "/files/x" });
    }
    const m = { id: nid("msg"), conversationId, memberId, parentId, bodyMd: body, attachmentsJson, ts: now() };
    s.messages.push(m);
    if (memberId !== AGENT_MEMBER && new RegExp(`@${HANDLE}\\b`).test(bodyMd) && s.conversations.get(conversationId)?.members.includes(AGENT_MEMBER)) {
      enqueue("mention", { conversationId, messageId: m.id });
    }
    return m;
  }
  function comment(taskId, memberId, bodyMd) {
    const t = s.tasks.get(taskId);
    const c = { id: nid("tcom"), taskId, memberId, bodyMd, attachmentsJson: [], ts: now() };
    t.comments.push(c);
    t.activity.push({ id: nid("act"), taskId, actorMemberId: memberId, kind: "comment", ts: c.ts });
    if (memberId !== AGENT_MEMBER && t.assignees.includes(AGENT_MEMBER)) enqueue("task_comment", { taskId });
    return c;
  }
  const taskView = (t) => ({ id: t.id, title: t.title, bodyMd: t.bodyMd, status: t.status, archived: t.archived, createdAt: t.createdAt, assignees: t.assignees });

  // ---- the routes ----
  const routes = [
    ["GET", /^\/api\/me$/, () => ({ user: { email: EMAIL }, memberId: CHECKER, workspaceId: "w_1", workspaces: [{ id: "w_1", name: "Agents", role: s.role }] })],
    ["GET", /^\/api\/agents$/, () => ({ agents: [admin() ? { ...s.agent } : publicAgent(s.agent)] })],
    ["GET", /^\/api\/agents\/([^/]+)$/, ([id]) => {
      if (id !== AGENT_ID) return 404;
      const runs = [...s.runs].reverse().slice(0, 25).map(({ ctx: _c, ...r }) => r);
      return { agent: admin() ? { ...s.agent } : publicAgent(s.agent), channels: [], recentRuns: admin() ? runs : runs.map(publicRun) };
    }],
    // Admin-only in CircleChat, or an agent's settings: a member gets 403.
    ["PATCH", /^\/api\/agents\/([^/]+)$/, () => (admin() ? { ok: true } : deny("PATCH /agents/:id"))],
    ["GET", /^\/api\/agents\/([^/]+)\/(export|memory)$/, ([, what]) => (admin() ? {} : deny(`GET /agents/:id/${what}`))],
    ["POST", /^\/api\/auth\/invite$/, () => (admin() ? {} : deny("POST /auth/invite"))],
    ["PATCH", /^\/api\/workspaces\/([^/]+)\/members\/([^/]+)$/, () => (admin() ? {} : deny("PATCH /workspaces/:id/members/:userId"))],
    ["POST", /^\/api\/auth\/logout$/, () => { s.logouts++; return { ok: true }; }],
    ["GET", /^\/api\/agents\/([^/]+)\/queue$/, () => ({
      running: s.running ? { runId: s.running.id, trigger: s.running.trigger, startedAt: s.running.startedAt, taskId: s.running.ctx.taskId ?? null, taskTitle: null } : null,
      waiting: s.queue.map((r, i) => ({ runId: r.id, position: i + 1, trigger: r.trigger, taskId: r.ctx.taskId ?? null, taskTitle: null, priority: "normal", enqueuedAt: r.startedAt })),
    })],
    ["POST", /^\/api\/agents\/([^/]+)\/run-heartbeat$/, () => ({ runId: enqueue("scheduled").id })],
    ["GET", /^\/api\/agent-runs\/([^/]+)$/, ([id]) => {
      const r = s.runs.find((x) => x.id === id);
      if (!r) return 404;
      const { ctx: _c, ...run } = r;
      return { run: admin() ? run : publicRun(run) };
    }],
    ["POST", /^\/api\/conversations$/, (_, b) => {
      const id = nid("c");
      s.conversations.set(id, { id, name: b.name, isPrivate: b.isPrivate, archived: false, createdBy: CHECKER, members: [CHECKER, ...(b.memberIds ?? [])] });
      return { id };
    }],
    // The channel's own admin, its maker, archives it, as in CircleChat.
    ["POST", /^\/api\/conversations\/([^/]+)\/archive$/, ([id]) => {
      const c = s.conversations.get(id);
      if (c.createdBy !== CHECKER) return deny("POST /conversations/:id/archive");
      c.archived = true;
      return { ok: true };
    }],
    ["GET", /^\/api\/conversations\/([^/]+)\/messages$/, ([id], _b, q) => {
      const parent = q.get("parent_id");
      return { messages: s.messages.filter((m) => m.conversationId === id && (parent ? m.parentId === parent : !m.parentId)), hasMore: false };
    }],
    ["POST", /^\/api\/conversations\/([^/]+)\/messages$/, ([id], b) => ({ message: post(id, CHECKER, b.bodyMd, b.parentId ?? null) })],
    ["POST", /^\/api\/tasks$/, (_, b) => {
      const t = { id: nid("task"), title: b.title, bodyMd: b.bodyMd ?? "", status: b.status ?? "backlog", archived: false, conversationId: b.conversationId ?? null,
        assignees: b.assignees ?? [], comments: [], activity: [], artifacts: [], createdAt: now() };
      s.tasks.set(t.id, t);
      t.activity.push({ id: nid("act"), taskId: t.id, actorMemberId: CHECKER, kind: "created", ts: t.createdAt });
      if (t.assignees.includes(AGENT_MEMBER)) enqueue("task_assigned", { taskId: t.id });
      return { task: taskView(t) };
    }],
    ["GET", /^\/api\/tasks\/([^/]+)$/, ([id]) => {
      const t = s.tasks.get(id);
      if (!t) return 404;
      return { task: taskView(t), subtasks: [], links: [], comments: [...t.comments], activity: [...t.activity].reverse() };
    }],
    ["PATCH", /^\/api\/tasks\/([^/]+)$/, ([id], b) => {
      const t = s.tasks.get(id);
      if (b.status && b.status !== t.status) {
        t.activity.push({ id: nid("act"), taskId: id, actorMemberId: CHECKER, kind: "status_changed", payload: { from: t.status, to: b.status }, ts: now() });
        t.status = b.status;
      }
      if (b.archived !== undefined) t.archived = b.archived;
      return { task: taskView(t) };
    }],
    ["POST", /^\/api\/tasks\/([^/]+)\/comments$/, ([id], b) => ({ comment: comment(id, CHECKER, b.bodyMd) })],
    ["GET", /^\/api\/tasks\/([^/]+)\/artifacts$/, ([id]) => ({ artifacts: s.tasks.get(id)?.artifacts ?? [] })],
  ];

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => { raw += d; });
    req.on("end", () => {
      const send = (code, body, headers = {}) => { res.writeHead(code, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(body)); };
      if (req.method === "POST" && req.url === "/api/auth/login") {
        const b = raw ? JSON.parse(raw) : {};
        if (b.email !== EMAIL || b.password !== PASSWORD) return send(401, { error: "invalid_credentials" });
        s.logins++;
        return send(200, { ok: true, memberId: CHECKER, workspaceId: "w_1" }, { "set-cookie": `cc_session=${SESSION}; Path=/; HttpOnly; SameSite=Lax` });
      }
      if (req.headers.cookie !== `cc_session=${SESSION}`) return send(401, { error: "unauthenticated" });
      const url = new URL(req.url, "http://x");
      for (const [method, re, fn] of routes) {
        const m = re.exec(url.pathname);
        if (!m || method !== req.method) continue;
        let out;
        try { out = fn(m.slice(1), raw ? JSON.parse(raw) : {}, url.searchParams); } catch (e) { return send(500, { error: String(e.message) }); }
        if (out === 403) return send(403, { error: "admin_only" });
        return out === 404 ? send(404, { error: "not_found" }) : send(200, out);
      }
      send(404, { error: "no_route" });
    });
  });
  return {
    state: s,
    async listen() {
      await new Promise((r) => server.listen(0, "127.0.0.1", r));
      return `http://127.0.0.1:${server.address().port}/api`;
    },
    close: () => new Promise((r) => server.close(r)),
  };
}

// Fast settings: the stand-in answers in about a tenth of a second.
const FAST = { replyTimeoutMs: 4000, turnTimeoutMs: 4000, quietMs: 300, heartbeats: 2, commentDelayMs: 0, pollMs: 20, only: [1, 2, 3, 4], keep: false };

// Signs in as the check's account, as main() does.
async function signedIn(base) {
  const api = apiClient({ base });
  await api.login(EMAIL, PASSWORD);
  return api;
}

async function run(faults) {
  const cc = standIn(faults);
  const base = await cc.listen();
  try {
    const lines = [];
    const results = await runChecks({ api: await signedIn(base), handle: HANDLE, opts: FAST, log: (l) => lines.push(l) });
    return { results, lines, state: cc.state };
  } finally {
    await cc.close();
  }
}
const statusOf = (results) => Object.fromEntries(results.map((r) => [r.check, r.status]));

test("a well-behaved agent passes all four checks as a member, and the channel and tasks are archived", async () => {
  const { results, lines, state } = await run({});
  assert.deepEqual(state.denied, [], "the check never needs an admin-only route");
  assert.deepEqual(statusOf(results), { 1: "PASS", 2: "PASS", 3: "PASS", 4: "PASS" }, lines.join("\n"));
  assert.match(results[0].reason, /waited in the queue at position 1/);
  assert.match(results[1].reason, /one question/);
  assert.match(results[3].reason, /reply\.md/);
  assert.equal(lines.length, 4);
  for (const l of lines) assert.match(l, /^PASS  [1-4]\. /);
  assert.ok([...state.conversations.values()].every((c) => c.archived && c.isPrivate));
  assert.ok([...state.tasks.values()].every((t) => t.archived));
});

test("a request refused during a running turn fails check 1", async () => {
  const { results, lines } = await run({ refusesBusy: true });
  const s = statusOf(results);
  assert.equal(s[1], "FAIL", lines.join("\n"));
  assert.match(results.find((r) => r.check === 1).reason, /failed instead of waiting in the agent's queue \(a refusal as agent_busy/);
  assert.match(lines[0], /^FAIL  1\. a request during a running turn is answered: /);
});

test("an agent that asks twice fails check 2", async () => {
  const { results, lines } = await run({ asksTwice: true });
  const s = statusOf(results);
  assert.equal(s[1], "PASS", lines.join("\n"));
  assert.equal(s[2], "FAIL", lines.join("\n"));
  assert.match(results.find((r) => r.check === 2).reason, /asking again/);
});

test("an agent that touches a task in review fails check 3", async () => {
  const { results, lines } = await run({ touchesSettled: true });
  const s = statusOf(results);
  assert.equal(s[1], "PASS", lines.join("\n"));
  assert.equal(s[2], "PASS", lines.join("\n"));
  assert.equal(s[3], "FAIL", lines.join("\n"));
  assert.match(results.find((r) => r.check === 3).reason, /\d+ comments?/);
});

test("a long reply posted without a file fails check 4", async () => {
  const { results, lines } = await run({ longWithoutFile: true });
  const s = statusOf(results);
  assert.equal(s[4], "FAIL", lines.join("\n"));
  assert.match(results.find((r) => r.check === 4).reason, /over the chat limit of 2000, with no reply\.md/);
});

test("check 4 uses the deliverables-only limit of 600 with CHECK_DELIVERABLES_ONLY, which a member cannot read from CircleChat", async () => {
  const cc = standIn({});
  cc.state.agent.configJson.deliverablesOnly = true;
  const base = await cc.listen();
  try {
    const results = await runChecks({ api: await signedIn(base), handle: HANDLE, opts: { ...FAST, only: [4], deliverablesOnly: true } });
    assert.equal(results[0].status, "PASS");
    assert.match(results[0].reason, /deliverables-only limit of 600/);
    assert.deepEqual(cc.state.denied, []);
  } finally {
    await cc.close();
  }
});

test("an account with the admin role is refused before the first check, and nothing is made", async () => {
  const cc = standIn({}, { role: "admin" });
  const base = await cc.listen();
  try {
    await assert.rejects(runChecks({ api: await signedIn(base), handle: HANDLE, opts: FAST }), /is admin in the workspace, and the check runs as a member only/);
    assert.equal(cc.state.conversations.size, 0);
    assert.equal(cc.state.tasks.size, 0);
  } finally {
    await cc.close();
  }
});

test("an answer counts when it names three things and asks nothing", () => {
  assert.ok(namesThree("Glimberry, sunplum and moonmelon."));
  assert.ok(namesThree("Glimberry\nSunplum\nMoonmelon"));
  assert.ok(!namesThree("On it."));
  assert.ok(!namesThree("Which fruits, how many, and in what format?"));
});

test("every wait has a limit from the environment, with defaults", () => {
  const d = optionsFromEnv({});
  assert.equal(d.replyTimeoutMs, 900_000);
  assert.equal(d.turnTimeoutMs, 600_000);
  assert.equal(d.quietMs, 60_000);
  assert.equal(d.heartbeats, 2);
  assert.deepEqual(d.only, [1, 2, 3, 4]);
  const o = optionsFromEnv({ CHECK_REPLY_TIMEOUT: "30", CHECK_COMMENT_DELAY: "9", CHECK_ONLY: "1,3", CHECK_KEEP: "1" });
  assert.equal(o.replyTimeoutMs, 30_000);
  assert.equal(o.commentDelayMs, 2000, "the comment comes within 2 s of the assignment");
  assert.deepEqual(o.only, [1, 3]);
  assert.equal(o.keep, true);
  assert.equal(d.deliverablesOnly, false);
  assert.equal(optionsFromEnv({ CHECK_DELIVERABLES_ONLY: "1" }).deliverablesOnly, true);
  assert.throws(() => optionsFromEnv({ CHECK_ONLY: "5" }));
  assert.throws(() => optionsFromEnv({ CHECK_QUIET: "soon" }));
});

// A stack folder with the check's password file and a site.json.
function stackDir({ password = PASSWORD } = {}) {
  const cc = fs.mkdtempSync(path.join(os.tmpdir(), "agent-check-"));
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ site: { public_host: "circlechat.example.ts.net", check_account: EMAIL } }));
  if (password !== null) fs.writeFileSync(path.join(cc, "agent-check.env"), `CC_CHECK_PASSWORD=${password}\n`, { mode: 0o600 });
  return cc;
}

test("the command signs in as the check's account, prints one line per check, exits 1 on a failure, signs out, and never prints the password", async () => {
  const cc = standIn({ touchesSettled: true });
  const base = await cc.listen();
  try {
    const dir = stackDir();
    const env = {
      PATH: process.env.PATH, CC_API_BASE: base, CC_DIR: dir, SITE: path.join(dir, "site.json"),
      CHECK_REPLY_TIMEOUT: "4", CHECK_TURN_TIMEOUT: "4", CHECK_QUIET: "0.3", CHECK_COMMENT_DELAY: "0", CHECK_POLL: "0.02",
    };
    const child = spawn(process.execPath, [path.join(here, "agent-check.mjs"), HANDLE], { env });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const code = await new Promise((r) => child.on("close", r));
    assert.equal(code, 1, out);
    assert.equal(out.match(/^(PASS|FAIL|SKIP) {1,2}[1-4]\. /gm)?.length, 4, out);
    assert.match(out, /^FAIL  3\. a settled task stays untouched: /m);
    assert.match(out, new RegExp(`as ${EMAIL}, a member of the workspace`));
    assert.ok(!out.includes(SESSION) && !out.includes(PASSWORD), out);
    assert.equal(cc.state.logins, 1);
    assert.equal(cc.state.logouts, 1, "the check signs out at the end");
    assert.deepEqual(cc.state.denied, []);
  } finally {
    await cc.close();
  }
});

test("a usage, password or sign-in problem exits 2 without printing a secret", async () => {
  const lines = [];
  const log = (l) => lines.push(l);
  const dir = stackDir();
  assert.equal(await main([], {}, log), 2);
  assert.equal(await main([HANDLE], { CC_DIR: dir }, log), 2);
  assert.match(lines.at(-1), /no CC_API_BASE/);
  // No password file, or a short password: refused before anything reaches CircleChat.
  const none = stackDir({ password: null });
  assert.equal(await main([HANDLE], { CC_API_BASE: "http://127.0.0.1:9/api", CC_DIR: none }, log), 2);
  assert.match(lines.at(-1), /no .*agent-check\.env\. Add CC_CHECK_PASSWORD to the stack's GitHub environment/);
  assert.equal(await main([HANDLE], { CC_API_BASE: "http://127.0.0.1:9/api", CC_DIR: stackDir({ password: "short" }) }, log), 2);
  assert.match(lines.at(-1), /at least 16 characters/);
  const cc = standIn({});
  const base = await cc.listen();
  try {
    // A wrong password: CircleChat refuses the sign-in.
    const wrong = stackDir({ password: "a-wrong-password-0123456789" });
    assert.equal(await main([HANDLE], { CC_API_BASE: base, CC_DIR: wrong }, log), 2);
    assert.match(lines.at(-1), /POST \/auth\/login answered 401/);
    assert.equal(cc.state.logouts, 0);
  } finally {
    await cc.close();
  }
  assert.ok(lines.every((l) => !l.includes(SESSION) && !l.includes(PASSWORD) && !l.includes("a-wrong-password")), lines.join("\n"));
});

test("an admin's sign-in stops the command before any check, and still signs out", async () => {
  const cc = standIn({}, { role: "admin" });
  const base = await cc.listen();
  try {
    const lines = [];
    assert.equal(await main([HANDLE], { CC_API_BASE: base, CC_DIR: stackDir() }, (l) => lines.push(l)), 2);
    assert.match(lines.at(-1), /runs as a member only/);
    assert.equal(cc.state.logouts, 1);
    assert.equal(cc.state.tasks.size, 0);
  } finally {
    await cc.close();
  }
});
