// The GitHub token service (token-service.mjs), with a stand-in for GitHub's API.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { TokenService, fromCluster } from "./token-service.mjs";
import { ENDED, drillKey, issue, revokeTask, taskKey, taskSecret, loadKeys, writeState } from "../gateway/keys.mjs";

const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" });
const NOW = 1_800_000_000_000;
const apps = {
  alan: { app_id: 1, installation_id: 10, slug: "acme-alan", repos: ["acme/knowledge"], permissions: { contents: "write", pull_requests: "write", issues: "write" } },
  porter: { app_id: 2, installation_id: 20, slug: "acme-porter", repos: ["acme/adapter-a", "acme/adapter-b"], permissions: { contents: "write", pull_requests: "write" } },
};

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-"));
  const cc = path.join(root, "circlechat"), keysRoot = path.join(root, "keys");
  for (const a of ["alan", "porter"]) { fs.mkdirSync(path.join(cc, "hermes-homes", `.hermes-${a}`), { recursive: true }); fs.writeFileSync(path.join(cc, "hermes-homes", `.hermes-${a}`, ".env"), "KEEP=1\nALAN_GITHUB_PAT=old\n"); }
  fs.mkdirSync(path.join(keysRoot, "cluster"), { recursive: true });
  for (const a of ["alan", "porter"]) fs.writeFileSync(path.join(keysRoot, "cluster", `${a}.pem`), pem, { mode: 0o600 });
  let n = 0, t = NOW;
  const minted = [], logs = [];
  const installs = { "acme/adapter-a": { id: 20, permissions: { contents: "write", pull_requests: "write", metadata: "read" } },
    "acme/adapter-b": { id: 20, permissions: { contents: "read", pull_requests: "write", metadata: "read" } } };
  const fetchFn = async (url, opts = {}) => {
    const lookup = /\/repos\/([^/]+)\/([^/]+)\/installation$/.exec(url);
    if (lookup) {
      assert.match(opts.headers.authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/, "the lookup uses the app's JWT");
      const hit = installs[`${lookup[1]}/${lookup[2]}`];
      return hit ? { ok: true, status: 200, json: async () => hit } : { ok: false, status: 404 };
    }
    if (url.includes("/access_tokens")) { minted.push({ url, body: JSON.parse(opts.body) }); n++; return { ok: true, json: async () => ({ token: `ghs_${n}`, expires_at: new Date(t + 3600_000).toISOString() }) }; }
    if (url.includes("/users/")) return { ok: true, json: async () => ({ id: url.includes("porter") ? 52 : 51 }) };
    return { ok: false, status: 404 };
  };
  const svc = new TokenService({ site: { github_apps: apps }, stack: "cluster", ccDir: cc, keysRoot, fetchFn, now: () => t, log: (l) => logs.push(l) });
  return { svc, cc, keysRoot, minted, logs, advance: (ms) => { t += ms; }, env: (a) => fs.readFileSync(path.join(cc, "hermes-homes", `.hermes-${a}`, ".env"), "utf8") };
}

test("each agent's token goes to the agent's .env, with the bot identity, and is renewed 15 minutes before the token ends", async () => {
  const s = setup();
  assert.deepEqual(await s.svc.tick(), ["alan", "porter"]);
  assert.match(s.env("alan"), /^KEEP=1$/m);
  assert.match(s.env("alan"), /^ALAN_GITHUB_TOKEN=ghs_1$/m);
  assert.match(s.env("alan"), /^GIT_COMMITTER_NAME=acme-alan\[bot\]$/m);
  assert.match(s.env("alan"), /^GIT_AUTHOR_EMAIL=51\+acme-alan\[bot\]@users\.noreply\.github\.com$/m);
  assert.doesNotMatch(s.env("alan"), /PRIVATE KEY/, "the agent gets the token, never the key");
  assert.deepEqual(s.minted[0].body, { repositories: ["knowledge"], permissions: apps.alan.permissions });
  s.advance(40 * 60_000);
  assert.deepEqual(await s.svc.tick(), [], "a token with more than 15 minutes left stays");
  s.advance(10 * 60_000);
  assert.deepEqual(await s.svc.tick(), ["alan", "porter"]);
  assert.match(s.env("alan"), /^ALAN_GITHUB_TOKEN=ghs_3$/m);
});

test("the service never writes through a symlinked .env, and skips an agent with no .env", async () => {
  const s = setup();
  const outside = path.join(s.cc, "..", "outside.txt");
  fs.writeFileSync(outside, "outside\n");
  const env = path.join(s.cc, "hermes-homes", ".hermes-alan", ".env");
  fs.rmSync(env); fs.symlinkSync(outside, env);
  fs.rmSync(path.join(s.cc, "hermes-homes", ".hermes-porter", ".env"));
  assert.deepEqual(await s.svc.tick(), []);
  assert.equal(fs.readFileSync(outside, "utf8"), "outside\n");
});

test("a port job gets a token for one of Porter's repos with the job's task key, and nothing without one", async () => {
  const s = setup();
  const gw = path.join(s.cc, "gateway-state");
  issue(gw, "porter"); issue(gw, "alan");
  const key = taskKey(taskSecret(gw), loadKeys(gw), "porter", "task-1", { now: NOW });
  const srv = http.createServer((q, r) => s.svc.handle(q, r));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const ask = (auth, repo) => fetch(`http://127.0.0.1:${srv.address().port}/token`, { method: "POST", headers: { authorization: `Bearer ${auth}` }, body: JSON.stringify({ repo }) });
  try {
    const ok = await ask(key, "https://github.com/acme/adapter-b.git");
    assert.equal(ok.status, 200);
    const j = await ok.json();
    assert.match(j.token, /^ghs_/);
    assert.equal(j.name, "acme-porter[bot]");
    assert.deepEqual(s.minted.at(-1).body.repositories, ["adapter-b"], "only the job's repo");
    assert.equal((await ask(key, "acme/knowledge")).status, 403, "a repo outside Porter's repos");
    assert.equal((await ask("ccg_not-a-task-key", "acme/adapter-a")).status, 401);
    assert.equal((await ask(`${key}x`, "acme/adapter-a")).status, 401, "a changed task key");
  } finally { srv.close(); }
});

test("the service takes requests from loopback and Tailscale only", () => {
  assert.equal(fromCluster("127.0.0.1"), true);
  assert.equal(fromCluster("100.64.0.9"), true);
  assert.equal(fromCluster("::ffff:100.64.0.5"), true);
  assert.equal(fromCluster("fd7a:115c:a1e0::1"), true);
  assert.equal(fromCluster("192.0.2.20"), false);
  assert.equal(fromCluster("198.51.100.5"), false);
});

test("the Kev notes push's token goes to kev-data.env, for data.repo only, with the app's bot identity", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-"));
  const cc = path.join(root, "circlechat"), keysRoot = path.join(root, "keys");
  fs.mkdirSync(cc); fs.mkdirSync(path.join(keysRoot, "cluster"), { recursive: true });
  fs.writeFileSync(path.join(keysRoot, "cluster", "kev-data.pem"), pem, { mode: 0o600 });
  let n = 0, t = NOW;
  const minted = [], logs = [];
  const installs = { "acme/adapter-a": { id: 20, permissions: { contents: "write", pull_requests: "write", metadata: "read" } },
    "acme/adapter-b": { id: 20, permissions: { contents: "read", pull_requests: "write", metadata: "read" } } };
  const fetchFn = async (url, opts = {}) => {
    const lookup = /\/repos\/([^/]+)\/([^/]+)\/installation$/.exec(url);
    if (lookup) {
      assert.match(opts.headers.authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/, "the lookup uses the app's JWT");
      const hit = installs[`${lookup[1]}/${lookup[2]}`];
      return hit ? { ok: true, status: 200, json: async () => hit } : { ok: false, status: 404 };
    }
    if (url.includes("/access_tokens")) { minted.push({ url, body: JSON.parse(opts.body) }); n++; return { ok: true, json: async () => ({ token: `ghs_${n}`, expires_at: new Date(t + 3600_000).toISOString() }) }; }
    if (url.includes("/users/")) return { ok: true, json: async () => ({ id: 61 }) };
    return { ok: false, status: 404 };
  };
  const site = { data: { repo: "acme/kev-data", github_app: { app_id: 3, installation_id: 30, slug: "acme-kev-data" } } };
  const svc = new TokenService({ site, stack: "cluster", ccDir: cc, keysRoot, fetchFn, now: () => t, log: () => {} });
  const file = path.join(cc, "kev-data.env");
  fs.writeFileSync(file, "KEEP=1\nKEV_DATA_GITHUB_PAT=old\n", { mode: 0o644 });
  assert.deepEqual(await svc.tick(), ["kev-data"]);
  assert.equal(minted[0].url, "https://api.github.com/app/installations/30/access_tokens");
  assert.deepEqual(minted[0].body, { repositories: ["kev-data"], permissions: { contents: "write", pull_requests: "write" } });
  const text = fs.readFileSync(file, "utf8");
  assert.match(text, /^KEEP=1$/m);
  assert.match(text, /^KEV_DATA_GITHUB_TOKEN=ghs_1$/m);
  assert.match(text, /^GIT_AUTHOR_NAME=acme-kev-data\[bot\]$/m);
  assert.match(text, /^GIT_COMMITTER_EMAIL=61\+acme-kev-data\[bot\]@users\.noreply\.github\.com$/m);
  assert.doesNotMatch(text, /PRIVATE KEY/, "the push gets the token, never the key");
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  t += 40 * 60_000;
  assert.deepEqual(await svc.tick(), [], "a token with more than 15 minutes left stays");
  t += 10 * 60_000;
  assert.deepEqual(await svc.tick(), ["kev-data"]);
  assert.match(fs.readFileSync(file, "utf8"), /^KEV_DATA_GITHUB_TOKEN=ghs_2$/m);
  // A missing file is made, mode 600.
  fs.rmSync(file); t += 50 * 60_000;
  assert.deepEqual(await svc.tick(), ["kev-data"]);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  // A symlink at the file: refused, and the file the symlink names stays unchanged.
  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(outside, "outside\n");
  fs.rmSync(file); fs.symlinkSync(outside, file); t += 50 * 60_000;
  assert.deepEqual(await svc.tick(), []);
  assert.equal(fs.readFileSync(outside, "utf8"), "outside\n");
  // No data.repo: no token.
  const off = new TokenService({ site: { data: { github_app: site.data.github_app } }, stack: "cluster", ccDir: cc, keysRoot, fetchFn, now: () => t, log: () => {} });
  assert.deepEqual(await off.tick(), []);
});

// A token service on a free port, with Porter's and Alan's gateway keys, for the tests below.
async function serve(s) {
  const gw = path.join(s.cc, "gateway-state");
  issue(gw, "porter"); issue(gw, "alan");
  const srv = http.createServer((q, r) => s.svc.handle(q, r));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const post = (route, auth, repo) => fetch(`http://127.0.0.1:${srv.address().port}${route}`, { method: "POST", headers: { authorization: `Bearer ${auth}` }, body: JSON.stringify({ repo }) });
  const key = (task, opts = {}) => taskKey(taskSecret(gw), loadKeys(gw), "porter", task, { now: NOW, ...opts });
  return { gw, srv, post, key };
}

test("a check job learns that Porter may get a token for a repo, and the service makes no token", async () => {
  const s = setup();
  const { srv, post, key } = await serve(s);
  try {
    const r = await post("/check", key("task-1"), "https://github.com/acme/adapter-a.git");
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ok, true);
    assert.deepEqual(j.checks, { key: true, app: true, repo_listed: true, private_key: true, installation: true, permissions: true });
    assert.deepEqual([j.agent, j.task, j.repo, j.installation_id], ["porter", "task-1", "acme/adapter-a", 20]);
    assert.deepEqual(j.permissions, { contents: "write", pull_requests: "write" });
    assert.equal(s.minted.length, 0, "a check makes no token");
    assert.equal(s.logs.at(-1), "github check for a port job: agent porter, task task-1, repo acme/adapter-a: pass");
  } finally { srv.close(); }
});

test("a check names the failed step: a repo outside the app, a missing installation, a missing permission, a missing key", async () => {
  const s = setup();
  const { srv, post, key } = await serve(s);
  try {
    const outside = await (await post("/check", key("task-1"), "acme/knowledge")).json();
    assert.equal(outside.ok, false);
    assert.match(outside.checks.repo_listed, /not one of porter's repos/);
    assert.equal(outside.checks.installation, null, "no step runs after a failed step");
    const read = await (await post("/check", key("task-1"), "acme/adapter-b")).json();
    assert.equal(read.ok, false);
    assert.equal(read.checks.installation, true);
    assert.match(read.checks.permissions, /lacks contents write/);
    assert.match(s.logs.at(-1), /repo acme\/adapter-b: fail \(permissions: the installation lacks contents write\)$/);
    s.svc.site.github_apps.porter.repos.push("acme/adapter-c");
    const missing = await (await post("/check", key("task-1"), "acme/adapter-c")).json();
    assert.match(missing.checks.installation, /not installed on acme\/adapter-c/);
    fs.rmSync(path.join(s.keysRoot, "cluster", "porter.pem"));
    const nokey = await (await post("/check", key("task-1"), "acme/adapter-a")).json();
    assert.match(nokey.checks.private_key, /cannot be read: ENOENT/);
    assert.equal(s.minted.length, 0);
  } finally { srv.close(); s.svc.site.github_apps.porter.repos.pop(); }
});

test("a drill key may run a check, and never gets a token", async () => {
  const s = setup();
  const { gw, srv, post } = await serve(s);
  try {
    const drill = drillKey(gw, "porter", "node-a", 15, NOW).key;
    assert.equal((await (await post("/check", drill, "acme/adapter-a")).json()).ok, true);
    const r = await post("/token", drill, "acme/adapter-a");
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error, "drill_key");
    assert.equal(s.minted.length, 0);
  } finally { srv.close(); }
});

test("an expired key, a revoked task's key and a closed task's key get no token and no check", async () => {
  const s = setup();
  const { gw, srv, post, key } = await serve(s);
  const status = async (route, k) => { const r = await post(route, k, "acme/adapter-a"); return [r.status, (await r.json()).error]; };
  try {
    const old = key("task-1", { now: NOW - 5 * 3600_000 });
    assert.deepEqual(await status("/token", old), [401, "key_expired"]);
    assert.deepEqual(await status("/check", old), [401, "key_expired"]);
    const k2 = key("task-2");
    revokeTask(gw, "task-2", NOW + 1000);
    assert.deepEqual(await status("/token", k2), [401, "key_revoked"]);
    writeState(gw, ENDED, { "task-3": new Date(NOW).toISOString() });
    assert.deepEqual(await status("/token", key("task-3")), [401, "task_closed"]);
    assert.equal((await post("/token", key("task-4"), "acme/adapter-a")).status, 200, "another task's key still works");
  } finally { srv.close(); }
});
