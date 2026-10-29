import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Guard } from "./guard.mjs";

function setup(conns = []) {
  let t = 1_800_000_000_000;
  const log = [], notes = [];
  const platform = {
    connections: async () => conns, listening: async () => [22, 8080],
    seal: async (on) => log.push(["seal", on]),
    snapshot: async (dir) => { fs.writeFileSync(path.join(dir, "connections.txt"), "tcp ..."); log.push(["snapshot"]); },
    lookup: async (ip) => ({ ip, owner: "Example Net", country: "US" }),
    captureStart: async (ip, file) => { fs.writeFileSync(file, "pcap"); log.push(["capture", ip]); },
    captureStop: async () => log.push(["capture-stop"]),
    block: async (ip) => log.push(["block", ip]), unblock: async (ip) => log.push(["unblock", ip]),
    lockdownFirewall: async (on) => log.push(["firewall", on]),
    encryptAndUpload: async () => true,
  };
  const g = new Guard({ platform, computer: "machine-1", stateDir: fs.mkdtempSync(path.join(os.tmpdir(), "guard-")),
    notify: async (kind, text, ref) => notes.push({ kind, text, ref }), now: () => t });
  return { g, log, notes, advance: (ms) => (t += ms) };
}
const intruder = [{ remote: "192.168.1.77", remotePort: 50000, localPort: 22, process: "sshd" }];

test("seals first, records, alerts with buttons, then cuts off after 10 minutes", async () => {
  const { g, log, notes, advance } = setup(intruder);
  const s = await g.tick();
  assert.equal(s.status, "watching");
  assert.deepEqual(log[0], ["seal", true]);
  assert.ok(log.some((l) => l[0] === "capture" && l[1] === "192.168.1.77"));
  assert.equal(notes[0].kind, "lockdown");
  assert.match(notes[0].text, /Example Net, US/);
  advance(9 * 60_000); assert.equal((await g.tick()).status, "watching");
  advance(2 * 60_000); const c = await g.tick();
  assert.equal(c.status, "cut-off");
  assert.ok(log.some((l) => l[0] === "block" && l[1] === "192.168.1.77"));
  assert.ok(log.some((l) => l[0] === "firewall" && l[1] === true));
  const manifest = JSON.parse(fs.readFileSync(path.join(c.dir, "manifest.json"), "utf8"));
  assert.ok(manifest.entries.every((e) => /^[0-9a-f]{64}$/.test(e.sha256)));
});

test("keep watching adds 30 minutes", async () => {
  const { g, advance } = setup(intruder);
  await g.tick();
  assert.equal((await g.keepWatching()).ok, true);
  advance(15 * 60_000); assert.equal((await g.tick()).status, "watching");
  advance(30 * 60_000); assert.equal((await g.tick()).status, "cut-off");
});

test("a touch on a decoy starts a lockdown", async () => {
  const { g } = setup([]);
  const s = await g.tick([{ src_host: "10.0.0.9", src_port: 4444, dst_port: 2222, logtype: "ssh login attempt" }]);
  assert.equal(s.status, "watching");
});

test("release opens the firewall and unseals; allow-source also remembers the address", async () => {
  const { g, log } = setup(intruder);
  await g.tick();
  const r = await g.release(true);
  assert.equal(r.ok, true);
  assert.equal(g.state.status, "normal");
  assert.ok(log.some((l) => l[0] === "unblock"));
  assert.deepEqual(g.allowed, ["192.168.1.77"]);
  assert.deepEqual((await g.tick()), { status: "normal", last: g.state.last });
});

test("no lockdown without a connection no rule allows", async () => {
  const { g, notes } = setup([{ remote: "100.90.1.1", remotePort: 1, localPort: 22, process: "sshd" }]);
  assert.equal((await g.tick()).status, "normal");
  assert.equal(notes.length, 0);
});
