// The check-job drill (check-job.sh, kit/check-job.mjs), with a stand-in for a node's job runner.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { drill, jobdUrl } from "./check-job.mjs";
import { REVOKED, checkKey, issue, loadKeys, taskKeyState, taskSecret } from "../gateway/keys.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const pass = { image: { ok: true, detail: "Claude Code 2.1.325" }, gateway: { ok: true, detail: "200 in 1.8 s, model qwen3:32b" }, token: { ok: true, detail: "porter may get a token for acme/adapter-x" } };
const site = { nodes: [{ name: "node-a", address: "192.0.2.1", tailnet_address: "127.0.0.1", jobs: { port: 7400 } }, { name: "node-b", address: "192.0.2.2" }], porter: { targets: ["https://github.com/acme/adapter-x"] } };

test("the drill finds each node's job runner at the node's Tailscale address", () => {
  assert.equal(jobdUrl(site, "node-a"), "http://127.0.0.1:7400");
  assert.throws(() => jobdUrl(site, "node-b"), /no jobs block/);
  assert.throws(() => jobdUrl(site, "node-c"), /no node node-c\. The nodes: node-a, node-b/);
});

// A fetch stand-in: POST /jobs answers `start`, and each GET answers the next meta in `polls`.
const fakeFetch = (start, polls) => async (url, opts = {}) => ({
  status: opts.method === "POST" ? start[0] : 200,
  json: async () => (opts.method === "POST" ? start[1] : polls.shift()),
});
const quick = { url: "http://jobd", token: "t", key: "cct_k.s", repo: "https://github.com/acme/adapter-x", node: "node-a", sleep: async () => {}, pollMs: 1 };

test("the drill prints one line per part, and passes only when every part passes", async () => {
  const ok = await drill({ ...quick, fetchFn: fakeFetch([201, { id: "job-1" }], [{ status: "running" }, { status: "succeeded", checks: pass }]) });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.lines, [
    "check-job node-a: jobd     PASS  201 job-1",
    "check-job node-a: image    PASS  Claude Code 2.1.325",
    "check-job node-a: gateway  PASS  200 in 1.8 s, model qwen3:32b",
    "check-job node-a: token    PASS  porter may get a token for acme/adapter-x",
  ]);
  const failed = await drill({ ...quick, fetchFn: fakeFetch([201, { id: "job-2" }], [{ status: "failed", checks: { ...pass, gateway: { ok: false, detail: "401 key_expired" } } }]) });
  assert.equal(failed.ok, false);
  assert.equal(failed.lines[2], "check-job node-a: gateway  FAIL  401 key_expired");
});

test("the drill says what to do when the job runner is old, busy or slow", async () => {
  const old = await drill({ ...quick, fetchFn: fakeFetch([400, { error: "unknown_job_type" }], []) });
  assert.deepEqual(old.lines, ["check-job node-a: jobd     FAIL  400 the job runner has no check job: rerun setup-node.sh on the node"]);
  const busy = await drill({ ...quick, fetchFn: fakeFetch([429, { error: "check_running", detail: "One check job runs at a time." }], []) });
  assert.match(busy.lines[0], /FAIL  429 check_running One check job runs at a time\.$/);
  let t = 0;
  const slow = await drill({ ...quick, timeoutMs: 180_000, now: () => (t += 60_000), fetchFn: fakeFetch([201, { id: "job-3" }], Array(9).fill({ status: "running" })) });
  assert.equal(slow.ok, false);
  assert.match(slow.lines.at(-1), /check    FAIL  the check job did not end in 3 minutes\. Read GET \/jobs\/job-3\/log on the node\.$/);
  const down = await drill({ ...quick, fetchFn: async () => { throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNREFUSED" } }); } });
  assert.deepEqual(down.lines, ["check-job node-a: jobd     FAIL  no answer from http://jobd: ECONNREFUSED"]);
});

test("check-job.sh gets a drill key, runs the check job and revokes the key", async () => {
  const cc = fs.mkdtempSync(path.join(os.tmpdir(), "check-job-"));
  const state = path.join(cc, "gateway-state");
  issue(state, "porter");
  taskSecret(state);
  const got = [];
  const jobd = http.createServer((q, s) => {
    let b = ""; q.on("data", (d) => (b += d));
    q.on("end", () => {
      got.push({ method: q.method, url: q.url, auth: q.headers.authorization, body: b ? JSON.parse(b) : null });
      s.setHeader("content-type", "application/json");
      if (q.method === "POST") { s.statusCode = 201; return s.end('{"id":"job-9","node":"node-a"}'); }
      s.end(JSON.stringify({ id: "job-9", status: "succeeded", checks: pass }));
    });
  });
  await new Promise((r) => jobd.listen(0, "127.0.0.1", r));
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ ...site, nodes: [{ ...site.nodes[0], jobs: { port: jobd.address().port } }] }));
  fs.writeFileSync(path.join(cc, ".env"), "JOBD_TOKEN=jobd-test-token\n");
  const r = await new Promise((resolve) => {
    const p = spawn("bash", [path.join(here, "..", "check-job.sh"), "node-a"], { env: { ...process.env, CC_DIR: cc, SUDO: "", CHECK_JOB_ANY_OWNER: "1", CHECK_JOB_POLL_MS: "20" } });
    let out = "", err = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("exit", (code) => resolve({ code, out, err }));
  });
  jobd.close();
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(r.out.trim().split("\n").map((l) => l.split(/\s+/).slice(2, 5).join(" ")), ["jobd PASS 201", "image PASS Claude", "gateway PASS 200", "token PASS porter"]);
  const sent = got[0];
  assert.equal(sent.auth, "Bearer jobd-test-token");
  assert.deepEqual([sent.body.type, sent.body.repo, sent.body.label], ["check", "https://github.com/acme/adapter-x", "drill node-a"]);
  const who = checkKey(sent.body.gateway_key, loadKeys(state), taskSecret(state), { now: Date.now() }).who;
  assert.equal(who.kind, "drill");
  assert.ok(who.expiresAt - Date.now() <= 15 * 60_000);
  assert.ok(JSON.parse(fs.readFileSync(path.join(state, REVOKED), "utf8")).keys[who.id], "the drill revokes the key");
  assert.equal(checkKey(sent.body.gateway_key, loadKeys(state), taskSecret(state), taskKeyState(state)).error, "key_revoked");
  assert.ok(!r.out.includes(sent.body.gateway_key) && !r.err.includes(sent.body.gateway_key), "the drill never prints the key");
});
