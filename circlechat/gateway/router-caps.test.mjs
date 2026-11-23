// The caps on a program's gateway key (svc-<name>, from recursicachat.services in site.json):
// requests at once and requests per day. Stand-ins for LiteLLM and a task source; each test
// has its own gateway and state folder.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCaps, createGateway, dayIn } from "./router.mjs";
import { issue } from "./keys.mjs";

const listen = (handler) => new Promise((r) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => r(s)); });
const base = (s) => `http://127.0.0.1:${s.address().port}`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const stop = (s) => { s.close(); s.closeAllConnections?.(); };

// LiteLLM stand-in: answers at once, or holds a request with "hang" in its body until release().
const held = [];
const seen = [];
const litellm = await listen(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  const body = JSON.parse(b);
  seen.push(body.model);
  if (body.hang) return void held.push(res);
  res.writeHead(200, { "content-type": "application/json", "x-litellm-model-id": `${body.model}|m1/ollama/large` });
  res.end(JSON.stringify({ model: "openai/judge", choices: [{ message: { content: "secret answer text" } }], usage: { prompt_tokens: 5, completion_tokens: 1 } }));
});
const release = () => { for (const res of held.splice(0)) { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); } };
test.after(() => stop(litellm));

const SVC = "svc-example-service";
const config = (caps = { max_parallel: 2, daily_requests: 5 }) => ({
  agents: {
    [SVC]: { routes: ["judge"], cloud: false, key: null, service: true, ...caps },
    designer: { routes: ["judge", "local-large"], cloud: true, key: "default" },
  },
  fallback: { routes: [], cloud: false, key: null },
  keys: { default: { model: "key/default" } },
  routes: { judge: { local: true }, "local-large": { local: true } },
  models: { "m1/ollama/large": { server: "m1/ollama", kind: "ollama", model: "example-model" } },
  timezone: "America/New_York",
});
// The task source's stand-in fails the test if the gateway looks up a program's running turns.
const db = {
  looked: [],
  async runTasks(h) { this.looked.push(h); return []; },
  async onTask() { return true; },
  async setting() { return null; },
};

async function gateway({ caps, state = fs.mkdtempSync(path.join(os.tmpdir(), "gw-caps-")), now = Date.now } = {}) {
  const keys = { svc: issue(state, SVC), designer: issue(state, "designer") };
  const spendLog = path.join(state, "spend.jsonl");
  const server = await listen(createGateway({ config: config(caps), db, litellm: base(litellm), stateDir: state, spendLog, now, retryMs: 20 }));
  const ask = (key, extra = {}) => fetch(`${base(server)}/v1/chat/completions`, {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "judge", messages: [{ role: "user", content: "secret prompt text" }], ...extra }),
  });
  const log = async () => { await pause(30); return fs.existsSync(spendLog) ? fs.readFileSync(spendLog, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
  return { server, state, keys, ask, log, spendLog };
}

test("dayIn counts the day in the cluster's time zone", () => {
  const t = Date.UTC(2026, 10, 22, 3, 0);   // 03:00 UTC is still the day before in New York
  assert.equal(dayIn(t, "UTC"), "2026-11-22");
  assert.equal(dayIn(t, "America/New_York"), "2026-11-21");
  assert.equal(dayIn(t, "Not/A_Zone"), "2026-11-22", "an unknown time zone counts in UTC");
});

test("a program's key lists exactly its routes, gets no task key, and is never looked up as a running turn", async () => {
  const g = await gateway();
  try {
    const models = await (await fetch(`${base(g.server)}/v1/models`, { headers: { authorization: `Bearer ${g.keys.svc}` } })).json();
    assert.deepEqual(models.data.map((m) => m.id), ["judge"]);
    const tk = await fetch(`${base(g.server)}/task-key`, { method: "POST", headers: { authorization: `Bearer ${g.keys.svc}`, "content-type": "application/json" }, body: JSON.stringify({ task: "t-1" }) });
    assert.equal(tk.status, 403);
    assert.equal((await tk.json()).error.type, "agent_key_needed");
    const other = await g.ask(g.keys.svc, { model: "local-large" });
    assert.equal(other.status, 403, "a route outside the program's routes is refused");
    db.looked.length = 0;
    const r = await g.ask(g.keys.svc);
    assert.equal(r.status, 200);
    assert.ok(!db.looked.includes(SVC), "a program's request is outside any task");
  } finally { stop(g.server); }
});

test("past max_parallel the gateway answers 429 at once, and frees the slot when an answer ends", async () => {
  const g = await gateway({ caps: { max_parallel: 2, daily_requests: 100 } });
  try {
    const first = g.ask(g.keys.svc, { hang: true });
    const second = g.ask(g.keys.svc, { hang: true });
    while (held.length < 2) await pause(10);
    const third = await g.ask(g.keys.svc);
    assert.equal(third.status, 429);
    assert.equal(third.headers.get("retry-after"), "1");
    const err = (await third.json()).error;
    assert.equal(err.type, "too_many_at_once");
    assert.match(err.message, /2 requests in flight, its max_parallel/);
    // an agent's key has no cap, whatever the program has in flight
    assert.equal((await g.ask(g.keys.designer)).status, 200);
    release();
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
    await pause(20);
    assert.equal((await g.ask(g.keys.svc)).status, 200, "a slot is free again once an answer ends");
    // a caller that goes away frees its slot too
    const ctl = new AbortController();
    const kept = g.ask(g.keys.svc, { hang: true });
    const gone = fetch(`${base(g.server)}/v1/chat/completions`, { method: "POST", signal: ctl.signal, headers: { authorization: `Bearer ${g.keys.svc}`, "content-type": "application/json" }, body: JSON.stringify({ model: "judge", hang: true }) }).catch(() => null);
    while (held.length < 2) await pause(10);
    assert.equal((await g.ask(g.keys.svc)).status, 429);
    ctl.abort();
    await gone;
    await pause(50);
    const after = g.ask(g.keys.svc, { hang: true });
    while (held.length < 3) await pause(10);
    release();
    assert.equal((await after).status, 200, "the slot of the caller that went is free");
    assert.equal((await kept).status, 200);
    const refused = (await g.log()).filter((l) => l.status === 429);
    assert.ok(refused.length >= 2);
    assert.deepEqual(Object.keys(refused[0]).sort(), ["agent", "key", "model", "reason", "route", "status", "task", "time"]);
    assert.equal(refused[0].reason, "too_many_at_once");
    assert.equal(refused[0].agent, SVC);
    assert.doesNotMatch(fs.readFileSync(g.spendLog, "utf8"), /secret prompt text|secret answer text/);
  } finally { release(); stop(g.server); }
});

test("past daily_requests the gateway answers 429 until midnight in the cluster's time zone, and a restart keeps the count", async () => {
  let at = Date.UTC(2026, 10, 22, 15, 0);   // 10:00 in New York
  const now = () => at;
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "gw-caps-day-"));
  const g = await gateway({ caps: { max_parallel: 4, daily_requests: 3 }, state, now });
  for (let i = 0; i < 2; i++) assert.equal((await g.ask(g.keys.svc)).status, 200);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state, "service-counts.json"), "utf8")), { [SVC]: { day: "2026-11-22", requests: 2 } }, "the count is on disk at once");
  stop(g.server);

  // A new gateway on the same state folder, as after a restart: one request left today.
  const server = await listen(createGateway({ config: config({ max_parallel: 4, daily_requests: 3 }), db, litellm: base(litellm), stateDir: state, spendLog: g.spendLog, now, retryMs: 20 }));
  const ask = () => fetch(`${base(server)}/v1/chat/completions`, { method: "POST", headers: { authorization: `Bearer ${g.keys.svc}`, "content-type": "application/json" }, body: JSON.stringify({ model: "judge", messages: [] }) });
  try {
    assert.equal((await ask()).status, 200);
    const over = await ask();
    assert.equal(over.status, 429);
    const err = (await over.json()).error;
    assert.equal(err.type, "daily_limit");
    assert.match(err.message, /3 requests for 2026-11-22 \(America\/New_York\)/);
    assert.equal((await ask()).status, 429, "a refused request does not count, and the cap holds");
    assert.equal(JSON.parse(fs.readFileSync(path.join(state, "service-counts.json"), "utf8"))[SVC].requests, 3);
    // 04:59 UTC is still 23:59 the same day in New York
    at = Date.UTC(2026, 10, 23, 4, 59);
    assert.equal((await ask()).status, 429);
    // 05:00 UTC is midnight in New York: a new day
    at = Date.UTC(2026, 10, 23, 5, 0);
    assert.equal((await ask()).status, 200);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state, "service-counts.json"), "utf8"))[SVC], { day: "2026-11-23", requests: 1 });
  } finally { stop(server); }
});

test("createCaps: a key without caps is never counted, and release frees one slot once", () => {
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "gw-caps-unit-"));
  const caps = createCaps({ stateDir: state, timeZone: "UTC", now: () => Date.UTC(2026, 0, 1) });
  const a = caps.take(SVC, { max_parallel: 1 });
  assert.ok(a.ok);
  assert.equal(caps.take(SVC, { max_parallel: 1 }).ok, false);
  a.release(); a.release();
  assert.equal(caps.inFlight(SVC), 0, "a second release frees nothing");
  assert.equal(caps.count(SVC), 0, "with no daily cap, nothing is counted");
  assert.ok(!fs.existsSync(path.join(state, "service-counts.json")));
});
