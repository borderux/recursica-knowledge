// disk-image.sh on Linux and WSL, with stand-ins for sudo, colima, findmnt and agent-stacks-disk.
// Each stand-in writes one line per call to a log, so a test sees what the script ran, in order.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const linux = process.platform === "linux";

function setup({ mounted = false } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "disk-"));
  const bin = path.join(home, "bin");
  const log = path.join(home, "log");
  fs.mkdirSync(bin);
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`, { mode: 0o755 });
  // stdin=<n> is the length of what the call read on stdin: the key passes through, and is never logged.
  stub("helper", `in="$(cat)"; echo "helper $* stdin=\${#in}" >> "${log}"`);
  stub("sudo", `[ "$1" = -n ] && shift; exec "$@"`);
  stub("colima", `echo "colima $* COLIMA_HOME=$COLIMA_HOME" >> "${log}"`);
  stub("findmnt", mounted ? `echo /dev/mapper/agent-stacks-acme` : `exit 1`);
  const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, AGENT_STACKS_DISK: path.join(bin, "helper") };
  const run = (args, input = "") => spawnSync("bash", [path.join(here, "disk-image.sh"), ...args], { env, input, encoding: "utf8" });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n") : []);
  return { home, run, calls };
}

const key = "k".repeat(32);

test("refuses a client name that is not a slug", () => {
  const { run } = setup();
  assert.notEqual(run(["status", "../x"]).status, 0);
});

test("create passes the key to agent-stacks-disk and puts Colima's folder in the image", { skip: !linux }, () => {
  const { home, run, calls } = setup();
  const r = run(["create", "acme", "20g"], key);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(calls(), ["helper create acme 20g stdin=32"]);
  assert.ok(fs.statSync(path.join(home, "tenants/acme/colima")).isDirectory());
  assert.doesNotMatch(r.stdout + r.stderr, new RegExp(key));
});

test("create refuses a key shorter than 24 characters", { skip: !linux }, () => {
  const { run, calls } = setup();
  const r = run(["create", "acme", "20g"], "short");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /at least 24 characters/);
  assert.deepEqual(calls(), []);
});

test("create refuses a client name too long for Colima's socket path", { skip: !linux }, () => {
  const { run } = setup();
  const r = run(["create", "a".repeat(40), "20g"], key);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /too long/);
});

test("vm creates the Docker VM with the stack's folder as the only mount", { skip: !linux }, () => {
  const { home, run, calls } = setup({ mounted: true });
  fs.mkdirSync(path.join(home, "tenants/acme/colima"), { recursive: true });
  const r = run(["vm", "acme", "2", "4", "30"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const stack = path.join(home, "tenants/acme");
  assert.deepEqual(calls(), [
    `colima start --profile acme --activate=false --ssh-config=false --cpus 2 --memory 4 --disk 30 --mount ${stack}:w COLIMA_HOME=${stack}/colima`,
  ]);
});

test("unlock opens the image, then starts the VM without making the VM the current Docker context", { skip: !linux }, () => {
  const { home, run, calls } = setup();
  fs.mkdirSync(path.join(home, "tenants/acme/colima/acme"), { recursive: true });
  const r = run(["unlock", "acme"], key);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(calls(), [
    "helper open acme stdin=32",
    `colima start --profile acme --activate=false --ssh-config=false COLIMA_HOME=${home}/tenants/acme/colima`,
  ]);
});

test("unlock refuses a disk image that holds no Docker VM", { skip: !linux }, () => {
  const { run, calls } = setup({ mounted: true });
  const r = run(["unlock", "acme"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /holds no Docker VM/);
  assert.deepEqual(calls(), []);
});

test("unlock refuses a VM that mounts the home folder", { skip: !linux }, () => {
  const { home, run, calls } = setup({ mounted: true });
  const conf = path.join(home, "tenants/acme/colima/acme");
  fs.mkdirSync(conf, { recursive: true });
  fs.writeFileSync(path.join(conf, "colima.yaml"), "mounts:\n  - location: ~\n    writable: true\n");
  const r = run(["unlock", "acme"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /mounts more than/);
  assert.deepEqual(calls(), []);
});

test("unlock refuses a VM with no mounts listed, because Colima then mounts the home folder", { skip: !linux }, () => {
  const { home, run } = setup({ mounted: true });
  const conf = path.join(home, "tenants/acme/colima/acme");
  fs.mkdirSync(conf, { recursive: true });
  fs.writeFileSync(path.join(conf, "colima.yaml"), "cpu: 2\nmounts: []\n");
  assert.notEqual(run(["unlock", "acme"]).status, 0);
});

test("lock stops the VM, then closes the image", { skip: !linux }, () => {
  const { home, run, calls } = setup({ mounted: true });
  const r = run(["lock", "acme"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(calls(), [`colima stop --profile acme COLIMA_HOME=${home}/tenants/acme/colima`, "helper close acme stdin=0"]);
});

test("agent-stacks-disk refuses to run without root", { skip: !linux || process.getuid() === 0 }, () => {
  const r = spawnSync("bash", [path.join(here, "disk-helper.sh"), "status", "acme"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /runs as root/);
});

test("setup-pc.sh never gives the passwordless rule to the owner or to root", { skip: !linux || process.getuid() === 0 }, () => {
  for (const account of [os.userInfo().username, "root"]) {
    const r = spawnSync("bash", [path.join(here, "setup-pc.sh"), account], { encoding: "utf8" });
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /separate account/);
  }
  const r = spawnSync("bash", [path.join(here, "setup-pc.sh"), "no-such-account-acme"], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /No account named no-such-account-acme/);
});
