// A port job that a restart cut off starts again, up to JOBD_MAX_RESTARTS times, with the newest
// task key the job saved.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { startJobd } from "./test-jobd.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobd-restart-"));
const state = path.join(tmp, "docker");
const jobs = path.join(tmp, "jobs");
const REPO = "https://github.com/acme/adapter-x";
fs.mkdirSync(state, { recursive: true });

// Two jobs that were running before this job runner started, as after a reboot.
const earlier = new Date(Date.now() - 3600_000).toISOString();
function oldJob(id, restarts) {
  fs.mkdirSync(path.join(jobs, id), { recursive: true });
  fs.writeFileSync(path.join(jobs, id, "package.md"), "# Port the new prop");
  fs.writeFileSync(path.join(jobs, id, "meta.json"), JSON.stringify({ id, type: "porter", repo: REPO, label: id, status: "running", started: earlier, node: "node-a", restarts }));
  fs.writeFileSync(path.join(state, id), "exited 137 false");
}
oldJob("job-aaaa1-aaaaaa", 0);
oldJob("job-bbbb2-bbbbbb", 2);
// Two jobs that renewed their task key: one key still works, and one key ended during the stop.
const keyEnding = (ms) => `cct_${Buffer.from(JSON.stringify({ v: 2, a: "porter", t: "t-sub", exp: Math.floor(ms / 1000) })).toString("base64url")}.c2ln`;
const NEWEST = keyEnding(Date.now() + 3600_000), ENDED = keyEnding(Date.now() - 60_000);
for (const [id, key] of [["job-cccc3-cccccc", NEWEST], ["job-dddd4-dddddd", ENDED]]) {
  oldJob(id, 0);
  fs.writeFileSync(path.join(jobs, id, "gateway.env"), "ANTHROPIC_BASE_URL=http://cc-gateway:4000\nANTHROPIC_AUTH_TOKEN=cct_first.key\n");
  fs.writeFileSync(path.join(jobs, id, "task-key"), `${key}\n`);
}

const hooks = [];
const hook = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { hooks.push(b); s.end("ok"); }); });
await new Promise((r) => hook.listen(0, r));
const { proc: jobd } = await startJobd(path.join(here, "jobd.mjs"), { ...process.env,
  JOBD_TOKEN: "t", JOBD_SLOTS: "1", JOBD_DIR: jobs,
  JOBD_DOCKER: path.join(here, "fake-docker.sh"), FAKE_DOCKER_STATE: state, JOBD_ALLOWED_REPOS: REPO, JOBD_POLL_MS: "150",
  JOBD_NODE_NAME: "node-a", JOBD_GATEWAY_URL: "http://cc-gateway:4000", PORTER_HOOK_URL: `http://127.0.0.1:${hook.address().port}/hook`, PORTER_HOOK_SECRET: "s" });
test.after(() => { jobd.kill(); hook.close(); });
await new Promise((r) => setTimeout(r, 900));
const meta = (id) => JSON.parse(fs.readFileSync(path.join(jobs, id, "meta.json"), "utf8"));

test("restarts a job that a restart cut off", () => {
  const m = meta("job-aaaa1-aaaaaa");
  assert.equal(m.status, "running");
  assert.equal(m.restarts, 1);
  assert.match(fs.readFileSync(path.join(state, "job-aaaa1-aaaaaa"), "utf8"), /^running/);
});

test("reports a failure after the last allowed restart", () => {
  const m = meta("job-bbbb2-bbbbbb");
  assert.equal(m.status, "failed");
  assert.ok(hooks.some((b) => b.includes("job-bbbb2-bbbbbb")));
});

test("a job that ends while the job runner runs is not restarted", async () => {
  fs.writeFileSync(path.join(state, "job-aaaa1-aaaaaa"), "exited 1 false");
  await new Promise((r) => setTimeout(r, 600));
  const m = meta("job-aaaa1-aaaaaa");
  assert.equal(m.status, "failed");
  assert.equal(m.restarts, 1);
});

test("a restart uses the newest task key the job saved", () => {
  assert.equal(meta("job-cccc3-cccccc").status, "running");
  assert.equal(fs.readFileSync(path.join(jobs, "job-cccc3-cccccc", "gateway.env"), "utf8"), `ANTHROPIC_BASE_URL=http://cc-gateway:4000\nANTHROPIC_AUTH_TOKEN=${NEWEST}\n`);
});

test("a job whose newest key ended during the stop is not restarted, and the report says why", () => {
  const m = meta("job-dddd4-dddddd");
  assert.equal(m.status, "failed");
  assert.equal(m.restarts ?? 0, 0);
  assert.match(fs.readFileSync(path.join(jobs, m.id, "report.md"), "utf8"), /task key ended while the job was stopped/);
  assert.equal(fs.existsSync(path.join(jobs, m.id, "task-key")), false);
});
