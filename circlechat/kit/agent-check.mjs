#!/usr/bin/env node
// The agent check: drives a running CircleChat through its HTTP API, and checks how one agent
// behaves. circlechat/check-agent.sh runs it after setup-agent.sh, as its own command.
//
// The check signs in as its own CircleChat account, made only for the check
// (kit/check-account.mjs): a member of the agents' workspace, never an admin. The email is
// site.check_account in site.json, or agent-check@<site.public_host>. The password is
// CC_CHECK_PASSWORD, which the secrets deploy writes to $CC_DIR/agent-check.env. The check signs
// out at the end, and stops before the first check when the account is anything but a member.
//
//   node agent-check.mjs <handle>
//
// It works in a private throwaway channel, on throwaway tasks, and archives them at the end. It
// checks four things:
//   1. A request that arrives during a running turn still gets answered. The run for the request
//      waits in the agent's queue (GET /api/agents/:id/queue), and never fails. A member sees no
//      run's error text, so a request refused as agent_busy shows as a failed run.
//   2. A question gets asked once, then waits. No second question and no further comment on the
//      task until a person replies, through heartbeats. After the reply, the agent acts.
//   3. A settled task stays untouched. A task a person moved to review gets no comment, status
//      change or file from the agent, through heartbeats.
//   4. A long reply lands as a file. A reply past the chat limit (600 characters for an agent with
//      the deliverables-only setting, 2,000 otherwise) is posted as its opening paragraph, with the
//      whole text attached as reply.md (api/src/agents/long-reply.ts in the CircleChat fork). Only
//      an admin sees the agent's setting, so CHECK_DELIVERABLES_ONLY=1 says the agent has it.
// One PASS, FAIL or SKIP line per check. Exit 1 on any FAIL, 2 on a usage or setup error.
//
// Settings, from the environment (seconds unless noted):
//   CC_API_BASE            CircleChat's API, such as http://localhost:8080/api
//   CC_DIR                 the stack's folder, which holds agent-check.env
//   SITE                   the stack's site.json ($CC_DIR/site.json)
//   CHECK_DELIVERABLES_ONLY  1 when the agent has the deliverables-only setting (off)
//   CHECK_REPLY_TIMEOUT    how long to wait for each answer from the agent (900)
//   CHECK_TURN_TIMEOUT     how long to wait for each heartbeat turn to finish (600)
//   CHECK_QUIET            how long to keep watching after the heartbeats (60)
//   CHECK_HEARTBEATS       how many heartbeats to start in checks 2 and 3 (2)
//   CHECK_COMMENT_DELAY    when check 1 comments after the assignment, at most 2 (1)
//   CHECK_POLL             how often to look (5)
//   CHECK_ONLY             which checks to run, such as "1,3" (all)
//   CHECK_KEEP             1 to leave the channel and the tasks in place
// No secret reaches the output: an error names the route and the status, never a header or a body.

import fs from "node:fs";
import path from "node:path";
import { readCheckPassword } from "./check-account.mjs";
import { checkAccountEmail } from "./render.mjs";

export const DEFAULTS = {
  replyTimeoutMs: 900_000,
  turnTimeoutMs: 600_000,
  quietMs: 60_000,
  heartbeats: 2,
  commentDelayMs: 1_000,
  pollMs: 5_000,
  only: [1, 2, 3, 4],
  keep: false,
  deliverablesOnly: false,
};

// The limits in the fork's api/src/agents/long-reply.ts.
export const CHAT_BODY_MAX = 2000;
export const SUMMARY_MAX = 600;
const LONG_REPLY_ASK = 2500;

export const NAMES = {
  1: "a request during a running turn is answered",
  2: "a question is asked once, then waits",
  3: "a settled task stays untouched",
  4: "a long reply lands as a file",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const time = (v) => (v ? Date.parse(v) : NaN);
const after = (v, t) => time(v) > t;

// A small client for CircleChat's API, with the session cookie of one sign-in.
export function apiClient({ base, fetchImpl = globalThis.fetch }) {
  const root = String(base).replace(/\/+$/, "");
  let cookie = "";
  async function call(method, path, body) {
    const r = await fetchImpl(root + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    let data = null;
    try { data = await r.json(); } catch { data = null; }
    if (!r.ok) {
      const code = data && typeof data.error === "string" ? ` (${data.error})` : "";
      const err = new Error(`${method} ${path.replace(/\?.*$/, "")} answered ${r.status}${code}`);
      err.status = r.status;
      throw err;
    }
    return data;
  }
  return {
    get: (p) => call("GET", p),
    post: (p, b = {}) => call("POST", p, b),
    patch: (p, b) => call("PATCH", p, b),
    // Signs in once. The session lives in this client only.
    async login(email, password) {
      const r = await fetchImpl(root + "/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!r.ok) throw new Error(`POST /auth/login answered ${r.status}`);
      const set = typeof r.headers.getSetCookie === "function" ? r.headers.getSetCookie().join(";") : r.headers.get("set-cookie") ?? "";
      const m = /(?:^|[;,\s])cc_session=([^;,\s]+)/.exec(set);
      if (!m) throw new Error("POST /auth/login set no session");
      cookie = `cc_session=${m[1]}`;
    },
    async logout() {
      if (cookie) await call("POST", "/auth/logout").catch(() => {});
      cookie = "";
    },
  };
}

// Waits for fn() to return something truthy, or for the time limit. Returns the value or null.
async function waitFor(fn, timeoutMs, pollMs) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() >= end) return null;
    await sleep(Math.min(pollMs, Math.max(1, end - Date.now())));
  }
}

const isQuestion = (body) => /\?/.test(String(body ?? ""));
// An answer that names three things: three items split by commas, "and" or lines, and no question.
export const namesThree = (body) =>
  !isQuestion(body) && String(body ?? "").split(/,|;|\n|\band\b/).map((s) => s.trim()).filter(Boolean).length >= 3;
const shortText = (s, n = 80) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export async function runChecks({ api, handle, opts = {}, log = () => {} }) {
  const o = { ...DEFAULTS, ...opts };
  const results = [];
  const record = (n, status, reason) => {
    const r = { check: n, name: NAMES[n], status, reason };
    results.push(r);
    log(formatResult(r));
  };

  const me = await api.get("/me");
  if (!me?.memberId) throw new Error("the check's account is in no workspace. Run kit/check-account.mjs, which check-agent.sh runs first");
  // The check runs as a member only: an admin sees and can change more than a member, so a pass as
  // an admin says nothing about what a member sees.
  const role = (me.workspaces ?? []).find((w) => w.id === me.workspaceId)?.role ?? "unknown";
  if (me.spectator || role !== "member") throw new Error(`the check's account is ${me.spectator ? "a spectator" : role} in the workspace, and the check runs as a member only. Run kit/check-account.mjs, which sets the role back to member`);
  const { agents = [] } = await api.get("/agents");
  const agent = agents.find((a) => a.handle === handle);
  if (!agent) throw new Error(`no agent @${handle} in this workspace`);
  if (!agent.memberId) throw new Error(`@${handle} has no workspace member`);
  const A = agent.memberId;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  const made = { channel: null, tasks: [] };

  const channel = await api.post("/conversations", {
    kind: "channel",
    name: `agent-check-${handle}-${stamp}`.slice(0, 100),
    topic: "A throwaway channel for circlechat/check-agent.sh. It is archived when the check ends.",
    isPrivate: true,
    memberIds: [A],
  });
  made.channel = channel.id;

  const newTask = async (title, extra = {}) => {
    const { task } = await api.post("/tasks", { title, conversationId: channel.id, ...extra });
    made.tasks.push(task.id);
    return task;
  };
  const detail = (id) => api.get(`/tasks/${id}`);
  const artifacts = async (id) => (await api.get(`/tasks/${id}/artifacts`).catch(() => ({ artifacts: [] }))).artifacts ?? [];
  const channelMessages = async () => (await api.get(`/conversations/${channel.id}/messages?limit=200`)).messages ?? [];
  const threadMessages = async (id) => (await api.get(`/conversations/${channel.id}/messages?parent_id=${encodeURIComponent(id)}&limit=200`)).messages ?? [];
  const agentRuns = async () => (await api.get(`/agents/${agent.id}`)).recentRuns ?? [];
  let queueRoute = true;
  const queue = async () => {
    if (!queueRoute) return null;
    try { return await api.get(`/agents/${agent.id}/queue`); }
    catch (e) { if (e.status === 404) { queueRoute = false; return null; } throw e; }
  };
  // The agent is between turns with nothing waiting.
  const idle = async () => {
    const q = await queue();
    if (q) return !q.running && !(q.waiting ?? []).length;
    return !(await agentRuns()).some((r) => r.status === "running" || r.status === "queued");
  };
  const waitIdle = () => waitFor(idle, o.turnTimeoutMs, o.pollMs);
  // Starts heartbeats, one after another, and waits for each to finish.
  const heartbeats = async () => {
    for (let i = 0; i < o.heartbeats; i++) {
      const { runId } = await api.post(`/agents/${agent.id}/run-heartbeat`);
      await waitFor(async () => {
        const { run } = await api.get(`/agent-runs/${runId}`);
        return run && run.status !== "queued" && run.status !== "running";
      }, o.turnTimeoutMs, o.pollMs);
    }
    await sleep(o.quietMs);
    await waitIdle();
  };
  // Everything the agent did to a task after time t: comments, status or other changes, files.
  const agentTouches = async (taskId, t) => {
    const d = await detail(taskId);
    const comments = (d.comments ?? []).filter((c) => c.memberId === A && after(c.ts, t));
    const activity = (d.activity ?? []).filter((x) => x.actorMemberId === A && after(x.ts, t) && x.kind !== "comment");
    const files = (await artifacts(taskId)).filter((f) => f.createdBy === A && after(f.createdAt, t));
    return { comments, activity, files, task: d.task };
  };
  const agentChannelPosts = async (t) => (await channelMessages()).filter((m) => m.memberId === A && after(m.ts, t));

  let check1Task = null;
  try {
    // 1. A request that arrives during a running turn.
    if (o.only.includes(1)) {
      const task = await newTask(`Agent check: a request during a turn (${stamp})`, { assignees: [A] });
      check1Task = task;
      await sleep(Math.min(o.commentDelayMs, 2000));
      const { comment } = await api.post(`/tasks/${task.id}/comments`, {
        bodyMd: `@${handle} Reply with one short paragraph that names three made-up fruits.`,
        mentions: [A],
      });
      const t = time(comment.ts);
      let held = null;
      let refused = null;
      const answer = await waitFor(async () => {
        const q = await queue();
        const w = (q?.waiting ?? []).find((x) => x.taskId === task.id);
        if (w && !held) held = w;
        // A member sees each run's status and trigger, never the run's error text.
        const bad = (await agentRuns()).find((r) => time(r.startedAt) >= t - 1000 && r.status === "failed" && r.trigger === "task_comment");
        if (bad) { refused = bad; return "refused"; }
        const touch = await agentTouches(task.id, t);
        if (touch.files.length) return { kind: "file on the task", body: touch.files[0].name };
        const c = touch.comments.find((x) => namesThree(x.bodyMd) || (x.attachmentsJson ?? []).length);
        if (c) return { kind: "task comment", body: c.bodyMd };
        const m = (await agentChannelPosts(t)).find((x) => namesThree(x.bodyMd) || (x.attachmentsJson ?? []).length);
        if (m) return { kind: "channel reply", body: m.bodyMd };
        return null;
      }, o.replyTimeoutMs, o.pollMs);
      if (answer === "refused") {
        record(1, "FAIL", `the comment's run failed instead of waiting in the agent's queue (a refusal as agent_busy, or another error; an admin sees the run's error text on the agent's page${refused.summary ? `; CircleChat says "${shortText(refused.summary, 60)}"` : ""})`);
      } else if (!answer) {
        record(1, "FAIL", `no answer naming three fruits within ${Math.round(o.replyTimeoutMs / 1000)} s`);
      } else {
        const how = held ? `the comment's run waited in the queue at position ${held.position}` : queueRoute ? "the comment's run started without waiting" : "CircleChat has no queue route";
        record(1, "PASS", `answered by a ${answer.kind} ("${shortText(answer.body, 60)}"); ${how}`);
      }
    }

    // 2. A question gets asked once, then waits.
    if (o.only.includes(2)) {
      await waitIdle();
      const task = await newTask(`Agent check: an open request (${stamp})`, {
        bodyMd: `@${handle} Write something for me.`,
        assignees: [A],
      });
      const t0 = time(task.createdAt);
      const first = await waitFor(async () => {
        const touch = await agentTouches(task.id, t0);
        if (touch.comments.length || touch.files.length) return true;
        return (await agentChannelPosts(t0)).length > 0;
      }, o.replyTimeoutMs, o.pollMs);
      if (!first) {
        record(2, "FAIL", `the agent did not respond to the open request within ${Math.round(o.replyTimeoutMs / 1000)} s`);
      } else {
        await waitIdle();
        const said = async () => {
          const touch = await agentTouches(task.id, t0);
          const posts = await agentChannelPosts(t0);
          return { touch, all: [...touch.comments, ...posts].sort((a, b) => time(a.ts) - time(b.ts)) };
        };
        const before = await said();
        const questions = before.all.filter((c) => isQuestion(c.bodyMd));
        if (!questions.length) {
          record(2, "PASS", "the agent chose for itself and made something without asking, so there was nothing to wait on");
        } else if (questions.length > 1) {
          record(2, "FAIL", `the agent asked ${questions.length} questions before anyone answered`);
        } else {
          const q = questions[0];
          await heartbeats();
          const later = (await said()).all.filter((c) => time(c.ts) > time(q.ts));
          if (later.length) {
            record(2, "FAIL", `after its question the agent posted ${later.length} more time${later.length === 1 ? "" : "s"} before a person replied${later.some((c) => isQuestion(c.bodyMd)) ? ", asking again" : ""}`);
          } else {
            const { comment } = await api.post(`/tasks/${task.id}/comments`, {
              bodyMd: `@${handle} Anything you like: four lines about the sea.`,
              mentions: [A],
            });
            const t = time(comment.ts);
            const acted = await waitFor(async () => {
              const touch = await agentTouches(task.id, t);
              return touch.comments.length || touch.files.length || touch.activity.length || (await agentChannelPosts(t)).length;
            }, o.replyTimeoutMs, o.pollMs);
            if (acted) record(2, "PASS", `one question ("${shortText(q.bodyMd, 60)}"), quiet through ${o.heartbeats} heartbeat${o.heartbeats === 1 ? "" : "s"}, then acted on the reply`);
            else record(2, "FAIL", `asked once and waited, but did not act on the reply within ${Math.round(o.replyTimeoutMs / 1000)} s`);
          }
        }
      }
    }

    // 3. A settled task stays untouched.
    if (o.only.includes(3)) {
      let task = check1Task;
      if (!task) {
        task = await newTask(`Agent check: a finished task (${stamp})`, { assignees: [A] });
        await api.post(`/tasks/${task.id}/comments`, { bodyMd: `@${handle} Reply with one word: done.`, mentions: [A] });
        await waitFor(async () => (await agentTouches(task.id, time(task.createdAt))).comments.length, o.replyTimeoutMs, o.pollMs);
      }
      await waitIdle();
      await api.patch(`/tasks/${task.id}`, { status: "review" });
      // From the newest thing on the task, by the server's clock: anything later is new.
      const d = await detail(task.id);
      const t = Math.max(time(d.task?.createdAt) || 0, ...[...(d.activity ?? []), ...(d.comments ?? [])].map((x) => time(x.ts) || 0));
      await heartbeats();
      const touch = await agentTouches(task.id, t);
      const what = [
        touch.comments.length && `${touch.comments.length} comment${touch.comments.length === 1 ? "" : "s"}`,
        touch.activity.length && `${touch.activity.length} change${touch.activity.length === 1 ? "" : "s"} (${[...new Set(touch.activity.map((x) => x.kind))].join(", ")})`,
        touch.files.length && `${touch.files.length} file${touch.files.length === 1 ? "" : "s"}`,
      ].filter(Boolean);
      if (what.length) record(3, "FAIL", `the agent changed a task in review: ${what.join(", ")}`);
      else if (touch.task && touch.task.status !== "review") record(3, "FAIL", `the task left review for ${touch.task.status}`);
      else record(3, "PASS", `no comment, change or file through ${o.heartbeats} heartbeat${o.heartbeats === 1 ? "" : "s"}`);
    }

    // 4. A long reply lands as a file.
    if (o.only.includes(4)) {
      await waitIdle();
      // Only an admin sees the agent's deliverables-only setting, so the setting comes from
      // CHECK_DELIVERABLES_ONLY.
      const deliverablesOnly = o.deliverablesOnly === true;
      const limit = deliverablesOnly ? SUMMARY_MAX : CHAT_BODY_MAX;
      const { message } = await api.post(`/conversations/${channel.id}/messages`, {
        bodyMd: `@${handle} Reply here, in this channel, with a text of at least ${LONG_REPLY_ASK.toLocaleString("en-US")} characters: a made-up guide to looking after a garden, in several paragraphs. Open with one short paragraph that says what it is.`,
      });
      const t = time(message.ts);
      const reply = await waitFor(async () => {
        const posts = [...(await agentChannelPosts(t)), ...(await threadMessages(message.id)).filter((m) => m.memberId === A && after(m.ts, t))];
        return posts.sort((a, b) => time(a.ts) - time(b.ts))[0] ?? null;
      }, o.replyTimeoutMs, o.pollMs);
      const setting = deliverablesOnly ? "deliverables-only" : "chat";
      if (!reply) {
        record(4, "FAIL", `no reply in the channel within ${Math.round(o.replyTimeoutMs / 1000)} s`);
      } else {
        const len = String(reply.bodyMd ?? "").length;
        const files = (reply.attachmentsJson ?? []).filter((f) => f && typeof f === "object");
        const file = files.find((f) => f.name === "reply.md");
        if (len > limit) record(4, "FAIL", `the post is ${len} characters, over the ${setting} limit of ${limit}, ${file ? "though reply.md is attached" : "with no reply.md"}`);
        else if (file) record(4, "PASS", `the post keeps ${len} characters, under the ${setting} limit of ${limit}, and reply.md (${file.size ?? "?"} bytes) holds the rest`);
        else if (files.length) record(4, "PASS", `the post keeps ${len} characters, and the agent attached ${files.map((f) => f.name).join(", ")} itself`);
        else record(4, "SKIP", `the agent's reply was ${len} characters, under the ${setting} limit of ${limit}, so nothing went into a file; ask again for a longer reply to check this`);
      }
    }
  } finally {
    if (!o.keep) {
      for (const id of made.tasks) await api.patch(`/tasks/${id}`, { archived: true }).catch(() => {});
      if (made.channel) await api.post(`/conversations/${made.channel}/archive`).catch(() => {});
    }
  }
  return results;
}

export function formatResult(r) {
  return `${r.status.padEnd(4)}  ${r.check}. ${r.name}: ${r.reason}`;
}

export function optionsFromEnv(env) {
  const secs = (k, d) => {
    const v = env[k];
    if (v === undefined || v === "") return d;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${k} must be a number of seconds`);
    return Math.round(n * 1000);
  };
  const only = env.CHECK_ONLY ? env.CHECK_ONLY.split(/[,\s]+/).filter(Boolean).map(Number) : DEFAULTS.only;
  if (only.some((n) => !NAMES[n])) throw new Error("CHECK_ONLY lists checks 1 to 4, such as 1,3");
  const heartbeats = env.CHECK_HEARTBEATS ? Number(env.CHECK_HEARTBEATS) : DEFAULTS.heartbeats;
  if (!Number.isInteger(heartbeats) || heartbeats < 1) throw new Error("CHECK_HEARTBEATS must be 1 or more");
  return {
    replyTimeoutMs: secs("CHECK_REPLY_TIMEOUT", DEFAULTS.replyTimeoutMs),
    turnTimeoutMs: secs("CHECK_TURN_TIMEOUT", DEFAULTS.turnTimeoutMs),
    quietMs: secs("CHECK_QUIET", DEFAULTS.quietMs),
    heartbeats,
    commentDelayMs: Math.min(secs("CHECK_COMMENT_DELAY", DEFAULTS.commentDelayMs), 2000),
    pollMs: Math.max(secs("CHECK_POLL", DEFAULTS.pollMs), 10),
    only,
    keep: env.CHECK_KEEP === "1",
    deliverablesOnly: env.CHECK_DELIVERABLES_ONLY === "1",
  };
}

// The check's sign-in: the email from site.json, the password from $CC_DIR/agent-check.env.
export function checkAccount(env) {
  const ccDir = env.CC_DIR || path.join(env.HOME ?? "", env.TENANT ? `tenants/${env.TENANT}/circlechat` : "circlechat");
  const sitePath = env.SITE || path.join(ccDir, "site.json");
  let site;
  try { site = JSON.parse(fs.readFileSync(sitePath, "utf8")); } catch { throw new Error(`no readable ${sitePath}`); }
  const email = checkAccountEmail(site);
  if (!email) throw new Error("the check's account has no email: set site.public_host or site.check_account in site.json");
  return { email, password: readCheckPassword(ccDir) };
}

export async function main(argv, env, out = console.log) {
  const handle = argv[0];
  if (!handle || !/^[a-z0-9_-]+$/i.test(handle)) {
    out("usage: agent-check.mjs <handle>   (CC_API_BASE, CC_DIR and SITE in the environment)");
    return 2;
  }
  let opts;
  try { opts = optionsFromEnv(env); } catch (e) { out(`agent check: ${e.message}`); return 2; }
  if (!env.CC_API_BASE) { out("agent check: no CC_API_BASE"); return 2; }
  let account;
  try { account = checkAccount(env); } catch (e) { out(`agent check: ${e.message}`); return 2; }
  const api = apiClient({ base: env.CC_API_BASE });
  let signedIn = false;
  try {
    await api.login(account.email, account.password);
    signedIn = true;
    out(`Checking @${handle} on ${env.CC_API_BASE.replace(/\/\/[^/@]*@/, "//")}, as ${account.email}, a member of the workspace. Each wait is bounded; the model can take minutes.`);
    const results = await runChecks({ api, handle, opts, log: out });
    const failed = results.filter((r) => r.status === "FAIL").length;
    out(failed ? `${failed} of ${results.length} checks failed.` : `All ${results.length} checks passed or were skipped.`);
    return failed ? 1 : 0;
  } catch (e) {
    out(`agent check: ${String(e.message).split(account.password).join("<password>")}`);
    return 2;
  } finally {
    if (signedIn) await api.logout();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}
