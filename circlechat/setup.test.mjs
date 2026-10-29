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
import { stackSite } from "./kit/stack-site.mjs";

function sandbox(site, { tenant, system, dockerContext = "default" } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "setup-"));
  const bin = path.join(home, "bin"), log = path.join(home, "calls.log"), units = path.join(home, "units");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  stub("docker", `case "$1 $2" in "volume inspect"|"network inspect") exit 1 ;; "context inspect") exit 0 ;; "context show") echo ${dockerContext} ;; "image inspect") echo "\${@: -1}@sha256:0123abcd" ;; "compose exec") case "$*" in *to_regclass*) echo t ;; esac ;; "info --format") echo "\${FAKE_DOCKER_INFO:-}" ;; esac; exit 0`);
  if (system) stub("uname", `[ "$1" = -s ] || [ $# -eq 0 ] && { echo ${system}; exit 0; }; PATH=/usr/bin:/bin exec uname "$@"`);
  stub("sudo", `if [ "$1" = tee ]; then cat > "${units}/$(basename "$2")"; exit 0; fi; if [ "$1" = -n ] || [ "$1" = -u ]; then exit 0; fi; exit 0`);
  const cc = tenant ? path.join(home, "tenants", tenant, "circlechat") : path.join(home, "circlechat");
  fs.mkdirSync(cc, { recursive: true });
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify(site));
  fs.writeFileSync(path.join(cc, ".env.example"), "PG_PASSWORD=circlechat\nSESSION_SECRET=change-me-at-least-32-chars-long-string\nMINIO_ROOT_USER=minioadmin\nMINIO_ROOT_PASSWORD=minioadmin\n");
  fs.writeFileSync(path.join(cc, "compose.yml"), 'services:\n  caddy:\n    ports:\n      - "80:80"\n      - "443:443"\n');
  fs.writeFileSync(path.join(cc, "compose.agents.yml"), "services:\n  api:\n    environment:\n      CC_API_BASE: ${PUBLIC_BASE_URL:-http://localhost:8080}/api\n");
  const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, ...(tenant ? { TENANT: tenant } : {}) };
  // The cluster's own site.json, which a client or demo stack's computers are checked against.
  if (tenant) { fs.mkdirSync(path.join(home, "circlechat"), { recursive: true }); fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify(example)); }
  const run = (script, ...args) => spawnSync("bash", [path.join(here, script), ...args], { env, encoding: "utf8", cwd: home });
  const dotenv = () => Object.fromEntries(fs.readFileSync(path.join(cc, ".env"), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  return { home, cc, run, dotenv, stub, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : ""), units };
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
  assert.equal(e.CC_AGENT_API_BASE, "http://api:3000/api");
  assert.notEqual(e.SESSION_SECRET, "change-me-at-least-32-chars-long-string");
  assert.notEqual(e.MINIO_ROOT_PASSWORD, "minioadmin");
  assert.notEqual(e.PG_PASSWORD, "circlechat");
  assert.match(fs.readFileSync(path.join(s.cc, "compose.egress.yml"), "utf8"), /internal: true/);
  // The gateway: LiteLLM alone on the gateway's network, with the keys from the secrets file and no
  // environment file; the router in front, on the stack's network, the gateway's network and the
  // agents' network, reachable over Tailscale for port jobs on other computers.
  const calls = s.calls();
  const litellm = calls.split("\n").find((l) => l.startsWith("docker run -d --name cc-litellm "));
  assert.match(litellm, /--network circlechat_models /);
  assert.match(litellm, /-v .*\/model-keys\.env:\/run\/secrets\/model-keys\.env:ro/);
  assert.match(litellm, /--entrypoint python ghcr\.io\/berriai\/litellm:main-stable@sha256:0123abcd \/kit\/start-litellm\.py/);
  assert.doesNotMatch(litellm, /--env-file|-p /, "LiteLLM gets no environment file and publishes no port");
  // LiteLLM reaches the model servers directly, not through the outgoing filter, which keeps every
  // model server's port closed to agents.
  assert.match(litellm, /--add-host host\.docker\.internal:host-gateway /);
  assert.doesNotMatch(litellm, /_PROXY=|_proxy=/, "LiteLLM does not use the outgoing filter");
  assert.match(calls, /docker network create circlechat_models\n/, "the gateway's network has a route out");
  assert.doesNotMatch(calls, /docker network connect \S* ?circlechat_agents cc-litellm/, "LiteLLM is not on the agents' closed network");
  const router = calls.split("\n").find((l) => l.startsWith("docker run -d --name cc-gateway "));
  // With the filter on, only the port for port jobs is published, on the Tailscale address.
  assert.match(router, /--network circlechat_default -p 100\.64\.0\.1:4000:4001 -v /);
  assert.match(router, /LITELLM_URL=http:\/\/cc-litellm:4000/);
  assert.doesNotMatch(router, /--env-file|ANTHROPIC|DATABASE_URL|postgres:\/\//);
  // The router's read-only database role, made before the router starts; its address is in a file.
  assert.match(calls, /docker compose exec -T postgres psql -q -U postgres -d circlechat\n(.*\n)*docker run -d --name cc-gateway /);
  assert.match(fs.readFileSync(path.join(s.units, "db.url"), "utf8"), /^postgres:\/\/cc_gateway_read:.*@postgres:5432\/circlechat$/m);
  assert.match(calls, /docker network connect circlechat_models cc-gateway/);
  assert.match(calls, /docker network connect --alias cc-gateway circlechat_agents cc-gateway/);
  assert.ok(fs.existsSync(path.join(s.cc, "gateway-app/router.mjs")));
  assert.equal(e.LITELLM_MASTER_KEY, undefined, "no agent gets a master key");
  const lock = JSON.parse(fs.readFileSync(path.join(s.cc, "images.lock"), "utf8"));
  assert.equal(lock["ghcr.io/berriai/litellm:main-stable"].ref, "ghcr.io/berriai/litellm:main-stable@sha256:0123abcd");
});

test("on a Mac, setup-host gives the gateway's secrets file and state folder to the owner, and on Linux leaves both to root", () => {
  const me = os.userInfo().username;
  for (const [system, owned] of [["Darwin", true], ["Linux", false]]) {
    const s = sandbox(example, { system });
    const r = s.run("setup-host.sh", "--secrets-only");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const calls = s.calls().split("\n");
    const gw = path.join(s.cc, "gateway-state");
    assert.equal(calls.includes(`sudo chown -h -R ${me} ${path.join(s.cc, "model-keys.env")} ${gw}`), owned, system);
    assert.equal(calls.includes(`sudo chown -h -R ${me} ${gw}/db.url`), owned, system);
    assert.equal(calls.some((l) => l.startsWith("sudo chown")), owned, `${system}: no other chown`);
  }
});

test("setup-host runs the file store from pinned Chainguard images, in every stack", () => {
  const s = sandbox(example);
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(s.dotenv().COMPOSE_FILE, /^compose\.yml:compose\.agents\.yml:compose\.storage\.yml(:|$)/);
  const storage = fs.readFileSync(path.join(s.cc, "compose.storage.yml"), "utf8");
  assert.match(storage, /minio:\n    image: cgr\.dev\/chainguard\/minio:latest@sha256:0123abcd\n    user: "0:0"/);
  assert.match(storage, /minio-setup:\n    image: cgr\.dev\/chainguard\/minio-client:latest-dev@sha256:0123abcd/);
  const lock = JSON.parse(fs.readFileSync(path.join(s.cc, "images.lock"), "utf8"));
  assert.ok(lock["cgr.dev/chainguard/minio:latest"]);
  assert.ok(lock["cgr.dev/chainguard/minio-client:latest-dev"]);
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
  assert.match(s.calls(), /docker run -d --name cc-litellm-acme .*PRESIDIO_ANALYZER_API_BASE=http:\/\/presidio-analyzer:3000/);
  assert.match(fs.readFileSync(path.join(s.cc, "compose.privacy.yml"), "utf8"), /name: cc-acme_models\n    external: true/);
});

test("setup-host moves an old ANTHROPIC_API_KEY out of .env, and stops on another cloud key there", () => {
  const s = sandbox(example);
  fs.writeFileSync(path.join(s.cc, ".env"), "ANTHROPIC_API_KEY=sk-ant-old\n");
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(s.dotenv().ANTHROPIC_API_KEY, undefined);
  assert.match(r.stdout, /Moved ANTHROPIC_API_KEY from \.env to the gateway's secrets file/);
  fs.appendFileSync(path.join(s.cc, ".env"), "XAI_API_KEY=xai-abc\n");
  const again = s.run("setup-host.sh", "--secrets-only");
  assert.notEqual(again.status, 0);
  assert.match(again.stdout, /XAI_API_KEY is in .*\.env, which holds no cloud key/);
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
  // machine-1 is a Linux node, so the test runs as Linux on every computer.
  const s = sandbox(site, { tenant: "acme", system: "Linux" });
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
  assert.match(unit, node === "machine-1" ? /JOBD_GATEWAY_URL=http:\/\/cc-gateway:4000 / : /JOBD_GATEWAY_URL=http:\/\/100\.64\.0\.1:4000 /);
});

test("setup-node refuses a cloud key in the job runner's secrets file", () => {
  const s = sandbox(example, { system: "Linux" });
  fs.writeFileSync(path.join(s.home, ".recursica-node.env"), "JOBD_TOKEN=t\nANTHROPIC_API_KEY=k\n");
  const r = s.run("setup-node.sh", "machine-1");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /holds a cloud key. Port jobs reach cloud models only through the gateway/);
});

test("a demo stack on one computer leaves out the models that don't fit, and stops on a Docker VM bigger than its limits", () => {
  const tenantsDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenants-"));
  const site = stackSite(example, { stack: "acme", kind: "demo", computers: "machine-2", limits: { cpus: 4, memory_gb: 24, model_memory_gb: 48 }, cloud: null, tenantsDir });
  const s = sandbox(site, { tenant: "acme" });
  const big = s.run("setup-host.sh", "--secrets-only");
  assert.match(big.stdout, /Left out machine-2\/mlx\/large-mlx: the model needs 40 GB, and machine-2 has 8 GB left of the 48 GB it gives this stack's models\./);
  const tooBig = spawnSync("bash", [path.join(here, "setup-host.sh"), "--secrets-only"], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, TENANT: "acme", FAKE_DOCKER_INFO: "8 17179869184" }, encoding: "utf8" });
  assert.notEqual(tooBig.status, 0);
  assert.match(tooBig.stdout, /has 8 cores, and limits.cpus is 4/);
  assert.equal(big.status, 0, big.stdout + big.stderr);
  const gw = JSON.parse(fs.readFileSync(path.join(s.cc, "kit-out", "gateway.json"), "utf8"));
  assert.equal(gw.routes["machine-2/mlx/large-mlx"], undefined, "the gateway never offers the left-out model");
});

test("a stack's job runner on its one computer gets its own port and the computer's limits", () => {
  const tenantsDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenants-"));
  const site = stackSite(example, { stack: "acme", kind: "demo", computers: "machine-1", limits: { cpus: 2, memory_gb: 8, model_memory_gb: 12 }, cloud: null, tenantsDir });
  const s = sandbox(site, { tenant: "acme", system: "Linux" });
  fs.writeFileSync(path.join(s.home, "tenants/acme/node.env"), "JOBD_TOKEN=t\n");
  const r = s.run("setup-node.sh", "machine-1");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const unit = fs.readFileSync(path.join(s.units, "jobd-acme.service"), "utf8");
  assert.match(unit, /JOBD_PORT=7410 JOBD_SLOTS=1 JOBD_MEMORY_GB=8 JOBD_CPUS=2 /);
  assert.ok(!fs.existsSync(path.join(s.units, "kev-engine.service")), "the cluster's own stack starts the shared Kev's model");
  const other = s.run("setup-node.sh", "machine-2");
  assert.notEqual(other.status, 0);
  assert.match(other.stdout, /No node "machine-2" .* lists only the computers picked for the stack/);
});

// A Mac whose Docker runs in Colima: an office network address, and Tailscale's address. Each
// gateway check gets the answer the test names.
function colimaMac({ serveStatus = { TCP: { 4000: { TCPForward: "127.0.0.1:4001" } } }, jobsAnswer = "401", officeAnswers = false } = {}) {
  const s = sandbox(example, { system: "Darwin", dockerContext: "colima" });
  s.stub("tailscale", `[ "$1 $2" = "serve status" ] && echo '${JSON.stringify(serveStatus)}'; exit 0`);
  s.stub("ifconfig", `printf 'lo0: flags\\n\\tinet 127.0.0.1 netmask 0xff000000\\nen0: flags\\n\\tinet 192.168.1.20 netmask 0xffffff00\\nutun4: flags\\n\\tinet 100.64.0.1 --> 100.64.0.1\\n'`);
  s.stub("curl", `case "$*" in *127.0.0.1:4001*) printf ${jobsAnswer} ;; *192.168.1.20*) ${officeAnswers ? "printf 401" : "printf 000; exit 7"} ;; *) printf 000; exit 7 ;; esac`);
  s.stub("sleep", "");
  return s;
}

test("on a Mac with Colima, the gateway's port for port jobs is on 127.0.0.1, and tailscale serve gives the port to the tailnet", () => {
  const s = colimaMac();
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = s.calls();
  const router = calls.split("\n").find((l) => l.startsWith("docker run -d --name cc-gateway "));
  assert.match(router, /--network circlechat_default -p 127\.0\.0\.1:4001:4001 -v /);
  assert.doesNotMatch(router, /100\.64\.0\.1/, "Docker publishes nothing on the Tailscale address");
  assert.match(calls, /^tailscale serve --bg --tcp=4000 tcp:\/\/127\.0\.0\.1:4001$/m);
  // A request without a task key is refused, and the office network gets no answer on either port.
  assert.match(calls, /^curl .*http:\/\/127\.0\.0\.1:4001\/health$/m);
  assert.match(calls, /^curl .*http:\/\/192\.168\.1\.20:4000\/health$/m);
  assert.match(calls, /^curl .*http:\/\/192\.168\.1\.20:4001\/health$/m);
  assert.doesNotMatch(calls, /curl .*(127\.0\.0\.1|100\.64\.0\.1):4000/, "only other addresses are checked for the gateway port");
  assert.match(r.stdout, /Gateway for port jobs: Tailscale port 4000 only, and a task key is required/);
});

test("on a Mac with Colima, the setup stops when the gateway answers on the office network, without a task key, or outside tailscale serve", () => {
  const office = colimaMac({ officeAnswers: true }).run("setup-host.sh", "--secrets-only");
  assert.equal(office.status, 1);
  assert.match(office.stdout, /The gateway answers on 192\.168\.1\.20:4000, outside Tailscale/);
  const open = colimaMac({ jobsAnswer: "200" }).run("setup-host.sh", "--secrets-only");
  assert.equal(open.status, 1, open.stdout + open.stderr);
  assert.match(open.stdout, /answered 200 without a task key, not 401/);
  const unserved = colimaMac({ serveStatus: {} }).run("setup-host.sh", "--secrets-only");
  assert.equal(unserved.status, 1);
  assert.match(unserved.stdout, /tailscale serve does not pass port 4000 to 127\.0\.0\.1:4001/);
});

test("on Linux, and on a Mac with another Docker, Docker publishes the port for port jobs on the Tailscale address", () => {
  for (const [system, dockerContext] of [["Linux", "default"], ["Darwin", "orbstack"]]) {
    const s = sandbox(example, { system, dockerContext });
    s.stub("tailscale", "");
    const r = s.run("setup-host.sh", "--secrets-only");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const router = s.calls().split("\n").find((l) => l.startsWith("docker run -d --name cc-gateway "));
    assert.match(router, /-p 100\.64\.0\.1:4000:4001 -v /, system);
    assert.doesNotMatch(s.calls(), /tailscale serve/, system);
  }
});
