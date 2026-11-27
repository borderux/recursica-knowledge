// The usage sampler (usage.mjs), with a stand-in for colima and for Ollama's /api/ps, and samples in
// a temporary folder. Nothing here runs colima or reaches Ollama.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KEEP_DAYS, UsageSampler, addDays, cleanSamples, dayOf, gb, parseVms, readModels, readVms, takeSample, usedFromMeminfo, writeSample } from "./usage.mjs";

const TZ = "America/Los_Angeles";
const folder = () => fs.mkdtempSync(path.join(os.tmpdir(), "usage-"));
const MEMINFO = "MemTotal:       65848320 kB\nMemFree:         1000000 kB\nMemAvailable:   41313280 kB\nBuffers:           10000 kB\n";
const LIST = [
  JSON.stringify({ name: "default", status: "Running", arch: "aarch64", cpus: 8, memory: 68719476736, disk: 107374182400 }),
  JSON.stringify({ name: "spare", status: "Stopped", memory: 8589934592 }),
].join("\n") + "\n";

// A stand-in for sudo and colima: each call is recorded, and the answers come from the table.
function fakeRun(answers = {}) {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push([cmd, ...args].join(" "));
    const i = args.indexOf("colima");
    const verb = args.slice(i + 1).join(" ");
    return verb in answers ? answers[verb] : null;
  };
  return { run, calls };
}

test("GB is 1024³ bytes, one decimal; a day's dates in the time zone", () => {
  assert.equal(gb(68719476736), 64);
  assert.equal(gb(70970000000), 66.1);
  assert.equal(gb(null), null);
  assert.equal(gb("x"), null);
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(dayOf(TZ)(Date.parse("2026-11-23T07:59:00Z")), "2026-11-22");
  assert.equal(dayOf(TZ)(Date.parse("2026-11-23T08:00:00Z")), "2026-11-23");
});

test("colima list --json and /proc/meminfo: the VM's memory and the memory in use", () => {
  assert.deepEqual(parseVms(LIST + "not json\n"), [
    { profile: "default", status: "Running", memory_gb: 64 },
    { profile: "spare", status: "Stopped", memory_gb: 8 },
  ]);
  assert.equal(usedFromMeminfo(MEMINFO), 23.4);
  assert.equal(usedFromMeminfo("MemTotal: 100 kB\n"), null, "no MemAvailable line");
});

test("the VMs: the cluster's own Colima folder only, as the owner, and memory in use for each running VM", async () => {
  const { run, calls } = fakeRun({ "list --json": LIST, "ssh --profile default -- cat /proc/meminfo": MEMINFO });
  const vms = await readVms({ run, owner: "owner", ownerHome: "/Users/owner", envPath: "/usr/bin" });
  assert.deepEqual(vms, [
    { profile: "default", status: "Running", memory_gb: 64, used_gb: 23.4 },
    { profile: "spare", status: "Stopped", memory_gb: 8, used_gb: null },
  ]);
  const owner = "sudo -u owner -H env PATH=/usr/bin COLIMA_HOME=/Users/owner/.colima colima";
  assert.deepEqual(calls, [`${owner} list --json`, `${owner} ssh --profile default -- cat /proc/meminfo`], "no ssh into a stopped VM, and no client stack's folder");
  // a failed ssh gives used_gb null; a failed list gives no VMs at all
  const noSsh = fakeRun({ "list --json": LIST });
  assert.equal((await readVms({ run: noSsh.run, owner: "owner", ownerHome: "/Users/owner" }))[0].used_gb, null);
  assert.equal(await readVms({ run: fakeRun().run, owner: "owner", ownerHome: "/Users/owner" }), null);
});

test("the models Ollama holds loaded, from /api/ps; any failure gives null", async () => {
  const seen = [];
  const fetch = async (url, opts) => {
    seen.push({ url, signal: Boolean(opts?.signal) });
    return { ok: true, json: async () => ({ models: [
      { name: "large-model:1b", model: "large-model:1b", size: 70970000000, expires_at: "2026-11-23T09:00:00.000Z" },
      { name: "small-model:1b", size: 1073741824, expires_at: "never" },
    ] }) };
  };
  assert.deepEqual(await readModels({ port: 11434, fetch }), [
    { name: "large-model:1b", size_gb: 66.1, expires_at: "2026-11-23T09:00:00.000Z" },
    { name: "small-model:1b", size_gb: 1, expires_at: null },
  ]);
  assert.deepEqual(seen, [{ url: "http://127.0.0.1:11434/api/ps", signal: true }], "with a timeout");
  assert.equal(await readModels({ port: 11434, fetch: async () => { throw new Error("refused"); } }), null);
  assert.equal(await readModels({ port: 11434, fetch: async () => ({ ok: false }) }), null);
  assert.equal(await readModels({ port: 11434, fetch: async () => ({ ok: true, json: async () => ({}) }) }), null);
  assert.equal(await readModels({ port: null, fetch }), null, "no Ollama server on the control computer");
});

test("a sample never throws: a reader that fails gives null in its place", async () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  assert.deepEqual(await takeSample({ now, vms: async () => { throw new Error("colima"); }, models: async () => [] }),
    { time: "2026-11-23T12:00:00.000Z", vms: null, models: [] });
});

test("each sample goes to its day's file in the cluster's time zone, one JSON line", () => {
  const dir = path.join(folder(), "usage");
  const late = { time: "2026-11-23T07:55:00.000Z", vms: null, models: null };
  const early = { time: "2026-11-23T08:00:00.000Z", vms: [], models: [] };
  assert.equal(path.basename(writeSample(dir, late, TZ)), "samples-2026-11-22.jsonl", "23:55 in Los Angeles is still the 22nd");
  assert.equal(path.basename(writeSample(dir, early, TZ)), "samples-2026-11-23.jsonl");
  writeSample(dir, { ...early, time: "2026-11-23T08:05:00.000Z" }, TZ);
  const lines = fs.readFileSync(path.join(dir, "samples-2026-11-23.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], early);
  assert.equal(fs.statSync(path.join(dir, "samples-2026-11-22.jsonl")).mode & 0o777, 0o600);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
});

test("sample files more than 15 days old are deleted; other files stay", () => {
  const dir = folder();
  const today = "2026-11-23";
  for (const n of [0, 1, KEEP_DAYS, KEEP_DAYS + 1, 40]) fs.writeFileSync(path.join(dir, `samples-${addDays(today, -n)}.jsonl`), "");
  fs.writeFileSync(path.join(dir, "notes.txt"), "");
  assert.deepEqual(cleanSamples(dir, today).sort(), ["samples-2026-10-14.jsonl", "samples-2026-11-07.jsonl"]);
  assert.deepEqual(fs.readdirSync(dir).sort(), ["notes.txt", "samples-2026-11-08.jsonl", "samples-2026-11-22.jsonl", "samples-2026-11-23.jsonl"]);
  assert.deepEqual(cleanSamples(path.join(dir, "missing"), today), []);
});

test("the sampler: once in each 5-minute slot, and only on the control computer", async () => {
  const dir = path.join(folder(), "usage");
  let t = Date.parse("2026-11-23T12:00:30Z");
  let control = { nodes: [] };
  const samples = [];
  const s = new UsageSampler({ dir, tz: TZ, now: () => t, control: async () => control,
    sample: async (site, at) => { samples.push(at); return { time: new Date(at).toISOString(), vms: null, models: null }; } });
  await s.tick();
  t += 60_000; await s.tick();
  t += 4 * 60_000; await s.tick();
  assert.equal(samples.length, 2, "12:00:30 and 12:05:30; not 12:01:30");
  control = null;
  t += 5 * 60_000; await s.tick();
  assert.equal(samples.length, 2, "a computer that is not the control computer takes no sample");
  assert.equal(fs.readFileSync(path.join(dir, "samples-2026-11-23.jsonl"), "utf8").trim().split("\n").length, 2);
});
