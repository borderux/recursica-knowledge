// The 96-hour limit of a port job, and the hourly status of running ports in Slack.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { startJobd } from "./test-jobd.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobd-limits-"));
const state = path.join(tmp, "docker");
const jobs = path.join(tmp, "jobs");
const REPO = "https://github.com/acme/adapter-x";
const H = 3_600_000;
fs.mkdirSync(state, { recursive: true });

// Two running port jobs: one that started 97 hours ago, and one that started 5 hours ago.
function runningJob(id, hoursAgo, label) {
  fs.mkdirSync(path.join(jobs, id), { recursive: true });
  const first = new Date(Date.now() - hoursAgo * H).toISOString();
  // The newer start is a restart: the limit counts from the first start.
  fs.writeFileSync(path.join(jobs, id, "meta.json"), JSON.stringify({ id, type: "porter", repo: REPO, label, status: "running", started: new Date().toISOString(), first_started: first, node: "node-a" }));
  fs.writeFileSync(path.join(jobs, id, "gateway.env"), "ANTHROPIC_AUTH_TOKEN=cct_x.y\n");
  fs.writeFileSync(path.join(jobs, id, "task-key"), "cct_x.y\n");
  fs.writeFileSync(path.join(state, id), "running 0 false");
}
runningJob("job-old11-aaaaaa", 97, "v1.2.3 mui-v7");
runningJob("job-new22-bbbbbb", 5, "v1.2.3 <!channel> beam");
fs.writeFileSync(path.join(jobs, "job-new22-bbbbbb", "stream.jsonl"), [
  { type: "system", subtype: "init" },
  { type: "assistant", message: { content: [{ type: "text", text: "Read the package." }] } },
  { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash" }] } },
  { type: "assistant", message: { content: [{ type: "text", text: "Ran the adapter tests:\n3 failures left <@U123>." }] } },
  { type: "user", message: { content: [{ type: "tool_result" }] } },
].map((o) => JSON.stringify(o)).join("\n") + "\n");

const hooks = [], posts = [];
const hook = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { hooks.push(JSON.parse(b)); s.end("ok"); }); });
const slack = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { posts.push({ url: q.url, auth: q.headers.authorization, body: JSON.parse(b) }); s.setHeader("content-type", "application/json"); s.end('{"ok":true}'); }); });
await new Promise((r) => hook.listen(0, r));
await new Promise((r) => slack.listen(0, r));
const { proc: jobd } = await startJobd(path.join(here, "jobd.mjs"), { ...process.env,
  JOBD_TOKEN: "t", JOBD_SLOTS: "2", JOBD_DIR: jobs, JOBD_DOCKER: path.join(here, "fake-docker.sh"), FAKE_DOCKER_STATE: state,
  JOBD_ALLOWED_REPOS: REPO, JOBD_POLL_MS: "150", JOBD_NODE_NAME: "node-a", JOBD_STATUS_MS: "700",
  PORTER_HOOK_URL: `http://127.0.0.1:${hook.address().port}/hook`, PORTER_HOOK_SECRET: "s",
  JOBD_SLACK_API: `http://127.0.0.1:${slack.address().port}/api`, SLACK_BOT_TOKEN: "xoxb-test", SLACK_CHANNEL_ID: "C0TEST", SLACK_ICON: ":desktop_computer:" });
test.after(() => { jobd.kill(); hook.close(); slack.close(); });
await new Promise((r) => setTimeout(r, 1200));
const meta = (id) => JSON.parse(fs.readFileSync(path.join(jobs, id, "meta.json"), "utf8"));

test("jobd stops a port job at the 96-hour limit, and the job's report says so", () => {
  const m = meta("job-old11-aaaaaa");
  assert.equal(m.status, "timed_out");
  assert.match(fs.readFileSync(path.join(jobs, m.id, "report.md"), "utf8"), /^jobd stopped this job after 96 hours, the most a port job may run\./);
  assert.equal(fs.existsSync(path.join(jobs, m.id, "gateway.env")), false, "the key files go");
  assert.equal(fs.existsSync(path.join(jobs, m.id, "task-key")), false);
  assert.deepEqual(hooks.find((h) => h.job === m.id), { event: "porter_job_done", job: m.id, node: "node-a", label: "v1.2.3 mui-v7", repo: REPO, status: "timed_out" });
  assert.equal(meta("job-new22-bbbbbb").status, "running", "a job under the limit keeps running");
});

test("jobd posts each running port's status in the cluster's channel, with the latest progress and no mention", () => {
  assert.ok(posts.length >= 1);
  const p = posts.at(-1);
  assert.equal(p.url, "/api/chat.postMessage");
  assert.equal(p.auth, "Bearer xoxb-test");
  assert.deepEqual([p.body.channel, p.body.username, p.body.icon_emoji], ["C0TEST", "node-a", ":desktop_computer:"]);
  assert.equal(p.body.text, "Port jobs running on node-a: 1\n"
    + "• job-new22-bbbbbb on node-a, v1.2.3 &lt;!channel&gt; beam: running for 5 h 0 min. Latest progress: Ran the adapter tests: 3 failures left &lt;@U123&gt;.");
});

test("jobd posts nothing while no port runs", async () => {
  fs.writeFileSync(path.join(jobs, "job-new22-bbbbbb", "report.md"), "PR: https://example/pr/2");
  fs.writeFileSync(path.join(state, "job-new22-bbbbbb"), "exited 0 false");
  await new Promise((r) => setTimeout(r, 400));
  const n = posts.length;
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(posts.length, n);
});
