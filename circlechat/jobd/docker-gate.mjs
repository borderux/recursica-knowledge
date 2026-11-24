#!/usr/bin/env node
// jobd's Docker filter on Linux. jobd runs under an account outside the docker group, and reaches
// Docker only through this filter's Unix socket. The filter passes only the Docker calls that
// jobd needs, with jobd's fixed settings, and refuses every other call. No dependencies.
// setup-jobd.sh installs the filter, and the filter runs under the jobd-gate service.
//
//   node docker-gate.mjs <settings file>
//
// The settings file is JSON, written by setup-jobd.sh:
//   listen      the filter's socket. setup-jobd.sh puts the socket in a folder that only jobd's
//               account and the filter's account can open.
//   docker      Docker's own socket, such as /var/run/docker.sock
//   image       the job image, such as recursica/porter-job
//   network     the jobs' closed network, such as jobs-egress
//   memoryBytes the memory cap of one job, and nanoCpus the CPU cap of one job, or 0
//   pidsLimit   the most processes one job may run
//   workRoot    the folder of the jobs' work folders. The filter owns the folder, and makes each
//               job's work folder.
//   groupId     the group of jobd's account. A job's container gets the group, so the job's user
//               can write in the job's work folder.
//   envNames    the names of the settings a job may get
//
// The calls the filter passes:
//   GET or HEAD /_ping, and GET /version
//   POST   /containers/create?name=<job id>      a job's container, with the settings below
//   POST   /containers/<job>/start
//   GET    /containers/<job>/json
//   GET    /containers/<job>/logs                stdout, stderr, tail and timestamps only
//   POST   /containers/<job>/wait
//   DELETE /containers/<job>                     force and v only
// A path may start with an API version, such as /v1.47. <job> is the name or ID of a container
// that the filter created: a name like job-<id>, and the label io.recursica.jobd=1. The filter
// checks the container with Docker first, and sends the call with the container's full ID.
//
// A container that the filter creates has exactly these settings: the job image with the image's
// own command, the closed network, the memory, CPU and process caps, DNS at 127.0.0.1, the job's
// work folder at /work, jobd's group, no-new-privileges and the label. The filter refuses a
// request with any other setting, such as privileged mode, an added capability, the host network
// or another folder. A setting with an empty value, such as false, 0 or [], counts as not set.
// The filter never sends jobd's request on: the filter sends a request of the filter's own, with
// the settings above and the job's checked settings. Docker reads a setting's name in any case,
// such as "privileged", so the filter compares names in lowercase.
//
// Each refusal answers 403 and writes one line to the service's log: the method, the path and the
// reason. The line never holds a request's body, which carries the job's gateway key.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ID = /^job-[0-9a-z-]{6,64}$/;
const LABEL = "io.recursica.jobd";
const MAX_BODY = 1 << 20;

export class Refusal extends Error {}
const refuse = (why) => { throw new Refusal(why); };

const isEmpty = (v) => v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.every(isEmpty)) ||
  (typeof v === "object" && !Array.isArray(v) && Object.values(v).every(isEmpty));

// The object's keys in lowercase. Two keys that differ only in case are refused, because Docker
// reads either one.
function lower(obj, where) {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== "object" || Array.isArray(obj)) refuse(`${where} is not an object`);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const l = k.toLowerCase();
    if (l in out) refuse(`${where} has the setting ${k} twice`);
    out[l] = v;
  }
  return out;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The create request the filter sends for one job, from the filter's settings. */
export function jobContainer(cfg, name, env) {
  const host = {
    Binds: [`${path.join(cfg.workRoot, name)}:/work`],
    NetworkMode: cfg.network,
    Memory: cfg.memoryBytes,
    MemorySwap: cfg.memoryBytes,
    ...(cfg.nanoCpus ? { NanoCpus: cfg.nanoCpus } : {}),
    PidsLimit: cfg.pidsLimit,
    Dns: ["127.0.0.1"],
    GroupAdd: [String(cfg.groupId)],
    SecurityOpt: ["no-new-privileges"],
    Privileged: false,
    CapAdd: [],
    RestartPolicy: { Name: "no" },
  };
  return { Image: cfg.image, Env: env, Labels: { [LABEL]: "1" }, HostConfig: host, NetworkingConfig: { EndpointsConfig: { [cfg.network]: {} } } };
}

// Each setting of jobd's request must hold the filter's value or be empty. Env is checked by name.
// docker create sets AttachStdout and AttachStderr. The two settings grant nothing, and the
// filter's own request leaves the two settings out.
const ALLOWED_TOP = new Set(["image", "env", "labels", "hostconfig", "networkingconfig", "attachstdout", "attachstderr"]);
// The docker CLI sends two defaults that are not empty: a restart policy of "no", and a memory
// swappiness of -1, which leaves Docker's default.
const SAME_AS_EMPTY = {
  restartpolicy: (v) => { const r = lower(v, "RestartPolicy"); return (r.name === "no" || isEmpty(r.name)) && isEmpty(r.maximumretrycount); },
  memoryswappiness: (v) => v === -1,
};

/** Checks jobd's create request against the filter's settings. Returns the checked Env. */
export function checkCreate(cfg, name, body) {
  if (!ID.test(name)) refuse(`the container name ${JSON.stringify(name)} is not a job's name`);
  const want = jobContainer(cfg, name, []);
  const top = lower(body, "the request");
  for (const [k, v] of Object.entries(top)) {
    if (ALLOWED_TOP.has(k)) continue;
    if (!isEmpty(v)) refuse(`the setting ${k} is set`);
  }
  if (!isEmpty(top.image) && top.image !== want.Image) refuse(`the image ${JSON.stringify(top.image)} is not the job image`);
  if (!isEmpty(top.labels) && !same(top.labels, want.Labels)) refuse("the request sets labels");
  const host = lower(top.hostconfig, "HostConfig"), wantHost = lower(want.HostConfig, "HostConfig");
  for (const [k, v] of Object.entries(host)) {
    if (isEmpty(v) || SAME_AS_EMPTY[k]?.(v)) continue;
    if (!(k in wantHost)) refuse(`the setting HostConfig.${k} is set`);
    if (!same(v, wantHost[k])) refuse(`HostConfig.${k} is ${JSON.stringify(v)}, and a job gets ${JSON.stringify(wantHost[k])}`);
  }
  const net = lower(top.networkingconfig, "NetworkingConfig");
  for (const [k, v] of Object.entries(net)) {
    // A network's name is a key, so an empty endpoint still joins the network.
    if (k !== "endpointsconfig") { if (isEmpty(v)) continue; refuse(`the setting NetworkingConfig.${k} is set`); }
    if (v === null || typeof v !== "object" || Array.isArray(v)) refuse("EndpointsConfig is not an object");
    for (const [n, e] of Object.entries(v)) {
      if (n !== cfg.network) refuse(`the request joins the network ${JSON.stringify(n)}`);
      if (!isEmpty(e)) refuse(`the request sets the network ${JSON.stringify(n)}'s endpoint`);
    }
  }
  const env = top.env ?? [];
  if (!Array.isArray(env)) refuse("Env is not a list");
  const names = new Set();
  for (const e of env) {
    if (typeof e !== "string" || !e.includes("=")) refuse("an Env entry has no value");
    const n = e.slice(0, e.indexOf("="));
    if (!cfg.envNames.includes(n)) refuse(`the setting ${JSON.stringify(n)} is not one a job gets`);
    if (names.has(n)) refuse(`the setting ${n} is set twice`);
    names.add(n);
  }
  return env;
}

// One call to Docker's own socket. Returns { status, headers, body } with the whole body.
function docker(cfg, method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({ socketPath: cfg.docker, method, path: p, headers: { host: "docker", ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}) } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end(data);
  });
}

// The work folder of one job. The filter owns the work root, so jobd can never swap a work
// folder for a link between the filter's check and Docker's mount.
function workFolder(cfg, name) {
  const dir = path.join(cfg.workRoot, name);
  let st = null;
  try { st = fs.lstatSync(dir); } catch {}
  if (!st) { fs.mkdirSync(dir, { mode: 0o2770 }); fs.chmodSync(dir, 0o2770); st = fs.lstatSync(dir); }
  if (!st.isDirectory()) refuse(`${dir} is not a folder`);
  if (st.uid !== process.getuid()) refuse(`${dir} belongs to another account`);
}

/** Checks the work root and the network once at the start. Throws on a problem. */
export async function checkSetup(cfg) {
  const st = fs.lstatSync(cfg.workRoot);
  if (!st.isDirectory()) throw new Error(`${cfg.workRoot} is not a folder`);
  if (st.uid !== process.getuid()) throw new Error(`${cfg.workRoot} belongs to another account`);
  if (st.mode & 0o022) throw new Error(`${cfg.workRoot} is writable by other accounts`);
}

async function internalNetwork(cfg, version) {
  const r = await docker(cfg, "GET", `${version}/networks/${encodeURIComponent(cfg.network)}`);
  if (r.status !== 200) refuse(`the network ${cfg.network} does not exist`);
  if (JSON.parse(r.body).Internal !== true) refuse(`the network ${cfg.network} is not a closed network`);
}

// A container of jobd's, by name or ID: the container's inspect answer, or a refusal.
async function ownContainer(cfg, version, ref) {
  const r = await docker(cfg, "GET", `${version}/containers/${ref}/json`);
  if (r.status === 404) return { missing: r };
  if (r.status !== 200) return { missing: r };
  const c = JSON.parse(r.body);
  if (c.Config?.Labels?.[LABEL] !== "1" || !ID.test(String(c.Name ?? "").replace(/^\//, ""))) refuse(`the container ${ref} is not a job's container`);
  return { inspect: r, id: c.Id };
}

const PATH = /^(\/v1\.\d{1,3})?(\/[A-Za-z0-9._/-]*)$/;
const REF = "([A-Za-z0-9][A-Za-z0-9_.-]{0,127})";
const ROUTES = [
  { method: ["GET", "HEAD"], re: /^\/_ping$/, query: [] },
  { method: ["GET"], re: /^\/version$/, query: [] },
  { method: ["POST"], re: /^\/containers\/create$/, query: ["name"], create: true },
  { method: ["POST"], re: new RegExp(`^/containers/${REF}/start$`), query: [] },
  { method: ["GET"], re: new RegExp(`^/containers/${REF}/json$`), query: ["size"], inspect: true },
  { method: ["GET"], re: new RegExp(`^/containers/${REF}/logs$`), query: ["stdout", "stderr", "tail", "timestamps", "follow"] },
  { method: ["POST"], re: new RegExp(`^/containers/${REF}/wait$`), query: ["condition"] },
  { method: ["DELETE"], re: new RegExp(`^/containers/${REF}$`), query: ["force", "v"] },
];

async function readBody(req) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > MAX_BODY) refuse("the request body is over 1 MB"); chunks.push(c); }
  return Buffer.concat(chunks).toString("utf8");
}

const HOP = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade"]);
function pass(res, r) {
  const headers = Object.fromEntries(Object.entries(r.headers).filter(([k]) => !HOP.has(k)));
  headers["content-length"] = r.body.length;
  res.writeHead(r.status, headers);
  res.end(r.body);
}

export function handler(cfg, log = (line) => console.error(line)) {
  return async (req, res) => {
    const raw = req.url ?? "";
    try {
      if (req.headers.upgrade || /upgrade/i.test(String(req.headers.connection ?? ""))) refuse("the request asks for a connection upgrade");
      const [p, qs = ""] = raw.split(/\?(.*)/s);
      if (raw.includes("%") || raw.includes("..") || raw.includes("//")) refuse("the path holds an encoded character, .. or //");
      const m = p.match(PATH);
      if (!m) refuse("the path is not a Docker call that jobd makes");
      const version = m[1] ?? "", call = m[2];
      const route = ROUTES.find((r) => r.re.test(call));
      if (!route) refuse("the path is not a Docker call that jobd makes");
      if (!route.method.includes(req.method)) refuse(`${req.method} is not allowed on this path`);
      const query = new URLSearchParams(qs);
      for (const [k, v] of query) {
        if (!route.query.includes(k)) refuse(`the query setting ${k} is not allowed`);
        if (k === "follow" && !["0", "false", ""].includes(v)) refuse("a log that follows the container is not allowed");
        if (k === "size" && !["0", "false", ""].includes(v)) refuse("the size query is not allowed");
      }
      const ref = call.match(route.re)[1];

      if (!ref && !route.create) {
        await readBody(req);
        return pass(res, await docker(cfg, req.method, `${version}${call}`));
      }
      if (route.create) {
        const name = query.get("name") ?? "";
        let body;
        try { body = JSON.parse(await readBody(req)); } catch (e) { if (e instanceof Refusal) throw e; refuse("the request body is not JSON"); }
        const env = checkCreate(cfg, name, body);
        await internalNetwork(cfg, version);
        workFolder(cfg, name);
        return pass(res, await docker(cfg, "POST", `${version}/containers/create?name=${name}`, jobContainer(cfg, name, env)));
      }
      await readBody(req);
      const own = await ownContainer(cfg, version, ref);
      if (own.missing) return pass(res, own.missing);
      if (route.inspect) return pass(res, own.inspect);
      const sub = call.slice(`/containers/${ref}`.length);
      const q = qs ? `?${qs}` : "";
      return pass(res, await docker(cfg, req.method, `${version}/containers/${own.id}${sub}${q}`));
    } catch (e) {
      if (!(e instanceof Refusal)) {
        log(`error ${req.method} ${raw}: ${e.message}`);
        res.writeHead(502, { "content-type": "application/json" });
        return res.end(JSON.stringify({ message: `docker-gate: ${e.message}` }));
      }
      log(`refused ${req.method} ${raw}: ${e.message}`);
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: `refused by jobd's Docker filter: ${e.message}` }));
    }
  };
}

export function readSettings(file) {
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const k of ["listen", "docker", "image", "network", "workRoot"]) if (typeof cfg[k] !== "string" || !cfg[k]) throw new Error(`${file}: ${k} is missing`);
  for (const k of ["memoryBytes", "pidsLimit", "groupId"]) if (!Number.isInteger(cfg[k]) || cfg[k] <= 0) throw new Error(`${file}: ${k} must be a whole number above 0`);
  if (!Number.isInteger(cfg.nanoCpus ?? 0) || cfg.nanoCpus < 0) throw new Error(`${file}: nanoCpus must be a whole number`);
  if (!Array.isArray(cfg.envNames)) throw new Error(`${file}: envNames must be a list`);
  return cfg;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cfg = readSettings(process.argv[2] ?? "/etc/recursica-jobd/gate.json");
  await checkSetup(cfg);
  const server = http.createServer(handler(cfg));
  fs.rmSync(cfg.listen, { force: true });
  // The socket's folder decides who can open the socket. The socket itself is open to the
  // filter's account and group only.
  const old = process.umask(0o117);
  server.listen(cfg.listen, () => {
    process.umask(old);
    console.log(`jobd's Docker filter on ${cfg.listen}, for ${cfg.image} on ${cfg.network}`);
  });
  server.on("error", (e) => { console.error(`jobd's Docker filter cannot listen on ${cfg.listen}: ${e.message}`); process.exit(1); });
}
