// A port job that a restart cut off starts again, up to JOBD_MAX_RESTARTS times.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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

const hooks = [];
const hook = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { hooks.push(b); s.end("ok"); }); });
await new Promise((r) => hook.listen(0, r));
const PORT = 18000 + Math.floor(Math.random() * 500);
const jobd = spawn(process.execPath, [path.join(here, "jobd.mjs")], { env: { ...process.env,
  JOBD_PORT: String(PORT), JOBD_HOST: "127.0.0.1", JOBD_TOKEN: "t", JOBD_SLOTS: "1", JOBD_DIR: jobs,
  JOBD_DOCKER: path.join(here, "fake-docker.sh"), FAKE_DOCKER_STATE: state, JOBD_ALLOWED_REPOS: REPO, JOBD_POLL_MS: "150",
  JOBD_NODE_NAME: "node-a", PORTER_HOOK_URL: `http://127.0.0.1:${hook.address().port}/hook`, PORTER_HOOK_SECRET: "s" }, stdio: "ignore" });
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
