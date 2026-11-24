import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { filterStacks, makeAgent, readCanary } from "./agent.mjs";

function setup(t0 = Date.UTC(2026, 9, 20, 15, 0)) {
  let t = t0;
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const calls = [];
  const guard = { state: { status: "normal" }, tick: async () => calls.push("tick"), cutOff: async () => ({ status: "cut-off" }),
    keepWatching: async () => ({ ok: true, message: "more" }), release: async (allow) => ({ ok: true, message: allow ? "allowed" : "released" }) };
  const platform = { reboot: async () => calls.push("reboot"), shutDown: async () => calls.push("shutdown") };
  const agent = makeAgent({ env: { COMPUTER: "machine-1", KIT: "/nonexistent", CLUSTER_TZ: "America/Chicago" }, platform, guard, post: async () => {}, now: () => t, stateDir });
  return { agent, calls, stateDir, advance: (ms) => (t += ms) };
}

test("4 a.m. schedules the next 4 a.m. in the cluster's time zone", async () => {
  const { agent, stateDir } = setup();
  const r = await agent.act({ action: "reboot-4am", ref: "u1" });
  assert.equal(r.ok, true);
  const at = JSON.parse(fs.readFileSync(path.join(stateDir, "reboot.json"), "utf8")).at;
  assert.equal(new Date(at).toISOString(), "2026-10-21T09:00:00.000Z");
});

test("a due reboot runs once, and skip cancels a scheduled one", async () => {
  const { agent, calls, advance } = setup();
  await agent.act({ action: "reboot-at", ref: "u1", extra: { at: Date.UTC(2026, 9, 20, 16, 0) } });
  await agent.minute(); assert.equal(calls.includes("reboot"), false);
  advance(61 * 60_000); await agent.minute(); await agent.minute();
  assert.equal(calls.filter((c) => c === "reboot").length, 1);
  await agent.act({ action: "reboot-tonight", ref: "u2" });
  await agent.act({ action: "reboot-skip", ref: "u2" });
  advance(24 * 3600_000); await agent.minute();
  assert.equal(calls.filter((c) => c === "reboot").length, 1);
});

test("lockdown buttons reach the guard", async () => {
  const { agent } = setup();
  assert.equal((await agent.act({ action: "release-lockdown" })).message, "released");
  assert.equal((await agent.act({ action: "allow-source" })).message, "allowed");
  assert.equal((await agent.act({ action: "nope" })).ok, false);
});

test("reads only new decoy touches, and skips the decoys' own start-up lines", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canary-"));
  const log = path.join(dir, "opencanary.log"), pos = path.join(dir, "pos");
  fs.writeFileSync(log, JSON.stringify({ logtype: 1001, src_host: "" }) + "\n" + JSON.stringify({ logtype: 4002, src_host: "10.0.0.9", dst_port: 2222 }) + "\n");
  assert.equal(readCanary(log, pos).length, 1);
  assert.equal(readCanary(log, pos).length, 0);
  fs.appendFileSync(log, JSON.stringify({ logtype: 2000, src_host: "10.0.0.10", dst_port: 2121 }) + "\n");
  assert.equal(readCanary(log, pos)[0].src_host, "10.0.0.10");
});

test("each minute runs the network check, and a failed check stops nothing else", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  let ticks = 0;
  const guard = { state: { status: "normal" }, tick: async () => {} };
  const network = { tick: async () => { ticks++; throw new Error("no route"); } };
  const agent = makeAgent({ env: { COMPUTER: "machine-1", KIT: "/nonexistent" }, platform: {}, guard, post: async () => {}, stateDir, network });
  await agent.minute();
  await agent.minute();
  assert.equal(ticks, 2);
});

test("Install for a kit release records the approval on the computer", async () => {
  const { agent, stateDir } = setup();
  const r = await agent.act({ action: "release-install", ref: "@recursica/knowledge@0.13.0", extra: { by: "person_a" } });
  assert.equal(r.ok, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(stateDir, "release-approvals.json"), "utf8"))["@recursica/knowledge@0.13.0"].by, "person_a");
  assert.match(fs.readFileSync(path.join(stateDir, "release-approvals.log"), "utf8"), /"by":"person_a".*"computer":"machine-1"/);
  assert.equal((await agent.act({ action: "release-install", ref: "../etc/passwd" })).ok, false);
});

test("the buttons of CircleChat 1.x are unknown actions", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const agent = makeAgent({ env: { COMPUTER: "machine-1" }, platform: {}, guard: { state: {} }, post: async () => {}, stateDir });
  for (const action of ["cloud-approve", "cloud-deny", "agents-stop", "agents-resume", "egress-allow-once", "egress-deny"]) {
    assert.deepEqual(await agent.act({ action, ref: "acme|x" }), { ok: false, message: `unknown action ${action}` });
  }
});

test("Skip this version writes to the stack's folder, the old one until a person moves it", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-home-"));
  fs.mkdirSync(path.join(home, "circlechat/kit-out"), { recursive: true });
  const agent = makeAgent({ env: { COMPUTER: "machine-1", OWNER_HOME: home }, platform: {}, guard: { state: {} }, post: async () => {}, stateDir, now: () => 5 });
  await agent.act({ action: "upgrade-skip", ref: "@recursica/knowledge@1.0.0" });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, "circlechat/kit-out/upgrade-state.json"), "utf8")).skipped, { "@recursica/knowledge@1.0.0": 5 });
  fs.mkdirSync(path.join(home, "recursica-stack/kit-out"), { recursive: true });
  await agent.act({ action: "upgrade-skip", ref: "@recursica/knowledge@1.1.0" });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, "recursica-stack/kit-out/upgrade-state.json"), "utf8")).skipped, { "@recursica/knowledge@1.1.0": 5 });
});

test("/status lists each kit service's name and state, and nothing else", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const services = async () => [{ name: "kev-engine", state: "up", key: "sk-secret", log: "loaded model", port: 8009 }, { name: "jobd", state: "down" }];
  const agent = makeAgent({ env: { COMPUTER: "machine-2", CLUSTER_TOKEN: "t0ken" }, platform: {}, guard: { state: { status: "ok" } }, post: async () => {}, stateDir, services });
  const srv = agent.server().listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  try {
    const url = `http://127.0.0.1:${srv.address().port}/status`;
    assert.equal((await fetch(url)).status, 401, "no token, no status");
    const body = await (await fetch(url, { headers: { authorization: "Bearer t0ken" } })).text();
    assert.deepEqual(JSON.parse(body).services, [{ name: "kev-engine", state: "up" }, { name: "jobd", state: "down" }]);
    assert.doesNotMatch(body, /sk-secret|loaded model|8009/);
  } finally { srv.close(); }
});

test("/status names Barb's state on the control computer only, and an error reads as unknown", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const status = async (barb) => {
    const agent = makeAgent({ env: { COMPUTER: "machine-1", CLUSTER_TOKEN: "t0ken" }, platform: {}, guard: { state: { status: "ok" } }, post: async () => {}, stateDir, ...(barb ? { barb } : {}) });
    const srv = agent.server().listen(0, "127.0.0.1");
    await new Promise((r) => srv.once("listening", r));
    try { return await (await fetch(`http://127.0.0.1:${srv.address().port}/status`, { headers: { authorization: "Bearer t0ken" } })).json(); } finally { srv.close(); }
  };
  assert.equal((await status(async () => "idle")).barb, "idle");
  assert.equal((await status(async () => "busy: 1 agent message(s) queued or in a turn")).barb, "busy: 1 agent message(s) queued or in a turn");
  assert.equal((await status(async () => { throw new Error("no database"); })).barb, "unknown");
  assert.ok(!("barb" in (await status())), "a computer that isn't the control computer reports no state");
});

test("each minute runs the restart check, and a failed check stops nothing else", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const ran = [];
  const guard = { state: {}, tick: async () => ran.push("guard") };
  const restarts = { tick: async () => { ran.push("restarts"); throw new Error("systemctl missing"); } };
  const network = { tick: async () => ran.push("network") };
  const agent = makeAgent({ env: { COMPUTER: "machine-1", KIT: "/nonexistent" }, platform: {}, guard, post: async () => {}, stateDir, network, restarts });
  await agent.minute();
  assert.deepEqual(ran, ["guard", "network", "restarts"]);
});

test("on a helper with no stack folder and no filter log, the egress step has nothing to read and no error", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "helper-"));
  fs.mkdirSync(path.join(home, "circlechat"));
  fs.writeFileSync(path.join(home, "circlechat/site.json"), "{}");
  assert.deepEqual(filterStacks({ home, clusterChannel: "C", clusterName: "border" }), []);
  fs.mkdirSync(path.join(home, ".recursica-jobs-egress/logs"), { recursive: true });
  fs.writeFileSync(path.join(home, ".recursica-jobs-egress/logs/access.log"), "");
  assert.deepEqual(filterStacks({ home, clusterChannel: "C", clusterName: "border" }).map((s) => [s.name, s.channel]), [["border-jobs", "C"]]);
});
