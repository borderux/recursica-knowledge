import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKOFF_MS, gate, MAX_WAIT_MS, retryAfterMs, retrying } from "./limit.mjs";
import { pool } from "./pool.mjs";

// A 429 as the SDK's RateLimitError gives it: a status and the answer's headers.
const tooMany = (headers = new Headers()) => Object.assign(new Error("429 too_many_at_once"), { status: 429, headers });

test("one gate holds Kev's two nested pools under one limit", async () => {
  const limit = gate(4);
  let now = 0, peak = 0;
  const ask = () => limit.run(async () => {
    now++;
    peak = Math.max(peak, now);
    await new Promise((r) => setTimeout(r, 1));
    now--;
  });
  // 6 skills, 8 units each, both pools 4 wide: 16 at once without the gate
  await pool(Array.from({ length: 6 }, () => async () => {
    await ask();
    await pool(Array.from({ length: 8 }, () => ask), 4);
    await ask();
  }), 4);
  assert.equal(peak, 4);
  assert.equal(limit.running, 0, "every slot is given back");
});

test("a gate gives its slot back when a call fails", async () => {
  const limit = gate(1);
  await assert.rejects(limit.run(async () => { throw new Error("boom"); }), /boom/);
  assert.equal(await limit.run(async () => "next"), "next");
});

test("a 429 waits as its retry-after says, then asks again", async () => {
  const waited = [], logs = [];
  let n = 0;
  const got = await retrying(async () => {
    if (++n < 3) throw tooMany(new Headers({ "retry-after": "1" }));
    return "answered";
  }, { sleep: async (ms) => void waited.push(ms), log: (m) => logs.push(m) });
  assert.equal(got, "answered");
  assert.deepEqual(waited, [1000, 1000]);
  assert.equal(logs.length, 2);
  assert.match(logs[0], /429, too many requests at once; waiting 1000 ms/);
});

test("a 429 with no header waits by the backoff, and the last 429 is thrown when the tries run out", async () => {
  const waited = [];
  let n = 0;
  await assert.rejects(retrying(async () => { n++; throw tooMany(); }, { sleep: async (ms) => void waited.push(ms) }), /429/);
  assert.deepEqual(waited, BACKOFF_MS);
  assert.equal(n, BACKOFF_MS.length + 1);
});

test("any other error is thrown at once, and a long retry-after is capped", async () => {
  let n = 0;
  await assert.rejects(retrying(async () => { n++; throw Object.assign(new Error("422 bad request"), { status: 422 }); }, { sleep: async () => {} }), /422/);
  assert.equal(n, 1, "no wait and no second try");
  assert.equal(retryAfterMs(tooMany(new Headers({ "retry-after-ms": "250" }))), 250, "retry-after-ms first");
  assert.equal(retryAfterMs(tooMany()), undefined);
  assert.equal(retryAfterMs({ headers: { "retry-after": "2" } }), 2000, "plain headers too");
  const waited = [];
  await assert.rejects(retrying(async () => { throw tooMany(new Headers({ "retry-after": "600" })); }, { sleep: async (ms) => void waited.push(ms), waits: [1] }));
  assert.deepEqual(waited, [MAX_WAIT_MS]);
});
