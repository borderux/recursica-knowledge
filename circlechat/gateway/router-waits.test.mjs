// Where a model request's time goes, in the spend log (waits.mjs): the wait at the gateway, the
// estimated wait at the model server, and the tries. Stand-ins for LiteLLM and a task source.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createGateway } from "./router.mjs";
import { issue } from "./keys.mjs";

const listen = (handler) => new Promise((r) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => r(s)); });
const base = (s) => `http://127.0.0.1:${s.address().port}`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// LiteLLM stand-in: answers after the "hold" in the request's body (ms), or 503 while busy > 0.
let busy = 0;
const litellm = await listen(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  const body = JSON.parse(b);
  if (busy > 0) { busy--; res.writeHead(503); return res.end("busy"); }
  await pause(body.hold ?? 0);
  res.writeHead(200, { "content-type": "application/json", "x-litellm-model-id": `${body.model}|m1/ollama/large` });
  res.end(JSON.stringify({ model: "openai/large", choices: [{ message: { content: "secret answer text" } }], usage: { prompt_tokens: 5, completion_tokens: 1 } }));
});

const config = {
  agents: { designer: { routes: ["local-large"], cloud: false, key: "default" } },
  fallback: { routes: [], cloud: false, key: null },
  keys: { default: { model: "key/default" } },
  routes: { "local-large": { local: true, models: ["m1/ollama/large"] } },
  // one slot: the second request at once waits for the first
  models: { "m1/ollama/large": { server: "m1/ollama", kind: "ollama", model: "example-model", parallel: 1 } },
};
const db = { async runTasks() { return []; }, async onTask() { return true; }, async setting() { return null; } };
const state = fs.mkdtempSync(path.join(os.tmpdir(), "gw-waits-"));
const spendLog = path.join(state, "spend.jsonl");
const key = issue(state, "designer");
const gw = await listen(createGateway({ config, db, litellm: base(litellm), stateDir: state, spendLog, retryMs: 50 }));
test.after(() => { gw.close(); litellm.close(); });

const ask = (hold = 0) => fetch(`${base(gw)}/v1/chat/completions`, {
  method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
  body: JSON.stringify({ model: "local-large", hold, messages: [{ role: "user", content: "secret prompt text" }] }),
}).then((r) => r.json());
const logs = async () => { await pause(30); return fs.readFileSync(spendLog, "utf8").trim().split("\n").map((l) => JSON.parse(l)); };

test("a request sent while its model's one slot is busy logs the wait for the slot as its server wait", async () => {
  await Promise.all([ask(300), pause(20).then(() => ask(0))]);
  const [first, second] = (await logs()).slice(-2);
  assert.equal(first.server_wait_ms, 0);
  assert.ok(first.upstream_ms >= 300);
  assert.ok(second.server_wait_ms >= 200 && second.server_wait_ms <= second.upstream_ms, `the second waited for the first: ${second.server_wait_ms} ms`);
  assert.equal(second.ahead, 1);
  assert.deepEqual([first.tries, second.tries], [1, 1]);
  assert.ok(first.gateway_wait_ms < 100 && second.gateway_wait_ms < 100);
});

test("a busy cluster's retries count as the gateway's wait, with each try counted", async () => {
  busy = 2;
  await ask(0);
  const log = (await logs()).at(-1);
  assert.equal(log.tries, 3);
  assert.ok(log.gateway_wait_ms >= 100, `two back-offs of at least 50 ms: ${log.gateway_wait_ms} ms`);
  assert.equal(log.server_wait_ms, 0, "a failed try leaves its slot");
  assert.doesNotMatch(fs.readFileSync(spendLog, "utf8"), /secret prompt text|secret answer text/);
});
