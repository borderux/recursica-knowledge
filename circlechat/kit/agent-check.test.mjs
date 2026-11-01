// kit/agent-check.mjs against stand-ins: a small CircleChat in this file, with only the routes the
// check uses, and a scripted agent behind it. The agent behaves well in one run, and in each other
// run does one thing wrong: a request during a turn is refused, it asks twice, it touches a task in
// review, or its long reply is posted without a file. Nothing here reaches Docker, a model, the
// tailnet or launchd: the server listens on 127.0.0.1 only, on a port the system picks.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { runChecks, apiClient, namesThree, optionsFromEnv, main } from "./agent-check.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const SESSION = "stand-in-session-0123456789abcdef";
const HANDLE = "standin";
const PERSON = "m_person";
const AGENT_MEMBER = "m_agent";
const AGENT_ID = "a_standin";
const TURN_MS = 120;

// The limits and the split in the fork's api/src/agents/long-reply.ts, for a chat message.
function splitLongReply(body, max) {
  if (body.length <= max) return { body, file: null };
  const lead = body.trim().split(/\n\s*\n/)[0].slice(0, 400);
  return { body: `${lead}\n\n_The full text (${body.length} characters) is attached as reply.md._`, file: { name: "reply.md", size: body.length } };
}

// A stand-in CircleChat, with one person and one agent. `faults` names what the agent gets wrong.
function standIn(faults = {}) {
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
    agent: { id: AGENT_ID, handle: HANDLE, memberId: AGENT_MEMBER, configJson: { deliverablesOnly: false } },
  };

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
    ["GET", /^\/api\/me$/, () => ({ memberId: PERSON, workspaceId: "w_1" })],
    ["GET", /^\/api\/agents$/, () => ({ agents: [{ ...s.agent }] })],
    ["GET", /^\/api\/agents\/([^/]+)$/, ([id]) => (id === AGENT_ID ? { agent: { ...s.agent }, channels: [], recentRuns: [...s.runs].reverse().slice(0, 25).map(({ ctx: _c, ...r }) => r) } : 404)],
    ["GET", /^\/api\/agents\/([^/]+)\/queue$/, () => ({
      running: s.running ? { runId: s.running.id, trigger: s.running.trigger, startedAt: s.running.startedAt, taskId: s.running.ctx.taskId ?? null, taskTitle: null } : null,
      waiting: s.queue.map((r, i) => ({ runId: r.id, position: i + 1, trigger: r.trigger, taskId: r.ctx.taskId ?? null, taskTitle: null, priority: "normal", enqueuedAt: r.startedAt })),
    })],
    ["POST", /^\/api\/agents\/([^/]+)\/run-heartbeat$/, () => ({ runId: enqueue("scheduled").id })],
    ["GET", /^\/api\/agent-runs\/([^/]+)$/, ([id]) => {
      const r = s.runs.find((x) => x.id === id);
      if (!r) return 404;
      const { ctx: _c, ...run } = r;
      return { run };
    }],
    ["POST", /^\/api\/conversations$/, (_, b) => {
      const id = nid("c");
      s.conversations.set(id, { id, name: b.name, isPrivate: b.isPrivate, archived: false, members: [PERSON, ...(b.memberIds ?? [])] });
      return { id };
    }],
    ["POST", /^\/api\/conversations\/([^/]+)\/archive$/, ([id]) => { s.conversations.get(id).archived = true; return { ok: true }; }],
    ["GET", /^\/api\/conversations\/([^/]+)\/messages$/, ([id], _b, q) => {
      const parent = q.get("parent_id");
      return { messages: s.messages.filter((m) => m.conversationId === id && (parent ? m.parentId === parent : !m.parentId)), hasMore: false };
    }],
    ["POST", /^\/api\/conversations\/([^/]+)\/messages$/, ([id], b) => ({ message: post(id, PERSON, b.bodyMd, b.parentId ?? null) })],
    ["POST", /^\/api\/tasks$/, (_, b) => {
      const t = { id: nid("task"), title: b.title, bodyMd: b.bodyMd ?? "", status: b.status ?? "backlog", archived: false, conversationId: b.conversationId ?? null,
        assignees: b.assignees ?? [], comments: [], activity: [], artifacts: [], createdAt: now() };
      s.tasks.set(t.id, t);
      t.activity.push({ id: nid("act"), taskId: t.id, actorMemberId: PERSON, kind: "created", ts: t.createdAt });
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
        t.activity.push({ id: nid("act"), taskId: id, actorMemberId: PERSON, kind: "status_changed", payload: { from: t.status, to: b.status }, ts: now() });
        t.status = b.status;
      }
      if (b.archived !== undefined) t.archived = b.archived;
      return { task: taskView(t) };
    }],
    ["POST", /^\/api\/tasks\/([^/]+)\/comments$/, ([id], b) => ({ comment: comment(id, PERSON, b.bodyMd) })],
    ["GET", /^\/api\/tasks\/([^/]+)\/artifacts$/, ([id]) => ({ artifacts: s.tasks.get(id)?.artifacts ?? [] })],
  ];

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => { raw += d; });
    req.on("end", () => {
      const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
      if (req.headers.cookie !== `cc_session=${SESSION}`) return send(401, { error: "unauthenticated" });
      const url = new URL(req.url, "http://x");
      for (const [method, re, fn] of routes) {
        const m = re.exec(url.pathname);
        if (!m || method !== req.method) continue;
        let out;
        try { out = fn(m.slice(1), raw ? JSON.parse(raw) : {}, url.searchParams); } catch (e) { return send(500, { error: String(e.message) }); }
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

async function run(faults) {
  const cc = standIn(faults);
  const base = await cc.listen();
  try {
    const lines = [];
    const results = await runChecks({ api: apiClient({ base, session: SESSION }), handle: HANDLE, opts: FAST, log: (l) => lines.push(l) });
    return { results, lines, state: cc.state };
  } finally {
    await cc.close();
  }
}
const statusOf = (results) => Object.fromEntries(results.map((r) => [r.check, r.status]));

test("a well-behaved agent passes all four checks, and the channel and tasks are archived", async () => {
  const { results, lines, state } = await run({});
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
  assert.match(results.find((r) => r.check === 1).reason, /agent_busy/);
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

test("check 4 uses the deliverables-only limit of 600 when the agent has the setting", async () => {
  const cc = standIn({});
  cc.state.agent.configJson.deliverablesOnly = true;
  const base = await cc.listen();
  try {
    const results = await runChecks({ api: apiClient({ base, session: SESSION }), handle: HANDLE, opts: { ...FAST, only: [4] } });
    assert.equal(results[0].status, "PASS");
    assert.match(results[0].reason, /deliverables-only limit of 600/);
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
  assert.throws(() => optionsFromEnv({ CHECK_ONLY: "5" }));
  assert.throws(() => optionsFromEnv({ CHECK_QUIET: "soon" }));
});

test("the command prints one line per check, exits 1 on a failure, and never prints the session", async () => {
  const cc = standIn({ touchesSettled: true });
  const base = await cc.listen();
  try {
    const env = {
      PATH: process.env.PATH, CC_API_BASE: base, CHECK_SESSION: SESSION,
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
    assert.ok(!out.includes(SESSION));
  } finally {
    await cc.close();
  }
});

test("a usage or sign-in problem exits 2 without printing a secret", async () => {
  const lines = [];
  assert.equal(await main([], {}, (l) => lines.push(l)), 2);
  assert.equal(await main([HANDLE], { CHECK_SESSION: SESSION }, (l) => lines.push(l)), 2);
  assert.equal(await main([HANDLE], { CC_API_BASE: "http://127.0.0.1:9/api" }, (l) => lines.push(l)), 2);
  const cc = standIn({});
  const base = await cc.listen();
  try {
    assert.equal(await main([HANDLE], { CC_API_BASE: base, CHECK_SESSION: "wrong-session-value" }, (l) => lines.push(l)), 2);
  } finally {
    await cc.close();
  }
  assert.ok(lines.every((l) => !l.includes(SESSION) && !l.includes("wrong-session-value")), lines.join("\n"));
  assert.match(lines.at(-1), /GET \/me answered 401/);
});
