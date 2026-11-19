// kit/rc-agent-check.mjs against stand-ins: a small RecursicaChat 2.0 in this file, with only the
// routes the check uses, and a scripted agent behind it that answers one message at a time. The
// agent behaves well in one run, and in each other run does one thing wrong. rc-check-agent.sh runs
// with stand-ins for sudo and Node. Nothing here reaches Docker, a model, the tailnet or a real
// server: the one HTTP server listens on 127.0.0.1 only, on a port the system picks.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { apiClient, exitCode, main, optionsFromEnv, runChecks, stamps, tokenFrom, transcriptProblems, wordCount } from "./rc-agent-check.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const HANDLE = "standin";
const AGENT_ID = "a_standin";
const ME = "u_checker";
const TURN_MS = 40;
const BANNER = "SYNTHETIC: made up by a stand-in.\nNo real person said any of this.";

// A transcript of `turns` speaker turns, `gap` seconds apart, each turn `words` words long.
function transcript({ turns = 40, gap = 20, words = 12, banner = BANNER } = {}) {
  const hms = (s) => [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  const parts = [];
  for (let i = 0; i < turns; i++) parts.push(`${i % 2 ? "Pat Example" : "Researcher"}  ${hms(5 + i * gap)}\n${Array(words).fill("word").join(" ")}`);
  return `${banner ? `${banner}\nA made-up gadget, interview 1 of 1, Researcher and Pat Example, 15 min\n\n` : ""}${parts.join("\n\n")}`;
}

// A stand-in RecursicaChat 2.0 with the check's account and one agent. `faults` names what the
// agent gets wrong.
function standIn(faults = {}, { role = "member" } = {}) {
  let clock = 1_000;
  const now = () => (clock = Math.max(Date.now(), clock + 1));
  let seq = 0;
  const s = { chats: new Map(), messages: [], tasks: new Map(), calls: [], queue: [], working: false, removed: [], renamed: [], files: new Map(), downloads: [] };
  const msg = (chatId, authorType, authorId, body, kind = "text", meta = {}) => {
    const m = { id: `m_${++seq}`, chatId, authorType, authorId, kind, body, meta, ts: now() };
    s.messages.push(m);
    return m;
  };
  const reply = (chatId, body, meta = {}) => msg(chatId, "agent", AGENT_ID, body, "text", meta);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function turn(d) {
    const b = d.body;
    if (/beekeeper/.test(b)) { await sleep(TURN_MS * 3); reply(d.chatId, transcript({ turns: 6 })); return; }
    const word = /single word (kumquat\d+)/.exec(b)?.[1];
    if (word) { await sleep(TURN_MS); reply(d.chatId, word); return; }
    if (/Make one for me/.test(b)) {
      await sleep(TURN_MS);
      reply(d.chatId, "What should the transcript be about?");
      if (faults.askTwice) setTimeout(() => reply(d.chatId, "Are you still there? What subject?"), TURN_MS * 2);
      if (faults.noisy) setTimeout(() => reply(d.chatId, "Working on it.", { interim: true }), TURN_MS);
      return;
    }
    if (/garden tool/.test(b)) { await sleep(TURN_MS); if (!faults.ignoresReply) reply(d.chatId, transcript({ turns: 6 })); return; }
    if (/single word ready/.test(b)) {
      await sleep(TURN_MS);
      if (faults.touchesTask) for (const t of s.tasks.values()) if (t.chatId === d.chatId) Object.assign(t, { status: "checking", updatedAt: now() });
      if (faults.retouchesTask) for (const t of s.tasks.values()) if (t.chatId === d.chatId) t.updatedAt = now();
      reply(d.chatId, "ready");
      return;
    }
    if (/kitchen gadget/.test(b)) {
      await sleep(TURN_MS);
      if (faults.toolCall) s.calls.push({ id: "tc_1", agentId: AGENT_ID, chatId: d.chatId, tool: "sandbox.execute", ts: now() });
      const opts = faults.short ? { turns: 6 } : faults.backwards ? { gap: -1 } : faults.tooLong ? { gap: 40 } : faults.noBanner ? { banner: null } : {};
      if (faults.noFile) { reply(d.chatId, transcript(opts)); return; }
      // attach_files: one message holding the .txt and its formatted .md copy
      s.calls.push({ id: `tc_${++seq}`, agentId: AGENT_ID, chatId: d.chatId, tool: "attach_files", ts: now() });
      const names = faults.twoTxt ? ["gadget-interview-1-of-1.txt", "gadget-interview-1-of-1 (2).txt"] : ["gadget-interview-1-of-1.txt", "gadget-interview-1-of-1.md"];
      const files = names.map((name) => {
        const f = { id: `f_${++seq}`, name, size: 1 };
        s.files.set(f.id, name.endsWith(".md") ? "# formatted copy" : transcript(opts));
        return f;
      });
      msg(d.chatId, "agent", AGENT_ID, "Attached 2 files.", "text", { files });
      reply(d.chatId, faults.longReply ? `Here it is.\n${transcript({ turns: 4 })}` : faults.wordyReply ? Array(60).fill("word").join(" ") : "Interview 1 of 1 is attached as gadget-interview-1-of-1.txt.");
      if (faults.after) setTimeout(() => reply(d.chatId, "Want another one?"), TURN_MS / 2);
      return;
    }
    await sleep(TURN_MS);
    reply(d.chatId, "OK.");
  }
  async function work() {
    if (s.working) return;
    s.working = true;
    while (s.queue.length) {
      const d = s.queue.shift();
      if (faults.refuses && /single word kumquat/.test(d.body)) { msg(d.chatId, "system", "", "Stand-in stopped before finishing (agent busy).", "error", { agentId: AGENT_ID }); continue; }
      await turn(d);
    }
    s.working = false;
  }

  const routes = [
    ["GET", /^\/api\/me$/, () => ({ user: { id: ME, email: "agent-check@example.com", role } })],
    ["GET", /^\/api\/agents$/, () => ({ agents: [{ id: AGENT_ID, handle: HANDLE, name: "Stand-in" }] })],
    ["POST", /^\/api\/chats$/, (_, b) => {
      const chat = { id: `c_${++seq}`, name: b.name, agents: [...b.agents] };
      s.chats.set(chat.id, chat);
      return { chat };
    }],
    ["POST", /^\/api\/chats\/([^/]+)\/messages$/, ([id], b) => {
      const m = msg(id, "user", ME, b.body);
      if (s.chats.get(id).agents.includes(AGENT_ID)) { s.queue.push(m); setTimeout(work, 1); }
      return { message: m };
    }],
    ["GET", /^\/api\/chats\/([^/]+)\/messages$/, ([id]) => ({ messages: s.messages.filter((m) => m.chatId === id) })],
    ["POST", /^\/api\/chats\/([^/]+)\/members$/, ([id], b) => { if (b.remove) { s.removed.push(b.id); s.chats.get(id).agents = []; } return { chat: s.chats.get(id) }; }],
    ["PATCH", /^\/api\/chats\/([^/]+)$/, ([id], b) => { s.renamed.push(b.name); return { chat: s.chats.get(id) }; }],
    ["GET", /^\/api\/agents\/([^/]+)\/activity$/, () => ({
      status: { state: s.working ? "working" : "idle" },
      queued: s.queue.map((d) => ({ id: d.id, chatId: d.chatId })),
    })],
    ["POST", /^\/api\/tasks$/, (_, b) => {
      const t = { id: `t_${++seq}`, chatId: b.chatId, title: b.title, assigneeType: b.assigneeType, assigneeId: b.assigneeId, status: "todo", createdAt: now(), updatedAt: now() };
      s.tasks.set(t.id, t);
      return { task: { ...t } };
    }],
    ["PATCH", /^\/api\/tasks\/([^/]+)$/, ([id], b) => { const t = s.tasks.get(id); Object.assign(t, b, { updatedAt: now() }); return { task: { ...t } }; }],
    ["GET", /^\/api\/tasks$/, () => ({ tasks: [...s.tasks.values()].map((t) => ({ ...t })) })],
    ["GET", /^\/api\/toollog$/, () => ({ calls: s.calls })],
  ];
  const api = {
    // GET /api/files/:id with the check's session: the file's bytes as text
    download: async (p) => {
      const fid = decodeURIComponent(/^\/api\/files\/([^/?]+)$/.exec(p)?.[1] ?? "");
      s.downloads.push(fid);
      if (!s.files.has(fid)) throw Object.assign(new Error(`GET ${p} answered 404`), { status: 404 });
      return s.files.get(fid);
    },
  };
  for (const method of ["GET", "POST", "PATCH"]) {
    api[method.toLowerCase()] = async (p, b) => {
      const pathname = p.replace(/\?.*$/, "");
      for (const [m, re, fn] of routes) {
        const hit = m === method && re.exec(pathname);
        if (hit) return structuredClone(fn(hit.slice(1), b ?? {}));
      }
      throw Object.assign(new Error(`${method} ${pathname} answered 404`), { status: 404 });
    };
  }
  return { api, s };
}

const FAST = { replyTimeoutMs: 3_000, turnTimeoutMs: 3_000, quietMs: 3 * TURN_MS, commentDelayMs: 1, pollMs: 5, banner: BANNER, minWords: 400, minutes: 15 };
const run = (faults, opts = {}, standInOpts) => {
  const { api, s } = standIn(faults, standInOpts);
  return runChecks({ api, handle: HANDLE, opts: { ...FAST, ...opts } }).then((results) => ({ results, s }));
};
const status = (results) => Object.fromEntries(results.map((r) => [r.check, r.status]));

test("a well-behaved agent passes all four checks, and the check leaves its chat without the agent", async () => {
  const { results, s } = await run({});
  assert.deepEqual(status(results), { 1: "PASS", 2: "PASS", 3: "PASS", 4: "PASS" }, results.map((r) => r.reason).join("\n"));
  assert.equal(exitCode(results), 0);
  assert.match(results[0].reason, /after waiting in the agent's queue/);
  assert.deepEqual(s.removed, [AGENT_ID]);
  assert.match(s.renamed[0], /^agent-check-standin-.* \(finished\)$/);
});

test("CHECK_KEEP leaves the agent in the chat and the chat's name as it was", async () => {
  const { s } = await run({}, { keep: true, only: [3] });
  assert.deepEqual([s.removed, s.renamed], [[], []]);
});

test("check 1 fails when the second request's turn fails instead of waiting", async () => {
  const { results } = await run({ refuses: true }, { only: [1] });
  assert.equal(results[0].status, "FAIL");
  assert.match(results[0].reason, /a turn failed instead of waiting: "Stand-in stopped before finishing \(agent busy\)\."/);
  assert.equal(exitCode(results), 1);
});

test("check 2 fails when the agent asks twice, posts again after its question, or ignores the reply", async () => {
  assert.match((await run({ askTwice: true }, { only: [2] })).results[0].reason, /posted 1 more time before the check replied, asking again/);
  assert.match((await run({ noisy: true }, { only: [2] })).results[0].reason, /posted 1 more time before the check replied$/);
  assert.match((await run({ ignoresReply: true }, { only: [2] })).results[0].reason, /did not act on the reply/);
});

test("check 3 fails when the agent moves a done task, or changes it at all", async () => {
  assert.match((await run({ touchesTask: true }, { only: [3] })).results[0].reason, /the done task moved to checking/);
  assert.match((await run({ retouchesTask: true }, { only: [3] })).results[0].reason, /the done task was changed/);
});

test("check 4 downloads the attached .txt with the check's session and checks the transcript in the file", async () => {
  const { results, s } = await run({}, { only: [4] });
  assert.equal(results[0].status, "PASS", results[0].reason);
  assert.match(results[0].reason, /^gadget-interview-1-of-1\.txt: \d+ words, \d+ speaker lines, and a one-line reply$/);
  assert.equal(s.downloads.length, 1, "the .txt only");
  assert.ok(s.files.get(s.downloads[0]).includes("Researcher  00:00:05"));
});

test("check 4 fails on no file, a short or broken transcript in the file, a long reply, a later post, or another tool call", async () => {
  const reason = async (f) => (await run(f, { only: [4] })).results[0];
  for (const [fault, re] of [
    ["noFile", /attached no file, and replied with \d+ words instead/],
    ["twoTxt", /attached 2 \.txt files, not 1/],
    ["short", /gadget-interview-1-of-1\.txt: .*words, fewer than 400/],
    ["backwards", /does not move forward/],
    ["tooLong", /past 15 minutes/],
    ["noBanner", /not the banner's/],
    ["longReply", /the reply holds transcript lines/],
    ["wordyReply", /the reply is 1 line and 60 words, not one short line/],
    ["after", /posted 2 replies, not 1/],
    ["toolCall", /made 1 tool call besides attach_files during the check \(sandbox\.execute\)/],
  ]) {
    const r = await reason({ [fault]: true });
    assert.equal(r.status, "FAIL", fault);
    assert.match(r.reason, re, fault);
  }
});

test("the check refuses an owner or an admin, and runs as a member or a builder", async () => {
  for (const role of ["owner", "admin"]) await assert.rejects(run({}, { only: [3] }, { role }), /runs as a member or a builder only/);
  assert.equal(status((await run({}, { only: [3] }, { role: "builder" })).results)[3], "PASS");
});

test("transcripts: speaker lines, word counts and each problem", () => {
  const t = transcript({ turns: 3 });
  assert.deepEqual(stamps(t).map((x) => [x.name, x.seconds]), [["Researcher", 5], ["Pat Example", 25], ["Researcher", 45]]);
  assert.deepEqual(stamps("Dana Ortiz  1:02\nNot a stamp 00:00:10\nResearcher\t\t00:01:03").map((x) => x.seconds), [62, 63]);
  assert.equal(wordCount("  one two\nthree  "), 3);
  assert.deepEqual(transcriptProblems(transcript(), { banner: BANNER, minWords: 400, minutes: 15 }), []);
  assert.deepEqual(transcriptProblems(transcript(), { minWords: 400 }), [], "no banner asked for, none checked");
  assert.match(transcriptProblems("just words", { minWords: 1 }).join(), /0 timestamped speaker lines/);
});

test("settings come from the environment, and bad values stop the check", () => {
  const o = optionsFromEnv({ CHECK_ONLY: "1,4", CHECK_QUIET: "3", CHECK_BANNER: "a\\nb", CHECK_MIN_WORDS: "900", CHECK_MINUTES: "30", CHECK_COMMENT_DELAY: "9" });
  assert.deepEqual([o.only, o.quietMs, o.banner, o.minWords, o.minutes, o.commentDelayMs], [[1, 4], 3000, "a\nb", 900, 30, 2000]);
  assert.equal(optionsFromEnv({}).banner, null);
  assert.throws(() => optionsFromEnv({ CHECK_ONLY: "5" }), /lists checks 1 to 4/);
  assert.throws(() => optionsFromEnv({ CHECK_MIN_WORDS: "lots" }), /whole number/);
  assert.throws(() => optionsFromEnv({ CHECK_POLL: "-1" }), /number of seconds/);
});

test("the session's token comes from stdin only, and one token only", () => {
  assert.equal(tokenFrom("tok_0123456789abcdef\n"), "tok_0123456789abcdef");
  assert.throws(() => tokenFrom(""), /no session token on stdin/);
  assert.throws(() => tokenFrom("a b"), /more than one session token/);
});

test("the client sends the token as a Bearer header and never as a cookie, and an error names no header", async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(req.headers);
    res.writeHead(req.url === "/api/me" ? 200 : 403, { "content-type": "application/json" });
    res.end(JSON.stringify(req.url === "/api/me" ? { user: { role: "member" } } : { error: "Only builders and above can do that" }));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const api = apiClient({ base: `http://127.0.0.1:${server.address().port}/`, token: "tok_secret_0123456789" });
    assert.equal((await api.get("/api/me")).user.role, "member");
    const err = await api.post("/api/triggers", {}).catch((e) => e);
    assert.equal(err.message, "POST /api/triggers answered 403 (Only builders and above can do that)");
    assert.doesNotMatch(err.message, /tok_secret/);
    assert.equal(seen[0].authorization, "Bearer tok_secret_0123456789");
    assert.equal(seen[0].cookie, undefined);
    const dl = await api.download("/api/files/f_1").catch((e) => e);
    assert.equal(dl.message, "GET /api/files/f_1 answered 403");
    assert.equal(seen.at(-1).authorization, "Bearer tok_secret_0123456789", "a download carries the session as a Bearer header too");
    assert.equal(seen.at(-1).cookie, undefined);
  } finally {
    server.close();
  }
});

test("main: a bad handle, bad settings or no token is a setup error (2), and the token is never printed", async () => {
  const lines = [];
  const out = (l) => lines.push(l);
  assert.equal(await main([], {}, { stdin: Readable.from([]), out }), 2);
  assert.equal(await main([HANDLE], { CHECK_ONLY: "9" }, { stdin: Readable.from(["tok"]), out }), 2);
  assert.equal(await main([HANDLE], {}, { stdin: Readable.from([]), out }), 2);
  const refused = async () => ({ ok: false, status: 401, json: async () => ({ error: "Please sign in" }) });
  assert.equal(await main([HANDLE], {}, { stdin: Readable.from(["tok_never_printed_0123\n"]), out, fetchImpl: refused }), 2);
  assert.match(lines.at(-1), /GET \/api\/me answered 401 \(Please sign in\)/);
  assert.doesNotMatch(lines.join("\n"), /tok_never_printed/);
});

// rc-check-agent.sh with stand-ins: sudo runs the command it is given; the server's CLI prints a
// token for `session` and records `end-sessions`; the check's Node records what reached it.
function wrapper({ checkExit = 0, sessionFails = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-check-"));
  const log = path.join(dir, "calls.log");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const script = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  script("sudo", `[ "$1" = -v ] && exit 0; echo "sudo $*" >> "${log}"; exec "$@"`);
  // The server's CLI: argv is <cli.ts> <command> <email> [...].
  script("server-node", `echo "cli $2 $3 $4 $5 data=$CIRCLECHAT_DATA" >> "${log}"; if [ "$2" = session ]; then ${sessionFails ? "exit 2" : "echo tok_from_cli_0123456789"}; fi; exit 0`);
  script("check-node", `t="$(cat)"; echo "check $2 url=$RC_URL stdin=$t args=$*" >> "${log}"; exit ${checkExit}`);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, RC_CHECK_EMAIL: "agent-check@example.com", RC_NODE: path.join(bin, "server-node"), CHECK_NODE: path.join(bin, "check-node"), RC_APP: path.join(dir, "srv", "app"), RC_DATA: path.join(dir, "srv", "data") };
  const r = spawnSync("bash", [path.join(here, "../rc-check-agent.sh"), HANDLE], { env, encoding: "utf8" });
  return { r, calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "" };
}

test("rc-check-agent.sh pipes the CLI's token into the check, and ends the account's sessions on the way out", () => {
  const { r, calls } = wrapper();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(calls, /^cli session agent-check@example\.com --minutes 60 data=.*\/data$/m);
  assert.match(calls, /^check standin url=http:\/\/127\.0\.0\.1:3100 stdin=tok_from_cli_0123456789 args=\S+rc-agent-check\.mjs standin$/m, "the token arrives on stdin, never as an argument");
  assert.match(calls, /check (.*\n)*cli end-sessions agent-check@example\.com/, "the sessions end after the check");
  assert.doesNotMatch(r.stdout + r.stderr, /tok_from_cli/);
});

test("rc-check-agent.sh ends the sessions after a failed check or a failed CLI, and keeps the check's exit code", () => {
  const failed = wrapper({ checkExit: 1 });
  assert.equal(failed.r.status, 1);
  assert.match(failed.calls, /cli end-sessions/);
  const noSession = wrapper({ sessionFails: true });
  assert.notEqual(noSession.r.status, 0);
  assert.match(noSession.calls, /cli end-sessions/);
});

test("rc-check-agent.sh refuses a Node inside the server's folder, and needs the check's account", () => {
  const env = { ...process.env, RC_CHECK_EMAIL: "agent-check@example.com", RC_APP: "/opt/recursicachat/app", RC_NODE: "/opt/recursicachat/node/bin/node" };
  const inside = spawnSync("bash", [path.join(here, "../rc-check-agent.sh"), HANDLE], { env, encoding: "utf8" });
  assert.equal(inside.status, 2);
  assert.match(inside.stdout, /RC_NODE is inside the server's folder/);
  const none = spawnSync("bash", [path.join(here, "../rc-check-agent.sh"), HANDLE], { env: { ...process.env, RC_CHECK_EMAIL: "" }, encoding: "utf8" });
  assert.notEqual(none.status, 0);
  assert.match(none.stderr, /RC_CHECK_EMAIL/);
});
