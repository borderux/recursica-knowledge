// The gateway's front door, with stand-ins for LiteLLM, CircleChat's database and CircleChat's API.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGateway, inCidr, strictest } from "./router.mjs";
import { issue, revoke } from "./keys.mjs";

const listen = (handler) => new Promise((r) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => r(s)); });
const base = (s) => `http://127.0.0.1:${s.address().port}`;

// LiteLLM stand-in. A cluster model (a route name) answers as `behavior[route]` says; a cloud key
// (key/<name>) always answers at once.
const seen = [];
const behavior = {};
const litellm = await listen(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  const body = JSON.parse(b);
  seen.push({ path: req.url, model: body.model });
  if (req.headers.authorization !== "Bearer sk-master") { res.writeHead(401); return res.end("no master key"); }
  const how = body.model.startsWith("key/") ? "ok" : (behavior[body.model]?.shift?.() ?? behavior[body.model] ?? "ok");
  if (how === "hang") return;   // a busy cluster: no answer yet
  if (how === "503") { res.writeHead(503); return res.end("busy"); }
  if (how === "stream") {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ model: "openai/small", choices: [{ delta: { content: "Hi" } }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ model: "openai/small", usage: { prompt_tokens: 7, completion_tokens: 2 } })}\n\n`);
    return res.end("data: [DONE]\n\n");
  }
  const model = body.model.startsWith("key/") ? "claude-sonnet-5-5" : `openai/${body.model}`;
  const answered = body.model.startsWith("key/") ? "anthropic/claude-sonnet-5-5" : `m1/${body.model === "local-small" ? "mlx" : "ollama"}/${body.model}`;
  res.writeHead(200, { "content-type": "application/json", "x-litellm-model-id": `${body.model}|${answered}` });
  res.end(JSON.stringify({ model, choices: [{ message: { content: "secret answer text" } }], usage: { prompt_tokens: 11, completion_tokens: 3 } }));
});

// CircleChat's API stand-in, for the gateway's comment on a task.
const comments = [];
const api = await listen(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  comments.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b) });
  res.end("{}");
});

const config = {
  agents: {
    betty: { routes: ["local-large"], cloud: true, key: "default" },
    loki: { routes: ["local-small"], cloud: false, key: "default" },
    porter: { routes: ["local-large", "local-small"], cloud: true, key: "porter" },
    nolocal: { routes: ["cloud-only"], cloud: true, key: "default" },
  },
  fallback: { routes: ["local-large", "local-small"], cloud: true, key: "default" },
  keys: { default: { model: "key/default" }, porter: { model: "key/porter" } },
  routes: { "local-large": { local: true }, "local-small": { local: true }, "cloud-only": { local: false } },
  models: {
    "m1/ollama/local-large": { server: "m1/ollama", kind: "ollama", model: "qwen3:32b" },
    "m1/mlx/local-small": { server: "m1/mlx", kind: "mlx-lm", model: "mlx-community/Qwen3-8B-4bit" },
    "anthropic/claude-sonnet-5-5": { server: "anthropic", kind: "cloud", model: "claude-sonnet-5-5" },
  },
};
const db = {
  tasks: { betty: null, loki: null, porter: null, nolocal: null },
  settings: {},
  reads: 0,
  // One task id per running turn; a list stands for more than one running turn.
  async runTasks(h) { const t = this.tasks[h]; return Array.isArray(t) ? t : t == null ? [] : [t]; },
  async onTask(h, t) { return h === "porter" && t.startsWith("t-sub"); },
  async setting(t) { this.reads++; return this.settings[t] ?? null; },
  async botToken(h) { return `cc_bot_${h}`; },
};
const state = fs.mkdtempSync(path.join(os.tmpdir(), "gw-"));
const spendLog = path.join(state, "spend.jsonl");
let offset = 0;
const now = () => Date.now() + offset;
const keys = Object.fromEntries(["betty", "loki", "porter", "nolocal"].map((h) => [h, issue(state, h)]));
const gw = await listen(createGateway({ config, db, litellm: base(litellm), litellmKey: "sk-master", stateDir: state, spendLog, apiBase: `${base(api)}/api`, now, retryMs: 20 }));
test.after(() => { gw.close(); litellm.close(); api.close(); });

const ask = (key, model = "local-large", extra = {}) => fetch(`${base(gw)}/v1/chat/completions`, {
  method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({ model, messages: [{ role: "user", content: "secret prompt text" }], ...extra }),
});
const lastLog = async () => { await new Promise((r) => setTimeout(r, 30)); return fs.readFileSync(spendLog, "utf8").trim().split("\n").map((l) => JSON.parse(l)).at(-1); };
// The gateway writes its clocks a moment after a change.
const clocks = async () => { await new Promise((r) => setTimeout(r, 300)); return JSON.parse(fs.readFileSync(path.join(state, "clocks.json"), "utf8")); };

test("a request outside a task goes to the cluster, and the spend log holds no prompt or answer", async () => {
  const r = await ask(keys.betty);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).model, "openai/local-large");
  assert.equal(seen.at(-1).model, "local-large");
  const log = await lastLog();
  assert.deepEqual({ task: log.task, agent: log.agent, key: log.key, server: log.server, model: log.model, backend: log.backend, input: log.input_tokens, output: log.output_tokens },
    { task: null, agent: "betty", key: "cluster", server: "m1/ollama", model: "qwen3:32b", backend: "m1/ollama/local-large", input: 11, output: 3 });
  assert.doesNotMatch(fs.readFileSync(spendLog, "utf8"), /secret prompt text|secret answer text/);
});

test("a cluster-only task waits through a busy cluster and never calls a cloud model", async () => {
  db.tasks.betty = "t-cluster";
  behavior["local-large"] = ["503", "503"];
  const before = seen.length;
  const r = await ask(keys.betty);
  assert.equal(r.status, 200);
  assert.deepEqual(seen.slice(before).map((s) => s.model), ["local-large", "local-large", "local-large"]);
  assert.equal((await lastLog()).key, "cluster");
  assert.ok((await clocks())["t-cluster"].startedAt, "the cluster's first answer starts the task");
});

test("cloud now calls the agent's cloud key from the first request", async () => {
  db.tasks.betty = "t-now"; db.settings["t-now"] = { mode: "cloud_now" };
  const r = await ask(keys.betty);
  assert.equal((await r.json()).model, "claude-sonnet-5-5");
  assert.equal(seen.at(-1).model, "key/default");
  const log = await lastLog();
  assert.deepEqual([log.task, log.agent, log.key, log.server, log.model], ["t-now", "betty", "default", "anthropic", "claude-sonnet-5-5"]);
});

test("the spend log names each request's agent, server and model, so runs can be compared", async () => {
  db.tasks.betty = null; db.tasks.loki = null;
  await ask(keys.betty);
  const a = await lastLog();
  await ask(keys.loki, "local-small");
  const b = await lastLog();
  assert.deepEqual([a.agent, a.server, a.model], ["betty", "m1/ollama", "qwen3:32b"]);
  assert.deepEqual([b.agent, b.server, b.model], ["loki", "m1/mlx", "mlx-community/Qwen3-8B-4bit"]);
});

test("an agent whose cloud switch is off never calls a cloud model, whatever the task says", async () => {
  db.tasks.loki = "t-now";
  await ask(keys.loki, "local-small");
  assert.equal(seen.at(-1).model, "local-small");
  assert.equal((await lastLog()).key, "cluster");
});

test("cloud after a wait moves a waiting request to the cloud key once the task passes its wait to start", async () => {
  db.tasks.betty = "t-wait"; db.settings["t-wait"] = { mode: "cloud_after_wait", max_start_wait_minutes: 1, max_finish_minutes: 60 };
  // A gateway whose clock for the task started a minute ago, less 300 ms.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-wait-"));
  fs.writeFileSync(path.join(dir, "clocks.json"), JSON.stringify({ "t-wait": { firstRequestAt: now() - 60_000 + 300 } }));
  const key = issue(dir, "betty");
  const g = await listen(createGateway({ config, db, litellm: base(litellm), litellmKey: "sk-master", stateDir: dir, spendLog, now, retryMs: 20 }));
  behavior["local-large"] = "hang";
  const t0 = Date.now();
  const r = await fetch(`${base(g)}/v1/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "local-large", messages: [{ role: "user", content: "hi" }] }) });
  g.close();
  assert.equal(r.status, 200);
  assert.ok(Date.now() - t0 >= 250, "the request waited for the cluster first");
  assert.deepEqual(seen.slice(-2).map((s) => s.model), ["local-large", "key/default"]);
  assert.equal((await lastLog()).key, "default");
  behavior["local-large"] = "ok";
});

test("a change to the task's setting applies within a minute", async () => {
  db.tasks.betty = "t-change"; db.settings["t-change"] = { mode: "cluster_only" };
  await ask(keys.betty);
  assert.equal(seen.at(-1).model, "local-large");
  db.settings["t-change"] = { mode: "cloud_now" };
  const reads = db.reads;
  await ask(keys.betty);
  assert.equal(db.reads, reads, "the setting is cached");
  offset += 61_000;
  await ask(keys.betty);
  assert.equal(seen.at(-1).model, "key/default");
});

test("with more than one running turn, the strictest setting among their tasks decides", async () => {
  db.settings["t-now"] = { mode: "cloud_now" }; db.settings["t-now-2"] = { mode: "cloud_now" };
  db.settings["t-only"] = { mode: "cluster_only" };
  db.tasks.betty = ["t-now", "t-only"];
  await ask(keys.betty);
  assert.equal(seen.at(-1).model, "local-large", "cluster only wins over cloud now");
  const log = await lastLog();
  assert.deepEqual([log.task, log.key, log.tasks], ["t-only", "cluster", ["t-now", "t-only"]]);
  db.tasks.betty = ["t-now", null];
  await ask(keys.betty);
  assert.equal(seen.at(-1).model, "local-large", "a turn outside a task counts as cluster only");
  db.tasks.betty = ["t-now", "t-now-2"];
  await ask(keys.betty);
  assert.equal(seen.at(-1).model, "key/default", "every running task allows cloud now");
  db.tasks.betty = ["t-new-a", "t-new-b"];
  await ask(keys.betty);
  assert.ok(!(await clocks())["t-new-a"], "a request the router cannot place starts no task's clock");
  db.tasks.porter = ["t-a", "t-b"];
  const many = await fetch(`${base(gw)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${keys.porter}` } });
  assert.equal(many.status, 409, "Porter must name the task");
  db.tasks.betty = null; db.tasks.porter = null;
  // A later move to the cloud is stricter than an earlier one.
  const at = (until) => ({ task: String(until), clock: null, d: { target: "cluster", until } });
  assert.equal(strictest([at(5), at(9), { task: "c", d: { target: "cloud" } }]).task, "9");
  assert.equal(strictest([at(5), { task: "x", d: { target: "cluster" } }]).task, "x");
});

test("only model requests reach LiteLLM: its admin endpoints are refused, even with a valid key", async () => {
  const before = seen.length;
  for (const [method, p] of [["POST", "/key/generate"], ["POST", "/v1/key/generate"], ["GET", "/key/list"], ["POST", "/model/new"], ["GET", "/v1/model/info"],
    ["POST", "/user/new"], ["GET", "/spend/logs"], ["POST", "/config/update"], ["POST", "/v1/embeddings"], ["POST", "/v1/messages/batches"], ["POST", "/v1/../key/generate"]]) {
    const r = await fetch(`${base(gw)}${p}`, { method, headers: { authorization: `Bearer ${keys.betty}`, "content-type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    assert.equal(r.status, 404, `${method} ${p}`);
  }
  assert.equal(seen.length, before, "LiteLLM saw none of them");
  for (const p of ["/v1/chat/completions", "/v1/completions", "/v1/messages"]) {
    const r = await fetch(`${base(gw)}${p}`, { method: "POST", headers: { authorization: `Bearer ${keys.betty}`, "content-type": "application/json" }, body: JSON.stringify({ model: "local-large", max_tokens: 5 }) });
    assert.equal(r.status, 200, p);
  }
  assert.deepEqual(seen.slice(before).map((s) => s.path), ["/v1/chat/completions", "/v1/completions", "/v1/messages"]);
});

test("the port for port jobs takes only a task key, for every request", async () => {
  const handler = createGateway({ config, db, litellm: base(litellm), litellmKey: "sk-master", stateDir: state, spendLog, now, retryMs: 20 });
  const jobs = await listen(handler.jobs);
  const get = (p, key) => fetch(`${base(jobs)}${p}`, { headers: key ? { authorization: `Bearer ${key}` } : {} });
  assert.equal((await get("/health")).status, 401, "no key, not even for /health");
  assert.equal((await get("/health", keys.porter)).status, 401, "an agent key is refused here");
  const { key } = await (await fetch(`${base(gw)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${keys.porter}`, "content-type": "application/json" }, body: JSON.stringify({ task: "t-sub-x" }) })).json();
  assert.equal((await get("/health", key)).status, 200);
  const r = await fetch(`${base(jobs)}/v1/messages`, { method: "POST", headers: { "x-api-key": key, "content-type": "application/json" }, body: JSON.stringify({ model: "sonnet", max_tokens: 5 }) });
  assert.equal(r.status, 200);
  assert.equal((await fetch(`${base(jobs)}/key/generate`, { method: "POST", headers: { "x-api-key": key } })).status, 404);
  jobs.close();
});

test("a key reaches only its agent's routes; another name means the agent's first route", async () => {
  db.tasks.betty = null;
  const r = await ask(keys.betty, "local-small");
  assert.equal(r.status, 403);
  assert.match((await r.json()).error.message, /Agent betty may use local-large, not local-small/);
  assert.equal((await ask(keys.betty, "key/porter")).status, 403);
  await ask(keys.betty, "claude-sonnet-5-5");
  assert.equal(seen.at(-1).model, "local-large");
});

test("an unknown or revoked key gets nothing, and revoking one agent leaves the others working", async () => {
  assert.equal((await ask("ccg_" + "1".repeat(48))).status, 401);
  assert.equal((await ask("sk-ant-anything")).status, 401);
  const extra = issue(state, "alan");
  assert.equal((await ask(extra)).status, 200, "the fallback serves an agent site.json does not list");
  revoke(state, "alan");
  assert.equal((await ask(extra)).status, 401);
  assert.equal((await ask(keys.betty)).status, 200);
});

test("Porter gets a key for the current task, and a port job's requests go through that task", async () => {
  db.tasks.porter = null;
  const none = await fetch(`${base(gw)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${keys.porter}` } });
  assert.equal(none.status, 409);
  db.tasks.porter = "t-port"; db.settings["t-port"] = { mode: "cloud_now" };
  const { key, task } = await (await fetch(`${base(gw)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${keys.porter}` } })).json();
  assert.equal(task, "t-port");
  assert.match(key, /^cct_/);
  db.tasks.porter = null;   // the job runs after Porter's turn ends
  // Claude Code in a port job: Anthropic's format, the key in x-api-key, any model name.
  const r = await fetch(`${base(gw)}/v1/messages`, { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "sonnet", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }) });
  assert.equal(r.status, 200);
  assert.deepEqual(seen.at(-1), { path: "/v1/messages", model: "key/porter" });
  const log = await lastLog();
  assert.deepEqual([log.task, log.agent, log.key], ["t-port", "porter", "porter"]);
  const fromTask = await fetch(`${base(gw)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${key}` } });
  assert.equal(fromTask.status, 403, "a task key cannot make more keys");
});

test("Porter gets a key for a task Porter created or is assigned to, and for no other task", async () => {
  const askFor = (task, k = keys.porter) => fetch(`${base(gw)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${k}`, "content-type": "application/json" }, body: JSON.stringify({ task }) });
  const ok = await askFor("t-sub-mui");
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).task, "t-sub-mui");
  assert.equal((await askFor("t-someone-else")).status, 403);
  assert.equal((await askFor("t-sub-mui", keys.betty)).status, 403);
  assert.equal((await askFor("../bad id")).status, 400);
});

test("with no cluster model, a cluster-only task fails with a clear message in the task, posted once", async () => {
  db.tasks.nolocal = "t-none";
  const r = await ask(keys.nolocal, "cloud-only");
  assert.equal(r.status, 409);
  assert.match((await r.json()).error.message, /no cluster model, and the task is cluster only/);
  await ask(keys.nolocal, "cloud-only");
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(comments.length, 1);
  assert.equal(comments[0].url, "/api/agent-api/tasks/t-none/comments");
  assert.equal(comments[0].auth, "Bearer cc_bot_nolocal");
  assert.match(comments[0].body.bodyMd, /cannot run this task/);
});

test("a streamed answer is passed through, and its model and token counts reach the spend log", async () => {
  db.tasks.betty = null;
  behavior["local-large"] = ["stream"];
  const r = await ask(keys.betty, "local-large", { stream: true });
  assert.match(await r.text(), /"content":"Hi"[\s\S]*\[DONE\]/);
  const log = await lastLog();
  assert.deepEqual([log.model, log.input_tokens, log.output_tokens], ["openai/small", 7, 2]);
});

test("a key works only from inside the cluster", async () => {
  const outside = await listen(createGateway({ config, db, litellm: base(litellm), stateDir: state, spendLog, now, allow: ["100.64.0.5"] }));
  const r = await fetch(`${base(outside)}/v1/models`, { headers: { authorization: `Bearer ${keys.betty}` } });
  assert.equal(r.status, 403);
  outside.close();
  assert.ok(inCidr("::ffff:172.18.0.4", "172.18.0.0/16"));
  assert.ok(inCidr("fd7a:115c:a1e0::4801:bfc4", "fd7a:115c:a1e0::/48"));
  assert.ok(!inCidr("10.1.2.3", "172.18.0.0/16"));
  assert.ok(inCidr("100.64.0.5", "100.64.0.5/32"));
});

test("a network the gateway joins after it starts counts, and an outside address still gets nothing", async () => {
  // setup-host.sh connects the agents' network after the gateway starts.
  let reads = 0;
  const joined = await listen(createGateway({ config, db, litellm: base(litellm), stateDir: state, spendLog, now, allow: ["100.64.0.5"], refreshAllow: async () => { reads++; return ["100.64.0.5", "127.0.0.0/8"]; } }));
  const r = await fetch(`${base(joined)}/v1/models`, { headers: { authorization: `Bearer ${keys.betty}` } });
  assert.notEqual(r.status, 403);
  assert.equal(reads, 1);
  joined.close();
  // A source on no network the gateway has: the networks are read again at most every 5 seconds.
  let t = Date.now(), outsideReads = 0;
  const outside = await listen(createGateway({ config, db, litellm: base(litellm), stateDir: state, spendLog, now: () => t, allow: ["100.64.0.5"], refreshAllow: async () => { outsideReads++; return ["100.64.0.5"]; } }));
  const ask = () => fetch(`${base(outside)}/v1/models`, { headers: { authorization: `Bearer ${keys.betty}` } }).then((x) => x.status);
  assert.equal(await ask(), 403);
  assert.equal(await ask(), 403);
  assert.equal(outsideReads, 1);
  t += 5000;
  assert.equal(await ask(), 403);
  assert.equal(outsideReads, 2);
  outside.close();
});
