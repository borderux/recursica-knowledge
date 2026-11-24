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
// Each job has two folders. The job's own folder, JOBD_DIR/<id>, mode 700, holds jobd's files:
// meta.json, gateway.env and job.log. The work folder, JOBD_DIR/<id>/work, is the container's
// /work, with package.md and the job's report.md. The container sees only the work folder, so a job
// can never change jobd's files. jobd reads report.md without following a link, up to
// JOBD_REPORT_MAX_BYTES. A job that an older jobd started has one folder for both. jobd reads and
// writes that folder without following a link, and gives the job a work folder at a restart.
//
// On Linux, jobd reaches Docker only through jobd's Docker filter (docker-gate.mjs), as an account
// outside the docker group (setup-jobd.sh). The work folders then sit in JOBD_WORK_ROOT, which the
// filter owns, and the filter makes each job's work folder when jobd creates the job's container.
// jobd stops at the start on Linux when jobd runs as root, or when jobd's account can open
// Docker's own socket. JOBD_DOCKER_DIRECT=allowed turns the check off for a client or demo
// stack's job runner, which keeps direct Docker access until a later change.
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
  reportMax: Number(env.JOBD_REPORT_MAX_BYTES ?? 1 << 20),
  workRoot: env.JOBD_WORK_ROOT ?? "",
};
const TYPES = { porter: { image: env.JOBD_PORTER_IMAGE ?? "recursica/porter-job" } };
if (!C.token) { console.error("JOBD_TOKEN is required"); process.exit(1); }
fs.mkdirSync(C.dir, { recursive: true });

const run = (args) => new Promise((res) => execFile(C.docker, args, { maxBuffer: 16 << 20 }, (e, out, err) => res({ ok: !e, out: String(out), err: String(err) })));
const ID = /^job-[0-9a-z-]{6,64}$/;
const TASK_KEY = /^cct_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const jobDir = (id) => path.join(C.dir, id);
// The work folder the container sees. A job that an older jobd started has no work folder, and
// the container saw the job's own folder.
const isDir = (p) => { try { return fs.lstatSync(p).isDirectory(); } catch { return false; } };
const workDir = (id) => (C.workRoot ? path.join(C.workRoot, id) : isDir(path.join(jobDir(id), "work")) ? path.join(jobDir(id), "work") : jobDir(id));
// The work folder that a new container mounts.
const mountDir = (id) => (C.workRoot ? path.join(C.workRoot, id) : path.join(jobDir(id), "work"));

// Reads a plain file without following a link. O_NONBLOCK keeps a named pipe from blocking the
// read. Returns null for a missing file, a link or any other kind of file, and { tooLarge } for a
// file over max bytes.
const { O_RDONLY, O_WRONLY, O_CREAT, O_EXCL, O_NOFOLLOW, O_NONBLOCK } = fs.constants;
export function readPlain(file, max) {
  let fd;
  try { fd = fs.openSync(file, O_RDONLY | O_NOFOLLOW | O_NONBLOCK); } catch { return null; }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) return null;
    if (st.size > max) return { tooLarge: true };
    const buf = Buffer.alloc(st.size);
    const n = st.size ? fs.readSync(fd, buf, 0, st.size, 0) : 0;
    return { text: buf.subarray(0, n).toString("utf8") };
  } finally { fs.closeSync(fd); }
}
// Writes a file as a new file, then renames the new file over the old name. A rename replaces a
// link itself, so a write never goes through a link that a job left in the folder.
export function writePlain(file, text, mode = 0o600) {
  const tmp = path.join(path.dirname(file), `.new-${crypto.randomBytes(6).toString("hex")}`);
  const fd = fs.openSync(tmp, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW, mode);
  try { fs.writeSync(fd, text); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
const readMeta = (id) => { try { return JSON.parse(readPlain(path.join(jobDir(id), "meta.json"), 1 << 20)?.text ?? "null"); } catch { return null; } };
const writeMeta = (m) => writePlain(path.join(jobDir(m.id), "meta.json"), JSON.stringify(m, null, 2), 0o644);
// A report of any size counts, without a read of the whole file.
const hasReport = (id) => readPlain(path.join(workDir(id), "report.md"), 0) !== null;
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
  return ["create", "--name", id, ...networkArgs(), "--memory", `${C.memoryGb}g`, "--memory-swap", `${C.memoryGb}g`,
    ...(C.cpus ? ["--cpus", C.cpus] : []),
    "-v", `${mountDir(id)}:/work`, "-e", `TARGET_REPO=${repo}`, "-e", "PORTER_REPORT=/work/report.md",
    "--env-file", path.join(jobDir(id), "gateway.env"),
    ...C.passEnv.flatMap((n) => (env[n] !== undefined ? ["-e", n] : [])), image];
}

// Creates a job's container, writes the package into the work folder when one is given, and
// starts the container. With the Docker filter, the work folder exists only once the filter has
// created the container.
async function launch(id, repo, image, pkg) {
  const c = await run(containerArgs(id, repo, image));
  if (!c.ok) return c;
  if (pkg !== null) writePlain(path.join(mountDir(id), "package.md"), pkg, 0o644);
  const s = await run(["start", id]);
  if (!s.ok) await run(["rm", "-f", id]);
  return s;
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
  fs.mkdirSync(dir, { recursive: true });
  fs.chmodSync(dir, 0o700);
  if (!C.workRoot) {
    fs.mkdirSync(path.join(dir, "work"));
    fs.chmodSync(path.join(dir, "work"), 0o777);  // the container's user writes here
  }
  writePlain(path.join(dir, "gateway.env"), `ANTHROPIC_BASE_URL=${C.gateway}\nANTHROPIC_AUTH_TOKEN=${body.gateway_key}\n${C.githubTokenUrl ? `GITHUB_TOKEN_URL=${C.githubTokenUrl}\n` : ""}`);
  const label = String(body.label ?? "").slice(0, 120);
  const r = await launch(id, body.repo, type.image, body.package);
  if (!r.ok) { fs.rmSync(dir, { recursive: true, force: true }); return [500, { error: "start_failed", detail: r.err.slice(0, 400) }]; }
  writeMeta({ id, type: body.type, repo: body.repo, label, status: "running", started: new Date().toISOString(), node: C.node });
  console.log(`started ${id} ${label}`);
  return [201, { id, node: C.node }];
}

// Gives a job that an older jobd started a work folder, with a copy of the job's package. The
// job's container has ended, so the job's own folder becomes private. Returns false when the job
// has no package to start from.
function giveWorkFolder(id) {
  const dir = jobDir(id), work = path.join(dir, "work");
  if (C.workRoot || isDir(work)) return true;
  const pkg = readPlain(path.join(dir, "package.md"), 300_000);
  if (!pkg?.text) return false;
  fs.rmSync(work, { force: true });
  fs.mkdirSync(work);
  fs.chmodSync(work, 0o777);
  fs.chmodSync(dir, 0o700);
  writePlain(path.join(work, "package.md"), pkg.text, 0o644);
  return true;
}

async function reap() {
  for (const m of running()) {
    const r = await run(["inspect", "-f", "{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}", m.id]);
    const [state, code, oom] = r.ok ? r.out.trim().split(" ") : ["missing", "-1", "false"];
    if (state === "running" || state === "created") continue;
    const logs = await run(["logs", "--tail", "2000", m.id]);
    writePlain(path.join(jobDir(m.id), "job.log"), logs.out + logs.err, 0o644);
    await run(["rm", "-f", m.id]);
    const reported = hasReport(m.id);
    // A restart cut the job off: start the job again from the saved package, up to MAX_RESTARTS
    // times, instead of reporting a failure the job never had. A job that an older jobd started
    // gets a work folder first. The job could change that job's meta.json, so the repository must
    // still be on the allowlist.
    const interrupted = !reported && oom !== "true" && Date.parse(m.started) < STARTED;
    if (interrupted && (m.restarts ?? 0) < MAX_RESTARTS && TYPES[m.type] && C.repos.has(m.repo) && giveWorkFolder(m.id)) {
      const again = await launch(m.id, m.repo, TYPES[m.type].image, null);
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
    m.status = m.oom ? "out_of_memory" : m.exit_code === 0 && reported ? "succeeded" : "failed";
    writeMeta(m);
    console.log(`ended ${m.id} ${m.status}`);
    await notify({ event: "porter_job_done", job: m.id, node: C.node, label: m.label, repo: m.repo, status: m.status }, `${m.id}@${C.node}`);
  }
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
    if (req.method === "DELETE" && !m[2]) { await run(["rm", "-f", meta.id]); fs.rmSync(path.join(jobDir(meta.id), "gateway.env"), { force: true }); meta.status = "stopped"; writeMeta(meta); return send(res, 200, meta); }
    if (!m[2]) return send(res, 200, meta);
    if (m[2] === "report") {
      const r = readPlain(path.join(workDir(meta.id), "report.md"), C.reportMax);
      if (r?.tooLarge) return send(res, 413, { error: "report_too_large", max_bytes: C.reportMax });
      return r ? send(res, 200, r.text, "text/markdown") : send(res, 404, { error: "no_report_yet" });
    }
    const tail = Math.min(Number(u.searchParams.get("tail") ?? 200), 2000);
    const live = meta.status === "running" ? await run(["logs", "--tail", String(tail), meta.id]) : null;
    const text = live ? live.out + live.err : readPlain(path.join(jobDir(meta.id), "job.log"), 64 << 20)?.text ?? "";
    return send(res, 200, text.split("\n").slice(-tail).join("\n"), "text/plain");
  } catch (e) { send(res, 500, { error: "internal", detail: e.message }); }
};
export const server = http.createServer(handle);

// jobd never reaches Docker directly on Linux: Docker's own socket gives root on the computer.
function checkDockerAccess() {
  if (process.platform !== "linux" || env.JOBD_DOCKER_DIRECT === "allowed") return;
  const direct = env.JOBD_DIRECT_SOCKET ?? "/var/run/docker.sock";
  let open = false;
  try { fs.accessSync(direct, fs.constants.W_OK); open = true; } catch {}
  if (process.getuid() === 0 || open) {
    console.error(`jobd runs as ${process.getuid() === 0 ? "root" : "an account that can open " + direct}. On Linux, jobd runs as recursica-jobd and reaches Docker through jobd's Docker filter. Run setup-node.sh on this computer.`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkDockerAccess();
  // One server for each address. A missing address, such as Tailscale's before Tailscale starts,
  // stops jobd, and the service starts jobd again.
  for (const [i, host] of C.hosts.entries()) {
    const srv = i === 0 ? server : http.createServer(handle);
    srv.on("error", (e) => { console.error(`jobd cannot listen on ${host}:${C.port}: ${e.message}`); process.exit(1); });
    srv.listen(C.port, host, () => console.log(`jobd ${C.node} on ${host}:${C.port}, ${C.slots} slot(s), ${C.memoryGb} GB each`));
  }
  setInterval(() => reap().catch((e) => console.error(e.message)), C.pollMs);
}
