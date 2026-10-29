// The network check (network.mjs): the router, github.com's addresses and the office address.
// Every address here comes from the ranges set aside for documentation.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NETWORK_EVERY_MS, NetworkWatch, outsideRanges, parseLinuxRoute, parseMacRoute, parseWindowsRoute, readNetwork } from "./network.mjs";

const MAC_ROUTE = "   route to: default\ndestination: default\n       mask: default\n    gateway: 192.0.2.1\n  interface: en0\n      flags: <UP,GATEWAY,DONE,STATIC,PRCLONING,GLOBAL>\n";
const LINUX_ROUTE = "1.1.1.1 via 192.0.2.1 dev eth0 src 192.0.2.20 uid 0 \n    cache \n";
const WEB = ["198.51.100.0/24", "2001:db8:100::/48"];

test("reads the router and the office address on a Mac, on Linux and on the Windows side of WSL", async () => {
  assert.deepEqual(parseMacRoute(MAC_ROUTE), { router: "192.0.2.1", iface: "en0" });
  assert.deepEqual(parseLinuxRoute(LINUX_ROUTE), { router: "192.0.2.1", office: "192.0.2.20" });
  assert.deepEqual(parseWindowsRoute('{"router":"192.0.2.1","office":"192.0.2.30"}'), { router: "192.0.2.1", office: "192.0.2.30" });
  assert.deepEqual(parseWindowsRoute("not json"), { router: null, office: null });
  const calls = [];
  const run = async (cmd, args) => {
    calls.push([cmd, ...args].join(" "));
    return { route: MAC_ROUTE, ipconfig: "192.0.2.25\n", ip: LINUX_ROUTE, "powershell.exe": '{"router":"192.0.2.1","office":"192.0.2.30"}' }[cmd];
  };
  assert.deepEqual(await readNetwork({ run, mac: true }), { router: "192.0.2.1", office: "192.0.2.25" });
  assert.deepEqual(await readNetwork({ run }), { router: "192.0.2.1", office: "192.0.2.20" });
  assert.deepEqual(await readNetwork({ run, wsl: true }), { router: "192.0.2.1", office: "192.0.2.30" });
  assert.deepEqual(calls.slice(0, 3), ["route -n get default", "ipconfig getifaddr en0", "ip -4 route get 1.1.1.1"]);
});

test("finds the addresses outside GitHub's web ranges, IPv4 and IPv6", () => {
  assert.deepEqual(outsideRanges(["198.51.100.7", "2001:db8:100::7"], WEB), []);
  assert.deepEqual(outsideRanges(["198.51.100.7", "203.0.113.9", "2001:db8:200::1"], WEB), ["203.0.113.9", "2001:db8:200::1"]);
});

function watch({ net = { router: "192.0.2.1", office: "192.0.2.20" }, addresses = ["198.51.100.7"], meta = async () => WEB, expectedRouter = "192.0.2.1" } = {}) {
  let t = 1_800_000_000_000;
  const posts = [], state = { net, addresses, meta };
  const stateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "network-")), "network.json");
  const w = new NetworkWatch({ computer: "machine-1", expectedRouter, post: async (text) => posts.push(text), stateFile,
    read: async () => state.net, lookup: async () => state.addresses, meta: (...a) => state.meta(...a), now: () => t });
  return { w, posts, state, stateFile, advance: (ms) => (t += ms) };
}

test("a wrong router posts once, and once again when the expected router is back", async () => {
  const { w, posts, state, advance } = watch();
  await w.tick();
  assert.deepEqual(posts, [":office: machine-1's office address is now 192.0.2.20. On a Mac, unlock FileVault over SSH at this address after a restart."]);
  posts.length = 0;
  state.net = { router: "192.0.2.99", office: "192.0.2.20" };
  advance(60_000); await w.tick();
  assert.deepEqual(posts, [], "the check runs every 5 minutes");
  advance(NETWORK_EVERY_MS); await w.tick();
  assert.equal(posts.length, 1);
  assert.match(posts[0], /^:rotating_light: machine-1's router is 192\.0\.2\.99, and site\.json expects 192\.0\.2\.1\./);
  advance(NETWORK_EVERY_MS); await w.tick();
  assert.equal(posts.length, 1, "once while the problem lasts");
  state.net = { router: "192.0.2.1", office: "192.0.2.20" };
  advance(NETWORK_EVERY_MS); await w.tick();
  assert.deepEqual(posts.slice(1), [":white_check_mark: machine-1's router is 192.0.2.1 again."]);
});

test("with no router in site.json, the router is not checked", async () => {
  const { w, posts } = watch({ expectedRouter: "", net: { router: "192.0.2.99", office: null } });
  await w.tick();
  assert.deepEqual(posts, []);
});

test("github.com outside GitHub's web ranges posts once, and a cached list still checks when the fetch fails", async () => {
  const { w, posts, state, advance } = watch({ net: { router: "192.0.2.1", office: null } });
  await w.tick();
  assert.deepEqual(posts, []);
  // A changed name lookup that also breaks the fetch of api.github.com/meta.
  state.addresses = ["198.51.100.7", "203.0.113.9"];
  state.meta = async () => { throw new Error("certificate error"); };
  advance(25 * 3600_000); await w.tick();
  assert.equal(posts.length, 1);
  assert.match(posts[0], /^:rotating_light: On machine-1, github\.com resolves to 203\.0\.113\.9, outside the web addresses that api\.github\.com\/meta lists\./);
  state.addresses = ["198.51.100.7"];
  advance(NETWORK_EVERY_MS); await w.tick();
  assert.match(posts[1], /github\.com resolves inside GitHub's web addresses again/);
});

test("with no list of GitHub's ranges yet, github.com is not judged", async () => {
  const { w, posts } = watch({ net: { router: "192.0.2.1", office: null }, addresses: ["203.0.113.9"], meta: async () => { throw new Error("offline"); } });
  await w.tick();
  assert.deepEqual(posts, []);
});

test("each new office address posts, and the state survives a restart of the agent", async () => {
  const { w, posts, state, stateFile, advance } = watch();
  await w.tick();
  state.net = { router: "192.0.2.1", office: "192.0.2.21" };
  advance(NETWORK_EVERY_MS); await w.tick();
  assert.equal(posts.length, 2);
  assert.match(posts[1], /machine-1's office address is now 192\.0\.2\.21\./);
  const again = new NetworkWatch({ computer: "machine-1", expectedRouter: "192.0.2.1", post: async (text) => posts.push(text), stateFile,
    read: async () => state.net, lookup: async () => ["198.51.100.7"], meta: async () => WEB, now: () => Date.now() + 365 * 24 * 3600_000 });
  await again.tick();
  assert.equal(posts.length, 2, "the same address after a restart posts nothing");
});
