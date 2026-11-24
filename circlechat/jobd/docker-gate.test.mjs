// jobd's Docker filter (docker-gate.mjs), in front of a stand-in Docker Engine on a Unix socket.
// The filter passes jobd's calls with jobd's fixed settings, and refuses and logs every other call.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { handler } from "./docker-gate.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docker-gate-"));
const workRoot = path.join(tmp, "work");
fs.mkdirSync(workRoot, { mode: 0o750 });
const KEY = "cct_eyJhIjoicG9ydGVyIn0.c2lnbmF0dXJl";
const cfg = {
  listen: path.join(tmp, "gate.sock"), docker: path.join(tmp, "engine.sock"), image: "recursica/porter-job", network: "jobs-egress",
  memoryBytes: 12 * 2 ** 30, nanoCpus: 0, pidsLimit: 4096, workRoot, groupId: 990,
  envNames: ["TARGET_REPO", "PORTER_REPORT", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "PORTER_MODEL"],
};

// The stand-in Docker Engine: containers by name, and every request it got.
const seen = [];
const containers = new Map([
  ["job-other1-aaaaaa", { Id: "a".repeat(64), Name: "/job-other1-aaaaaa", Config: { Labels: {} } }],
  ["cc-gateway", { Id: "b".repeat(64), Name: "/cc-gateway", Config: { Labels: { "io.recursica.jobd": "1" } } }],
]);
let internal = true;
const engine = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    seen.push({ method: req.method, url: req.url, body: body ? JSON.parse(body) : undefined });
    const json = (code, v) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(v)); };
    const u = new URL(req.url, "http://x");
    const p = u.pathname.replace(/^\/v1\.\d+/, "");
    if (p === "/_ping") return res.end("OK");
    if (p === "/networks/jobs-egress") return json(200, { Name: "jobs-egress", Internal: internal });
    if (p === "/containers/create") {
      const name = u.searchParams.get("name");
      const c = { Id: name.replace(/[^0-9a-f]/g, "").padEnd(64, "c"), Name: `/${name}`, Config: { Labels: JSON.parse(body).Labels } };
      containers.set(name, c);
      return json(201, { Id: c.Id });
    }
    const m = p.match(/^\/containers\/([^/]+)(\/.*)?$/);
    if (m) {
      const c = containers.get(m[1]) ?? [...containers.values()].find((x) => x.Id === m[1]);
      if (!c) return json(404, { message: `No such container: ${m[1]}` });
      if (m[2] === "/json") return json(200, c);
      return json(200, { ok: true });
    }
    json(200, { ok: true });
  });
});
await new Promise((r) => engine.listen(cfg.docker, r));

const logs = [];
const gate = http.createServer(handler(cfg, (l) => logs.push(l)));
await new Promise((r) => gate.listen(cfg.listen, r));
test.after(() => { gate.close(); engine.close(); });

function call(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
    const req = http.request({ socketPath: cfg.listen, method, path: p, headers: { host: "docker", ...(data ? { "content-type": "application/json" } : {}), ...headers } }, (res) => {
      let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => resolve({ status: res.statusCode, body: b }));
    });
    req.on("error", reject);
    req.end(data);
  });
}

// The request the docker CLI sends for jobd's docker create, with the CLI's empty settings.
const jobBody = (over = {}, host = {}) => ({
  Hostname: "", User: "", AttachStdin: false, AttachStdout: true, AttachStderr: true, Tty: false, OpenStdin: false, StdinOnce: false,
  Env: ["TARGET_REPO=https://github.com/acme/adapter-x", "PORTER_REPORT=/work/report.md", "ANTHROPIC_BASE_URL=http://cc-gateway:4000", `ANTHROPIC_AUTH_TOKEN=${KEY}`],
  Cmd: null, Image: "recursica/porter-job", Volumes: {}, WorkingDir: "", Entrypoint: null, OnBuild: null, Labels: {},
  HostConfig: { Binds: [`${workRoot}/${over.name ?? "job-abc12-aaaaaa"}:/work`], NetworkMode: "jobs-egress", Memory: cfg.memoryBytes, MemorySwap: cfg.memoryBytes,
    Dns: ["127.0.0.1"], RestartPolicy: { Name: "no", MaximumRetryCount: 0 }, LogConfig: { Type: "", Config: {} }, AutoRemove: false, CapAdd: null,
    Privileged: false, PortBindings: {}, ConsoleSize: [0, 0], Mounts: null, PidsLimit: null, MemorySwappiness: -1, ...host },
  NetworkingConfig: { EndpointsConfig: { "jobs-egress": {} } },
  ...over.top,
});
const lastCreate = () => seen.filter((r) => r.url.includes("/containers/create")).at(-1);

test("passes the version calls", async () => {
  assert.equal((await call("GET", "/_ping")).status, 200);
  assert.equal((await call("HEAD", "/v1.47/_ping")).status, 200);
  assert.equal((await call("GET", "/v1.47/version")).status, 200);
});

test("creates a job's container with the filter's own settings, and makes the job's work folder", async () => {
  const r = await call("POST", "/v1.47/containers/create?name=job-abc12-aaaaaa", jobBody());
  assert.equal(r.status, 201, r.body);
  const sent = lastCreate();
  assert.equal(sent.url, "/v1.47/containers/create?name=job-abc12-aaaaaa");
  assert.deepEqual(sent.body, {
    Image: "recursica/porter-job",
    Env: jobBody().Env,
    Labels: { "io.recursica.jobd": "1" },
    HostConfig: { Binds: [`${workRoot}/job-abc12-aaaaaa:/work`], NetworkMode: "jobs-egress", Memory: cfg.memoryBytes, MemorySwap: cfg.memoryBytes,
      PidsLimit: 4096, Dns: ["127.0.0.1"], GroupAdd: ["990"], SecurityOpt: ["no-new-privileges"], Privileged: false, CapAdd: [], RestartPolicy: { Name: "no" } },
    NetworkingConfig: { EndpointsConfig: { "jobs-egress": {} } },
  });
  const st = fs.lstatSync(path.join(workRoot, "job-abc12-aaaaaa"));
  assert.ok(st.isDirectory());
  assert.equal(st.mode & 0o7777, 0o2770);
  // A second create of the same job, as after an interruption, uses the same work folder.
  containers.delete("job-abc12-aaaaaa");
  assert.equal((await call("POST", "/v1.47/containers/create?name=job-abc12-aaaaaa", jobBody())).status, 201);
});

test("refuses a create with any setting outside jobd's fixed settings, and logs each refusal without the request's body", async () => {
  const cases = [
    ["privileged mode", jobBody({}, { Privileged: true }), /HostConfig.privileged/],
    ["privileged mode, in lowercase", jobBody({ top: { HostConfig: { ...jobBody().HostConfig, Privileged: undefined, privileged: true } } }), /HostConfig.privileged/],
    ["an added capability", jobBody({}, { CapAdd: ["SYS_ADMIN"] }), /HostConfig.capadd/],
    ["the host network", jobBody({}, { NetworkMode: "host" }), /HostConfig.networkmode/],
    ["the host's process namespace", jobBody({}, { PidMode: "host" }), /HostConfig.pidmode/],
    ["a host folder", jobBody({}, { Binds: [`${workRoot}/job-abc12-aaaaaa:/work`, "/:/host"] }), /HostConfig.binds/],
    ["another job's work folder", jobBody({}, { Binds: [`${workRoot}/job-zzz99-zzzzzz:/work`] }), /HostConfig.binds/],
    ["a mount", jobBody({}, { Mounts: [{ Type: "bind", Source: "/", Target: "/host" }] }), /HostConfig.mounts/],
    ["a device", jobBody({}, { Devices: [{ PathOnHost: "/dev/sda" }] }), /HostConfig.devices/],
    ["a security option", jobBody({}, { SecurityOpt: ["seccomp=unconfined"] }), /HostConfig.securityopt/],
    ["a larger memory cap", jobBody({}, { Memory: cfg.memoryBytes * 2 }), /HostConfig.memory/],
    ["a memory swappiness", jobBody({}, { MemorySwappiness: 100 }), /HostConfig.memoryswappiness/],
    ["another image", jobBody({ top: { Image: "alpine" } }), /image "alpine"/],
    ["a command", jobBody({ top: { Cmd: ["sh", "-c", "id"] } }), /setting cmd/],
    ["an entry point", jobBody({ top: { Entrypoint: ["/bin/sh"] } }), /setting entrypoint/],
    ["the root user", jobBody({ top: { User: "root" } }), /setting user/],
    ["a label", jobBody({ top: { Labels: { "io.recursica.jobd": "1", x: "y" } } }), /labels/],
    ["a setting a job never gets", jobBody({ top: { Env: [...jobBody().Env, "LD_PRELOAD=/x.so"] } }), /"LD_PRELOAD"/],
    ["a second network", jobBody({ top: { NetworkingConfig: { EndpointsConfig: { "jobs-egress": {}, bridge: {} } } } }), /network "bridge"/],
    ["a network alias", jobBody({ top: { NetworkingConfig: { EndpointsConfig: { "jobs-egress": { Aliases: ["cc-gateway"] } } } } }), /endpoint/],
  ];
  for (const [what, body, why] of cases) {
    const before = seen.length;
    const r = await call("POST", "/v1.47/containers/create?name=job-abc12-aaaaaa", body);
    assert.equal(r.status, 403, what);
    assert.match(JSON.parse(r.body).message, why, what);
    assert.ok(!seen.slice(before).some((x) => x.url.includes("/containers/create")), `${what} reached Docker`);
    assert.match(logs.at(-1), new RegExp(`^refused POST /v1.47/containers/create\\?name=job-abc12-aaaaaa: `), what);
  }
  assert.ok(!logs.some((l) => l.includes(KEY)), "a refusal never logs the job's gateway key");

  const twice = JSON.stringify(jobBody()).replace('"Privileged":false', '"Privileged":false,"privileged":true');
  assert.equal((await call("POST", "/v1.47/containers/create?name=job-abc12-aaaaaa", twice)).status, 403, "a setting twice, in two cases");
  assert.equal((await call("POST", "/v1.47/containers/create?name=cc-evil", jobBody())).status, 403, "a name that is not a job's");
  assert.equal((await call("POST", "/v1.47/containers/create?name=job-abc12-aaaaaa", "x".repeat(2 << 20))).status, 403, "a body over 1 MB");
});

test("refuses a work folder that is a link, and a network that is not closed", async () => {
  fs.symlinkSync("/", path.join(workRoot, "job-link1-aaaaaa"));
  const linked = await call("POST", "/v1.47/containers/create?name=job-link1-aaaaaa", jobBody({ name: "job-link1-aaaaaa" }));
  assert.equal(linked.status, 403);
  assert.match(JSON.parse(linked.body).message, /is not a folder/);
  internal = false;
  const open = await call("POST", "/v1.47/containers/create?name=job-net11-aaaaaa", jobBody({ name: "job-net11-aaaaaa" }));
  internal = true;
  assert.equal(open.status, 403);
  assert.match(JSON.parse(open.body).message, /not a closed network/);
});

test("passes start, inspect, logs, wait and remove for a job's container, by the container's full ID", async () => {
  assert.equal((await call("POST", "/v1.47/containers/create?name=job-run12-aaaaaa", jobBody({ name: "job-run12-aaaaaa" }))).status, 201);
  const id = containers.get("job-run12-aaaaaa").Id;
  for (const [method, p, sent] of [
    ["POST", "/v1.47/containers/job-run12-aaaaaa/start", `/v1.47/containers/${id}/start`],
    ["POST", `/v1.47/containers/${id}/start`, `/v1.47/containers/${id}/start`],
    ["GET", "/v1.47/containers/job-run12-aaaaaa/logs?stderr=1&stdout=1&tail=2000", `/v1.47/containers/${id}/logs?stderr=1&stdout=1&tail=2000`],
    ["POST", "/v1.47/containers/job-run12-aaaaaa/wait?condition=not-running", `/v1.47/containers/${id}/wait?condition=not-running`],
    ["DELETE", "/v1.47/containers/job-run12-aaaaaa?force=1", `/v1.47/containers/${id}?force=1`],
  ]) {
    const r = await call(method, p);
    assert.equal(r.status, 200, `${method} ${p}: ${r.body}`);
    assert.equal(seen.at(-1).url, sent);
  }
  const inspect = await call("GET", "/v1.47/containers/job-run12-aaaaaa/json");
  assert.equal(JSON.parse(inspect.body).Id, id);
  assert.equal((await call("GET", "/v1.47/containers/job-gone1-aaaaaa/json")).status, 404);
});

test("refuses every call on a container that the filter did not create", async () => {
  for (const ref of ["job-other1-aaaaaa", "cc-gateway"]) {
    const r = await call("POST", `/v1.47/containers/${ref}/start`);
    assert.equal(r.status, 403, ref);
    assert.match(logs.at(-1), /is not a job's container/);
    assert.equal((await call("DELETE", `/v1.47/containers/${ref}?force=1`)).status, 403, ref);
    assert.equal((await call("GET", `/v1.47/containers/${ref}/json`)).status, 403, ref);
  }
});

test("refuses every other Docker call", async () => {
  await call("POST", "/v1.47/containers/create?name=job-oth12-aaaaaa", jobBody({ name: "job-oth12-aaaaaa" }));
  const before = seen.length;
  for (const [method, p, headers] of [
    ["POST", "/v1.47/containers/job-oth12-aaaaaa/exec"],
    ["POST", "/v1.47/containers/job-oth12-aaaaaa/attach?stream=1"],
    ["GET", "/v1.47/containers/job-oth12-aaaaaa/archive?path=/"],
    ["POST", "/v1.47/containers/job-oth12-aaaaaa/update"],
    ["POST", "/v1.47/containers/job-oth12-aaaaaa/stop"],
    ["GET", "/v1.47/containers/json"],
    ["POST", "/v1.47/images/create?fromImage=alpine"],
    ["POST", "/v1.47/build"],
    ["GET", "/v1.47/info"],
    ["POST", "/v1.47/networks/create"],
    ["POST", "/v1.47/volumes/create"],
    ["GET", "/v1.47/events"],
    ["GET", "/v1.47/containers/job-oth12-aaaaaa/logs?follow=1&stdout=1"],
    ["DELETE", "/v1.47/containers/job-oth12-aaaaaa?force=1&link=1"],
    ["GET", "/v1.47/containers/job-oth12-aaaaaa/../../info"],
    ["GET", "/v1.47/containers/job-oth12-aaaaaa/%2e%2e/json"],
    ["POST", "/v1.47/containers/job-oth12-aaaaaa/start", { connection: "Upgrade", upgrade: "tcp" }],
    ["PUT", "/v1.47/containers/job-oth12-aaaaaa/start"],
  ]) {
    const r = await call(method, p, undefined, headers);
    assert.equal(r.status, 403, `${method} ${p}`);
    assert.ok(logs.at(-1).startsWith(`refused ${method} `), `${method} ${p}`);
  }
  assert.deepEqual(seen.slice(before), [], "no refused call reached Docker");
});
