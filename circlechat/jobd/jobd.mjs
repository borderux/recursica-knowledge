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
//
//   GET    /health                 { node, slots, running }
//   POST   /jobs                   { type: "porter", repo, label, package, gateway_key }  -> 201 { id } | 429 when full
//   GET    /jobs/:id               { id, label, repo, status, exit_code, oom }
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
  host: env.JOBD_HOST ?? "0.0.0.0",
  token: env.JOBD_TOKEN ?? "",
  slots: Number(env.JOBD_SLOTS ?? 1),
  memoryGb: Number(env.JOBD_MEMORY_GB ?? 12),
  cpus: env.JOBD_CPUS ?? "",
  dir: env.JOBD_DIR ?? path.join(os.homedir(), ".recursica-jobs"),
  docker: env.JOBD_DOCKER ?? "docker",
  node: env.JOBD_NODE_NAME ?? os.hostname(),
  repos: new Set((env.JOBD_ALLOWED_REPOS ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
  passEnv: (env.JOBD_PASS_ENV ?? "PORTER_GITHUB_PAT,PORTER_GIT_NAME,PORTER_GIT_EMAIL,PORTER_MODEL")
    .split(",").map((s) => s.trim()).filter(Boolean),
  gateway: env.JOBD_GATEWAY_URL ?? "",
  hookUrl: env.PORTER_HOOK_URL ?? "",
  hookSecret: env.PORTER_HOOK_SECRET ?? "",
  pollMs: Number(env.JOBD_POLL_MS ?? 30000),
};
const TYPES = { porter: { image: env.JOBD_PORTER_IMAGE ?? "recursica/porter-job" } };
if (!C.token) { console.error("JOBD_TOKEN is required"); process.exit(1); }
fs.mkdirSync(C.dir, { recursive: true });

const run = (args) => new Promise((res) => execFile(C.docker, args, { maxBuffer: 16 << 20 }, (e, out, err) => res({ ok: !e, out: String(out), err: String(err) })));
const ID = /^job-[0-9a-z-]{6,64}$/;
const TASK_KEY = /^cct_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const jobDir = (id) => path.join(C.dir, id);
const readMeta = (id) => { try { return JSON.parse(fs.readFileSync(path.join(jobDir(id), "meta.json"), "utf8")); } catch { return null; } };
const writeMeta = (m) => fs.writeFileSync(path.join(jobDir(m.id), "meta.json"), JSON.stringify(m, null, 2));
const allJobs = () => fs.readdirSync(C.dir).filter((d) => ID.test(d)).map(readMeta).filter(Boolean);
const running = () => allJobs().filter((m) => m.status === "running");

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

function containerArgs(id, repo, image) {
  return ["run", "-d", "--name", id, ...networkArgs(), "--memory", `${C.memoryGb}g`, "--memory-swap", `${C.memoryGb}g`,
    ...(C.cpus ? ["--cpus", C.cpus] : []),
    "-v", `${jobDir(id)}:/work`, "-e", `TARGET_REPO=${repo}`, "-e", "PORTER_REPORT=/work/report.md",
    "--env-file", path.join(jobDir(id), "gateway.env"),
    ...C.passEnv.flatMap((n) => (env[n] !== undefined ? ["-e", n] : [])), image];
}

async function start(body) {
  const type = TYPES[body?.type];
  if (!type) return [400, { error: "unknown_job_type" }];
  if (!C.repos.has(body.repo)) return [403, { error: "repo_not_allowed", allowed: [...C.repos] }];
  if (typeof body.package !== "string" || !body.package.trim() || body.package.length > 200_000) return [400, { error: "bad_package" }];
  if (!TASK_KEY.test(body.gateway_key ?? "")) return [400, { error: "gateway_key_required", detail: "Send the gateway key for the job's task (POST /task-key on the gateway)." }];
  if (!C.gateway) return [500, { error: "no_gateway", detail: "JOBD_GATEWAY_URL is not set. Rerun setup-node.sh." }];
  if (running().length >= C.slots) return [429, { error: "full", slots: C.slots }];
  const id = `job-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const dir = jobDir(id);
  fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
  fs.chmodSync(dir, 0o777);  // the container's user writes here
  fs.writeFileSync(path.join(dir, "package.md"), body.package);
  fs.writeFileSync(path.join(dir, "gateway.env"), `ANTHROPIC_BASE_URL=${C.gateway}\nANTHROPIC_AUTH_TOKEN=${body.gateway_key}\n`, { mode: 0o600 });
  const label = String(body.label ?? "").slice(0, 120);
  const r = await run(containerArgs(id, body.repo, type.image));
  if (!r.ok) { fs.rmSync(dir, { recursive: true, force: true }); return [500, { error: "start_failed", detail: r.err.slice(0, 400) }]; }
  writeMeta({ id, type: body.type, repo: body.repo, label, status: "running", started: new Date().toISOString(), node: C.node });
  console.log(`started ${id} ${label}`);
  return [201, { id, node: C.node }];
}

async function reap() {
  for (const m of running()) {
    const r = await run(["inspect", "-f", "{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}", m.id]);
    const [state, code, oom] = r.ok ? r.out.trim().split(" ") : ["missing", "-1", "false"];
    if (state === "running" || state === "created") continue;
    const logs = await run(["logs", "--tail", "2000", m.id]);
    fs.writeFileSync(path.join(jobDir(m.id), "job.log"), logs.out + logs.err);
    await run(["rm", "-f", m.id]);
    const hasReport = fs.existsSync(path.join(jobDir(m.id), "report.md"));
    // A restart cut the job off: start the job again from the saved package, up to MAX_RESTARTS
    // times, instead of reporting a failure the job never had.
    const interrupted = !hasReport && oom !== "true" && Date.parse(m.started) < STARTED;
    if (interrupted && (m.restarts ?? 0) < MAX_RESTARTS && TYPES[m.type]) {
      const again = await run(containerArgs(m.id, m.repo, TYPES[m.type].image));
      if (again.ok) {
        m.restarts = (m.restarts ?? 0) + 1;
        m.started = new Date().toISOString();
        writeMeta(m);
        console.log(`restarted ${m.id} after an interruption (restart ${m.restarts} of ${MAX_RESTARTS})`);
        continue;
      }
    }
    fs.rmSync(path.join(jobDir(m.id), "gateway.env"), { force: true });
    m.exit_code = Number(code); m.oom = oom === "true"; m.ended = new Date().toISOString();
    m.status = m.oom ? "out_of_memory" : m.exit_code === 0 && hasReport ? "succeeded" : "failed";
    writeMeta(m);
    console.log(`ended ${m.id} ${m.status}`);
    await notify({ event: "porter_job_done", job: m.id, node: C.node, label: m.label, repo: m.repo, status: m.status }, `${m.id}@${C.node}`);
  }
}

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

export const server = http.createServer(async (req, res) => {
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
    if (req.method === "DELETE" && !m[2]) { await run(["rm", "-f", meta.id]); fs.rmSync(path.join(jobDir(meta.id), "gateway.env"), { force: true }); meta.status = "stopped"; writeMeta(meta); return send(res, 200, meta); }
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
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(C.port, C.host, () => console.log(`jobd ${C.node} on ${C.host}:${C.port}, ${C.slots} slot(s), ${C.memoryGb} GB each`));
  setInterval(() => reap().catch((e) => console.error(e.message)), C.pollMs);
}
