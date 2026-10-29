import assert from "node:assert/strict";
import test from "node:test";
import { cloudFrom, decide, settingFromRow } from "./policy.mjs";

const MIN = 60_000;
const agent = { cloud: true, key: "default", local: true };
const wait = { mode: "cloud_after_wait", maxStartWaitMinutes: 10, maxFinishMinutes: 60 };

test("a stored row becomes a setting, and a broken row means cluster only", () => {
  assert.deepEqual(settingFromRow(null), { mode: "cluster_only" });
  assert.deepEqual(settingFromRow({ mode: "cloud_now" }), { mode: "cloud_now" });
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: 5, max_finish_minutes: 30 }), { mode: "cloud_after_wait", maxStartWaitMinutes: 5, maxFinishMinutes: 30 });
  assert.deepEqual(settingFromRow({ mode: "cloud_after_wait", max_start_wait_minutes: null, max_finish_minutes: 30 }), { mode: "cluster_only" });
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

test("cloud after a wait: the cluster first, then the cloud once the wait to start or the time to finish passes", () => {
  const clock = { firstRequestAt: 0 };
  const early = decide({ task: "t1", setting: wait, agent, clock, now: 5 * MIN });
  assert.equal(early.target, "cluster");
  assert.equal(early.until, 10 * MIN, "the request moves to the cloud at the wait to start");
  assert.equal(decide({ task: "t1", setting: wait, agent, clock, now: 10 * MIN }).target, "cloud");
  // Once a cluster model has answered, only the time to finish counts.
  const started = { firstRequestAt: 0, startedAt: 2 * MIN };
  assert.equal(cloudFrom(wait, started), 60 * MIN);
  assert.equal(decide({ task: "t1", setting: wait, agent, clock: started, now: 30 * MIN }).target, "cluster");
  assert.equal(decide({ task: "t1", setting: wait, agent, clock: started, now: 60 * MIN }).target, "cloud");
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
