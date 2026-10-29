import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeAgent, readCanary } from "./agent.mjs";

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
