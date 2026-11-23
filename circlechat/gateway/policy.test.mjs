import assert from "node:assert/strict";
import test from "node:test";
import { cloudFrom, decide, settingFromRow } from "./policy.mjs";

const MIN = 60_000;
const agent = { cloud: true, key: "default", local: true };
const wait = { mode: "cloud_after_wait", maxStartWaitMinutes: 10 };

test("a stored row becomes a setting, and a broken row means cluster only", () => {
  assert.deepEqual(settingFromRow(null), { mode: "cluster_only" });
  assert.deepEqual(settingFromRow({ mode: "cloud_now" }), { mode: "cloud_now" });
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: 5 }), { mode: "cloud_after_wait", maxStartWaitMinutes: 5 }, "the stall alone: no time to finish");
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: 5, max_finish_minutes: 30 }), { mode: "cloud_after_wait", maxStartWaitMinutes: 5 }, "a time to finish is not read");
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: null, max_finish_minutes: 30 }), { mode: "cluster_only" });
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait" }), { mode: "cluster_only" }, "a half-filled row means cluster only");
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: 0 }), { mode: "cluster_only" });
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: "soon" }), { mode: "cluster_only" });
  assert.deepEqual(settingFromRow({ mode: "anything" }), { mode: "cluster_only" });
});

test("cluster only, and a request outside a task, never use a cloud model", () => {
  assert.equal(decide({ task: "t1", setting: { mode: "cluster_only" }, agent, clock: { firstRequestAt: 0 }, now: 1e12 }).target, "cluster");
  assert.equal(decide({ task: null, setting: { mode: "cloud_now" }, agent, clock: null, now: 0 }).target, "cluster");
});

test("cloud now uses the agent's key from the first request, unless the agent's switch is off or the agent has no key", () => {
  assert.equal(decide({ task: "t1", setting: { mode: "cloud_now" }, agent, clock: { firstRequestAt: 0 }, now: 0 }).target, "cloud");
  assert.equal(decide({ task: "t1", setting: { mode: "cloud_now" }, agent: { ...agent, cloud: false }, clock: {}, now: 0 }).target, "cluster");
  assert.equal(decide({ task: "t1", setting: { mode: "cloud_now" }, agent: { ...agent, key: null }, clock: {}, now: 0 }).target, "cluster");
});

test("cloud after a wait: the cluster first, then the cloud once the wait to start passes with no cluster answer", () => {
  const clock = { firstRequestAt: 0 };
  const early = decide({ task: "t1", setting: wait, agent, clock, now: 5 * MIN });
  assert.equal(early.target, "cluster");
  assert.equal(early.until, 10 * MIN, "the request moves to the cloud at the wait to start");
  assert.equal(decide({ task: "t1", setting: wait, agent, clock, now: 10 * MIN }).target, "cloud");
});

test("cloud after a wait has no time to finish: a long task the cluster answers never moves to the cloud", () => {
  const started = { firstRequestAt: 0, startedAt: 2 * MIN };
  assert.equal(cloudFrom(wait, started), Infinity);
  for (const now of [30 * MIN, 60 * MIN, 24 * 60 * MIN, 30 * 24 * 60 * MIN]) {
    const d = decide({ task: "t1", setting: wait, agent, clock: started, now });
    assert.equal(d.target, "cluster", `${now / MIN} minutes in`);
    assert.equal(d.until, Infinity, "the request never moves to the cloud");
  }
});

test("a stack with no permission for cloud models keeps every mode on the cluster", () => {
  const off = { ...agent, stack: false };
  for (const setting of [{ mode: "cluster_only" }, wait, { mode: "cloud_now" }]) {
    for (const now of [0, 10 * MIN, 1e12]) {
      const d = decide({ task: "t1", setting, agent: off, clock: { firstRequestAt: 0 }, now });
      assert.equal(d.target, "cluster", `${setting.mode} at ${now}`);
      assert.equal(d.until, undefined, `${setting.mode}: no move to the cloud later`);
    }
  }
  assert.match(decide({ task: "t1", setting: { mode: "cloud_now" }, agent: off, clock: {}, now: 0 }).reason, /stack has no permission for cloud models/);
});

test("with no cluster model, cluster only fails, and cloud after a wait waits out the wait first", () => {
  const none = { ...agent, local: false };
  const f = decide({ task: "t1", setting: { mode: "cluster_only" }, agent: none, clock: {}, now: 0 });
  assert.equal(f.target, "fail");
  assert.match(f.reason, /no cluster model, and the task is cluster only/);
  const w = decide({ task: "t1", setting: wait, agent: none, clock: { firstRequestAt: 0 }, now: MIN });
  assert.deepEqual([w.target, w.until], ["cluster", 10 * MIN]);
  assert.equal(decide({ task: "t1", setting: { mode: "cloud_now" }, agent: { ...none, cloud: false }, clock: {}, now: 0 }).target, "fail");
});
