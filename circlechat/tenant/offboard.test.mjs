// offboard.sh check: passes on a clean computer, fails while a trace of the client remains.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const check = (home) => spawnSync("bash", [path.join(here, "offboard.sh"), "check", "acme"], { env: { ...process.env, HOME: home }, encoding: "utf8" });

test("passes when nothing of the client remains", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "off-"));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat/notes.txt"), "border only");
  const r = check(home);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Nothing of client acme remains/);
});

test("fails on a leftover folder or a file naming the client", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "off-"));
  fs.mkdirSync(path.join(home, "tenants/acme"), { recursive: true });
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat/notes.txt"), "acme was here");
  const r = check(home);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /tenants\/acme\s+FAIL/);
  assert.match(r.stdout, /files naming acme\s+FAIL/);
});

test("refuses a client name that is not a slug", () => {
  const r = spawnSync("bash", [path.join(here, "offboard.sh"), "remove", "../x"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
});

test("fails on a Docker VM left in Colima's own folder, on a Mac or on Linux", () => {
  for (const dir of [".colima/_lima/_disks/colima-acme", ".config/colima/acme"]) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "off-"));
    fs.mkdirSync(path.join(home, dir), { recursive: true });
    const r = check(home);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, new RegExp(`${dir.replace(/\./g, "\\.")}\\s+FAIL`));
  }
});

test("fails on an ssh config line that names the client", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "off-"));
  fs.mkdirSync(path.join(home, ".ssh"));
  fs.writeFileSync(path.join(home, ".ssh/config"), `Include ${home}/tenants/acme/colima/ssh_config\n`);
  const r = check(home);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /files naming acme\s+FAIL/);
});

test("checks that the cluster's own stack still runs on this computer: each model server and Kev's model answers", async () => {
  const net = await import("node:net");
  const server = net.createServer((s) => s.end()).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const open = server.address().port;
  const closed = await new Promise((r) => { const t = net.createServer().listen(0, "127.0.0.1", () => { const p = t.address().port; t.close(() => r(p)); }); });
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "off-"));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  const site = (kevPort) => ({ nodes: [{ name: "machine-2", os: "linux", servers: [{ id: "ollama", kind: "ollama", port: open, models: [] }], kev: { port: kevPort } }] });
  const run = () => new Promise((resolve) => {
    const child = spawn("bash", [path.join(here, "offboard.sh"), "check", "acme"], { env: { ...process.env, HOME: home, CLUSTER_COMPUTER: "machine-2" } });
    let out = ""; child.stdout.on("data", (c) => (out += c)); child.on("close", (status) => resolve({ status, stdout: out }));
  });
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify(site(open)));
  const ok = await run();
  assert.equal(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, new RegExp(`the cluster's model server ollama \\(port ${open}\\)\\s+pass`));
  assert.match(ok.stdout, /the cluster's own stack runs as before/);
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify(site(closed)));
  const down = await run();
  assert.notEqual(down.status, 0);
  assert.match(down.stdout, new RegExp(`the cluster's Kev's model \\(port ${closed}\\)\\s+FAIL: no answer`));
  server.close();
});
