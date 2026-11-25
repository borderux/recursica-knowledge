import { test } from "node:test";
import assert from "node:assert/strict";
import { failover } from "./failover.mjs";

// One engine's stand-in: answers, or throws an error with an HTTP status, as the SDK's APIError does.
const engine = (url, answer) => {
  const calls = [];
  return { url, calls, c: { systemOne: async (req) => { calls.push(req); if (answer instanceof Error) throw answer; return answer; } } };
};
const httpError = (status) => Object.assign(new Error(`status ${status}`), { status });

test("an engine that refuses the key (401) is skipped, and the next engine answers", async () => {
  const logs = [];
  const a = engine("http://a:8009", httpError(401)), b = engine("http://b:8009", { answers: { q: 1 } });
  const f = failover([a, b], { log: (m) => logs.push(m) });
  assert.deepEqual(await f.systemOne({ n: 1 }), { answers: { q: 1 } });
  assert.deepEqual(await f.systemOne({ n: 2 }), { answers: { q: 1 } });
  assert.equal(a.calls.length, 1, "the refusing engine is skipped for the rest of the run");
  assert.equal(b.calls.length, 2);
  assert.deepEqual(logs, ["kev: engine http://a:8009 refused the key, trying the next one"]);
});

test("an unreachable engine is skipped, and a bad request still fails without trying the next engine", async () => {
  const down = engine("http://a:8009", httpError(503)), up = engine("http://b:8009", { ok: true });
  assert.deepEqual(await failover([down, up], { log: () => {} }).systemOne({}), { ok: true });
  const bad = engine("http://a:8009", httpError(422)), next = engine("http://b:8009", { ok: true });
  await assert.rejects(failover([bad, next], { log: () => {} }).systemOne({}), /status 422/);
  assert.equal(next.calls.length, 0);
});

test("when every engine refuses the key, the last refusal is the error", async () => {
  const f = failover([engine("http://a:8009", httpError(401)), engine("http://b:8009", httpError(401))], { log: () => {} });
  await assert.rejects(f.systemOne({}), /status 401/);
});
