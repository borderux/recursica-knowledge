// The port job's task key helper (task-key.mjs) and the check job (check.sh), with stand-ins for
// the gateway, the token service and Claude Code.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const here = path.dirname(new URL(import.meta.url).pathname);
const keyEnding = (ms, tag = "a") => `cct_${Buffer.from(JSON.stringify({ v: 2, a: "porter", t: "t-sub", tag, exp: Math.floor(ms / 1000) })).toString("base64url")}.c2ln`;
const has = (cmd) => { try { execFileSync("sh", ["-c", `command -v ${cmd}`]); return true; } catch { return false; } };

// The gateway and token service stand-in: each route answers as `answers[route]` says.
const seen = [];
const answers = {};
const srv = http.createServer((q, s) => {
  let b = ""; q.on("data", (d) => (b += d));
  q.on("end", () => {
    seen.push({ url: q.url, auth: q.headers.authorization, check: q.headers["x-recursica-check"], body: b ? JSON.parse(b) : null });
    const [code, body] = answers[q.url] ?? [404, { error: "not_found" }];
    s.writeHead(code, { "content-type": "application/json" }); s.end(JSON.stringify(body));
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const URL_ = `http://127.0.0.1:${srv.address().port}`;
test.after(() => srv.close());

const run = (cmd, args, env) => new Promise((resolve) => {
  const p = spawn(cmd, args, { env: { PATH: process.env.PATH, ...env } });
  let out = "", err = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("exit", (code) => resolve({ code, out, err }));
});
const work = () => fs.mkdtempSync(path.join(os.tmpdir(), "porter-job-"));
const taskKey = (dir, env = {}) => run(process.execPath, [path.join(here, "task-key.mjs")], { TASK_KEY_FILE: path.join(dir, "task-key"), ANTHROPIC_BASE_URL: URL_, ...env });

test("the task key helper saves jobd's key and renews no key with more than an hour left", async () => {
  const d = work(), k = keyEnding(Date.now() + 3 * 3600_000);
  const before = seen.length;
  const r = await taskKey(d, { JOB_TASK_KEY: k });
  assert.equal(r.out.trim(), k);
  assert.equal(fs.readFileSync(path.join(d, "task-key"), "utf8").trim(), k);
  assert.equal(fs.statSync(path.join(d, "task-key")).mode & 0o777, 0o644, "jobd, another user, reads the key for a restart");
  assert.equal(seen.length, before, "no renewal");
});

test("the task key helper renews a key with less than an hour left, and keeps the newest key", async () => {
  const d = work(), old = keyEnding(Date.now() + 30 * 60_000), fresh = keyEnding(Date.now() + 4 * 3600_000, "b");
  fs.writeFileSync(path.join(d, "task-key"), `${old}\n`);
  answers["/task-key/renew"] = [200, { key: fresh, task: "t-sub" }];
  const r = await taskKey(d);
  assert.equal(r.out.trim(), fresh);
  assert.equal(seen.at(-1).auth, `Bearer ${old}`);
  assert.equal(fs.readFileSync(path.join(d, "task-key"), "utf8").trim(), fresh);
});

test("a refused renewal keeps the old key and records the reason for the report", async () => {
  const d = work(), old = keyEnding(Date.now() + 10 * 60_000);
  fs.writeFileSync(path.join(d, "task-key"), `${old}\n`);
  answers["/task-key/renew"] = [401, { error: { type: "task_closed", message: "Task t-sub is closed." } }];
  const r = await taskKey(d);
  assert.equal(r.out.trim(), old);
  assert.match(fs.readFileSync(path.join(d, "key-ended"), "utf8"), /^task_closed: Task t-sub is closed\./);
});

// check.sh with a stand-in for Claude Code on PATH.
function fakeClaude(works) {
  const bin = work();
  fs.writeFileSync(path.join(bin, "claude"), works ? "#!/bin/sh\necho '2.1.325 (Claude Code)'\n" : "#!/bin/sh\necho 'Error: claude native binary not installed.' >&2\nexit 1\n", { mode: 0o755 });
  return bin;
}
const check = (dir, { claude = true, tokenUrl = URL_ } = {}) => run("bash", [path.join(here, "check.sh")], {
  PATH: `${fakeClaude(claude)}:${process.env.PATH}`, WORK: dir, TARGET_REPO: "https://github.com/acme/adapter-x",
  ANTHROPIC_BASE_URL: URL_, ANTHROPIC_AUTH_TOKEN: "cct_check.key", ...(tokenUrl ? { GITHUB_TOKEN_URL: tokenUrl } : {}) });
const tools = has("jq") && has("curl");

test("a check passes each part, never asks for a token, and reports each part", { skip: !tools && "needs jq and curl" }, async () => {
  answers["/v1/messages"] = [200, { model: "qwen3:32b", content: [{ type: "text", text: "ok" }] }];
  answers["/check"] = [200, { ok: true, agent: "porter", task: "t-sub", repo: "acme/adapter-x", installation_id: 20, permissions: { contents: "write", pull_requests: "write" } }];
  const d = work(), before = seen.length;
  const r = await check(d);
  assert.equal(r.code, 0, r.err);
  const c = JSON.parse(fs.readFileSync(path.join(d, "check.json"), "utf8"));
  assert.deepEqual([c.image.ok, c.gateway.ok, c.token.ok], [true, true, true]);
  assert.equal(c.image.detail, "Claude Code 2.1.325 (Claude Code)");
  assert.match(c.gateway.detail, /^200 in \d+\.\d s, model qwen3:32b$/);
  assert.equal(c.token.detail, "porter may get a token for acme/adapter-x (installation 20, contents write, pull_requests write)");
  const calls = seen.slice(before);
  assert.deepEqual(calls.map((x) => x.url), ["/v1/messages", "/check"], "no /token, no clone");
  assert.ok(calls.every((x) => x.auth === "Bearer cct_check.key"));
  assert.equal(calls[0].check, "1");
  assert.equal(calls[0].body.max_tokens, 16);
  assert.deepEqual(calls[1].body, { repo: "https://github.com/acme/adapter-x" });
  for (const f of ["check.json", "report.md"]) assert.equal(fs.statSync(path.join(d, f)).mode & 0o044, 0o044, `jobd, another user, reads ${f}`);
  assert.match(fs.readFileSync(path.join(d, "report.md"), "utf8"), /^Check job for https:\/\/github\.com\/acme\/adapter-x\n\n- image: pass/);
});

test("a check fails the part that fails, and says what to do", { skip: !tools && "needs jq and curl" }, async () => {
  answers["/v1/messages"] = [401, { error: { type: "key_expired", message: "The task key has expired." } }];
  delete answers["/check"];
  const d = work();
  const r = await check(d, { claude: false });
  assert.equal(r.code, 1);
  const c = JSON.parse(fs.readFileSync(path.join(d, "check.json"), "utf8"));
  assert.match(c.image.detail, /^Claude Code does not start in the image\. Rerun setup-node\.sh to build the image again\. The error: Error: claude native binary not installed\.$/);
  assert.equal(c.gateway.detail, "401 key_expired The task key has expired.");
  assert.equal(c.token.detail, "the token service has no /check: upgrade the control computer (setup-host.sh)");
  answers["/check"] = [200, { ok: false, checks: { key: true, app: true, repo_listed: true, private_key: true, installation: "the app is not installed on acme/adapter-x", permissions: null } }];
  await check(d);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, "check.json"), "utf8")).token.detail, "installation: the app is not installed on acme/adapter-x");
  await check(d, { tokenUrl: "" });
  assert.match(JSON.parse(fs.readFileSync(path.join(d, "check.json"), "utf8")).token.detail, /no token service/);
});
