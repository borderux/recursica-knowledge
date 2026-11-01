// The steps of a release upgrade that need root (root-steps.mjs), with stand-ins for every command.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterUpgrade, prepareCloudApprovals, prepareGateway, runUpgrade, stackPaths } from "./root-steps.mjs";

const stack = () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "root-steps-"));
  const ccDir = path.join(home, "circlechat");
  fs.mkdirSync(path.join(ccDir, "kit-out"), { recursive: true });
  return { home, ccDir, gw: path.join(ccDir, "gateway-state") };
};
const mode = (f) => fs.statSync(f).mode & 0o777;

test("root prepares the gateway's files once, and keeps the password and the master key", () => {
  const { ccDir, gw } = stack();
  const pw = prepareGateway({ ccDir });
  assert.match(pw, /^[0-9a-f]{48}$/);
  assert.equal(mode(gw), 0o700);
  assert.equal(fs.readFileSync(path.join(gw, "db-password"), "utf8"), `${pw}\n`);
  assert.equal(fs.readFileSync(path.join(gw, "db.url"), "utf8"), `postgres://cc_gateway_read:${pw}@postgres:5432/circlechat\n`);
  for (const f of ["db-password", "db.url", "litellm-master.key"]) assert.equal(mode(path.join(gw, f)), 0o600, f);
  assert.equal(mode(path.join(ccDir, "model-keys.env")), 0o600);
  const key = fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8");
  assert.match(key, /^sk-[0-9a-f]{48}\n$/);
  assert.equal(prepareGateway({ ccDir }), pw);
  assert.equal(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), key);
  assert.deepEqual(fs.readdirSync(gw).filter((f) => f.startsWith(".new.")), [], "no file left half written");
});

test("on a Mac, the owner gets the state folder and each file root writes", () => {
  const { ccDir, gw } = stack();
  const ids = { uid: process.getuid(), gid: process.getgid() };
  prepareGateway({ ccDir, ids });
  for (const f of [gw, path.join(gw, "db.url"), path.join(ccDir, "model-keys.env")]) assert.equal(fs.statSync(f).uid, ids.uid, f);
});

test("root never writes through a link, and replaces a password that a kit did not make", () => {
  const { home, ccDir, gw } = stack();
  fs.mkdirSync(gw);
  const outside = path.join(home, "outside.txt");
  fs.writeFileSync(outside, "text of another file\n");
  fs.symlinkSync(outside, path.join(gw, "db-password"));
  fs.symlinkSync(outside, path.join(gw, "db.url"));
  const pw = prepareGateway({ ccDir });
  assert.equal(fs.readFileSync(outside, "utf8"), "text of another file\n");
  assert.ok(!fs.lstatSync(path.join(gw, "db.url")).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(gw, "db-password"), "utf8"), `${pw}\n`);
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

test("the workspace of the cluster's own stack, and of a client stack", () => {
  assert.deepEqual(stackPaths("/home/o", "/home/o/circlechat"), { tenant: "", ws: "/home/o/circlechat-workspace" });
  assert.deepEqual(stackPaths("/home/o", "/home/o/tenants/acme/circlechat"), { tenant: "acme", ws: "/home/o/tenants/acme/workspace" });
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

test("after an upgrade, the owner syncs the skills, then root runs the key check on the owner's database dump", () => {
  const { home, ccDir } = stack();
  fs.writeFileSync(path.join(ccDir, "kit-out/tenant.env"), "DOCKER_CONTEXT=colima-acme\n");
  const f = fakeRun({ "pg_dump": { status: 0, stdout: "the dump" } });
  assert.deepEqual(afterUpgrade({ env: env(home), ccDir, run: f.run }), []);
  const [sync, dump, check] = [f.calls.find((c) => c.line.includes("sync-skills.sh")), f.calls.find((c) => c.line.includes("pg_dump")), f.calls.find((c) => c.line.includes("key-check.mjs"))];
  // The sync runs as the owner, never as root: agents can change the workspace and their homes.
  assert.match(sync.line, /^sudo -u owner -H env /);
  assert.ok(sync.line.endsWith(" bash /kit/circlechat/sync-skills.sh"), sync.line);
  for (const v of [`CC_DIR=${ccDir}`, `WS=${path.join(home, "circlechat-workspace")}`, "OWNER=owner"]) assert.ok(sync.args.includes(v), v);
  assert.ok(!f.calls.some((c) => /chown/.test(c.line)), "root changes no owner in the workspace");
  assert.match(dump.line, /^sudo -u owner -H env DOCKER_CONTEXT=colima-acme PATH=\/usr\/bin:\/bin bash -c /);
  assert.equal(check.cmd, process.execPath);
  assert.deepEqual(check.args, ["/kit/circlechat/gateway/key-check.mjs", "--secrets", path.join(ccDir, "model-keys.env"), "--stdin", "CircleChat's database", path.join(ccDir, "hermes-homes")]);
  assert.equal(check.opts.input, "the dump");
  assert.ok(f.calls.indexOf(sync) < f.calls.indexOf(check));
});

test("after an upgrade, a failed sync or a failed key check is a problem", () => {
  const { home, ccDir } = stack();
  const f = fakeRun({ "sync-skills.sh": { status: 1 }, "key-check.mjs": { status: 1 } });
  assert.deepEqual(afterUpgrade({ env: env(home), ccDir, run: f.run }), ["the agents' skills and personas did not sync", "the key check found a cloud key, or could not run"]);
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

test("the upgrade runs as the owner with the password on stdin, and root's steps after it run only when the setup ran", async () => {
  for (const ranSetup of [true, false]) {
    const { home, ccDir } = stack();
    const s = fakeSpawn(ccDir, { ranSetup });
    const f = fakeRun();
    const posts = [];
    const r = await runUpgrade({ env: env(home), ccDir, ref: "@recursica/knowledge@1.2.3", approved: ["@recursica/knowledge@1.2.3", "not a tag"], mac: false, spawnFn: s.spawnFn, run: f.run, post: async (t) => { posts.push(t); } });
    const pw = fs.readFileSync(path.join(ccDir, "gateway-state/db-password"), "utf8").trim();
    assert.equal(s.seen.stdin, `${pw}\n`);
    assert.equal(s.seen.cmd, "sudo");
    assert.deepEqual(s.seen.args.slice(0, 5), ["-u", "owner", "-H", "env", "KIT_ROOT_STEPS=1"]);
    assert.equal(s.seen.args[5], "KIT_APPROVED=@recursica/knowledge@1.2.3", "only the approved release tags reach the upgrade");
    assert.ok(!s.seen.args.some((a) => a.includes(pw)), "the password is never an argument");
    assert.deepEqual(s.seen.args.slice(-2), ["/kit/circlechat/kit/upgrade.mjs", "@recursica/knowledge@1.2.3"]);
    assert.equal(r.ran, ranSetup);
    assert.equal(f.calls.some((c) => c.line.includes("key-check.mjs")), ranSetup);
    assert.deepEqual(posts, []);
  }
});

test("a problem after the upgrade goes to the stack's Slack channel, and a refused state folder stops the upgrade", async () => {
  const a = stack();
  const posts = [];
  const post = async (t) => { posts.push(t); };
  await runUpgrade({ env: env(a.home), ccDir: a.ccDir, mac: false, spawnFn: fakeSpawn(a.ccDir, { ranSetup: true }).spawnFn, run: fakeRun({ "key-check.mjs": { status: 1 } }).run, post });
  assert.match(posts[0], /After the upgrade, the key check found a cloud key, or could not run/);
  const b = stack();
  fs.mkdirSync(path.join(b.home, "elsewhere"));
  fs.symlinkSync(path.join(b.home, "elsewhere"), b.gw);
  const s = fakeSpawn(b.ccDir, { ranSetup: true });
  const r = await runUpgrade({ env: env(b.home), ccDir: b.ccDir, mac: false, spawnFn: s.spawnFn, run: fakeRun().run, post });
  assert.equal(r.ran, false);
  assert.equal(s.seen.cmd, undefined, "the upgrade never started");
  assert.match(posts[1], /The upgrade job stopped before the upgrade: .*gateway-state is a symlink/);
});

test("the upgrade job makes the two secrets of cloud-model requests before the upgrade, owned as Docker needs", () => {
  for (const mac of [false, true]) {
    const ccDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-"));
    const me = { uid: process.getuid(), gid: process.getgid() };
    const dir = path.join(ccDir, "cloud-approvals");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(ccDir, "outside"), "keep\n");
    fs.symlinkSync(path.join(ccDir, "outside"), path.join(dir, "webhook-secret"));
    prepareCloudApprovals({ ccDir, ids: mac ? me : null });
    assert.equal(fs.statSync(dir).mode & 0o777, mac ? 0o700 : 0o711);
    const first = {};
    for (const f of ["approval-token", "webhook-secret"]) {
      const file = path.join(dir, f);
      assert.equal(fs.lstatSync(file).isFile(), true, f);
      assert.equal(fs.statSync(file).mode & 0o777, 0o600, f);
      first[f] = fs.readFileSync(file, "utf8");
      assert.match(first[f], /^[0-9a-f]{64}\n$/);
    }
    assert.equal(fs.readFileSync(path.join(ccDir, "outside"), "utf8"), "keep\n", "never written through a link");
    prepareCloudApprovals({ ccDir, ids: mac ? me : null });
    for (const f of Object.keys(first)) assert.equal(fs.readFileSync(path.join(dir, f), "utf8"), first[f], "a second run keeps both");
  }
  const linked = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-"));
  fs.symlinkSync(os.tmpdir(), path.join(linked, "cloud-approvals"));
  assert.throws(() => prepareCloudApprovals({ ccDir: linked }), /cloud-approvals is a symlink/);
});
