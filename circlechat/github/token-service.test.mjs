// The GitHub token service (token-service.mjs), with a stand-in for GitHub's API.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { TokenService, fromCluster } from "./token-service.mjs";
import { issue, taskKey, taskSecret, loadKeys } from "../gateway/keys.mjs";

const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" });
const NOW = 1_800_000_000_000;
const apps = {
  alan: { app_id: 1, installation_id: 10, slug: "acme-alan", repos: ["acme/knowledge"], permissions: { contents: "write", pull_requests: "write", issues: "write" } },
  porter: { app_id: 2, installation_id: 20, slug: "acme-porter", repos: ["acme/adapter-a", "acme/adapter-b"], permissions: { contents: "write", pull_requests: "write" } },
};

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tokens-"));
  const cc = path.join(root, "recursica-stack"), keysRoot = path.join(root, "keys");
  fs.mkdirSync(path.join(keysRoot, "cluster"), { recursive: true });
  for (const a of ["alan", "porter"]) fs.writeFileSync(path.join(keysRoot, "cluster", `${a}.pem`), pem, { mode: 0o600 });
  let n = 0, t = NOW;
  const minted = [];
  const fetchFn = async (url, opts = {}) => {
    if (url.includes("/access_tokens")) { minted.push({ url, body: JSON.parse(opts.body) }); n++; return { ok: true, json: async () => ({ token: `ghs_${n}`, expires_at: new Date(t + 3600_000).toISOString() }) }; }
    if (url.includes("/users/")) return { ok: true, json: async () => ({ id: url.includes("porter") ? 52 : 51 }) };
    return { ok: false, status: 404 };
  };
  const svc = new TokenService({ site: { github_apps: apps }, stack: "cluster", ccDir: cc, keysRoot, fetchFn, now: () => t, log: () => {} });
  return { svc, cc, minted, advance: (ms) => { t += ms; } };
}

test("no agent's token goes to a Hermes home of CircleChat 1.x, and no token is minted for an agent until a port job asks", async () => {
  const s = setup();
  for (const a of ["alan", "porter"]) { fs.mkdirSync(path.join(s.cc, "hermes-homes", `.hermes-${a}`), { recursive: true }); fs.writeFileSync(path.join(s.cc, "hermes-homes", `.hermes-${a}`, ".env"), "KEEP=1\n"); }
  assert.deepEqual(await s.svc.tick(), []);
  assert.equal(s.minted.length, 0);
  for (const a of ["alan", "porter"]) assert.equal(fs.readFileSync(path.join(s.cc, "hermes-homes", `.hermes-${a}`, ".env"), "utf8"), "KEEP=1\n");
});

test("a port job gets a token for one of Porter's repos with the job's task key, and nothing without one", async () => {
  const s = setup();
  const gw = path.join(s.cc, "gateway-state");
  issue(gw, "porter"); issue(gw, "alan");
  const key = taskKey(taskSecret(gw), loadKeys(gw), "porter", "task-1");
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
  const minted = [];
  const fetchFn = async (url, opts = {}) => {
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
