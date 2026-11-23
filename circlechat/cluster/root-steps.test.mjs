// The steps of a release upgrade that need root (root-steps.mjs), with stand-ins for every command.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterUpgrade, prepareGateway, runUpgrade, stackPaths } from "./root-steps.mjs";

const stack = () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "root-steps-"));
  const ccDir = path.join(home, "circlechat");
  fs.mkdirSync(path.join(ccDir, "kit-out"), { recursive: true });
  return { home, ccDir, gw: path.join(ccDir, "gateway-state") };
};
const mode = (f) => fs.statSync(f).mode & 0o777;

test("root prepares the gateway's files once, keeps the master key, and writes no database role", () => {
  const { ccDir, gw } = stack();
  assert.equal(prepareGateway({ ccDir }), "", "no password is left to pass on");
  assert.equal(mode(gw), 0o700);
  assert.equal(mode(path.join(gw, "litellm-master.key")), 0o600);
  assert.equal(mode(path.join(ccDir, "model-keys.env")), 0o600);
  for (const f of ["db-password", "db.url"]) assert.equal(fs.existsSync(path.join(gw, f)), false, f);
  const key = fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8");
  assert.match(key, /^sk-[0-9a-f]{48}\n$/);
  prepareGateway({ ccDir });
  assert.equal(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), key);
  assert.deepEqual(fs.readdirSync(gw).filter((f) => f.startsWith(".new.")), [], "no file left half written");
});

test("on a Mac, the owner gets the state folder and each file root writes", () => {
  const { ccDir, gw } = stack();
  const ids = { uid: process.getuid(), gid: process.getgid() };
  prepareGateway({ ccDir, ids });
  for (const f of [gw, path.join(gw, "litellm-master.key"), path.join(ccDir, "model-keys.env")]) assert.equal(fs.statSync(f).uid, ids.uid, f);
});

test("root never writes through a link", () => {
  const { home, ccDir, gw } = stack();
  fs.mkdirSync(gw);
  const outside = path.join(home, "outside.txt");
  fs.writeFileSync(outside, "text of another file\n");
  fs.symlinkSync(outside, path.join(gw, "litellm-master.key"));
  prepareGateway({ ccDir });
  assert.equal(fs.readFileSync(outside, "utf8"), "text of another file\n");
  assert.ok(!fs.lstatSync(path.join(gw, "litellm-master.key")).isSymbolicLink());
});

test("root refuses a symlinked state folder, and a secrets file with a symlink or a second hard link", () => {
  const a = stack();
  fs.mkdirSync(path.join(a.home, "elsewhere"));
  fs.symlinkSync(path.join(a.home, "elsewhere"), a.gw);
  assert.throws(() => prepareGateway({ ccDir: a.ccDir }), /gateway-state is a symlink/);
  assert.deepEqual(fs.readdirSync(path.join(a.home, "elsewhere")), []);
  const b = stack();
  fs.writeFileSync(path.join(b.home, "other.env"), "");
  fs.linkSync(path.join(b.home, "other.env"), path.join(b.ccDir, "model-keys.env"));
  assert.throws(() => prepareGateway({ ccDir: b.ccDir }), /model-keys\.env is a symlink or has a second hard link/);
  assert.ok(!fs.existsSync(b.gw), "nothing was written");
});

test("the workspace of the cluster's own stack, new name first, and of a client stack", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "root-steps-ws-"));
  assert.deepEqual(stackPaths(home, path.join(home, "recursica-stack")), { tenant: "", ws: path.join(home, "recursica-workspace") });
  fs.mkdirSync(path.join(home, "circlechat-workspace"));
  assert.deepEqual(stackPaths(home, path.join(home, "circlechat")), { tenant: "", ws: path.join(home, "circlechat-workspace") }, "an old layout keeps its workspace");
  fs.mkdirSync(path.join(home, "recursica-workspace"));
  assert.deepEqual(stackPaths(home, path.join(home, "recursica-stack")), { tenant: "", ws: path.join(home, "recursica-workspace") });
  for (const dir of ["stack", "circlechat"]) assert.deepEqual(stackPaths(home, path.join(home, "tenants/acme", dir)), { tenant: "acme", ws: path.join(home, "tenants/acme/workspace") });
});

// A stand-in for spawnSync: records each command, and answers from the given table.
function fakeRun(answers = {}) {
  const calls = [];
  const run = (cmd, args, opts = {}) => {
    calls.push({ cmd, args, opts, line: [cmd, ...args].join(" ") });
    const hit = Object.entries(answers).find(([k]) => [cmd, ...args].join(" ").includes(k));
    return hit ? hit[1] : { status: 0, stdout: "" };
  };
  return { run, calls };
}
const env = (home) => ({ OWNER: "owner", OWNER_HOME: home, KIT: "/kit", PATH: "/usr/bin:/bin", COMPUTER: "machine-1" });

test("after an upgrade, root runs no step of CircleChat 1.x", () => {
  assert.deepEqual(afterUpgrade(), []);
});

// A stand-in for the owner's kit/upgrade.mjs: records stdin, and with ranSetup records a run of
// setup-host.sh in the stack's upgrade state, as kit/upgrade.mjs does.
function fakeSpawn(ccDir, { ranSetup }) {
  const seen = {};
  const spawnFn = (cmd, args) => {
    Object.assign(seen, { cmd, args });
    const child = new EventEmitter();
    child.stdin = { end: (text) => {
      seen.stdin = text;
      if (ranSetup) fs.writeFileSync(path.join(ccDir, "kit-out/upgrade-state.json"), JSON.stringify({ setupRanAt: Date.now() }));
      setImmediate(() => child.emit("close", 0));
    } };
    return child;
  };
  return { spawnFn, seen };
}

test("the upgrade runs as the owner with nothing on stdin", async () => {
  for (const ranSetup of [true, false]) {
    const { home, ccDir } = stack();
    const s = fakeSpawn(ccDir, { ranSetup });
    const f = fakeRun();
    const posts = [];
    const r = await runUpgrade({ env: env(home), ccDir, ref: "@recursica/knowledge@1.2.3", approved: ["@recursica/knowledge@1.2.3", "not a tag"], mac: false, spawnFn: s.spawnFn, run: f.run, post: async (t) => { posts.push(t); } });
    assert.equal(s.seen.stdin, undefined);
    assert.equal(s.seen.cmd, "sudo");
    assert.deepEqual(s.seen.args.slice(0, 5), ["-u", "owner", "-H", "env", "KIT_ROOT_STEPS=1"]);
    assert.equal(s.seen.args[5], "KIT_APPROVED=@recursica/knowledge@1.2.3", "only the approved release tags reach the upgrade");
    assert.equal(s.seen.args[6], "KIT_HOLD_NETWORK=1", "the upgrade applies no network step");
    assert.deepEqual(s.seen.args.slice(-2), ["/kit/circlechat/kit/upgrade.mjs", "@recursica/knowledge@1.2.3"]);
    assert.equal(r.ran, ranSetup);
    assert.equal(f.calls.some((c) => c.line.includes("key-check.mjs") || c.line.includes("sync-skills.sh")), false);
    assert.deepEqual(posts, []);
  }
});

test("a refused state folder stops the upgrade, and the stack's Slack channel hears why", async () => {
  const posts = [];
  const post = async (t) => { posts.push(t); };
  const b = stack();
  fs.mkdirSync(path.join(b.home, "elsewhere"));
  fs.symlinkSync(path.join(b.home, "elsewhere"), b.gw);
  const s = fakeSpawn(b.ccDir, { ranSetup: true });
  const r = await runUpgrade({ env: env(b.home), ccDir: b.ccDir, mac: false, spawnFn: s.spawnFn, run: fakeRun().run, post });
  assert.equal(r.ran, false);
  assert.equal(s.seen.cmd, undefined, "the upgrade never started");
  assert.match(posts[0], /The upgrade job stopped before the upgrade: .*gateway-state is a symlink/);
});
