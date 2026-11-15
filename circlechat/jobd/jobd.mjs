#!/usr/bin/env node
// Job runner: runs long, heavy agent jobs (today: porter-adapter ports) in containers with a
// memory cap, on a machine with room, and wakes the agent that asked when a job ends.
// No dependencies. One per machine; setup-node.sh installs it for every node with a `jobs` block.
//
// Safe by construction: a request names a job TYPE and a repository from an allowlist. The image
// and its command are fixed here, so a request cannot run an arbitrary command. Secrets reach a job
// by name (`-e NAME`), never as text on a command line.
//
// A job holds no cloud key. The job sends its model requests to the stack's gateway
// (JOBD_GATEWAY_URL) with the gateway key for the job's task, which the request brings. The job
// gets the key from a file in the job's folder (`--env-file`), and the file goes when the job ends.
// With JOBD_GITHUB_TOKEN_URL, the job gets Porter's GitHub token for the job's repo from the
// stack's token service (github/token-service.mjs), with the same task key. The job holds no
// private key and no long-lived token.
//
// A task key lasts 4 hours. A running port job renews the key at the gateway and keeps the newest
// key in task-key in the job's folder. A restart of the job uses that newest key. A port job runs
// for JOBD_MAX_HOURS (96) at most: jobd then stops the job, and the job's report says so.
//
// Two job types:
//   porter  a porter-adapter port (porter-job/run.sh), in one of the JOBD_SLOTS slots
//   check   the check job (porter-job/check.sh): one tiny model request through the gateway, and
//           the token service's confirmation that the agent may get a token for the repo. A check
//           job never clones, pushes or opens a pull request. A check job takes no slot, and one
//           check job runs at a time. Porter starts a check job, or an admin with check-job.sh.
//
// Every hour (JOBD_STATUS_MS), jobd sends one status line per running port to this computer's
// cluster agent, over loopback (JOBD_STATUS_URL): the job, the node, how long the job has run and
// the job's latest progress. The cluster agent posts each line as plain text in the cluster's Slack
// channel. jobd holds no Slack token: the cluster agent's status token (JOBD_STATUS_TOKEN_FILE,
// written by the cluster agent) only posts a status line.
//
//   GET    /health                 { node, slots, running }
//   POST   /jobs                   { type: "porter", repo, label, package, gateway_key }  -> 201 { id } | 429 when full
//                                  { type: "check", repo, label, gateway_key }  -> 201 { id } | 429 check_running
//   GET    /jobs/:id               { id, type, label, repo, status, exit_code, oom, checks? }
//                                  status: running, succeeded, failed, out_of_memory, timed_out or stopped
//   GET    /jobs/:id/report        the job's report.md
//   GET    /jobs/:id/log?tail=200  the job's output
//   DELETE /jobs/:id               stop the job
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const env = process.env;
const C = {
  port: Number(env.JOBD_PORT ?? 7400),
  // The addresses jobd listens on, comma-separated: loopback and the computer's Tailscale address
  // (setup-node.sh), never every interface.
  hosts: (env.JOBD_HOST ?? "127.0.0.1").split(",").map((s) => s.trim()).filter(Boolean),
  token: env.JOBD_TOKEN ?? "",
  slots: Number(env.JOBD_SLOTS ?? 1),
  memoryGb: Number(env.JOBD_MEMORY_GB ?? 12),
  cpus: env.JOBD_CPUS ?? "",
  dir: env.JOBD_DIR ?? path.join(os.homedir(), ".recursica-jobs"),
  docker: env.JOBD_DOCKER ?? "docker",
  node: env.JOBD_NODE_NAME ?? os.hostname(),
  repos: new Set((env.JOBD_ALLOWED_REPOS ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
  passEnv: (env.JOBD_PASS_ENV ?? "PORTER_MODEL")
    .split(",").map((s) => s.trim()).filter(Boolean),
  gateway: env.JOBD_GATEWAY_URL ?? "",
  githubTokenUrl: env.JOBD_GITHUB_TOKEN_URL ?? "",
  hookUrl: env.PORTER_HOOK_URL ?? "",
  hookSecret: env.PORTER_HOOK_SECRET ?? "",
  pollMs: Number(env.JOBD_POLL_MS ?? 30000),
  maxHours: Number(env.JOBD_MAX_HOURS ?? 96),
  statusMs: Number(env.JOBD_STATUS_MS ?? 3_600_000),
  statusUrl: env.JOBD_STATUS_URL ?? "http://127.0.0.1:7500/job-status",
  statusTokenFile: env.JOBD_STATUS_TOKEN_FILE ?? path.join(os.homedir(), ".recursica-job-status.token"),
};
const HOUR = 3_600_000;
const IMAGE = env.JOBD_PORTER_IMAGE ?? "recursica/porter-job";
// slot: the job takes one of the JOBD_SLOTS slots, and a restart starts the job again.
const TYPES = {
  porter: { image: IMAGE, package: true, slot: true },
  check: { image: IMAGE, entrypoint: "/porter/check.sh", memoryGb: 1, readOnly: true },
};
if (!C.token) { console.error("JOBD_TOKEN is required"); process.exit(1); }
// The job folders hold each job's task key. Only this computer's owner reads them.
fs.mkdirSync(C.dir, { recursive: true, mode: 0o700 });
fs.chmodSync(C.dir, 0o700);

const run = (args) => new Promise((res) => execFile(C.docker, args, { maxBuffer: 16 << 20 }, (e, out, err) => res({ ok: !e, out: String(out), err: String(err) })));
const ID = /^job-[0-9a-z-]{6,64}$/;
const TASK_KEY = /^cct_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const jobDir = (id) => path.join(C.dir, id);
const readMeta = (id) => { try { return JSON.parse(fs.readFileSync(path.join(jobDir(id), "meta.json"), "utf8")); } catch { return null; } };
const writeMeta = (m) => fs.writeFileSync(path.join(jobDir(m.id), "meta.json"), JSON.stringify(m, null, 2));
const allJobs = () => fs.readdirSync(C.dir).filter((d) => ID.test(d)).map(readMeta).filter(Boolean);
const running = () => allJobs().filter((m) => m.status === "running");
const runningPorts = () => running().filter((m) => TYPES[m.type]?.slot);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const gatewayEnv = (key) => `ANTHROPIC_BASE_URL=${C.gateway}\nANTHROPIC_AUTH_TOKEN=${key}\n${C.githubTokenUrl ? `GITHUB_TOKEN_URL=${C.githubTokenUrl}\n` : ""}`;
const appendReport = (id, text) => {
  const f = path.join(jobDir(id), "report.md");
  fs.writeFileSync(f, fs.existsSync(f) && fs.statSync(f).size ? `${fs.readFileSync(f, "utf8").trimEnd()}\n\n${text}\n` : `${text}\n`);
};

// The newest task key a port job saved (task-key in the job's folder) goes in gateway.env, for a
// restart of the job. Returns the key's end time, or null when the job saved no key.
export function useNewestKey(id) {
  let key = "";
  try { key = fs.readFileSync(path.join(jobDir(id), "task-key"), "utf8").trim(); } catch { return null; }
  if (!TASK_KEY.test(key)) return null;
  fs.writeFileSync(path.join(jobDir(id), "gateway.env"), gatewayEnv(key), { mode: 0o600 });
  try { return JSON.parse(Buffer.from(key.slice(4, key.indexOf(".")), "base64url").toString("utf8")).exp * 1000 || null; } catch { return null; }
}
const dropKeys = (id) => { for (const f of ["gateway.env", "task-key"]) fs.rmSync(path.join(jobDir(id), f), { force: true }); };

function authorized(req) {
  const got = Buffer.from(String(req.headers.authorization ?? ""));
  const want = Buffer.from(`Bearer ${C.token}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// The same signed webhook CircleChat's workflows accept: sha256 HMAC of "<timestamp>.<body>".
export async function notify(payload, delivery) {
  if (!C.hookUrl || !C.hookSecret) return;
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = "sha256=" + crypto.createHmac("sha256", C.hookSecret).update(ts).update(".").update(body).digest("hex");
  try {
    const r = await fetch(C.hookUrl, { method: "POST", body, headers: {
      "content-type": "application/json", "x-circlechat-delivery": delivery, "x-circlechat-timestamp": ts, "x-circlechat-signature": sig } });
    if (!r.ok) console.error(`notify ${delivery}: ${r.status}`);
  } catch (e) { console.error(`notify ${delivery}: ${e.message}`); }
}

// When this process started. A job that started before this moment, and whose container is no
// longer running with no report written, was cut off by a restart of the computer or of Docker.
const STARTED = Date.now();
const MAX_RESTARTS = Number(env.JOBD_MAX_RESTARTS ?? 2);

// With JOBD_NETWORK (a closed Docker network) and JOBD_PROXY (the outgoing filter), a port job
// reaches only the sites the filter allows.
function networkArgs() {
  if (!env.JOBD_NETWORK) return [];
  const p = env.JOBD_PROXY;
  // The gateway on this computer sits on the job network, so the job reaches it without the filter.
  const direct = ["NO_PROXY", "no_proxy"].flatMap((k) => ["-e", `${k}=cc-gateway,localhost,127.0.0.1`]);
  return ["--network", env.JOBD_NETWORK, "--dns", "127.0.0.1", ...(p ? ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"].flatMap((k) => ["-e", `${k}=${p}`]).concat(["-e", "NODE_USE_ENV_PROXY=1"], direct) : [])];
}

function containerArgs(id, repo, typeName) {
  const type = TYPES[typeName];
  const gb = type.memoryGb ?? C.memoryGb;
  return ["run", "-d", "--name", id, ...networkArgs(), "--memory", `${gb}g`, "--memory-swap", `${gb}g`,
    ...(C.cpus ? ["--cpus", C.cpus] : []),
    ...(type.readOnly ? ["--read-only", "--tmpfs", "/tmp"] : []),
    ...(type.entrypoint ? ["--entrypoint", type.entrypoint] : []),
    "-v", `${jobDir(id)}:/work`, "-e", `TARGET_REPO=${repo}`, "-e", "PORTER_REPORT=/work/report.md",
    "--env-file", path.join(jobDir(id), "gateway.env"),
    ...C.passEnv.flatMap((n) => (env[n] !== undefined ? ["-e", n] : [])), type.image];
}

async function start(body) {
  const type = TYPES[body?.type];
  if (!type) return [400, { error: "unknown_job_type" }];
  if (!C.repos.has(body.repo)) return [403, { error: "repo_not_allowed", allowed: [...C.repos] }];
  if (type.package && (typeof body.package !== "string" || !body.package.trim() || body.package.length > 200_000)) return [400, { error: "bad_package" }];
  if (!TASK_KEY.test(body.gateway_key ?? "")) return [400, { error: "gateway_key_required", detail: "Send the gateway key for the job's task (POST /task-key on the gateway)." }];
  if (!C.gateway) return [500, { error: "no_gateway", detail: "JOBD_GATEWAY_URL is not set. Rerun setup-node.sh." }];
  if (type.slot && runningPorts().length >= C.slots) return [429, { error: "full", slots: C.slots }];
  if (!type.slot && running().some((m) => m.type === body.type)) return [429, { error: "check_running", detail: "One check job runs at a time. Try again in a few minutes." }];
  const id = `job-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const dir = jobDir(id);
  fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
  fs.chmodSync(dir, 0o777);  // the container's user writes here
  if (type.package) fs.writeFileSync(path.join(dir, "package.md"), body.package);
  fs.writeFileSync(path.join(dir, "gateway.env"), gatewayEnv(body.gateway_key), { mode: 0o600 });
  const label = String(body.label ?? "").slice(0, 120);
  const r = await run(containerArgs(id, body.repo, body.type));
  if (!r.ok) { fs.rmSync(dir, { recursive: true, force: true }); return [500, { error: "start_failed", detail: r.err.slice(0, 400) }]; }
  const started = new Date().toISOString();
  writeMeta({ id, type: body.type, repo: body.repo, label, status: "running", started, first_started: started, node: C.node });
  console.log(`started ${id} ${body.type === "porter" ? label : `${body.type} ${label}`}`.trimEnd());
  return [201, { id, node: C.node }];
}

// The check job's parts, in the order check.sh runs them.
const CHECK_PARTS = ["image", "gateway", "token"];

async function reap() {
  for (const m of running()) {
    const type = TYPES[m.type];
    // A port job runs for C.maxHours at most, counted from the job's first start.
    if (type?.slot && !m.timed_out && Date.now() - Date.parse(m.first_started ?? m.started) >= C.maxHours * HOUR) {
      m.timed_out = true;
      writeMeta(m);
      console.log(`stopping ${m.id}: the job reached the ${C.maxHours}-hour limit`);
      await run(["stop", "-t", "30", m.id]);
    }
    const r = await run(["inspect", "-f", "{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}", m.id]);
    const [state, code, oom] = r.ok ? r.out.trim().split(" ") : ["missing", "-1", "false"];
    if (state === "running" || state === "created") continue;
    const logs = await run(["logs", "--tail", "2000", m.id]);
    fs.writeFileSync(path.join(jobDir(m.id), "job.log"), logs.out + logs.err);
    await run(["rm", "-f", m.id]);
    const hasReport = fs.existsSync(path.join(jobDir(m.id), "report.md"));
    // A restart cut the job off: start the job again from the saved package, up to MAX_RESTARTS
    // times, instead of reporting a failure the job never had. The restart uses the newest key.
    const interrupted = !hasReport && oom !== "true" && !m.timed_out && Date.parse(m.started) < STARTED;
    if (interrupted && (m.restarts ?? 0) < MAX_RESTARTS && type?.slot) {
      const ends = useNewestKey(m.id);
      if (ends !== null && ends <= Date.now()) {
        appendReport(m.id, "The job's task key ended while the job was stopped, so jobd did not start the job again. Send the job again with a new task key.");
      } else {
        const again = await run(containerArgs(m.id, m.repo, m.type));
        if (again.ok) {
          m.restarts = (m.restarts ?? 0) + 1;
          m.started = new Date().toISOString();
          writeMeta(m);
          console.log(`restarted ${m.id} after an interruption (restart ${m.restarts} of ${MAX_RESTARTS})`);
          continue;
        }
      }
    }
    dropKeys(m.id);
    m.exit_code = Number(code); m.oom = oom === "true"; m.ended = new Date().toISOString();
    if (m.timed_out) appendReport(m.id, `jobd stopped this job after ${C.maxHours} hours, the most a port job may run. The job's pull request, if the job opened one, holds the work so far.`);
    if (m.type === "check") {
      m.checks = readJson(path.join(jobDir(m.id), "check.json")) ?? {};
      for (const part of CHECK_PARTS) {
        const c = m.checks[part];
        console.log(`check ${m.id} ${part} ${c?.ok ? "pass" : "fail"} (${c?.detail ?? "the check job wrote no result"})`);
      }
    }
    const checksPass = m.type === "check" && CHECK_PARTS.every((p) => m.checks[p]?.ok);
    m.status = m.oom ? "out_of_memory" : m.timed_out ? "timed_out"
      : m.type === "check" ? (checksPass && m.exit_code === 0 ? "succeeded" : "failed")
      : m.exit_code === 0 && hasReport ? "succeeded" : "failed";
    writeMeta(m);
    console.log(`ended ${m.id} ${m.status}`);
    const event = m.type === "check" ? "check_job_done" : "porter_job_done";
    await notify({ event, job: m.id, node: C.node, label: m.label, repo: m.repo, status: m.status, ...(m.type === "check" ? { checks: m.checks } : {}) }, `${m.id}@${C.node}`);
  }
}

// The port job's latest progress: the newest text Claude Code wrote in the job's stream
// (stream.jsonl in the job's folder), on one line, 200 characters at most. Null before the first.
export function progressOf(id) {
  let text = "";
  try {
    const f = path.join(jobDir(id), "stream.jsonl");
    const size = fs.statSync(f).size, n = Math.min(size, 256 * 1024);
    const fd = fs.openSync(f, "r");
    try { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, size - n); text = b.toString("utf8"); } finally { fs.closeSync(fd); }
  } catch { return null; }
  for (const line of text.split("\n").reverse()) {
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o?.type !== "assistant") continue;
    const said = (o.message?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
    if (said) return said.length > 200 ? `${said.slice(0, 199)}…` : said;
  }
  return null;
}

// "5 h 12 min", or "12 min" under an hour.
export const duration = (ms) => { const min = Math.floor(ms / 60_000); return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`; };

// One status line per running port, sent to the cluster agent, which escapes and posts each line.
// Returns the count of lines the cluster agent took.
export async function postStatus(now = Date.now()) {
  const ports = runningPorts();
  if (!ports.length) return 0;
  let token = "";
  try { token = fs.readFileSync(C.statusTokenFile, "utf8").trim(); } catch { /* the line below says so */ }
  if (!token) { console.error(`status post: no token in ${C.statusTokenFile}. The cluster agent writes the token: rerun install-cluster.sh.`); return 0; }
  let sent = 0;
  for (const m of ports) {
    const text = `Port job ${m.id} on ${C.node}, ${m.label || m.repo}: running for ${duration(now - Date.parse(m.first_started ?? m.started))}. Latest progress: ${progressOf(m.id) ?? "no progress yet"}`;
    try {
      const r = await fetch(C.statusUrl, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (r.ok) sent++;
      else console.error(`status post for ${m.id}: the cluster agent answered ${r.status}`);
    } catch (e) { console.error(`status post for ${m.id}: ${e.message}`); }
  }
  if (sent) console.log(`status posted for ${sent} running port job(s)`);
  return sent;
}

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

export const handle = async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/health") return send(res, 200, { node: C.node, slots: C.slots, running: running().length });
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
    if (req.method === "POST" && u.pathname === "/jobs") {
      let raw = ""; for await (const c of req) { raw += c; if (raw.length > 300_000) return send(res, 413, { error: "too_large" }); }
      let body; try { body = JSON.parse(raw); } catch { return send(res, 400, { error: "bad_json" }); }
      const [code, out] = await start(body); return send(res, code, out);
    }
    const m = u.pathname.match(/^\/jobs\/([^/]+)(?:\/(report|log))?$/);
    if (!m || !ID.test(m[1])) return send(res, 404, { error: "not_found" });
    const meta = readMeta(m[1]);
    if (!meta) return send(res, 404, { error: "not_found" });
    if (req.method === "DELETE" && !m[2]) { await run(["rm", "-f", meta.id]); dropKeys(meta.id); meta.status = "stopped"; writeMeta(meta); return send(res, 200, meta); }
    if (!m[2]) return send(res, 200, meta);
    if (m[2] === "report") {
      const f = path.join(jobDir(meta.id), "report.md");
      return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f, "utf8"), "text/markdown") : send(res, 404, { error: "no_report_yet" });
    }
    const tail = Math.min(Number(u.searchParams.get("tail") ?? 200), 2000);
    const live = meta.status === "running" ? await run(["logs", "--tail", String(tail), meta.id]) : null;
    const text = live ? live.out + live.err : (fs.existsSync(path.join(jobDir(meta.id), "job.log")) ? fs.readFileSync(path.join(jobDir(meta.id), "job.log"), "utf8") : "");
    return send(res, 200, text.split("\n").slice(-tail).join("\n"), "text/plain");
  } catch (e) { send(res, 500, { error: "internal", detail: e.message }); }
};
export const server = http.createServer(handle);

if (import.meta.url === `file://${process.argv[1]}`) {
  // One server for each address. A missing address, such as Tailscale's before Tailscale starts,
  // stops jobd, and the service starts jobd again.
  for (const [i, host] of C.hosts.entries()) {
    const srv = i === 0 ? server : http.createServer(handle);
    srv.on("error", (e) => { console.error(`jobd cannot listen on ${host}:${C.port}: ${e.message}`); process.exit(1); });
    srv.listen(C.port, host, () => console.log(`jobd ${C.node} on ${host}:${C.port}, ${C.slots} slot(s), ${C.memoryGb} GB each`));
  }
  setInterval(() => reap().catch((e) => console.error(e.message)), C.pollMs);
  setInterval(() => postStatus().catch((e) => console.error(e.message)), C.statusMs);
}
