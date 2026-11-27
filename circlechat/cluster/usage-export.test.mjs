// The usage export (usage-export.mjs), from an invented spend log and invented samples, into
// temporary state folders. The account switch is a stand-in that records the account, so nothing
// here changes the test's own user or touches the cluster's real folders.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { exportDays, exportUsage, healthServices, spendByDay, usageLimits } from "./usage-export.mjs";
import { addDays } from "./usage.mjs";

// Berlin is an hour ahead of UTC in November, so 23:00 UTC is the next day there.
const TZ = "Europe/Berlin";
// 11:00 in Berlin on the 23rd: the finished days are the 20th, 21st and 22nd.
const NOW = Date.parse("2026-11-23T10:00:00Z");
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), "usage-export-"));

const line = (time, extra = {}) => JSON.stringify({ time, agent: "svc-reporter", route: "judge", status: 200, gateway_wait_ms: 3, upstream_ms: 900, tries: 1, ...extra });
const SPEND = [
  line("2026-11-21T22:59:59.000Z"),                                      // 23:59:59 on the 21st
  line("2026-11-21T23:00:00.000Z"),                                      // 00:00 on the 22nd
  line("2026-11-22T22:30:00.000Z", { status: 429, reason: "daily_limit" }), // 23:30 on the 22nd
  line("2026-11-22T23:30:00.000Z"),                                      // 00:30 on the 23rd, today
  "not json",
  JSON.stringify({ time: "not a time", agent: "designer" }),
  "",
].join("\n");

function site(state, otherState) {
  return {
    site: { timezone: TZ, gateway_local_port: 4100 },
    nodes: [{ name: "machine-1", control: true, model_memory_gb: 96, servers: [{ id: "ollama", kind: "ollama", port: 11434, parallel: 4, max_loaded_models: 2, keep_alive: "-1",
      models: [{ id: "large", model: "large-model:1b", memory_gb: 40, context_length: 65536 }, { id: "small", model: "small-model:1b", memory_gb: 4, keep_alive: "10m" }] }] },
    { name: "machine-2", address: "machine-2.example.ts.net" }],
    routes: { judge: ["machine-1/ollama/large"], fast: ["machine-1/ollama/small"] },
    agents: { designer: { routes: ["fast"] } },
    recursicachat: { services: [
      { name: "reporter", account: "_example", file: "/opt/reporter/run/key", job: "io.example.reporter", state, health_report: true, gateway: { routes: ["judge"], max_parallel: 2, daily_requests: 500 } },
      { name: "other", agents: ["designer"], account: "_other", file: "/opt/other/run/token", job: "io.example.other", state: otherState },
    ] },
  };
}

function setup() {
  const root = folder();
  const state = path.join(root, "reporter-state"), other = path.join(root, "other-state"), samples = path.join(root, "agent-usage");
  for (const d of [state, other, samples]) fs.mkdirSync(d);
  const spendLog = path.join(root, "spend.jsonl");
  fs.writeFileSync(spendLog, SPEND);
  fs.writeFileSync(path.join(samples, "samples-2026-11-22.jsonl"), '{"time":"2026-11-22T12:00:00.000Z","vms":null,"models":null}\n');
  const accounts = [];
  const run = (account, fn) => { accounts.push(account); return fn(); };
  const logs = [];
  const go = (now = NOW) => exportUsage({ site: site(state, other), tz: TZ, spendLog, samplesDir: samples, now, run, log: (l) => logs.push(l) });
  return { root, state, other, samples, spendLog, accounts, logs, go };
}
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");

test("only a program with health_report true gets an export", () => {
  const s = site("/opt/reporter/state", "/opt/other/state");
  assert.deepEqual(healthServices(s).map((x) => x.name), ["reporter"]);
  assert.deepEqual(healthServices({}), []);
  assert.deepEqual(healthServices({ recursicachat: { services: [{ name: "x", account: "_x", state: "/s", health_report: "yes" }] } }), []);
  assert.deepEqual(exportDays("2026-03-02"), ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

test("the spend log's lines by day in the cluster's time zone; a line without a readable time is left out", async () => {
  const { spendLog } = setup();
  const by = await spendByDay(spendLog, ["2026-11-21", "2026-11-22"], TZ);
  assert.deepEqual(by["2026-11-21"].map((l) => JSON.parse(l).time), ["2026-11-21T22:59:59.000Z"]);
  assert.deepEqual(by["2026-11-22"].map((l) => JSON.parse(l).time), ["2026-11-21T23:00:00.000Z", "2026-11-22T22:30:00.000Z"]);
  assert.deepEqual(await spendByDay(path.join(spendLog, "..", "missing.jsonl"), ["2026-11-22"], TZ), { "2026-11-22": [] }, "no gateway log yet");
});

test("each of the last 3 finished days gets spend.jsonl, samples.jsonl, limits.json and done, as the program's account", async () => {
  const { state, other, accounts, go } = setup();
  const written = await go();
  assert.deepEqual(written, ["2026-11-20", "2026-11-21", "2026-11-22"].map((day) => ({ service: "reporter", day })));
  assert.ok(accounts.length > 0 && accounts.every((a) => a === "_example"), "every file is written as the program's account");
  const day = path.join(state, "usage", "2026-11-22");
  assert.deepEqual(fs.readdirSync(day).sort(), ["done", "limits.json", "samples.jsonl", "spend.jsonl"], "no temporary file is left");
  assert.deepEqual(read(day, "spend.jsonl").trim().split("\n").map((l) => JSON.parse(l)), [JSON.parse(SPEND.split("\n")[1]), JSON.parse(SPEND.split("\n")[2])]);
  assert.equal(read(day, "samples.jsonl"), '{"time":"2026-11-22T12:00:00.000Z","vms":null,"models":null}\n');
  assert.equal(read(day, "done"), "");
  assert.equal(read(state, "usage", "2026-11-20", "samples.jsonl"), "", "a day without samples gets an empty file");
  assert.equal(read(state, "usage", "2026-11-20", "spend.jsonl"), "");
  for (const f of ["spend.jsonl", "samples.jsonl", "limits.json", "done"]) assert.equal(fs.statSync(path.join(day, f)).mode & 0o777, 0o600, f);
  assert.equal(fs.statSync(day).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(state, "usage")).mode & 0o777, 0o700);
  assert.deepEqual(fs.readdirSync(other), [], "a program without health_report gets nothing");
});

test("limits.json: the time zone, the day, each handle's caps, the routes, the models' settings and each node's model memory", async () => {
  const { state, go } = setup();
  await go();
  const limits = JSON.parse(read(state, "usage", "2026-11-22", "limits.json"));
  assert.deepEqual(limits, usageLimits(site(state, "/x"), TZ, "2026-11-22"));
  assert.equal(limits.timezone, TZ);
  assert.equal(limits.day, "2026-11-22");
  assert.deepEqual(limits.keys["svc-reporter"], { routes: ["judge"], max_parallel: 2, daily_requests: 500 });
  assert.deepEqual(limits.keys.designer, { routes: ["fast"], max_parallel: null, daily_requests: null });
  assert.deepEqual(limits.routes, { judge: ["machine-1/ollama/large"], fast: ["machine-1/ollama/small"] });
  assert.deepEqual(limits.models["machine-1/ollama/large"], { model: "large-model:1b", memory_gb: 40, keep_alive: "-1", context_length: 65536, server_parallel: 4, server_max_loaded_models: 2 });
  assert.deepEqual(limits.models["machine-1/ollama/small"], { model: "small-model:1b", memory_gb: 4, keep_alive: "10m", context_length: null, server_parallel: 4, server_max_loaded_models: 2 });
  assert.deepEqual(limits.nodes, { "machine-1": { model_memory_gb: 96 }, "machine-2": { model_memory_gb: null } });
  assert.ok(!/"key"|secret|token/i.test(JSON.stringify(limits)), "no key's name or value");
});

test("done makes the export run once per day; a missed day catches up, for at most 3 days", async () => {
  const { state, go } = setup();
  await go();
  const spend = path.join(state, "usage", "2026-11-22", "spend.jsonl");
  fs.writeFileSync(spend, "kept\n");
  assert.deepEqual(await go(NOW + 3600_000), [], "every day is done");
  assert.equal(read(spend), "kept\n", "a done day is never written again");
  // a day without done, such as one cut off half way, is written again
  fs.rmSync(path.join(state, "usage", "2026-11-21", "done"));
  assert.deepEqual(await go(NOW + 7200_000), [{ service: "reporter", day: "2026-11-21" }]);
  // five days later: only the last 3 finished days, not the two before them
  const later = NOW + 5 * 24 * 3600_000;
  assert.deepEqual((await go(later)).map((w) => w.day), ["2026-11-25", "2026-11-26", "2026-11-27"]);
  assert.ok(!fs.existsSync(path.join(state, "usage", "2026-11-23")));
});

test("day folders more than 15 days old are deleted; other names stay", async () => {
  const { state, go } = setup();
  const usage = path.join(state, "usage");
  for (const n of [15, 16, 30]) fs.mkdirSync(path.join(usage, addDays("2026-11-23", -n)), { recursive: true });
  fs.writeFileSync(path.join(usage, addDays("2026-11-23", -30), "done"), "");
  fs.mkdirSync(path.join(usage, "keep-me"));
  await go();
  assert.deepEqual(fs.readdirSync(usage).sort(), ["2026-11-08", "2026-11-20", "2026-11-21", "2026-11-22", "keep-me"]);
});

test("a program whose export fails is logged and tried again; the others go on", async () => {
  const { root, state, go, logs } = setup();
  fs.rmSync(state, { recursive: true });
  assert.deepEqual(await go(), []);
  assert.match(logs.at(-1), /^usage export for reporter: /);
  // a file where the usage folder should be stops that program's export, and nothing is marked done
  fs.mkdirSync(state);
  fs.writeFileSync(path.join(state, "usage"), "");
  assert.deepEqual(await go(), []);
  assert.ok(fs.existsSync(root));
});
