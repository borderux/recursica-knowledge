// The kit services each cluster agent reports in /status, and the restart check (services.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { RestartWatch, answers, cleanServices, restartCounts, serviceChecks, serviceStates } from "./services.mjs";

// A cluster like the one the kit runs: a Mac control computer, and a Linux helper with RustDesk and
// a trial Ollama server.
const site = () => ({
  routes: { judge: ["studio/ollama/large"] },
  nodes: [
    { name: "studio", os: "macos", control: true, address: "host.docker.internal", tailnet_address: "100.64.0.1", kev: { port: 8009 }, jobs: { port: 7400 },
      servers: [{ id: "ollama", kind: "ollama", port: 11434, models: [{ id: "large", model: "x", memory_gb: 80 }] }], services: [{ name: "kev-engine", command: "kev", dir: "/k" }] },
    { name: "pc", os: "linux", address: "100.64.0.2", kev: { port: 8009 }, jobs: { port: 7400 }, rustdesk: { image: "i", console_host: "pc.example.ts.net" },
      servers: [{ id: "ollama", kind: "ollama", port: 11434, listen: "127.0.0.1", models: [{ id: "judge-small", model: "y", memory_gb: 5 }] }],
      services: [{ name: "kev-engine", command: "kev", dir: "/k" }] },
  ],
});

test("a helper watches kev-engine, jobd and the RustDesk containers, and a trial Ollama only once a route names the server's model", () => {
  const s = site();
  let checks = serviceChecks(s, "pc");
  assert.deepEqual(checks.map((c) => c.name), ["kev-engine", "jobd", "rustdesk-hbbs", "rustdesk-hbbr"]);
  assert.deepEqual(checks.find((c) => c.name === "kev-engine"), { name: "kev-engine", ports: [8009], hosts: ["127.0.0.1", "100.64.0.2"], unit: "kev-engine" });
  assert.deepEqual(checks.find((c) => c.name === "rustdesk-hbbs"), { name: "rustdesk-hbbs", ports: [21116], hosts: ["127.0.0.1"], container: "rustdesk-hbbs" });
  s.routes.judge.unshift("pc/ollama/judge-small");
  checks = serviceChecks(s, "pc");
  assert.deepEqual(checks.find((c) => c.name === "ollama"), { name: "ollama", ports: [11434], hosts: ["127.0.0.1"], unit: "recursica-ollama" });
  assert.deepEqual(serviceChecks(s, "nowhere"), [], "a computer missing from site.json runs no kit service");
});

test("the Mac control computer watches its services at 127.0.0.1 and its Tailscale address, with launchd's labels", () => {
  const checks = serviceChecks(site(), "studio", { mac: true });
  assert.deepEqual(checks.map((c) => [c.name, c.unit, c.hosts.join(" ")]), [
    ["kev-engine", "io.recursica.kev-engine", "127.0.0.1 100.64.0.1"],
    ["jobd", "io.recursica.jobd", "127.0.0.1 100.64.0.1"],
    ["ollama", "io.recursica.ollama", "127.0.0.1"],
  ]);
});

test("a service is up when its port answers on one of its addresses, and its container runs", async () => {
  const checks = serviceChecks(site(), "pc");
  const open = new Set(["100.64.0.2:8009", "127.0.0.1:21116", "127.0.0.1:21117"]);
  const states = await serviceStates(checks, { answers: async (h, p) => open.has(`${h}:${p}`), running: async (c) => c === "rustdesk-hbbs" });
  assert.deepEqual(states, [
    { name: "kev-engine", state: "up" },
    { name: "jobd", state: "down" },
    { name: "rustdesk-hbbs", state: "up" },
    { name: "rustdesk-hbbr", state: "down" },
  ], "hbbr's port answers, but a stopped container is down");
});

test("a peer's service list keeps only known names and states", () => {
  assert.deepEqual(cleanServices([
    { name: "kev-engine", state: "up", key: "sk-abc" },
    { name: "jobd", state: "down" },
    { name: "<!channel> look", state: "down" },
    { name: "ollama", state: "exploded" },
    null,
  ]), [{ name: "kev-engine", state: "up" }, { name: "jobd", state: "down" }]);
  assert.deepEqual(cleanServices("not a list"), []);
});

test("restart counts come from systemd, launchd and Docker, and an unreadable count is left out", async () => {
  const checks = serviceChecks(site(), "pc");
  const out = { "systemctl show -p NRestarts --value kev-engine.service": "2\n", "systemctl show -p NRestarts --value jobd.service": "",
    "docker inspect -f {{.RestartCount}} rustdesk-hbbs": "0\n", "docker inspect -f {{.RestartCount}} rustdesk-hbbr": "5\n" };
  assert.deepEqual(await restartCounts(checks, { run: async (cmd, args) => out[[cmd, ...args].join(" ")] ?? "" }), { "kev-engine": 2, "rustdesk-hbbs": 0, "rustdesk-hbbr": 5 });
  const mac = serviceChecks(site(), "studio", { mac: true });
  const counts = await restartCounts(mac, { mac: true, run: async (cmd, args) => (cmd === "launchctl" && args[1] === "system/io.recursica.kev-engine" ? "\tstate = running\n\truns = 7\n" : "") });
  assert.deepEqual(counts, { "kev-engine": 7 });
});

function watch(start = Date.parse("2026-11-23T10:00:00Z")) {
  let t = start, counts = { "kev-engine": 0, "rustdesk-hbbr": 0 };
  const posts = [];
  const w = new RestartWatch({ computer: "pc", read: async () => ({ ...counts }), post: async (text) => { posts.push(text); return { ok: true }; },
    stateFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "restarts-")), "r.json"), now: () => t });
  return { w, posts, set: (name, n) => (counts[name] = n), advance: (ms) => (t += ms) };
}

test("more than 3 restarts in an hour post once, and a quiet hour lets a new episode post again", async () => {
  const r = watch();
  await r.w.tick();
  for (const n of [1, 2, 3]) { r.advance(60_000); r.set("kev-engine", n); await r.w.tick(); }
  assert.equal(r.posts.length, 0, "3 restarts in an hour post nothing");
  r.advance(60_000); r.set("kev-engine", 4); await r.w.tick();
  assert.deepEqual(r.posts, [":repeat: kev-engine on pc restarted 4 times in the last hour. The service starts and stops again, so the service may be failing. Read the service's log on pc."]);
  for (const n of [5, 6, 7]) { r.advance(60_000); r.set("kev-engine", n); await r.w.tick(); }
  assert.equal(r.posts.length, 1, "one post for the episode");
  r.advance(61 * 60_000); await r.w.tick();
  for (const n of [8, 9, 10, 11]) { r.advance(60_000); r.set("kev-engine", n); await r.w.tick(); }
  assert.equal(r.posts.length, 2, "a later episode posts again");
});

test("restarts spread over more than an hour post nothing, and a count that goes down starts a new baseline", async () => {
  const r = watch();
  await r.w.tick();
  for (const n of [1, 2, 3, 4, 5]) { r.advance(20 * 60_000); r.set("rustdesk-hbbr", n); await r.w.tick(); }
  assert.equal(r.posts.length, 0, "5 restarts, at most 3 in any hour");
  // An hour later the count drops to 0, as after a reload, then 2 restarts follow.
  r.advance(61 * 60_000); r.set("rustdesk-hbbr", 0); await r.w.tick();
  r.advance(60_000); r.set("rustdesk-hbbr", 2); await r.w.tick();
  assert.equal(r.posts.length, 0, "a count that goes down is a new baseline, not a burst of restarts");
});

test("a restart post that fails is tried again at the next minute", async () => {
  let ok = false;
  const posts = [];
  let t = 0, n = 0;
  const w = new RestartWatch({ computer: "pc", read: async () => ({ jobd: n }), post: async (text) => { posts.push(text); return { ok }; },
    stateFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "restarts-")), "r.json"), now: () => t });
  await w.tick();
  n = 4; t += 60_000; await w.tick();
  ok = true; t += 60_000; await w.tick();
  assert.equal(posts.length, 2);
  t += 60_000; await w.tick();
  assert.equal(posts.length, 2);
});

test("a port answers when a TCP connection opens, and a closed port doesn't", async () => {
  const srv = net.createServer((c) => c.end()).listen(0, "127.0.0.1");
  await new Promise((r) => srv.once("listening", r));
  const port = srv.address().port;
  try {
    assert.equal(await answers("127.0.0.1", port), true);
  } finally { await new Promise((r) => srv.close(r)); }
  assert.equal(await answers("127.0.0.1", port, 500), false);
});
