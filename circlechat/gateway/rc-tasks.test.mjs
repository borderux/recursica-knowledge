// The RecursicaChat task source (rc-tasks.mjs) and the gateway with it: each "Model use" choice, the
// stack's cloud permission, and the switch reports. Stand-ins for LiteLLM and the server's gateway
// listener, on 127.0.0.1.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { settingFromRow } from "./policy.mjs";
import { DEFAULT_STALL_MINUTES, MODEL_USE_SETTING, rcTasks, rowFromChoice } from "./rc-tasks.mjs";
import { createGateway, taskSource } from "./router.mjs";
import { issue } from "./keys.mjs";

const listen = (handler) => new Promise((r) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => r(s)); });
const base = (s) => `http://127.0.0.1:${s.address().port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Waits for a condition, for at most `ms`.
async function until(check, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await check()) return true; await sleep(20); }
  return false;
}

// LiteLLM stand-in: a route answers as `behavior[route]` says; a cloud key (key/<name>) at once.
const seen = [];
const behavior = {};
const litellm = await listen(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  const body = JSON.parse(b);
  seen.push(body.model);
  const how = body.model.startsWith("key/") ? "ok" : behavior[body.model] ?? "ok";
  if (how === "hang") return;
  res.writeHead(200, { "content-type": "application/json", "x-litellm-model-id": `${body.model}|${body.model.startsWith("key/") ? "anthropic/claude-sonnet-5-5" : `m1/ollama/${body.model}`}` });
  res.end(JSON.stringify({ model: body.model, choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
});

// The server's gateway listener stand-in, with the contract's four routes and its key.
const RC_KEY = `rct_${"a".repeat(48)}`;
const rc = { tasks: {}, running: {}, switches: [], posts: [], failSwitches: 0 };
const rcServer = await listen(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  const send = (code, j) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(j)); };
  if (req.headers.authorization !== `Bearer ${RC_KEY}`) return send(401, {});
  let m;
  if (req.method === "GET" && (m = req.url.match(/^\/gateway\/tasks\/([^/]+)$/))) {
    if (m[1] === "t-hang") return;   // never answers
    const t = rc.tasks[m[1]];
    if (!t) return send(404, {});
    return send(200, { task: m[1], status: t.open === false ? "done" : "working", settings: t.settings, open: t.open !== false });
  }
  if (req.method === "GET" && (m = req.url.match(/^\/gateway\/agents\/([^/]+)\/tasks$/))) return send(200, { tasks: rc.running[m[1]] ?? [] });
  if (req.method === "GET" && (m = req.url.match(/^\/gateway\/agents\/([^/]+)\/tasks\/([^/]+)$/))) return send(200, { on: (rc.running[m[1]] ?? []).includes(m[2]) });
  if (req.method === "POST" && (m = req.url.match(/^\/gateway\/tasks\/([^/]+)\/cloud-switch$/))) {
    const sw = JSON.parse(b);
    rc.posts.push({ task: m[1], ...sw });
    if (rc.failSwitches > 0) { rc.failSwitches--; return send(503, {}); }
    if (!rc.tasks[m[1]]) return send(404, {});
    if (rc.tasks[m[1]].open === false) return send(409, {});
    if (rc.switches.some((s) => s.task === m[1] && s.n === sw.n)) return send(200, { duplicate: true });
    rc.switches.push({ task: m[1], n: sw.n, reason: sw.reason });
    return send(201, {});
  }
  send(404, {});
});
// An address where nothing listens.
const gone = await listen(() => {});
const GONE = base(gone);
gone.close();
test.after(() => { litellm.closeAllConnections(); litellm.close(); rcServer.closeAllConnections(); rcServer.close(); });

const HANDLES = { "rc-designer": "designer", "rc-writer": "writer", "rc-nokey": "nokey" };
const source = (extra = {}) => rcTasks({ url: base(rcServer), key: RC_KEY, handles: HANDLES, ...extra });
const choose = (task, value) => { rc.tasks[task] = { settings: value === undefined ? {} : { model_use: value } }; };

test("each Model use choice maps to a mode: local only, the stall alone, and cloud from the start", () => {
  assert.deepEqual(settingFromRow(rowFromChoice("local_only")), { mode: "cluster_only" });
  assert.deepEqual(settingFromRow(rowFromChoice("local_then_cloud")), { mode: "cloud_after_wait", maxStartWaitMinutes: 15 }, "the stall, 15 minutes by default, and no time to finish");
  assert.equal(DEFAULT_STALL_MINUTES, 15);
  assert.deepEqual(settingFromRow(rowFromChoice("local_then_cloud", 20)), { mode: "cloud_after_wait", maxStartWaitMinutes: 20 });
  assert.deepEqual(settingFromRow(rowFromChoice("cloud_now")), { mode: "cloud_now" });
  for (const v of [undefined, null, "", "cloud", "CLOUD_NOW", "local_then_cloud ", 3]) assert.deepEqual(settingFromRow(rowFromChoice(v)), { mode: "cluster_only" }, String(v));
  // The choices the kit declares are the ones mapped here.
  assert.deepEqual(MODEL_USE_SETTING.choices.map((c) => c.value), ["local_only", "local_then_cloud", "cloud_now"]);
  assert.equal(MODEL_USE_SETTING.default, "local_only");
});

test("the source reads each task's choice from the server", async () => {
  const s = source({ stallMinutes: 20 });
  for (const [value, mode] of [["local_only", "cluster_only"], ["local_then_cloud", "cloud_after_wait"], ["cloud_now", "cloud_now"]]) {
    choose(`t-read-${value}`, value);
    assert.equal(settingFromRow(await s.setting(`t-read-${value}`)).mode, mode, value);
  }
  assert.deepEqual(settingFromRow(await s.setting("t-read-local_then_cloud")), { mode: "cloud_after_wait", maxStartWaitMinutes: 20 });
});

test("an unknown or missing choice, a closed task, a wrong key, a timeout or an unreachable server means local only", async () => {
  const local = async (s, task) => assert.deepEqual(settingFromRow(await s.setting(task)), { mode: "cluster_only" }, task);
  choose("t-unknown", "cloud_sometimes"); await local(source(), "t-unknown");
  choose("t-missing", undefined); await local(source(), "t-missing");
  rc.tasks["t-closed"] = { settings: { model_use: "cloud_now" }, open: false }; await local(source(), "t-closed");
  await local(source(), "t-no-such-task");
  choose("t-key", "cloud_now");
  await local(source({ key: "rct_wrong" }), "t-key");
  await local(source({ timeoutMs: 100 }), "t-hang");
  await local(rcTasks({ url: GONE, key: RC_KEY, handles: HANDLES }), "t-key");
  await local(rcTasks({ url: base(rcServer), keyFile: path.join(os.tmpdir(), "no-such-gateway-key"), handles: HANDLES }), "t-key");
  await local(source(), "../t-key");
});

test("the source maps gateway names to the server's handles, and knows no other agent", async () => {
  const s = source();
  rc.running.designer = ["t-a", "t-b", "../bad", 7];
  assert.deepEqual(await s.runTasks("rc-designer"), ["t-a", "t-b"], "only task ids");
  assert.equal(await s.onTask("rc-designer", "t-a"), true);
  assert.equal(await s.onTask("rc-designer", "t-other"), false);
  await assert.rejects(s.runTasks("designer"), /not an agent on the RecursicaChat server/);
  await assert.rejects(s.runTasks("svc-example"), /not an agent on the RecursicaChat server/);
  await assert.rejects(s.runTasks("constructor"), /not an agent on the RecursicaChat server/);
  await assert.rejects(rcTasks({ url: GONE, key: RC_KEY, handles: HANDLES }).runTasks("rc-designer"));
  await assert.rejects(source({ key: "rct_wrong" }).runTasks("rc-designer"), /answered 401/);
  rc.running.designer = [];
});

test("a switch report: recorded, a duplicate, refused for a closed task, and an error to retry", async () => {
  const s = source();
  choose("t-report", "cloud_now");
  assert.equal(await s.cloudSwitch("t-report", 1, "cloud_from_start"), "recorded");
  assert.equal(await s.cloudSwitch("t-report", 1, "cloud_from_start"), "duplicate");
  rc.tasks["t-report-closed"] = { settings: {}, open: false };
  assert.equal(await s.cloudSwitch("t-report-closed", 1, "stalled"), "refused");
  assert.equal(await s.cloudSwitch("t-report-none", 1, "stalled"), "refused");
  assert.equal(await source({ key: "rct_wrong" }).cloudSwitch("t-report", 2, "stalled"), "refused", "a 4xx is final: only a network error or a 5xx is asked again");
  rc.failSwitches = 1;
  await assert.rejects(s.cloudSwitch("t-report", 2, "stalled"), /answered 503/);
  await assert.rejects(rcTasks({ url: GONE, key: RC_KEY, handles: HANDLES }).cloudSwitch("t-report", 2, "stalled"));
});

// --- the gateway with the RecursicaChat source ---------------------------------------------------
const config = {
  cloud_allowed: true,
  agents: {
    "rc-designer": { routes: ["local-large"], cloud: true, key: "default" },
    "rc-writer": { routes: ["local-large"], cloud: false, key: "default" },
    "rc-nokey": { routes: ["local-large"], cloud: true, key: null },
  },
  fallback: { routes: [], cloud: false, key: null },
  keys: { default: { model: "key/default" } },
  routes: { "local-large": { local: true } },
  models: {},
};
let offset = 0;
const now = () => Date.now() + offset;
// A gateway with its own state folder, and clocks.json as given.
async function gateway({ clocks = {}, cfg = config, src = source(), switchRetryMs } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-rc-"));
  fs.writeFileSync(path.join(dir, "clocks.json"), JSON.stringify(clocks));
  const keys = Object.fromEntries(Object.keys(cfg.agents).map((h) => [h, issue(dir, h)]));
  const spendLog = path.join(dir, "spend.jsonl");
  const handler = createGateway({ config: cfg, db: src, litellm: base(litellm), litellmKey: "sk-master", stateDir: dir, spendLog, now, retryMs: 20, ...(switchRetryMs ? { switchRetryMs } : {}) });
  const server = await listen(handler);
  const ask = (agent) => fetch(`${base(server)}/v1/chat/completions`, {
    method: "POST", headers: { authorization: `Bearer ${keys[agent]}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "local-large", messages: [{ role: "user", content: "hi" }] }),
  }).then(async (r) => { await r.text(); return r.status; });
  // A request the caller gives up on after `ms`: "waiting" while the gateway still waits for the cluster.
  const askBrief = (agent, ms = 300) => fetch(`${base(server)}/v1/chat/completions`, {
    method: "POST", headers: { authorization: `Bearer ${keys[agent]}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "local-large", messages: [{ role: "user", content: "hi" }] }), signal: AbortSignal.timeout(ms),
  }).then(async (r) => { await r.text(); return r.status; }, () => "waiting");
  const logs = async () => { await sleep(50); return fs.existsSync(spendLog) ? fs.readFileSync(spendLog, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []; };
  const readClocks = async () => { await sleep(300); return JSON.parse(fs.readFileSync(path.join(dir, "clocks.json"), "utf8")); };
  return { ask, askBrief, logs, readClocks, handler, close: () => { server.closeAllConnections(); server.close(); } };
}
const switchesOf = (task) => rc.switches.filter((s) => s.task === task);
const postsOf = (task) => rc.posts.filter((s) => s.task === task);

test("cloud from the start: the cloud key answers, and the switch is reported once, with n 1", async () => {
  const g = await gateway();
  choose("t-now", "cloud_now");
  rc.running.designer = ["t-now"];
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "key/default");
  assert.ok(await until(() => switchesOf("t-now").length === 1), "the switch is reported");
  assert.deepEqual(switchesOf("t-now"), [{ task: "t-now", n: 1, reason: "cloud_from_start" }]);
  assert.deepEqual((await g.logs()).at(-1).switch, { n: 1, reason: "cloud_from_start" }, "the spend log records the switch");
  // The next request stays on the cloud: no new switch.
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "key/default");
  await sleep(200);
  assert.equal(postsOf("t-now").length, 1, "one report for one switch");
  assert.equal((await g.logs()).at(-1).switch, undefined);
  const c = (await g.readClocks())["t-now"];
  assert.deepEqual([c.switches, c.onCloud, c.reports], [1, true, undefined], "the report is sent, so none waits");

  // Back to local only: the cluster answers. Then cloud from the start again: a second switch.
  choose("t-now", "local_only");
  offset += 61_000;
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "local-large");
  choose("t-now", "cloud_now");
  offset += 61_000;
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "key/default");
  assert.ok(await until(() => switchesOf("t-now").length === 2));
  assert.deepEqual(switchesOf("t-now")[1], { task: "t-now", n: 2, reason: "cloud_from_start" }, "n is raised");
  rc.running.designer = [];
  g.close();
});

test("a failed switch report waits in clocks.json and is sent again later", async () => {
  const g = await gateway({ switchRetryMs: 100 });
  choose("t-retry", "cloud_now");
  rc.running.designer = ["t-retry"];
  rc.failSwitches = 1;
  assert.equal(await g.ask("rc-designer"), 200);
  assert.ok(await until(() => switchesOf("t-retry").length === 1), "the retry reports the switch");
  assert.equal(rc.failSwitches, 0, "the first report failed");
  assert.ok(postsOf("t-retry").length >= 2, "and was sent again");
  assert.deepEqual(switchesOf("t-retry"), [{ task: "t-retry", n: 1, reason: "cloud_from_start" }]);
  assert.ok(postsOf("t-retry").every((p) => p.n === 1 && p.reason === "cloud_from_start"), "the same switch each time");
  assert.equal((await g.readClocks())["t-retry"].reports, undefined, "nothing waits once the server has the switch");
  rc.running.designer = [];
  g.close();
});

test("local, then cloud: a request with no cluster answer by the stall moves to the cloud, reported as stalled", async () => {
  // The task's first request was a minute ago, less 300 ms; the stall is a minute.
  const g = await gateway({ clocks: { "t-stall": { firstRequestAt: now() - 60_000 + 300 } }, src: source({ stallMinutes: 1 }) });
  choose("t-stall", "local_then_cloud");
  rc.running.designer = ["t-stall"];
  behavior["local-large"] = "hang";
  const t0 = Date.now();
  assert.equal(await g.ask("rc-designer"), 200);
  behavior["local-large"] = "ok";
  assert.ok(Date.now() - t0 >= 250, "the request waited for the cluster first");
  assert.deepEqual(seen.slice(-2), ["local-large", "key/default"]);
  assert.ok(await until(() => switchesOf("t-stall").length === 1));
  assert.deepEqual(switchesOf("t-stall"), [{ task: "t-stall", n: 1, reason: "stalled" }]);
  rc.running.designer = [];
  g.close();
});

test("local, then cloud has no time to finish: a long task the cluster answers never moves to the cloud", async () => {
  const days = 10 * 24 * 3600_000;
  const g = await gateway({ clocks: { "t-long": { firstRequestAt: now() - days, startedAt: now() - days + 60_000 } } });
  choose("t-long", "local_then_cloud");
  rc.running.designer = ["t-long"];
  for (let i = 0; i < 3; i++) {
    assert.equal(await g.ask("rc-designer"), 200);
    assert.equal(seen.at(-1), "local-large", `request ${i + 1}`);
    offset += 61_000;
  }
  await sleep(100);
  assert.deepEqual(postsOf("t-long"), []);
  rc.running.designer = [];
  g.close();
});

test("a changed choice starts the task's stall again: from cloud from the start to local, then cloud", async () => {
  const g = await gateway();
  choose("t-turn", "cloud_now");
  rc.running.designer = ["t-turn"];
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "key/default");
  assert.ok(await until(() => switchesOf("t-turn").length === 1));
  // Turned down to local first: the next request tries the cluster again.
  choose("t-turn", "local_then_cloud");
  offset += 61_000;
  const changedAt = now();
  behavior["local-large"] = "hang";
  assert.equal(await g.askBrief("rc-designer"), "waiting", "the request waits for the cluster");
  assert.equal(seen.at(-1), "local-large");
  const c = (await g.readClocks())["t-turn"];
  assert.ok(c.firstRequestAt >= changedAt, "the clock starts again");
  assert.deepEqual([c.startedAt, c.onCloud, c.switches, c.mode], [undefined, false, 1, "cloud_after_wait"], "the switch count keeps counting");
  // 14 minutes later: still inside the fresh stall.
  offset += 14 * 60_000;
  assert.equal(await g.askBrief("rc-designer"), "waiting");
  assert.equal(seen.at(-1), "local-large");
  assert.equal(switchesOf("t-turn").length, 1);
  // Past the fresh 15-minute stall, with no cluster answer: the cloud, as switch 2.
  offset += 61_000;
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "key/default");
  behavior["local-large"] = "ok";
  assert.ok(await until(() => switchesOf("t-turn").length === 2));
  assert.deepEqual(switchesOf("t-turn")[1], { task: "t-turn", n: 2, reason: "stalled" });
  rc.running.designer = [];
  g.close();
});

test("a request that can't be placed in one task stays local, even when every task is cloud from the start", async () => {
  const g = await gateway();
  choose("t-both-a", "cloud_now");
  choose("t-both-b", "cloud_now");
  rc.running.designer = ["t-both-a", "t-both-b"];
  assert.equal(await g.ask("rc-designer"), 200);
  assert.equal(seen.at(-1), "local-large");
  const log = (await g.logs()).at(-1);
  assert.deepEqual([log.key, log.reason, log.tasks, log.switch], ["cluster", "the request could not be placed in one task", ["t-both-a", "t-both-b"], undefined]);
  await sleep(100);
  assert.deepEqual([...postsOf("t-both-a"), ...postsOf("t-both-b")], [], "no switch, and no report");
  rc.running.designer = [];
  g.close();
});

test("the stack's cloud permission wins: with it off, every choice stays local", async () => {
  // Without the permission, and for a task past its stall that the cluster never answered.
  const old = { firstRequestAt: now() - 3600_000 };
  const choices = ["local_only", "local_then_cloud", "cloud_now"];
  const cases = [
    ["the stack's permission is off", { ...config, cloud_allowed: false }, "rc-designer", "designer"],
    ["gateway.json names no permission", { ...config, cloud_allowed: undefined }, "rc-designer", "designer"],
    ["the agent's cloud switch is off", config, "rc-writer", "writer"],
    ["the agent has no cloud key", config, "rc-nokey", "nokey"],
  ];
  for (const [why, cfg, agent, handle] of cases) {
    const tasks = Object.fromEntries(choices.map((c) => [`t-off-${handle}-${cfg.cloud_allowed}-${c}`, c]));
    const g = await gateway({ cfg, clocks: Object.fromEntries(Object.keys(tasks).map((t) => [t, old])) });
    for (const [task, choice] of Object.entries(tasks)) {
      choose(task, choice);
      rc.running[handle] = [task];
      assert.equal(await g.ask(agent), 200, `${why}: ${choice}`);
      assert.equal(seen.at(-1), "local-large", `${why}: ${choice} stays local`);
    }
    await sleep(100);
    for (const task of Object.keys(tasks)) assert.deepEqual(postsOf(task), [], `${why}: no switch for ${task}`);
    rc.running[handle] = [];
    g.close();
  }
});

test("with the server's routes missing or the server down, every request stays local, quietly", async () => {
  for (const src of [rcTasks({ url: GONE, key: RC_KEY, handles: HANDLES }), source({ key: "rct_wrong" })]) {
    const g = await gateway({ src });
    choose("t-down", "cloud_now");
    rc.running.designer = ["t-down"];
    assert.equal(await g.ask("rc-designer"), 200);
    assert.equal(seen.at(-1), "local-large");
    assert.deepEqual((await g.logs()).at(-1).task, null, "the request is outside a task");
    rc.running.designer = [];
    g.close();
  }
});

test("gateway.json's recursicachat_tasks block picks the source; without it, no task source runs", async () => {
  const none = taskSource({});
  assert.match(none.describe, /task source: none/);
  await assert.rejects(none.runTasks("rc-designer"), /no task source/);
  assert.equal(none.cloudSwitch, undefined);
  const block = { recursicachat_tasks: { url: base(rcServer), key_file: path.join(os.tmpdir(), "no-such-gateway-key"), stall_minutes: 15, handles: HANDLES } };
  const rcSource = taskSource(block);
  assert.match(rcSource.describe, /RecursicaChat at http:\/\/127\.0\.0\.1:\d+, for 3 agent\(s\); no key in .* yet/);
  assert.equal(typeof rcSource.cloudSwitch, "function");
  await assert.rejects(rcSource.runTasks("rc-designer"), /no key/, "no key file: no task");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-rc-key-"));
  fs.writeFileSync(path.join(dir, "rc-tasks.key"), `${RC_KEY}\n`);
  const withKey = taskSource(block, { RC_TASKS_KEY_FILE: path.join(dir, "rc-tasks.key") });
  assert.doesNotMatch(withKey.describe, /no key/);
  rc.running.designer = ["t-a"];
  assert.deepEqual(await withKey.runTasks("rc-designer"), ["t-a"], "the key file is read");
  rc.running.designer = [];
  assert.match(taskSource({ recursicachat_tasks: { url: base(rcServer) } }).describe, /task source: none/, "a block with no key file is no source");
});
