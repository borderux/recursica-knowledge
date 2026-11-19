#!/usr/bin/env node
// The agent check for a RecursicaChat 2.0 server: drives the server through its HTTP API, and checks
// how one agent behaves. circlechat/rc-check-agent.sh runs it, by hand, on the computer that runs the
// server. The check is the harness's own: it talks to the server's API only, and nothing of it runs
// inside the server.
//
// The check signs in as its own RecursicaChat account, a member or a builder, never an owner or an
// admin. The server's CLI, run as root, gives the account a session of at most an hour
// (`cli.ts session <email>`), and the wrapper pipes the session's token to this script's stdin. The
// wrapper ends the account's sessions on every way out (`cli.ts end-sessions <email>`). The token goes in an Authorization
// header only: never an argument, an environment variable or an output line. A session cookie sent
// by a script is refused by the server's origin check, so the check never sends a cookie.
//
//   node rc-agent-check.mjs <handle> < token      (RC_URL, and the CHECK_* settings, in the environment)
//
// It works in a throwaway chat with the agent. At the end the agent leaves the chat and the chat's
// name says the check finished (RecursicaChat 2.0 has no way for a member to archive a chat). It
// checks four things:
//   1. A request that arrives during a running turn still gets answered. The second request waits in
//      the agent's queue (GET /api/agents/:id/activity), and no turn fails.
//   2. A question gets asked once, then waits. An open request gets at most one question, then
//      nothing more from the agent through a quiet window. After the check's reply, the agent acts.
//      RecursicaChat 2.0 wakes an agent only for a message, a hand-off or a builder's trigger, so a
//      member's check has no heartbeat to start: the quiet window stands in for one.
//   3. A settled task stays untouched. A task in the chat, set to done, keeps its status and its
//      update time through another turn of the agent in the same chat.
//   4. A transcript arrives as an attached file. The agent attaches one .txt file (a formatted .md
//      copy beside it is fine), and the check downloads the .txt with its own session: the banner's
//      lines first when CHECK_BANNER is set, at least CHECK_MIN_WORDS words, and timestamps that only
//      move forward and end within the asked length. The agent's reply is one short line with no
//      transcript in it, nothing follows the reply, and the agent calls no tool but attach_files.
// One PASS, FAIL or SKIP line per check. Exit 1 on any FAIL, 2 on a usage or setup error.
//
// Settings, from the environment (seconds unless noted):
//   RC_URL               the server, such as http://127.0.0.1:3100 (the default)
//   CHECK_REPLY_TIMEOUT  how long to wait for each answer from the agent (900)
//   CHECK_TURN_TIMEOUT   how long to wait for the agent to finish its turns (900)
//   CHECK_QUIET          how long to keep watching after a turn (120)
//   CHECK_COMMENT_DELAY  when check 1 sends its second request, at most 2 (1)
//   CHECK_POLL           how often to look (5)
//   CHECK_ONLY           which checks to run, such as "1,3" (all)
//   CHECK_KEEP           1 to leave the agent in the chat, and the chat's name as it was
//   CHECK_BANNER         the lines a long reply must open with, with \n between lines (none)
//   CHECK_MIN_WORDS      the fewest words in the long reply (1500)
//   CHECK_MINUTES        the length check 4 asks for, in minutes (15)
// No secret reaches the output: an error names the route and the status, never a header.

import { pathToFileURL } from "node:url";

export const DEFAULTS = {
  replyTimeoutMs: 900_000,
  turnTimeoutMs: 900_000,
  quietMs: 120_000,
  commentDelayMs: 1_000,
  pollMs: 5_000,
  only: [1, 2, 3, 4],
  keep: false,
  banner: null,
  minWords: 1500,
  minutes: 15,
};

export const NAMES = {
  1: "a request during a running turn is answered",
  2: "a question is asked once, then waits",
  3: "a settled task stays untouched",
  4: "a transcript arrives as an attached file",
};

const BUSY = new Set(["starting", "working", "waiting_approval"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isQuestion = (body) => /\?/.test(String(body ?? ""));
const shortText = (s, n = 80) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// A small client for the server's API. The session's token goes in an Authorization header, never
// in a cookie: the server refuses a cookie session from anything but its own pages.
export function apiClient({ base, token, fetchImpl = globalThis.fetch }) {
  const root = String(base).replace(/\/+$/, "");
  async function call(method, path, body) {
    const r = await fetchImpl(root + path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    let data = null;
    try { data = await r.json(); } catch { data = null; }
    if (!r.ok) {
      const code = data && typeof data.error === "string" ? ` (${shortText(data.error, 120)})` : "";
      const err = new Error(`${method} ${path.replace(/\?.*$/, "")} answered ${r.status}${code}`);
      err.status = r.status;
      throw err;
    }
    return data;
  }
  // A file's bytes as text, such as an attached file from GET /api/files/:id.
  async function download(path) {
    const r = await fetchImpl(root + path, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
    if (!r.ok) {
      const err = new Error(`GET ${path.replace(/\?.*$/, "")} answered ${r.status}`);
      err.status = r.status;
      throw err;
    }
    return r.text();
  }
  return {
    download,
    get: (p) => call("GET", p),
    post: (p, b = {}) => call("POST", p, b),
    patch: (p, b) => call("PATCH", p, b),
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

// --- transcripts ---------------------------------------------------------------------------------
// A speaker's line in a transcript: the name, two spaces or more, and hh:mm:ss (or mm:ss).
export const STAMP = /^\s*(\S.*?)\s{2,}(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\s*$/;

/** Each speaker line of a transcript: { name, seconds, line } with line counted from 1. */
export function stamps(text) {
  const out = [];
  String(text ?? "").split("\n").forEach((l, i) => {
    const m = STAMP.exec(l);
    if (m) out.push({ name: m[1].trim(), seconds: Number(m[2] ?? 0) * 3600 + Number(m[3]) * 60 + Number(m[4]), line: i + 1 });
  });
  return out;
}

export const wordCount = (text) => String(text ?? "").split(/\s+/).filter(Boolean).length;

/** What is wrong with a long reply, as a list of short reasons; empty when nothing is. */
export function transcriptProblems(text, { banner = null, minWords = DEFAULTS.minWords, minutes = DEFAULTS.minutes } = {}) {
  const problems = [];
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  if (banner) {
    const want = String(banner).split("\n").map((l) => l.trim()).filter(Boolean);
    const got = lines.slice(0, want.length).map((l) => l.trim());
    const bad = want.findIndex((l, i) => got[i] !== l);
    if (bad >= 0) problems.push(`line ${bad + 1} is "${shortText(got[bad] ?? "", 60)}", not the banner's "${shortText(want[bad], 60)}"`);
  }
  const words = wordCount(text);
  if (words < minWords) problems.push(`${words} words, fewer than ${minWords}`);
  const s = stamps(text);
  if (s.length < 2) problems.push(`${plural(s.length, "timestamped speaker line")}, so the timestamps can't be checked`);
  for (let i = 1; i < s.length; i++) {
    if (s[i].seconds <= s[i - 1].seconds) { problems.push(`the timestamp on line ${s[i].line} does not move forward from line ${s[i - 1].line}`); break; }
  }
  const last = s.at(-1);
  if (last && last.seconds > minutes * 60) problems.push(`the last timestamp (line ${last.line}) is past ${minutes} minutes`);
  return problems;
}

// --- the checks ----------------------------------------------------------------------------------
export async function runChecks({ api, handle, opts = {}, log = () => {} }) {
  const o = { ...DEFAULTS, ...opts };
  const results = [];
  const record = (n, status, reason) => {
    const r = { check: n, name: NAMES[n], status, reason };
    results.push(r);
    log(formatResult(r));
  };

  const { user: me } = await api.get("/api/me");
  // The check runs as a member or a builder only: an owner or an admin sees and can change more,
  // so a pass as one of them says nothing about what the agent's own people see. The server's CLI
  // refuses to give an owner or an admin a session anyway.
  if (!me || !["member", "builder"].includes(me.role)) throw new Error(`the check's account is ${me?.role ?? "unknown"}, and the check runs as a member or a builder only`);
  const { agents = [] } = await api.get("/api/agents");
  const agent = agents.find((a) => a.handle === handle);
  if (!agent) throw new Error(`no agent @${handle} on this server`);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  const { chat } = await api.post("/api/chats", { name: `agent-check-${handle}-${stamp}`.slice(0, 80), agents: [agent.id] });
  const started = Date.now();

  const say = async (body) => (await api.post(`/api/chats/${chat.id}/messages`, { body })).message;
  const messages = async () => (await api.get(`/api/chats/${chat.id}/messages?limit=200`)).messages ?? [];
  const fromAgent = (m) => m.authorType === "agent" && m.authorId === agent.id;
  // The agent's replies after t: its final answers, and its progress updates (meta.interim).
  const posts = async (t, { interim = false } = {}) => (await messages()).filter((m) => fromAgent(m) && m.ts > t && m.kind === "text" && (interim || !m.meta?.interim));
  // A turn that failed or did not start, after t: the server says so in the chat.
  const failures = async (t) => (await messages()).filter((m) => m.authorType === "system" && m.ts > t && m.meta?.agentId === agent.id && (m.kind === "error" || m.meta?.reason));
  const activity = () => api.get(`/api/agents/${agent.id}/activity?limit=50`);
  const idle = async () => {
    const a = await activity();
    return !BUSY.has(a.status?.state) && !(a.queued ?? []).length;
  };
  const waitIdle = () => waitFor(idle, o.turnTimeoutMs, o.pollMs);
  const settle = async () => { await waitIdle(); await sleep(o.quietMs); await waitIdle(); };
  const secs = (ms) => Math.round(ms / 1000);

  try {
    // 1. A request that arrives during a running turn.
    if (o.only.includes(1)) {
      const word = `kumquat${Math.floor(Math.random() * 9000 + 1000)}`;
      const first = await say(`@${handle} Write a made-up 3-minute interview transcript between a Researcher and a beekeeper.`);
      await sleep(Math.min(o.commentDelayMs, 2000));
      const second = await say(`@${handle} Once that is done, reply with the single word ${word}, and nothing else.`);
      let held = false;
      const answer = await waitFor(async () => {
        const a = await activity();
        if ((a.queued ?? []).some((d) => d.chatId === chat.id)) held = true;
        const bad = await failures(first.ts - 1);
        if (bad.length) return { failed: bad[0] };
        const hit = (await posts(second.ts)).find((m) => m.body.toLowerCase().includes(word));
        return hit ? { reply: hit } : null;
      }, o.replyTimeoutMs, o.pollMs);
      if (!answer) record(1, "FAIL", `no reply with the word ${word} within ${secs(o.replyTimeoutMs)} s`);
      else if (answer.failed) record(1, "FAIL", `a turn failed instead of waiting: "${shortText(answer.failed.body, 100)}"`);
      else record(1, "PASS", `the second request was answered${held ? ", after waiting in the agent's queue" : " (the first turn had ended before the check looked at the queue)"}`);
    }

    // 2. A question gets asked once, then waits.
    if (o.only.includes(2)) {
      await waitIdle();
      const open = await say(`@${handle} Make one for me, please.`);
      const first = await waitFor(async () => (await posts(open.ts)).length || (await failures(open.ts)).length, o.replyTimeoutMs, o.pollMs);
      const bad = await failures(open.ts);
      if (bad.length) record(2, "FAIL", `the turn failed: "${shortText(bad[0].body, 100)}"`);
      else if (!first) record(2, "FAIL", `the agent did not respond to the open request within ${secs(o.replyTimeoutMs)} s`);
      else {
        await waitIdle();
        const questions = (await posts(open.ts, { interim: true })).filter((m) => isQuestion(m.body));
        if (!questions.length) record(2, "PASS", "the agent chose for itself and made something without asking, so there was nothing to wait on");
        else if (questions.length > 1) record(2, "FAIL", `the agent asked ${questions.length} questions before anyone answered`);
        else {
          const q = questions[0];
          await settle();
          const later = await posts(q.ts, { interim: true });
          if (later.length) record(2, "FAIL", `after its question the agent posted ${plural(later.length, "more time")} before the check replied${later.some((m) => isQuestion(m.body)) ? ", asking again" : ""}`);
          else {
            const reply = await say(`@${handle} Anything you like: a made-up 3-minute interview about a garden tool.`);
            const acted = await waitFor(async () => (await posts(reply.ts)).length, o.replyTimeoutMs, o.pollMs);
            if (acted) record(2, "PASS", `one question ("${shortText(q.body, 60)}"), quiet for ${secs(o.quietMs)} s, then acted on the reply`);
            else record(2, "FAIL", `asked once and waited, but did not act on the reply within ${secs(o.replyTimeoutMs)} s`);
          }
        }
      }
    }

    // 3. A settled task stays untouched.
    if (o.only.includes(3)) {
      await waitIdle();
      const { task } = await api.post("/api/tasks", { chatId: chat.id, title: `Agent check: a finished task (${stamp})`, assigneeType: "agent", assigneeId: agent.id });
      const { task: done } = await api.patch(`/api/tasks/${task.id}`, { status: "done" });
      const ask = await say(`@${handle} Reply with the single word ready, and nothing else.`);
      const answered = await waitFor(async () => (await posts(ask.ts)).length, o.replyTimeoutMs, o.pollMs);
      await settle();
      const now = ((await api.get(`/api/tasks?chat=${encodeURIComponent(chat.id)}`)).tasks ?? []).find((t) => t.id === task.id);
      if (!now) record(3, "FAIL", "the task is gone");
      else if (now.status !== "done") record(3, "FAIL", `the done task moved to ${now.status}`);
      else if (now.updatedAt !== done.updatedAt) record(3, "FAIL", "the done task was changed, though its status is done again");
      else if (!answered) record(3, "SKIP", `the agent took no turn within ${secs(o.replyTimeoutMs)} s, so the task was never at risk`);
      else record(3, "PASS", `the done task kept its status and update time through a turn and ${secs(o.quietMs)} s`);
    }

    // 4. A transcript arrives as an attached file.
    if (o.only.includes(4)) {
      await waitIdle();
      const ask = await say(`@${handle} Write one made-up ${o.minutes}-minute interview transcript between a Researcher and one participant, about a made-up kitchen gadget.`);
      const hasFiles = (m) => Array.isArray(m.meta?.files) && m.meta.files.length > 0;
      // the turn is over when the agent attached a file, or replied, or the turn failed
      const first = await waitFor(async () => (await posts(ask.ts))[0] ?? ((await failures(ask.ts))[0] ? { failed: true } : null), o.replyTimeoutMs, o.pollMs);
      if (!first) record(4, "FAIL", `no reply and no file within ${secs(o.replyTimeoutMs)} s`);
      else if (first.failed) record(4, "FAIL", `the turn failed: "${shortText((await failures(ask.ts))[0].body, 100)}"`);
      else {
        await settle();
        const all = await posts(ask.ts, { interim: true });
        const withFiles = all.filter(hasFiles);
        const replies = all.filter((m) => !hasFiles(m));
        const files = withFiles.flatMap((m) => m.meta.files);
        const txt = files.filter((f) => /\.txt$/i.test(f.name));
        const calls = ((await api.get(`/api/toollog?agent=${encodeURIComponent(agent.id)}`)).calls ?? []).filter((c) => c.chatId === chat.id && c.ts >= started);
        const others = calls.filter((c) => c.tool !== "attach_files");
        const problems = [];
        let text = "";
        if (!files.length) problems.push(`the agent attached no file${replies.length ? `, and replied with ${wordCount(replies[0].body)} words instead` : ""}`);
        else if (txt.length !== 1) problems.push(`the agent attached ${plural(txt.length, ".txt file")}, not 1 (${files.map((f) => f.name).join(", ")})`);
        else {
          text = await api.download(`/api/files/${encodeURIComponent(txt[0].id)}`);
          problems.push(...transcriptProblems(text, { banner: o.banner, minWords: o.minWords, minutes: o.minutes }).map((p) => `${txt[0].name}: ${p}`));
        }
        if (withFiles.length > 1) problems.push(`the files came in ${withFiles.length} messages, not 1`);
        if (replies.length > 1) problems.push(`the agent posted ${replies.length} replies, not 1`);
        for (const r of replies) {
          const lines = String(r.body ?? "").split("\n").filter((l) => l.trim());
          if (stamps(r.body).length) problems.push("the reply holds transcript lines");
          else if (lines.length > 1 || wordCount(r.body) > 40) problems.push(`the reply is ${plural(lines.length, "line")} and ${wordCount(r.body)} words, not one short line`);
        }
        const last = all.at(-1);
        if (last && hasFiles(last) && replies.length && replies.at(-1).ts < last.ts) problems.push("the agent replied before attaching the file");
        if (others.length) problems.push(`the agent made ${plural(others.length, "tool call")} besides attach_files during the check (${[...new Set(others.map((c) => c.tool))].join(", ")})`);
        if (problems.length) record(4, "FAIL", problems.join("; "));
        else record(4, "PASS", `${txt[0].name}: ${wordCount(text)} words, ${plural(stamps(text).length, "speaker line")}, and a one-line reply`);
      }
    }
  } finally {
    if (!o.keep) {
      await api.post(`/api/chats/${chat.id}/members`, { type: "agent", id: agent.id, remove: true }).catch(() => {});
      await api.patch(`/api/chats/${chat.id}`, { name: `agent-check-${handle}-${stamp} (finished)`.slice(0, 80) }).catch(() => {});
    }
  }
  return results;
}

export function formatResult(r) {
  return `${r.status.padEnd(4)}  ${r.check}. ${r.name}: ${r.reason}`;
}

/** 1 when any check failed, else 0. */
export const exitCode = (results) => (results.some((r) => r.status === "FAIL") ? 1 : 0);

export function optionsFromEnv(env) {
  const secs = (k, d) => {
    const v = env[k];
    if (v === undefined || v === "") return d;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${k} must be a number of seconds`);
    return Math.round(n * 1000);
  };
  const count = (k, d) => {
    const v = env[k];
    if (v === undefined || v === "") return d;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new Error(`${k} must be a whole number, 1 or more`);
    return n;
  };
  const only = env.CHECK_ONLY ? env.CHECK_ONLY.split(/[,\s]+/).filter(Boolean).map(Number) : DEFAULTS.only;
  if (only.some((n) => !NAMES[n])) throw new Error("CHECK_ONLY lists checks 1 to 4, such as 1,3");
  return {
    replyTimeoutMs: secs("CHECK_REPLY_TIMEOUT", DEFAULTS.replyTimeoutMs),
    turnTimeoutMs: secs("CHECK_TURN_TIMEOUT", DEFAULTS.turnTimeoutMs),
    quietMs: secs("CHECK_QUIET", DEFAULTS.quietMs),
    commentDelayMs: Math.min(secs("CHECK_COMMENT_DELAY", DEFAULTS.commentDelayMs), 2000),
    pollMs: Math.max(secs("CHECK_POLL", DEFAULTS.pollMs), 10),
    only,
    keep: env.CHECK_KEEP === "1",
    banner: env.CHECK_BANNER ? env.CHECK_BANNER.replace(/\\n/g, "\n") : null,
    minWords: count("CHECK_MIN_WORDS", DEFAULTS.minWords),
    minutes: count("CHECK_MINUTES", DEFAULTS.minutes),
  };
}

/** The session's token, from the whole of stdin: one line, no spaces. */
export function tokenFrom(text) {
  const t = String(text ?? "").trim();
  if (!t) throw new Error("no session token on stdin. Pipe the server's `cli.ts session <email>` into this script");
  if (/\s/.test(t) || t.length > 512) throw new Error("stdin holds more than one session token");
  return t;
}

async function readAll(stream) {
  let s = "";
  for await (const c of stream) { s += c; if (s.length > 4096) break; }
  return s;
}

export async function main(argv, env, { stdin = process.stdin, out = console.log, fetchImpl } = {}) {
  const handle = argv[0];
  if (!handle || !/^[a-z][a-z0-9_-]{1,29}$/.test(handle)) {
    out("usage: rc-agent-check.mjs <handle> < token   (RC_URL and the CHECK_* settings in the environment)");
    return 2;
  }
  let opts, token;
  try { opts = optionsFromEnv(env); } catch (e) { out(`agent check: ${e.message}`); return 2; }
  try { token = tokenFrom(await readAll(stdin)); } catch (e) { out(`agent check: ${e.message}`); return 2; }
  const api = apiClient({ base: env.RC_URL || "http://127.0.0.1:3100", token, fetchImpl });
  let results;
  try {
    results = await runChecks({ api, handle, opts, log: out });
  } catch (e) {
    out(`agent check: ${e.message}`);
    return 2;
  }
  return exitCode(results);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await main(process.argv.slice(2), process.env);
}
