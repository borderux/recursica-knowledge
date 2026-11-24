// A job's container sees only the job's work folder. A link or a changed file that a job leaves in
// the work folder never changes jobd's files, never reaches a file outside the job, and never
// changes what jobd reports.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { startJobd } from "./test-jobd.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobd-files-"));
const state = path.join(tmp, "docker"), jobs = path.join(tmp, "jobs");
const TOKEN = "t0ken", REPO = "https://github.com/acme/adapter-x";
fs.mkdirSync(state, { recursive: true });

// Files of the job runner's account, outside every job.
const secret = path.join(tmp, "node.env"), profile = path.join(tmp, "profile");
fs.writeFileSync(secret, "JOBD_TOKEN=never-leaves\n");

// A job that an older jobd started, with one folder for jobd's files and the container's files.
// The job's container plants a link at job.log, and the job has used up its restarts.
const OLD = "job-old11-aaaaaa";
fs.mkdirSync(path.join(jobs, OLD), { recursive: true });
fs.writeFileSync(path.join(jobs, OLD, "package.md"), "# Port the new prop");
fs.writeFileSync(path.join(jobs, OLD, "meta.json"), JSON.stringify({ id: OLD, type: "porter", repo: REPO, label: OLD, status: "running", started: new Date(Date.now() - 3600_000).toISOString(), node: "node-a", restarts: 2 }));
fs.symlinkSync(profile, path.join(jobs, OLD, "job.log"));
fs.writeFileSync(path.join(state, OLD), "running 0 false");

const hooks = [];
const hook = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { hooks.push(JSON.parse(b)); s.end("ok"); }); });
await new Promise((r) => hook.listen(0, r));
const { proc: jobd, port: PORT } = await startJobd(path.join(here, "jobd.mjs"), { ...process.env,
  JOBD_TOKEN: TOKEN, JOBD_SLOTS: "5", JOBD_DIR: jobs, JOBD_REPORT_MAX_BYTES: "64",
  JOBD_DOCKER: path.join(here, "fake-docker.sh"), FAKE_DOCKER_STATE: state, JOBD_ALLOWED_REPOS: REPO, JOBD_POLL_MS: "150",
  JOBD_NODE_NAME: "node-a", PORTER_HOOK_URL: `http://127.0.0.1:${hook.address().port}/hook`, PORTER_HOOK_SECRET: "s",
  JOBD_GATEWAY_URL: "http://cc-gateway:4000" });
test.after(() => { jobd.kill(); hook.close(); });

const call = (method, p, body) => fetch(`http://127.0.0.1:${PORT}${p}`, { method,
  headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: body && JSON.stringify(body) });
const pkg = { type: "porter", repo: REPO, label: "v1 mui-v7", package: "# Port the new prop", gateway_key: "cct_eyJhIjoicG9ydGVyIn0.c2lnbmF0dXJl" };
const startJob = async () => { const r = await call("POST", "/jobs", pkg); assert.equal(r.status, 201); return (await r.json()).id; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const work = (id) => path.join(jobs, id, "work");

test("a link at report.md or job.log in the work folder is never followed, and a meta.json there changes nothing", async () => {
  fs.writeFileSync(profile, "original\n");
  const id = await startJob();
  fs.symlinkSync(secret, path.join(work(id), "report.md"));
  fs.symlinkSync(profile, path.join(work(id), "job.log"));
  fs.writeFileSync(path.join(work(id), "meta.json"), JSON.stringify({ id, status: "succeeded", repo: "https://github.com/evil/x", label: "changed" }));

  const report = await call("GET", `/jobs/${id}/report`);
  assert.equal(report.status, 404);
  assert.ok(!(await report.text()).includes("never-leaves"));
  const meta = await (await call("GET", `/jobs/${id}`)).json();
  assert.equal(meta.status, "running");
  assert.equal(meta.repo, REPO);
  assert.equal(meta.label, pkg.label);

  fs.writeFileSync(path.join(state, id), "exited 0 false");
  await wait(600);
  const ended = await (await call("GET", `/jobs/${id}`)).json();
  assert.equal(ended.status, "failed", "a link is no report");
  assert.equal(ended.repo, REPO);
  assert.equal(fs.readFileSync(profile, "utf8"), "original\n", "the file behind the link is unchanged");
  assert.equal(fs.readFileSync(path.join(jobs, id, "job.log"), "utf8").trim(), `log line for ${id}`);
  assert.deepEqual(hooks.find((h) => h.job === id), { event: "porter_job_done", job: id, node: "node-a", label: pkg.label, repo: REPO, status: "failed" });
});

test("a link at job.log in an older jobd's job folder is replaced, never followed", async () => {
  fs.writeFileSync(profile, "original\n");
  fs.writeFileSync(path.join(state, OLD), "exited 1 false");
  await wait(600);
  assert.equal(fs.readFileSync(profile, "utf8"), "original\n");
  assert.ok(!fs.lstatSync(path.join(jobs, OLD, "job.log")).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(jobs, OLD, "job.log"), "utf8").trim(), `log line for ${OLD}`);
  assert.equal((await (await call("GET", `/jobs/${OLD}`)).json()).status, "failed");
});

test("a report over the size cap is refused, and a report under the cap is served", async () => {
  const id = await startJob();
  fs.writeFileSync(path.join(work(id), "report.md"), "x".repeat(65));
  const big = await call("GET", `/jobs/${id}/report`);
  assert.equal(big.status, 413);
  assert.deepEqual(await big.json(), { error: "report_too_large", max_bytes: 64 });
  fs.writeFileSync(path.join(work(id), "report.md"), "PR: https://example/pr/2");
  assert.equal(await (await call("GET", `/jobs/${id}/report`)).text(), "PR: https://example/pr/2");
  fs.writeFileSync(path.join(state, id), "exited 0 false");
  await wait(600);
  assert.equal((await (await call("GET", `/jobs/${id}`)).json()).status, "succeeded");
});

test("a named pipe at report.md never blocks jobd", async () => {
  const id = await startJob();
  assert.equal(spawnSync("mkfifo", [path.join(work(id), "report.md")]).status, 0);
  const r = await call("GET", `/jobs/${id}/report`, undefined);
  assert.equal(r.status, 404);
  assert.equal((await call("GET", "/health")).status, 200);
});
