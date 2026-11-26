// Kev-engine through the gateway: POST /v1/systemone for a program's key whose gateway block lists
// Kev's computers (gateway.kev in site.json, a list of engine URLs in gateway.json). Stand-ins for
// two Kev-engines and LiteLLM; each test has its own gateway and state folder.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { KEV_KEY_FILE, KEV_PATH, createGateway } from "./router.mjs";
import { issue } from "./keys.mjs";

const listen = (handler) => new Promise((r) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => r(s)); });
const base = (s) => `http://127.0.0.1:${s.address().port}`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const stop = (s) => { s.close(); s.closeAllConnections?.(); };

// A Kev-engine stand-in: records each request's path, key and body, and answers with `status`.
function engine(status = 200) {
  const e = { status, seen: [] };
  e.ready = listen(async (req, res) => {
    let b = ""; for await (const c of req) b += c;
    e.seen.push({ path: req.url, auth: req.headers.authorization, body: b });
    res.writeHead(e.status, { "content-type": "application/json" });
    res.end(JSON.stringify(e.status === 200 ? { answers: { billing: { p: 0.9 } } } : { error: "busy" }));
  });
  return e;
}
const litellm = await listen((req, res) => { res.writeHead(500); res.end(); });
test.after(() => stop(litellm));

const SVC = "svc-example-service";
async function gateway({ engines, kevKey = "kev-engine-secret", caps = { max_parallel: 2, daily_requests: 100 }, withKev = true } = {}) {
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "gw-kev-"));
  if (kevKey !== null) fs.writeFileSync(path.join(state, KEV_KEY_FILE), `${kevKey}\n`);
  const config = {
    agents: {
      [SVC]: { routes: ["judge"], cloud: false, key: null, service: true, ...caps, ...(withKev ? { kev: engines } : {}) },
      designer: { routes: ["judge"], cloud: false, key: null },
    },
    fallback: { routes: [], cloud: false, key: null },
    keys: {},
    routes: { judge: { local: true } },
    models: {},
    timezone: "UTC",
  };
  const keys = { svc: issue(state, SVC), designer: issue(state, "designer") };
  const spendLog = path.join(state, "spend.jsonl");
  const server = await listen(createGateway({ config, litellm: base(litellm), stateDir: state, spendLog, retryMs: 20 }));
  const ask = (key, body = { state: "a screen", questions: { q1: { type: "noul", instructions: "Is the rule broken?" } } }) =>
    fetch(`${base(server)}${KEV_PATH}`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const log = async () => { await pause(30); return fs.existsSync(spendLog) ? fs.readFileSync(spendLog, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
  return { server, state, keys, ask, log, close: () => stop(server) };
}

test("a program's Kev request goes to its first engine, with the engines' key in place of the program's, and the body unchanged", async () => {
  const a = engine(), b = engine();
  const [sa, sb] = await Promise.all([a.ready, b.ready]);
  const g = await gateway({ engines: [base(sa), base(sb)] });
  try {
    const r = await g.ask(g.keys.svc);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { answers: { billing: { p: 0.9 } } });
    assert.equal(a.seen.length, 1);
    assert.equal(b.seen.length, 0, "the second engine is only a fallback");
    assert.equal(a.seen[0].path, KEV_PATH);
    assert.equal(a.seen[0].auth, "Bearer kev-engine-secret", "the engine gets its own key, never the program's");
    assert.deepEqual(JSON.parse(a.seen[0].body).questions.q1.instructions, "Is the rule broken?");
    const [line] = await g.log();
    assert.equal(line.route, "kev");
    assert.equal(line.agent, SVC);
    assert.equal(line.status, 200);
    assert.doesNotMatch(JSON.stringify(line), /a screen|rule broken|kev-engine-secret/, "the spend log holds no question, answer or key");
  } finally { g.close(); stop(sa); stop(sb); }
});

test("an engine that is busy, failing or gone passes the request to the next one", async () => {
  const busy = engine(429), broken = engine(503), good = engine();
  const [s1, s2, s3] = await Promise.all([busy.ready, broken.ready, good.ready]);
  const gone = await listen(() => {}); const goneUrl = base(gone); stop(gone);
  const g = await gateway({ engines: [goneUrl, base(s1), base(s2), base(s3)] });
  try {
    const r = await g.ask(g.keys.svc);
    assert.equal(r.status, 200);
    assert.deepEqual([busy.seen.length, broken.seen.length, good.seen.length], [1, 1, 1]);
  } finally { g.close(); stop(s1); stop(s2); stop(s3); }
});

test("with no engine answering, the program gets 502 naming each engine's failure", async () => {
  const broken = engine(500);
  const s = await broken.ready;
  const g = await gateway({ engines: [base(s)] });
  try {
    const r = await g.ask(g.keys.svc);
    assert.equal(r.status, 502);
    const e = (await r.json()).error;
    assert.equal(e.type, "kev_unavailable");
    assert.match(e.message, /: 500/);
    assert.equal((await g.log())[0].status, 502);
  } finally { g.close(); stop(s); }
});

test("an agent's key, and a program's key with no Kev computers, reach no Kev-engine", async () => {
  const a = engine();
  const s = await a.ready;
  const g = await gateway({ engines: [base(s)] });
  const noKev = await gateway({ engines: [base(s)], withKev: false });
  try {
    const agent = await g.ask(g.keys.designer);
    assert.equal(agent.status, 403);
    assert.equal((await agent.json()).error.type, "route_not_allowed");
    const program = await noKev.ask(noKev.keys.svc);
    assert.equal(program.status, 403);
    assert.equal(a.seen.length, 0);
  } finally { g.close(); noKev.close(); stop(s); }
});

test("without the engines' key file the gateway answers 503, and a new key applies without a restart", async () => {
  const a = engine();
  const s = await a.ready;
  const g = await gateway({ engines: [base(s)], kevKey: null });
  try {
    const r = await g.ask(g.keys.svc);
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error.type, "no_kev_key");
    assert.equal(a.seen.length, 0);
    fs.writeFileSync(path.join(g.state, KEV_KEY_FILE), "rotated-key\n");
    assert.equal((await g.ask(g.keys.svc)).status, 200);
    assert.equal(a.seen[0].auth, "Bearer rotated-key");
  } finally { g.close(); stop(s); }
});

test("Kev requests count against the program's caps", async () => {
  const a = engine();
  const s = await a.ready;
  const g = await gateway({ engines: [base(s)], caps: { max_parallel: 2, daily_requests: 1 } });
  try {
    assert.equal((await g.ask(g.keys.svc)).status, 200);
    const r = await g.ask(g.keys.svc);
    assert.equal(r.status, 429);
    assert.equal((await r.json()).error.type, "daily_limit");
    assert.equal(a.seen.length, 1);
  } finally { g.close(); stop(s); }
});

test("a bad key gets 401 and reaches no engine", async () => {
  const a = engine();
  const s = await a.ready;
  const g = await gateway({ engines: [base(s)] });
  try {
    assert.equal((await g.ask("not-a-key")).status, 401);
    assert.equal(a.seen.length, 0);
  } finally { g.close(); stop(s); }
});
