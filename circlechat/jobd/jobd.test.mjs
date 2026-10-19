import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobd-"));
const state = path.join(tmp, "docker");
const TOKEN = "t0ken", SECRET = "s3cret", REPO = "https://github.com/acme/adapter-x";
const hooks = [];
const hook = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { hooks.push({ h: q.headers, b }); s.end("ok"); }); });
await new Promise((r) => hook.listen(0, r));
const PORT = 17400 + Math.floor(Math.random() * 500);
const jobd = spawn(process.execPath, [path.join(here, "jobd.mjs")], { env: { ...process.env,
  JOBD_PORT: String(PORT), JOBD_HOST: "127.0.0.1", JOBD_TOKEN: TOKEN, JOBD_SLOTS: "1", JOBD_DIR: path.join(tmp, "jobs"),
  JOBD_DOCKER: path.join(here, "fake-docker.sh"), FAKE_DOCKER_STATE: state, JOBD_ALLOWED_REPOS: REPO, JOBD_POLL_MS: "150",
  JOBD_NODE_NAME: "node-a", PORTER_HOOK_URL: `http://127.0.0.1:${hook.address().port}/hook`, PORTER_HOOK_SECRET: SECRET,
  ANTHROPIC_API_KEY: "should-pass-by-name" }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 400));
const call = (method, p, body, auth = TOKEN) => fetch(`http://127.0.0.1:${PORT}${p}`, { method,
  headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" }, body: body && JSON.stringify(body) });
const pkg = { type: "porter", repo: REPO, label: "v1.2.3 mui-v7", package: "# Port the new prop" };

test.after(() => { jobd.kill(); hook.close(); });

test("rejects a wrong token", async () => assert.equal((await call("GET", "/jobs/job-abcdef", null, "nope")).status, 401));
test("rejects a repository outside the allowlist", async () =>
  assert.equal((await call("POST", "/jobs", { ...pkg, repo: "https://github.com/evil/x" })).status, 403));
test("rejects an unknown job type", async () => assert.equal((await call("POST", "/jobs", { ...pkg, type: "shell" })).status, 400));

test("starts a job, refuses a second when full, reports and wakes the agent when the job ends", async () => {
  const r = await call("POST", "/jobs", pkg);
  assert.equal(r.status, 201);
  const { id } = await r.json();
  assert.equal(fs.readFileSync(path.join(tmp, "jobs", id, "package.md"), "utf8"), pkg.package);
  assert.equal((await call("POST", "/jobs", pkg)).status, 429);
  assert.equal((await (await call("GET", `/jobs/${id}`)).json()).status, "running");
  fs.writeFileSync(path.join(tmp, "jobs", id, "report.md"), "PR: https://example/pr/1");
  fs.writeFileSync(path.join(state, id), "exited 0 false");
  await new Promise((r) => setTimeout(r, 600));
  const meta = await (await call("GET", `/jobs/${id}`)).json();
  assert.equal(meta.status, "succeeded");
  assert.equal(await (await call("GET", `/jobs/${id}/report`)).text(), "PR: https://example/pr/1");
  assert.equal(hooks.length, 1);
  const { h, b } = hooks[0];
  const want = "sha256=" + crypto.createHmac("sha256", SECRET).update(h["x-circlechat-timestamp"]).update(".").update(b).digest("hex");
  assert.equal(h["x-circlechat-signature"], want);
  assert.equal(h["x-circlechat-delivery"], `${id}@node-a`);
  assert.deepEqual(JSON.parse(b), { event: "porter_job_done", job: id, node: "node-a", label: "v1.2.3 mui-v7", repo: REPO, status: "succeeded" });
  assert.equal((await call("POST", "/jobs", pkg)).status, 201, "the slot is free again");
});

test("an out-of-memory job is reported as such", async () => {
  await new Promise((r) => setTimeout(r, 300));
  const running = fs.readdirSync(path.join(tmp, "jobs")).map((d) => JSON.parse(fs.readFileSync(path.join(tmp, "jobs", d, "meta.json")))).find((m) => m.status === "running");
  fs.writeFileSync(path.join(state, running.id), "exited 137 true");
  await new Promise((r) => setTimeout(r, 600));
  assert.equal((await (await call("GET", `/jobs/${running.id}`)).json()).status, "out_of_memory");
});
