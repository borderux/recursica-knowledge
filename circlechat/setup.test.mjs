// setup-host.sh and setup-node.sh, run with stand-ins for docker and sudo: the settings each
// script writes, and the containers and services each script starts.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const example = JSON.parse(fs.readFileSync(path.join(here, "site.example.json"), "utf8"));

function sandbox(site, { tenant } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "setup-"));
  const bin = path.join(home, "bin"), log = path.join(home, "calls.log"), units = path.join(home, "units");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  stub("docker", `case "$1 $2" in "volume inspect"|"network inspect") exit 1 ;; "context inspect") exit 0 ;; "image inspect") echo "\${@: -1}@sha256:0123abcd" ;; esac; exit 0`);
  stub("sudo", `if [ "$1" = tee ]; then cat > "${units}/$(basename "$2")"; exit 0; fi; if [ "$1" = -n ] || [ "$1" = -u ]; then exit 0; fi; exit 0`);
  const cc = tenant ? path.join(home, "tenants", tenant, "circlechat") : path.join(home, "circlechat");
  fs.mkdirSync(cc, { recursive: true });
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify(site));
  fs.writeFileSync(path.join(cc, ".env.example"), "PG_PASSWORD=circlechat\nSESSION_SECRET=change-me-at-least-32-chars-long-string\nMINIO_ROOT_USER=minioadmin\nMINIO_ROOT_PASSWORD=minioadmin\n");
  fs.writeFileSync(path.join(cc, "compose.yml"), 'services:\n  caddy:\n    ports:\n      - "80:80"\n      - "443:443"\n');
  fs.writeFileSync(path.join(cc, "compose.agents.yml"), "services:\n  api:\n    environment:\n      CC_API_BASE: ${PUBLIC_BASE_URL:-http://localhost:8080}/api\n");
  const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, ...(tenant ? { TENANT: tenant } : {}) };
  const run = (script, ...args) => spawnSync("bash", [path.join(here, script), ...args], { env, encoding: "utf8", cwd: home });
  const dotenv = () => Object.fromEntries(fs.readFileSync(path.join(cc, ".env"), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  return { home, cc, run, dotenv, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : ""), units };
}

test("setup-host --secrets-only writes the stack's settings and starts the gateway on the stack's network", () => {
  const s = sandbox(example);
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const e = s.dotenv();
  assert.equal(e.PUBLIC_BASE_URL, `https://${example.site.public_host}`);
  assert.equal(e.CC_API_BASE, `http://localhost:${example.site.port ?? 8080}/api`);
  assert.match(e.COMPOSE_FILE, /compose\.egress\.yml/);
  assert.equal(e.APPROVE_RISK_AT, "high");
  const mcp = JSON.parse(e.CC_AGENT_MCP_SERVERS);
  assert.deepEqual(mcp.betty["recursica-mcp"].args[0], "/workspace/.recursica-mcp.sh");
  assert.doesNotMatch(e.CC_AGENT_MCP_SERVERS, /\$/);
  assert.equal(fs.readFileSync(path.join(s.home, "circlechat-workspace/.recursica-mcp-version"), "utf8").trim(), "0.8.1");
  assert.equal(e.CC_AGENT_NETWORK, "circlechat_agents");
  assert.notEqual(e.SESSION_SECRET, "change-me-at-least-32-chars-long-string");
  assert.notEqual(e.MINIO_ROOT_PASSWORD, "minioadmin");
  assert.notEqual(e.PG_PASSWORD, "circlechat");
  assert.match(fs.readFileSync(path.join(s.cc, "compose.egress.yml"), "utf8"), /internal: true/);
  assert.match(s.calls(), /docker run -d --name cc-gateway .*--network circlechat_default/);
  assert.match(s.calls(), /docker network connect --alias cc-gateway circlechat_agents cc-gateway/);
  assert.match(s.calls(), /ghcr\.io\/berriai\/litellm:main-stable@sha256:0123abcd --config/);
  const lock = JSON.parse(fs.readFileSync(path.join(s.cc, "images.lock"), "utf8"));
  assert.equal(lock["ghcr.io/berriai/litellm:main-stable"].ref, "ghcr.io/berriai/litellm:main-stable@sha256:0123abcd");
});

test("setup-host --upgrade also brings the containers and the filter up", () => {
  const s = sandbox(example);
  const r = s.run("setup-host.sh", "--upgrade");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Upgrade applied/);
  assert.match(s.calls(), /docker compose up -d --remove-orphans/);
  assert.match(s.calls(), /docker run -d --name cc-egress /);
});

test("a client stack with cloud models runs the masking services and passes them to the gateway", () => {
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme", port: 8180, preview_port: 5273, gateway_port: 4100 });
  site.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "client-byok" };
  delete site.data; delete site.porter;
  const s = sandbox(site, { tenant: "acme" });
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(s.dotenv().COMPOSE_FILE, /compose\.privacy\.yml/);
  assert.equal(s.dotenv().COMPOSE_PROJECT_NAME, "cc-acme");
  assert.match(fs.readFileSync(path.join(s.cc, "compose.privacy.yml"), "utf8"), /presidio-analyzer/);
  assert.match(s.calls(), /docker run -d --name cc-gateway-acme .*PRESIDIO_ANALYZER_API_BASE=http:\/\/presidio-analyzer:3000/);
});

test("setup-host stops when TENANT and site.tenant disagree", () => {
  const s = sandbox(example);
  fs.mkdirSync(path.join(s.home, "tenants/acme/circlechat"), { recursive: true });
  fs.copyFileSync(path.join(s.cc, "site.json"), path.join(s.home, "tenants/acme/circlechat/site.json"));
  const r = spawnSync("bash", [path.join(here, "setup-host.sh"), "--secrets-only"], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, TENANT: "acme" }, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /TENANT=acme but .* has site.tenant <none>/);
});

test("setup-node gives a client stack its own job runner, filter, job folder and secrets file", () => {
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  site.site.cloud_models = { allowed: true, granted_by: "Person A", granted_on: "2026-10-20", payer: "client-byok" };
  delete site.data;
  const s = sandbox(site, { tenant: "acme" });
  fs.writeFileSync(path.join(s.home, "tenants/acme/node.env"), "JOBD_TOKEN=t\n");
  const node = site.nodes.find((n) => n.jobs).name;
  const r = s.run("setup-node.sh", node);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const unit = fs.readFileSync(path.join(s.units, "jobd-acme.service"), "utf8");
  assert.match(unit, /JOBD_NETWORK=jobs-egress-acme JOBD_PROXY=http:\/\/egress:3128/);
  assert.match(unit, new RegExp(`JOBD_DIR=${s.home}/tenants/acme/jobs`));
  assert.match(unit, /tenants\/acme\/node\.env/);
  assert.match(unit, /DOCKER_CONTEXT=colima-acme/);
  assert.match(s.calls(), /docker run -d --name cc-jobs-egress-acme /);
});
