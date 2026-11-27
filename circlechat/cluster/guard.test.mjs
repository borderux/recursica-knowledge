import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Guard } from "./guard.mjs";
import { pfLockdownLoaded, listedAddresses, pfAnchorUsed } from "./platform.mjs";

// The firewall as the kernel holds it: the fake's lockdownFirewall and block change it, as the real
// commands do, unless a test breaks them. firewallState reads it back.
function setup(conns = []) {
  let t = 1_800_000_000_000;
  const log = [], notes = [];
  const fw = { enforced: true, lockdown: false, blocked: [] };
  const breaks = { load: null, loadSilently: false, block: false };
  const platform = {
    connections: async () => conns, listening: async () => [{ host: "*", port: 22 }, { host: "*", port: 8080 }],
    seal: async (on) => log.push(["seal", on]),
    snapshot: async (dir) => { fs.writeFileSync(path.join(dir, "connections.txt"), "tcp ..."); log.push(["snapshot"]); },
    lookup: async (ip) => ({ ip, owner: "Example Net", country: "US" }),
    captureStart: async (ip, file) => { fs.writeFileSync(file, "pcap"); log.push(["capture", ip]); },
    captureStop: async () => log.push(["capture-stop"]),
    block: async (ip) => {
      log.push(["block", ip]);
      if (breaks.block) return { ok: false, error: "pfctl: Table does not exist." };
      if (!fw.blocked.includes(ip)) fw.blocked.push(ip);
      return { ok: true };
    },
    unblock: async (ip) => log.push(["unblock", ip]),
    lockdownFirewall: async (on) => {
      log.push(["firewall", on]);
      if (breaks.load) return { ok: false, error: breaks.load };
      if (!breaks.loadSilently) fw.lockdown = on;
      return { ok: true };
    },
    firewallState: async () => ({ enforced: fw.enforced, lockdown: fw.lockdown, blocked: [...fw.blocked] }),
    encryptAndUpload: async () => true,
  };
  const g = new Guard({ platform, computer: "machine-1", stateDir: fs.mkdtempSync(path.join(os.tmpdir(), "guard-")),
    notify: async (kind, text, ref) => notes.push({ kind, text, ref }), now: () => t });
  return { g, log, notes, fw, breaks, advance: (ms) => (t += ms) };
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
  const at = (k) => log.findIndex((l) => l[0] === k);
  assert.ok(at("firewall") < at("block"), "the lockdown rules load first, then each source is blocked");
  assert.match(notes.at(-1).text, /^:lock: machine-1 is cut off \(the watch window ended\)\. The firewall holds the lockdown rules and blocks 192\.168\.1\.77\./);
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

// The firewall's lists empty at each restart, so the guard keeps both on disk, root-only, and the
// start-up job loads them again (lists.mjs).
test("the cut-off writes each blocked source to blocked-sources.json; allow-source moves the source to allowed-sources.json", async () => {
  const file = (g, name) => path.join(g.stateDir, name);
  const read = (g, name) => JSON.parse(fs.readFileSync(file(g, name), "utf8"));
  const kept = setup(intruder);
  await kept.g.tick(); kept.advance(11 * 60_000); await kept.g.tick();
  assert.deepEqual(read(kept.g, "blocked-sources.json"), ["192.168.1.77"]);
  assert.equal(fs.statSync(file(kept.g, "blocked-sources.json")).mode & 0o777, 0o600);
  await kept.g.release(false);
  assert.deepEqual(read(kept.g, "blocked-sources.json"), ["192.168.1.77"], "a plain release keeps the source blocked");

  const moved = setup(intruder);
  fs.writeFileSync(file(moved.g, "blocked-sources.json"), JSON.stringify(["203.0.113.10"]));
  await moved.g.tick(); moved.advance(11 * 60_000); await moved.g.tick();
  assert.deepEqual(read(moved.g, "blocked-sources.json"), ["203.0.113.10", "192.168.1.77"], "added to the earlier list");
  await moved.g.release(true);
  assert.deepEqual(read(moved.g, "blocked-sources.json"), ["203.0.113.10"]);
  assert.deepEqual(read(moved.g, "allowed-sources.json"), ["192.168.1.77"]);
  for (const name of ["blocked-sources.json", "allowed-sources.json"]) assert.equal(fs.statSync(file(moved.g, name)).mode & 0o777, 0o600, name);
  assert.ok(!fs.readdirSync(moved.g.stateDir).some((f) => f.endsWith(".tmp")), "no temporary file left");
});

test("no lockdown without a connection no rule allows", async () => {
  const { g, notes } = setup([{ remote: "100.90.1.1", remotePort: 1, localPort: 22, process: "sshd" }]);
  assert.equal((await g.tick()).status, "normal");
  assert.equal(notes.length, 0);
});

// From a real lockdown: the cut-off reported success, but the anchor still held the base rules.
// pfctl's error went nowhere, the blocked table held the source, and the state said "cut-off".
test("a cut-off whose lockdown rules didn't load is recorded as failed, with one loud alert, never as cut off", async () => {
  const { g, notes, fw, breaks, advance } = setup(intruder);
  breaks.loadSilently = true;
  await g.tick();
  advance(11 * 60_000);
  const c = await g.tick();
  assert.equal(c.status, "cut-off-failed");
  assert.deepEqual(c.problems, ["the lockdown rules aren't loaded"]);
  assert.deepEqual(fw.blocked, ["192.168.1.77"], "the source is blocked, as in the real case");
  const alert = notes.at(-1);
  assert.equal(alert.kind, "cut-off-failed", "with buttons to try again, shut down or release");
  assert.match(alert.text, /^:rotating_light: <!channel> \*machine-1 is NOT cut off\.\* The cut-off \(the watch window ended\) failed: the lockdown rules aren't loaded\. The computer stays sealed/);
  assert.ok(!notes.some((n) => /is cut off/.test(n.text)), "no message says the computer is cut off");
  assert.ok(fs.existsSync(path.join(c.dir, "manifest.json")), "the evidence is kept anyway");

  // each minute's try after it is quiet, until one works
  advance(60_000);
  assert.equal((await g.tick()).status, "cut-off-failed");
  assert.equal(notes.filter((n) => n.kind === "cut-off-failed").length, 1, "one alert");
  breaks.loadSilently = false;
  advance(60_000);
  const ok = await g.tick();
  assert.equal(ok.status, "cut-off");
  assert.equal(ok.problems, undefined);
  assert.match(notes.at(-1).text, /^:lock: machine-1 is cut off \(the watch window ended\) after 3 tries, the first failed at \d\d:\d\d UTC\./);
});

test("a cut-off names the load's error and each source left unblocked; release works from a failed cut-off", async () => {
  const { g, notes, breaks, log } = setup(intruder);
  breaks.load = "pfctl: /var/lib/agent-cluster/pf-lockdown.conf: No such file or directory";
  breaks.block = true;
  await g.tick();
  const c = await g.cutOff("cut off from Slack");
  assert.equal(c.status, "cut-off-failed");
  assert.deepEqual(c.problems, [
    "the lockdown rules aren't loaded (pfctl: /var/lib/agent-cluster/pf-lockdown.conf: No such file or directory)",
    "192.168.1.77 isn't blocked (pfctl: Table does not exist.)",
  ]);
  assert.match(notes.at(-1).text, /failed: the lockdown rules aren't loaded \(pfctl: .*No such file or directory\); 192\.168\.1\.77 isn't blocked/);
  // "Cut off now" tries again at once
  const again = await g.cutOff("cut off from Slack");
  assert.equal(again.status, "cut-off-failed");
  assert.equal(again.tries, 2);
  const r = await g.release(false);
  assert.equal(r.ok, true);
  assert.equal(g.state.status, "normal");
  assert.ok(log.some((l) => l[0] === "seal" && l[1] === false), "unsealed");
});

test("a firewall that can't be read counts as a failed cut-off", async () => {
  const { g } = setup(intruder);
  g.platform.firewallState = async () => {
    throw new Error("pfctl: Permission denied");
  };
  await g.tick();
  const c = await g.cutOff("cut off from Slack");
  assert.equal(c.status, "cut-off-failed");
  assert.ok(c.problems.includes("the firewall couldn't be read (pfctl: Permission denied)"));
});

// pfctl -a agentguard -sr, as pfctl prints the base rules and the lockdown rules (tailscale_if expanded
// and cut to one interface here); pfctl -T show and nft list set, as they print addresses.
test("the firewall read back: the lockdown rules by their outgoing block, and the blocked addresses", () => {
  const base = ["block drop in log quick from <blocked> to any", "pass in quick on utun4 inet from 100.64.0.0/10 to any flags S/SA keep state", "block drop in log all", "pass out all flags S/SA keep state"].join("\n");
  const lockdown = ["block drop in log quick from <blocked> to any", "block drop in log all", "pass out quick proto tcp from any to any port = 443 flags S/SA keep state", "pass out quick proto udp from any to any port = 53 keep state", "block drop out log all"].join("\n");
  assert.equal(pfLockdownLoaded(base), false, "the base rules, as in the real case");
  assert.equal(pfLockdownLoaded(lockdown), true);
  assert.equal(pfLockdownLoaded(""), false);
  assert.deepEqual(listedAddresses("   203.0.113.10\n   2001:db8::7\n"), ["203.0.113.10", "2001:db8::7"]);
  assert.deepEqual(listedAddresses("table inet agentguard {\n\tset blocked4 {\n\t\ttype ipv4_addr\n\t\telements = { 203.0.113.10, 198.51.100.7 }\n\t}\n}\n"), ["203.0.113.10", "198.51.100.7"]);
  assert.deepEqual(listedAddresses("No ALTQ support in kernel\n"), []);
});

// From the same lockdown: a macOS update had replaced /etc/pf.conf with Apple's own, so the main rules
// no longer used the agentguard anchor. pfctl -a agentguard -sr listed the anchor's rules, and pf
// applied none of them: incoming connections weren't refused, and the cut-off blocked nothing.
const APPLE_MAIN = ['scrub-anchor "com.apple/*" all fragment reassemble', 'anchor "com.apple/*" all'].join("\n");
test("the main rules use the agentguard anchor, or none of its rules apply", () => {
  assert.equal(pfAnchorUsed(APPLE_MAIN), false, "Apple's own main rules, as after the update");
  assert.equal(pfAnchorUsed(`${APPLE_MAIN}\nanchor "agentguard" all`), true);
  assert.equal(pfAnchorUsed(`${APPLE_MAIN}\nanchor "agentguard-ci" all`), false, "another anchor");
});

test("a firewall that doesn't apply the guard's rules: one loud alert, one line when it does again", async () => {
  const { g, notes, fw } = setup([]);
  fw.enforced = false;
  await g.tick();
  await g.tick();
  const off = notes.filter((n) => /doesn't apply the guard's rules/.test(n.text));
  assert.equal(off.length, 1, "once, not each minute");
  assert.match(off[0].text, /^:rotating_light: <!channel> \*The firewall on machine-1 doesn't apply the guard's rules\.\* The main pf rules don't use the agentguard anchor/);
  fw.enforced = true;
  await g.tick();
  assert.match(notes.at(-1).text, /^:white_check_mark: The firewall on machine-1 applies the guard's rules again\.$/);
  await g.tick();
  assert.equal(notes.length, 2);
});

test("a cut-off on a firewall that doesn't apply the guard's rules is a failed cut-off", async () => {
  const { g, fw, advance } = setup(intruder);
  await g.tick();
  fw.enforced = false;
  advance(11 * 60_000);
  const c = await g.tick();
  assert.equal(c.status, "cut-off-failed");
  assert.equal(c.problems[0], "the main firewall rules don't use the agentguard anchor, so none of its rules apply");
});
