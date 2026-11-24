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

// A computer with stand-ins for docker, sudo and the rest.
//   layout: "new", the stack's folder ~/recursica-stack, or "old", CircleChat 1.x's ~/circlechat
//   networks: the Docker networks that exist, such as CircleChat 1.x's circlechat_models
function sandbox(site, { tenant, system, dockerContext = "default", layout = "new", networks = [] } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "setup-"));
  const bin = path.join(home, "bin"), log = path.join(home, "calls.log"), units = path.join(home, "units");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  stub("docker", `case "$1 $2" in "volume inspect") exit 1 ;; "network inspect") case " ${networks.join(" ")} " in *" $3 "*) exit 0 ;; esac; exit 1 ;; "context inspect") exit 0 ;; "context show") echo ${dockerContext} ;; "image inspect") echo "\${@: -1}@sha256:0123abcd" ;; "info --format") echo "\${FAKE_DOCKER_INFO:-}" ;; "info ") [ -z "\${FAKE_DOCKER_DOWN:-}" ]; exit ;; "ps -q") cat "${home}/fake-docker-ps" 2>/dev/null; exit 0 ;; esac; exit 0`);
  if (system) stub("uname", `[ "$1" = -s ] || [ $# -eq 0 ] && { echo ${system}; exit 0; }; PATH=/usr/bin:/bin exec uname "$@"`);
  stub("sudo", `if [ "$1" = tee ]; then cat > "${units}/$(basename "$2")"; exit 0; fi; if [ "$1" = -n ] || [ "$1" = -u ]; then exit 0; fi; exit 0`);
  // jobd's accounts on Linux (jobd/setup-jobd.sh): no account exists before useradd, and the group
  // recursica-jobd has the id 990.
  stub("getent", `[ "$1" = group ] && { echo "$2:x:990:"; exit 0; }; exit 2`);
  stub("systemctl", `[ "$1" = show ] && cat "${home}/fake-jobd-user" 2>/dev/null; exit 0`);
  const own = layout === "old" ? "circlechat" : "recursica-stack";
  const cc = tenant ? path.join(home, "tenants", tenant, layout === "old" ? "circlechat" : "stack") : path.join(home, own);
  fs.mkdirSync(cc, { recursive: true });
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify(site));
  const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, ...(tenant ? { TENANT: tenant } : {}) };
  // The cluster's own site.json, which a client or demo stack's computers are checked against.
  if (tenant) { fs.mkdirSync(path.join(home, own), { recursive: true }); fs.writeFileSync(path.join(home, own, "site.json"), JSON.stringify(example)); }
  const run = (script, ...args) => spawnSync("bash", [path.join(here, script), ...args], { env, encoding: "utf8", cwd: home });
  const dotenv = () => Object.fromEntries(fs.readFileSync(path.join(cc, ".env"), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  return { home, cc, run, dotenv, stub, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : ""), units };
}

test("setup-host --secrets-only starts the gateway on the gateway's own network, and writes no CircleChat setting", () => {
  const s = sandbox(example);
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const e = s.dotenv();
  for (const k of ["COMPOSE_FILE", "COMPOSE_PROJECT_NAME", "PUBLIC_BASE_URL", "CC_API_BASE", "CC_AGENT_NETWORK", "CC_AGENT_MCP_SERVERS", "CC_HERMES_IMAGE", "SESSION_SECRET", "APPROVE_RISK_AT", "HERMES_HOMES_DIR"]) assert.equal(e[k], undefined, k);
  assert.match(e.JOBD_TOKEN, /^[0-9a-f]{48}$/);
  for (const f of ["compose.egress.yml", "compose.privacy.yml", "compose.images.yml", "compose.workspace.yml", "compose.cloud-approvals.yml", "hermes-homes", "notify-state"]) assert.equal(fs.existsSync(path.join(s.cc, f)), false, f);
  // The gateway: LiteLLM alone on the gateway's network, with the keys from the secrets file and no
  // environment file; the router in front, on the same network, reachable over Tailscale for port
  // jobs on other computers.
  const calls = s.calls();
  // The setup looks for CircleChat 1.x's networks, and uses none.
  const changes = calls.split("\n").filter((l) => !l.startsWith("docker network inspect ")).join("\n");
  assert.doesNotMatch(changes, /docker compose|psql|cc-slack-notify|cc-cloud-requests|docker run -d --name cc-egress |circlechat_/);
  const litellm = calls.split("\n").find((l) => l.startsWith("docker run -d --name cc-litellm "));
  assert.match(litellm, /--network gateway-models /);
  assert.match(litellm, /-v .*\/model-keys\.env:\/run\/secrets\/model-keys\.env:ro/);
  assert.match(litellm, /--entrypoint python ghcr\.io\/berriai\/litellm:main-stable@sha256:0123abcd \/kit\/start-litellm\.py/);
  assert.doesNotMatch(litellm, /--env-file|-p /, "LiteLLM gets no environment file and publishes no port");
  // LiteLLM reaches the model servers directly, not through the outgoing filter.
  assert.match(litellm, /--add-host host\.docker\.internal:host-gateway /);
  assert.doesNotMatch(litellm, /_PROXY=|_proxy=/, "LiteLLM does not use the outgoing filter");
  assert.match(calls, /docker network create gateway-models\n/, "the gateway's network has a route out");
  const router = calls.split("\n").find((l) => l.startsWith("docker create --name cc-gateway "));
  // With the filter on, only the port for port jobs is published, on the Tailscale address.
  assert.match(router, /--network gateway-models -p 100\.64\.0\.1:4000:4001 -v /);
  assert.match(router, /LITELLM_URL=http:\/\/cc-litellm:4000/);
  assert.doesNotMatch(router, /--env-file|ANTHROPIC|DATABASE_URL|postgres:\/\//);
  // The router reaches the RecursicaChat server's gateway listener on the computer's 127.0.0.1, as LiteLLM reaches Ollama.
  assert.match(router, /--add-host host\.docker\.internal:host-gateway /);
  assert.doesNotMatch(calls, /docker network connect/, "the router needs no second network, and no port jobs' network exists here");
  assert.ok(fs.existsSync(path.join(s.cc, "gateway-app/router.mjs")));
  assert.equal(fs.existsSync(path.join(s.units, "db.url")), false, "no database role");
  assert.equal(e.LITELLM_MASTER_KEY, undefined, "no agent gets a master key");
  const lock = JSON.parse(fs.readFileSync(path.join(s.cc, "images.lock"), "utf8"));
  assert.equal(lock["ghcr.io/berriai/litellm:main-stable"].ref, "ghcr.io/berriai/litellm:main-stable@sha256:0123abcd");
  assert.equal(lock["nousresearch/hermes-agent:latest"], undefined, "no Hermes image");
});

test("a computer set up while CircleChat 1.x ran keeps the gateway on 1.x's networks, in every mode", () => {
  for (const mode of ["--secrets-only", "--upgrade"]) {
    const s = sandbox(example, { layout: "old", networks: ["circlechat_default", "circlechat_models", "circlechat_agents"] });
    const r = s.run("setup-host.sh", mode);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(s.cc, path.join(s.home, "circlechat"));
    assert.ok(fs.existsSync(path.join(s.cc, "kit-out/gateway.json")), `${mode}: the old folder holds the rendered files`);
    const calls = s.calls();
    assert.match(calls.split("\n").find((l) => l.startsWith("docker run -d --name cc-litellm ")), /--network circlechat_models /, mode);
    assert.match(calls.split("\n").find((l) => l.startsWith("docker create --name cc-gateway ")), /--network circlechat_default /, mode);
    assert.match(calls, /docker create --name cc-gateway (.*\n)*docker network connect circlechat_models cc-gateway\n(.*\n)*docker start cc-gateway\n/, mode);
    const changes = calls.split("\n").filter((l) => !l.startsWith("docker network inspect ")).join("\n");
    assert.doesNotMatch(changes, /docker network (create|rm)|circlechat_agents|gateway-models/, `${mode}: no network moves or is made`);
    assert.match(r.stdout, /The gateway keeps CircleChat 1\.x's networks circlechat_default and circlechat_models\. To move it, run circlechat\/migrate-off-1x\.sh\./);
  }
});

test("once the kit's own network exists, the gateway uses it, though 1.x's networks are still there", () => {
  const s = sandbox(example, { networks: ["gateway-models", "circlechat_default", "circlechat_models"] });
  assert.equal(s.run("setup-host.sh", "--secrets-only").status, 0);
  const calls = s.calls();
  assert.match(calls.split("\n").find((l) => l.startsWith("docker create --name cc-gateway ")), /--network gateway-models /);
  assert.doesNotMatch(calls, /circlechat_|docker network create/);
});

test("with the filter on, the router joins the port jobs' network on this computer as cc-gateway, before it starts", () => {
  const s = sandbox(example, { networks: ["jobs-egress"] });
  assert.equal(s.run("setup-host.sh", "--upgrade").status, 0);
  assert.match(s.calls(), /docker create --name cc-gateway (.*\n)*docker network connect --alias cc-gateway jobs-egress cc-gateway\n(.*\n)*docker start cc-gateway\n/);
  const off = structuredClone(example);
  off.egress = { ...(off.egress ?? {}), enabled: false };
  const t = sandbox(off, { networks: ["jobs-egress"] });
  assert.equal(t.run("setup-host.sh", "--upgrade").status, 0);
  assert.doesNotMatch(t.calls(), /jobs-egress/);
});

test("on a Mac, setup-host gives the gateway's secrets file and state folder to the owner, and on Linux leaves both to root", () => {
  const me = os.userInfo().username;
  for (const [system, owned] of [["Darwin", true], ["Linux", false]]) {
    const s = sandbox(example, { system });
    const r = s.run("setup-host.sh", "--secrets-only");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const calls = s.calls().split("\n");
    const gw = path.join(s.cc, "gateway-state");
    assert.equal(calls.includes(`sudo /usr/sbin/chown -h -R ${me} ${path.join(s.cc, "model-keys.env")} ${gw}`), owned, system);
    assert.equal(calls.some((l) => /^sudo \S*chown/.test(l)), owned, `${system}: no other chown`);
  }
});

test("setup-host --upgrade recreates the gateway, and starts no CircleChat container and no agents' filter", () => {
  const s = sandbox(example);
  const r = s.run("setup-host.sh", "--upgrade");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Upgrade applied: gateway recreated\./);
  assert.match(s.calls(), /^docker create --name cc-gateway /m);
  assert.doesNotMatch(s.calls(), /docker compose|docker run -d --name cc-egress /);
});

test("a client stack with cloud models runs the masking services and passes them to the gateway", () => {
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme", port: 8180, preview_port: 5273, gateway_port: 4100 });
  site.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "client-byok" };
  delete site.data; delete site.porter;
  const s = sandbox(site, { tenant: "acme" });
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(s.cc, path.join(s.home, "tenants/acme/stack"));
  const calls = s.calls();
  for (const svc of ["presidio-analyzer", "presidio-anonymizer"]) {
    assert.match(calls, new RegExp(`^docker run -d --name cc-${svc}-acme --restart unless-stopped --network gateway-models-acme --network-alias ${svc} mcr\\.microsoft\\.com/${svc}:latest@sha256:0123abcd$`, "m"));
  }
  assert.match(calls, /docker run -d --name cc-litellm-acme .*--network gateway-models-acme .*PRESIDIO_ANALYZER_API_BASE=http:\/\/presidio-analyzer:3000/);
  assert.equal(fs.existsSync(path.join(s.cc, "compose.privacy.yml")), false);
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
  fs.mkdirSync(path.join(s.home, "tenants/acme/stack"), { recursive: true });
  fs.copyFileSync(path.join(s.cc, "site.json"), path.join(s.home, "tenants/acme/stack/site.json"));
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
  assert.match(unit, /JOBD_DOCKER_DIRECT=allowed /, "a client stack's jobd on Linux keeps direct Docker access for now");
  assert.ok(!fs.existsSync(path.join(s.units, "jobd-gate.service")));
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

// tailscale serve status --json after the full setup: the app preview on 5173, on 127.0.0.1,
// tailnet only.
const host = example.site.public_host;
const siteServe = (extra = {}) => ({ Web: { [`${host}:5173`]: { Handlers: { "/": { Proxy: "http://127.0.0.1:5173" } } } }, ...extra });
// A stand-in for tailscale that records each call and answers serve status with the given status.
const tailscaleStub = (s, status = siteServe()) => s.stub("tailscale", `[ "$1 $2" = "serve status" ] && echo '${JSON.stringify(status)}'; exit 0`);
// A full setup, with stand-ins for git, so the run clones nothing, and for the Mac's model and VM
// services, so the run never reaches the computer's own Ollama, Colima or Homebrew.
function fullSetup(s, status) {
  s.stub("git", `[ "$1" = clone ] && mkdir -p "\${@: -1}/.git"; exit 0`);
  for (const t of ["ollama", "colima", "brew"]) s.stub(t, "exit 0");
  tailscaleStub(s, status);
  return s.run("setup-host.sh");
}

// launchd's pid for the kit's Colima service, with the service's own colima start among the pid's
// child processes, so the setup's wait for the VM ends at once (kit/lib.sh colima_service_started).
function colimaServiceRuns(s) {
  s.stub("launchctl", `printf 'system/io.recursica.colima = {\\n\\tpid = 4242\\n}\\n'`);
  s.stub("ps", `echo "4242 /opt/homebrew/bin/colima start -f --profile default"`);
}

// A Mac whose Docker runs in Colima: an office network address, and Tailscale's address. Each
// gateway check gets the answer the test names.
function colimaMac({ site = example, serveStatus = siteServe({ TCP: { 4000: { TCPForward: "127.0.0.1:4001" } } }), jobsAnswer = "401", officeAnswers = false } = {}) {
  const s = sandbox(site, { system: "Darwin", dockerContext: "colima" });
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
  const router = calls.split("\n").find((l) => l.startsWith("docker create --name cc-gateway "));
  assert.match(router, /--network gateway-models -p 127\.0\.0\.1:4001:4001 -v /);
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

// With KIT_HOLD_NETWORK=1, as the update job runs the setups (cluster/follow-main.mjs), no tailscale
// serve rule changes. Every other step runs.
test("with KIT_HOLD_NETWORK=1, setup-host.sh on a Mac with Colima starts the gateway and changes no tailscale serve rule", () => {
  const s = colimaMac({ serveStatus: {} });
  const r = spawnSync("bash", [path.join(here, "setup-host.sh"), "--secrets-only"], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, KIT_HOLD_NETWORK: "1" }, encoding: "utf8", cwd: s.home });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^Held for a person, with KIT_HOLD_NETWORK=1: tailscale serve for the gateway's port for port jobs\.$/m);
  assert.ok(s.calls().split("\n").some((l) => l.startsWith("docker create --name cc-gateway ")));
  assert.doesNotMatch(s.calls(), /^tailscale serve --bg/m);
  assert.doesNotMatch(r.stdout, /Gateway for port jobs/);
});

test("the full setup-host.sh adds the tailnet addresses and records its kit commit, and with KIT_HOLD_NETWORK=1 does neither", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  for (const hold of [false, true]) {
    const s = sandbox(example, { system: "Linux" });
    s.stub("git", `[ "$1" = clone ] && mkdir -p "\${@: -1}/.git"; [ "$3" = rev-parse ] && echo ${sha}; exit 0`);
    for (const t of ["ollama", "colima", "brew"]) s.stub(t, "exit 0");
    tailscaleStub(s);
    const r = spawnSync("bash", [path.join(here, "setup-host.sh")], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, ...(hold ? { KIT_HOLD_NETWORK: "1" } : {}) }, encoding: "utf8", cwd: s.home });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const marker = path.join(s.home, ".recursica-kit/network-applied/setup-host.sh");
    if (hold) {
      assert.doesNotMatch(s.calls(), /^tailscale serve --bg/m);
      assert.match(r.stdout, /tailscale serve for the app preview waits for a person: run setup-host\.sh by hand\./);
      assert.match(r.stdout, /^Held for a person, with KIT_HOLD_NETWORK=1: removing CircleChat 1\.x's jobs \(circlechat-boot, backup, restore-test, release-watch, agents-sync\), which can stop work that runs\.$/m);
      assert.equal(fs.existsSync(marker), false);
    } else {
      assert.match(s.calls(), /^tailscale serve --bg --https=5173 http:\/\/127\.0\.0\.1:5173$/m);
      assert.doesNotMatch(s.calls(), /--https=443/, "CircleChat 1.x gets no address");
      assert.doesNotMatch(r.stdout, /Held for a person/);
      assert.equal(fs.readFileSync(marker, "utf8"), `${sha}\n`);
    }
  }
});

test("on Linux, and on a Mac with another Docker, Docker publishes the port for port jobs on the Tailscale address", () => {
  for (const [system, dockerContext] of [["Linux", "default"], ["Darwin", "orbstack"]]) {
    const s = sandbox(example, { system, dockerContext });
    s.stub("tailscale", "");
    const r = s.run("setup-host.sh", "--secrets-only");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const router = s.calls().split("\n").find((l) => l.startsWith("docker create --name cc-gateway "));
    assert.match(router, /-p 100\.64\.0\.1:4000:4001 -v /, system);
    assert.doesNotMatch(s.calls(), /tailscale serve/, system);
  }
});

// site.gateway_local_port: the gateway's agents' port on 127.0.0.1, for a RecursicaChat 2.0 server on
// the control computer. health: what /health answers on 127.0.0.1; noKey: what a model request with no
// gateway key gets; elsewhere: whether the port also answers on the office network.
function localPortMac({ health = "200", noKey = "401", elsewhere = false } = {}) {
  const site = structuredClone(example);
  site.site.gateway_local_port = 4002;
  const s = colimaMac({ site });
  s.stub("curl", `case "$*" in *127.0.0.1:4001*) printf 401 ;; *127.0.0.1:4002/health*) printf ${health} ;; *127.0.0.1:4002/v1/*) printf ${noKey} ;; *192.168.1.20:4002*) ${elsewhere ? "printf 200" : "printf 000; exit 7"} ;; *) printf 000; exit 7 ;; esac`);
  return s;
}

test("site.gateway_local_port publishes the gateway's agents' port on 127.0.0.1 only, with the filter on, and checks the port", () => {
  const s = localPortMac();
  const r = s.run("setup-host.sh", "--secrets-only");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = s.calls();
  const router = calls.split("\n").find((l) => l.startsWith("docker create --name cc-gateway "));
  assert.match(router, / -p 127\.0\.0\.1:4002:4000 /);
  assert.deepEqual(router.match(/-p \S+:4000 /g), ["-p 127.0.0.1:4002:4000 "], "the agents' port is published once, on 127.0.0.1");
  assert.doesNotMatch(router, /(100\.64\.0\.1|192\.168\.1\.20|0\.0\.0\.0):4002/);
  assert.match(calls, /^curl .*http:\/\/127\.0\.0\.1:4002\/health$/m);
  assert.match(calls, /^curl .*-X POST .*http:\/\/127\.0\.0\.1:4002\/v1\/chat\/completions$/m);
  assert.match(calls, /^curl .*http:\/\/192\.168\.1\.20:4002\/health$/m, "the office network is checked");
  assert.match(calls, /^curl .*http:\/\/100\.64\.0\.1:4002\/health$/m, "Tailscale's address is checked too");
  assert.match(r.stdout, /Gateway's local port: 127\.0\.0\.1:4002 only, and an agent's gateway key is required/);
});

test("without site.gateway_local_port, the filter keeps the gateway's agents' port off the computer", () => {
  const s = colimaMac();
  assert.equal(s.run("setup-host.sh", "--secrets-only").status, 0);
  const router = s.calls().split("\n").find((l) => l.startsWith("docker create --name cc-gateway "));
  assert.doesNotMatch(router, /-p \S+:4000 /);
  assert.doesNotMatch(s.calls(), /Gateway's local port/);
});

test("the setup stops when the gateway's local port is down, answers without a key, or answers on another address", () => {
  const down = localPortMac({ health: "000" }).run("setup-host.sh", "--secrets-only");
  assert.equal(down.status, 1, down.stdout + down.stderr);
  assert.match(down.stdout, /local port 4002 answered 000 on 127\.0\.0\.1, not 200/);
  const open = localPortMac({ noKey: "200" }).run("setup-host.sh", "--secrets-only");
  assert.equal(open.status, 1, open.stdout + open.stderr);
  assert.match(open.stdout, /answered 200 to a request with no gateway key, not 401/);
  const wide = localPortMac({ elsewhere: true }).run("setup-host.sh", "--secrets-only");
  assert.equal(wide.status, 1, wide.stdout + wide.stderr);
  assert.match(wide.stdout, /answers on 192\.168\.1\.20:4002, not only on 127\.0\.0\.1/);
});

test("on a Mac, the full setup runs Colima and Ollama as the kit's services, with the Ollama settings from site.json", () => {
  const site = structuredClone(example);
  Object.assign(site.nodes.find((n) => n.control).servers.find((sv) => sv.kind === "ollama"), { context_length: 131072, parallel: 4, keep_alive: "-1" });
  // colimaMac stands in for tailscale serve and its checks.
  const s = colimaMac({ site });
  s.stub("git", `[ "$1" = clone ] && mkdir -p "\${@: -1}/.git"; exit 0`);
  for (const t of ["ollama", "colima", "brew"]) s.stub(t, "exit 0");
  colimaServiceRuns(s);
  const daemons = path.join(s.home, "LaunchDaemons");
  fs.mkdirSync(daemons);
  const r = spawnSync("bash", [path.join(here, "setup-host.sh")], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, LAUNCH_DAEMONS_DIR: daemons }, encoding: "utf8", cwd: s.home });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(s.units, "io.recursica.colima.plist")));
  assert.match(fs.readFileSync(path.join(s.units, "io.recursica.ollama.plist"), "utf8"),
    / OLLAMA_HOST=127\.0\.0\.1:11434 OLLAMA_CONTEXT_LENGTH=131072 OLLAMA_NUM_PARALLEL=4 OLLAMA_KEEP_ALIVE=-1 exec \S*\/ollama serve/);
});

test("on a Mac whose Colima VM is stopped, with only the default Docker context, the full setup installs the kit's Colima service for the VM in ~/.colima", () => {
  const s = sandbox(example, { system: "Darwin" });
  s.stub("git", `[ "$1" = clone ] && mkdir -p "\${@: -1}/.git"; exit 0`);
  for (const t of ["ollama", "colima", "brew"]) s.stub(t, "exit 0");
  tailscaleStub(s);
  s.stub("sleep", "");
  colimaServiceRuns(s);
  fs.mkdirSync(path.join(s.home, ".colima/default"), { recursive: true });
  fs.writeFileSync(path.join(s.home, ".colima/default/colima.yaml"), "cpu: 4\n");
  const daemons = path.join(s.home, "LaunchDaemons");
  fs.mkdirSync(daemons);
  // The default context points at no Docker, so docker info gets no answer.
  const r = spawnSync("bash", [path.join(here, "setup-host.sh")], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, LAUNCH_DAEMONS_DIR: daemons, COLIMA_HOME: "", FAKE_DOCKER_DOWN: "1" }, encoding: "utf8", cwd: s.home });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(s.units, "io.recursica.colima.plist"), "utf8"), /exec \S*\/colima-service\.sh default</);
  const calls = s.calls();
  assert.match(calls, /^sudo launchctl bootstrap system \/Library\/LaunchDaemons\/io\.recursica\.colima\.plist\n(.*\n)*docker --context colima info$/m, "the setup waits for the VM's own Docker context");
});

test("on a Mac, the full setup stops and changes nothing while a LaunchDaemon outside the kit runs Colima or Ollama", () => {
  const s = sandbox(example, { system: "Darwin", dockerContext: "colima" });
  for (const t of ["ollama", "colima", "brew", "tailscale", "git"]) s.stub(t, "exit 0");
  // A plain-text stand-in for each daemon's plist, and for plutil, which reads it.
  const daemons = path.join(s.home, "LaunchDaemons");
  fs.mkdirSync(daemons);
  fs.writeFileSync(path.join(daemons, "local.colima.plist"), `Label=local.colima\nProgramArguments=["/bin/bash","-c","colima start -f"]\n`);
  s.stub("plutil", `f="\${@: -1}"; sed -n "s/^$2=//p" "$f" | grep . || exit 1`);
  const r = spawnSync("bash", [path.join(here, "setup-host.sh")], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, LAUNCH_DAEMONS_DIR: daemons }, encoding: "utf8", cwd: s.home });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /A LaunchDaemon outside the kit already runs Colima or Ollama/);
  assert.match(r.stdout, new RegExp(`colima: sudo launchctl bootout system/local\\.colima && sudo rm ${daemons}/local\\.colima\\.plist`));
  assert.doesNotMatch(s.calls(), /^(sudo|brew|colima|ollama|git) |^docker (run|rm|compose|network|context use)/m, "nothing ran that changes the computer");
  assert.equal(fs.readdirSync(s.units).length, 0, "no service was installed");
  assert.ok(!fs.existsSync(path.join(s.cc, "kit-out")), "the setup stopped before the render");
  assert.ok(!fs.existsSync(path.join(s.cc, ".env")));
});

test("the full setup gives the app preview a tailnet-only address with tailscale serve, and starts no CircleChat", () => {
  const s = sandbox(example, { system: "Linux" });
  const r = fullSetup(s);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = s.calls();
  assert.match(calls, /^tailscale serve --bg --https=5173 http:\/\/127\.0\.0\.1:5173$/m);
  assert.doesNotMatch(calls, /^tailscale serve .*--https=443/m);
  assert.doesNotMatch(calls, /^tailscale funnel/m, "the setup never turns on Funnel");
  assert.doesNotMatch(calls, /docker compose|kb-proposals/);
  assert.match(calls, /^docker run -d --name betty-proto /m);
  assert.match(r.stdout, /tailscale serve, tailnet only: https:\/\/stack\.example\.ts\.net:5173 passes to http:\/\/127\.0\.0\.1:5173 for the app preview\./);
  assert.ok(fs.existsSync(path.join(s.home, "recursica-workspace", "recursica-knowledge", ".git")), "the workspace has the new name");
  assert.equal(fs.existsSync(path.join(s.cc, "hermes-homes")), false);
  for (const u of ["agents-sync.service", "release-watch.service", "circlechat-boot.service", "backup.service"]) assert.equal(fs.existsSync(path.join(s.units, u)), false, u);
});

test("the full setup stops when a serve rule is missing, or when Funnel serves a port to the internet", () => {
  const noPreview = siteServe(); delete noPreview.Web[`${host}:5173`];
  for (const [status, message] of [
    [noPreview, /HTTPS port 5173 does not pass to http:\/\/127\.0\.0\.1:5173/],
    [siteServe({ AllowFunnel: { [`${host}:5173`]: true } }), /Funnel serves HTTPS port 5173 to the internet\. Turn Funnel off: tailscale funnel --https=5173 off/],
  ]) {
    const r = fullSetup(sandbox(example, { system: "Linux" }), status);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, message);
  }
});

test("with site.proxy other, the full setup leaves tailscale serve alone and names the preview's local port", () => {
  const site = structuredClone(example);
  site.site.proxy = "other";
  const s = sandbox(site, { system: "Linux" });
  const r = fullSetup(s);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(s.calls(), /^tailscale serve --bg --https/m);
  assert.match(r.stdout, /Point an HTTPS reverse proxy on this computer at http:\/\/127\.0\.0\.1:5173 for the app preview\./);
});

test("with the secrets helper, --secrets-only takes only the Docker steps, and the owner needs no sudo", () => {
  for (const system of ["Linux", "Darwin"]) {
    const s = sandbox(example, { system });
    // The owner's sudo asks for a password, as on a computer with no password-free sudo.
    s.stub("sudo", `echo "sudo: a password is required" >&2; exit 1`);
    const pw = "0123456789abcdef0123456789abcdef0123456789abcdef";
    // KIT_SECRETS_HELPER, the older name of KIT_ROOT_STEPS, from a secrets helper installed before.
    const r = spawnSync("bash", [path.join(here, "setup-host.sh"), "--secrets-only"], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, KIT_SECRETS_HELPER: "1" }, input: `${pw}\n`, encoding: "utf8", cwd: s.home });
    assert.equal(r.status, 0, system + r.stdout + r.stderr);
    assert.match(r.stdout, /Secrets applied: gateway recreated\./);
    const calls = s.calls();
    assert.doesNotMatch(calls, /^sudo /m, `${system}: no sudo`);
    assert.doesNotMatch(calls, /psql|docker compose/, "no database role");
    assert.match(calls, /^docker create --name cc-gateway /m);
    assert.match(calls, /^docker run -d --name cc-litellm /m);
    assert.ok(!fs.existsSync(path.join(s.units, "db.url")));
    assert.doesNotMatch(calls, /key-check\.mjs/);
  }
});

test("with root's steps, --upgrade takes only the Docker steps, and the owner needs no sudo", () => {
  for (const system of ["Linux", "Darwin"]) {
    const s = sandbox(example, { system });
    s.stub("sudo", `echo "sudo: a password is required" >&2; exit 1`);
    // A root process from this kit passes nothing on stdin.
    const r = spawnSync("bash", [path.join(here, "setup-host.sh"), "--upgrade"], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, KIT_ROOT_STEPS: "1" }, input: "", encoding: "utf8", cwd: s.home });
    assert.equal(r.status, 0, system + r.stdout + r.stderr);
    assert.match(r.stdout, /Upgrade applied: gateway recreated\./);
    const calls = s.calls();
    assert.doesNotMatch(calls, /^sudo /m, `${system}: no sudo`);
    assert.doesNotMatch(calls, /docker compose|psql|docker run -d --name cc-egress /);
    assert.match(calls, /^docker create --name cc-gateway /m);
    assert.doesNotMatch(calls, /key-check\.mjs/);
  }
});

test("root's steps run only with --secrets-only or --upgrade, under either name", () => {
  const s = sandbox(example, { system: "Linux" });
  for (const name of ["KIT_ROOT_STEPS", "KIT_SECRETS_HELPER"]) {
    const r = spawnSync("bash", [path.join(here, "setup-host.sh")], { env: { ...process.env, HOME: s.home, PATH: `${s.home}/bin:${process.env.PATH}`, [name]: "1" }, input: "x\n", encoding: "utf8", cwd: s.home });
    assert.equal(r.status, 1, name);
    assert.match(r.stdout, /KIT_ROOT_STEPS needs --secrets-only or --upgrade/);
  }
});

test("the job runner listens on loopback and the computer's Tailscale addresses, never on every interface", () => {
  for (const [ts, want] of [
    [`[ "$1 $2" = "ip -4" ] && echo 100.64.0.2; [ "$1 $2" = "ip -6" ] && echo fd7a:115c:a1e0::2; exit 0`, "127.0.0.1,100.64.0.2,fd7a:115c:a1e0::2"],
    ["exit 1", "127.0.0.1"],
  ]) {
    const site = structuredClone(example);
    Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
    site.site.cloud_models = { allowed: true, granted_by: "Person A", granted_on: "2026-10-20", payer: "client-byok" };
    delete site.data;
    const s = sandbox(site, { tenant: "acme", system: "Linux" });
    s.stub("tailscale", ts); s.stub("tailscale.exe", "exit 1");
    fs.writeFileSync(path.join(s.home, "tenants/acme/node.env"), "JOBD_TOKEN=t\n");
    const r = s.run("setup-node.sh", site.nodes.find((n) => n.jobs).name);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const unit = fs.readFileSync(path.join(s.units, "jobd-acme.service"), "utf8");
    assert.match(unit, new RegExp(` JOBD_HOST=${want.replace(/\./g, "\\.")} JOBD_PORT=`));
    assert.equal(/listens on 127\.0\.0\.1 only/.test(r.stdout), want === "127.0.0.1");
  }
});

test("setup-node.sh reads porter.env without running a value, whatever porter.owner holds", () => {
  const site = structuredClone(example);
  const s = sandbox(site, { system: "Linux" });
  const ran = path.join(s.home, "ran");
  // Balanced quotes: with the old ". porter.env", bash ran this value.
  site.porter = { ...site.porter, owner: `acme$(touch ${ran});"q"'x'\`touch ${ran}\`` };
  fs.writeFileSync(path.join(s.cc, "site.json"), JSON.stringify(site));
  fs.writeFileSync(path.join(s.home, ".recursica-node.env"), "JOBD_TOKEN=t\n");
  const r = s.run("setup-node.sh", site.nodes.find((n) => n.jobs).name);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(ran), "a value in porter.env ran");
});

test("setup-node runs the cluster's own jobd on Linux as jobd's own account, behind jobd's Docker filter", () => {
  const s = sandbox(example, { system: "Linux" });
  fs.writeFileSync(path.join(s.home, ".recursica-node.env"), "JOBD_TOKEN=t0ken\nPORTER_HOOK_URL=http://127.0.0.1:9/hook\nKEV_API_KEY=never-in-jobd\nPORTER_MODEL=sonnet\n");
  const node = example.nodes.find((n) => n.jobs && n.os === "linux");
  const r = s.run("setup-node.sh", node.name);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = s.calls();
  for (const a of ["recursica-jobd", "recursica-jobd-gate"]) {
    assert.match(calls, new RegExp(`sudo useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin ${a}\n`));
  }
  assert.match(calls, /sudo chown -h recursica-jobd-gate:recursica-jobd \/var\/lib\/recursica-jobd-work\n/);
  assert.match(calls, /sudo chmod 2750 \/var\/lib\/recursica-jobd-work\n/);
  assert.match(calls, /sudo chmod 700 \/var\/lib\/recursica-jobd\n/);
  assert.match(calls, /sudo install -o root -g root -m 644 \S+\/jobd\/jobd\.mjs \S+\/jobd\/docker-gate\.mjs \/usr\/local\/lib\/recursica-jobd\//);

  // jobd: jobd's account, no docker group, and Docker through the filter only.
  const jobd = fs.readFileSync(path.join(s.units, "jobd.service"), "utf8");
  assert.match(jobd, /^User=recursica-jobd$/m);
  assert.doesNotMatch(jobd, /^(Group|SupplementaryGroups)=/m);
  assert.match(jobd, /DOCKER_HOST=unix:\/\/\/run\/recursica-jobd-gate\/docker\.sock /);
  assert.match(jobd, /JOBD_DIR=\/var\/lib\/recursica-jobd\/jobs JOBD_WORK_ROOT=\/var\/lib\/recursica-jobd-work /);
  assert.match(jobd, /\. \/etc\/recursica-jobd\/jobd\.env;/);
  assert.doesNotMatch(jobd, /recursica-node\.env|JOBD_DOCKER_DIRECT/, "jobd never reads the owner's secrets file, and never reaches Docker directly");
  assert.match(jobd, /^ProtectHome=yes$/m);
  assert.match(jobd, /^ReadWritePaths=\/var\/lib\/recursica-jobd \/var\/lib\/recursica-jobd-work$/m);
  assert.match(jobd, /^NoNewPrivileges=yes$/m);

  // The filter: the docker group for this service only, and no network.
  const gate = fs.readFileSync(path.join(s.units, "jobd-gate.service"), "utf8");
  for (const line of ["User=recursica-jobd-gate", "Group=recursica-jobd", "SupplementaryGroups=docker", "RuntimeDirectory=recursica-jobd-gate",
    "RuntimeDirectoryMode=0750", "PrivateNetwork=yes", "RestrictAddressFamilies=AF_UNIX", "ReadWritePaths=/var/lib/recursica-jobd-work", "CapabilityBoundingSet="]) {
    assert.ok(gate.split("\n").includes(line), line);
  }
  assert.match(gate, /docker-gate\.mjs \/etc\/recursica-jobd\/gate\.json'$/m);

  // jobd's secrets: only the names jobd uses.
  assert.equal(fs.readFileSync(path.join(s.units, "jobd.env"), "utf8"), "JOBD_TOKEN=t0ken\nPORTER_HOOK_URL=http://127.0.0.1:9/hook\nPORTER_MODEL=sonnet\n");
  assert.match(calls, /sudo install -o root -g recursica-jobd -m 640 \/dev\/null \/etc\/recursica-jobd\/jobd\.env\n/);

  const cfg = JSON.parse(fs.readFileSync(path.join(s.units, "gate.json"), "utf8"));
  const { envNames, ...rest } = cfg;
  assert.deepEqual(rest, { listen: "/run/recursica-jobd-gate/docker.sock", docker: "/var/run/docker.sock", image: "recursica/porter-job",
    network: "jobs-egress", memoryBytes: node.jobs.memory_gb * 2 ** 30, nanoCpus: 0, pidsLimit: 4096, workRoot: "/var/lib/recursica-jobd-work", groupId: 990 });
  for (const n of ["TARGET_REPO", "PORTER_REPORT", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "GITHUB_TOKEN_URL", "PORTER_MODEL", "HTTPS_PROXY", "NO_PROXY"]) assert.ok(envNames.includes(n), n);
  assert.ok(!envNames.includes("KEV_API_KEY"));
});

test("setup-node moves jobd to jobd's own account only when no port job runs", () => {
  const s = sandbox(example, { system: "Linux" });
  fs.writeFileSync(path.join(s.home, ".recursica-node.env"), "JOBD_TOKEN=t\n");
  fs.writeFileSync(path.join(s.home, "fake-docker-ps"), "0123456789ab\nba9876543210\n");
  const node = example.nodes.find((n) => n.jobs && n.os === "linux").name;
  const busy = s.run("setup-node.sh", node);
  assert.notEqual(busy.status, 0);
  assert.match(busy.stdout, /2 port job\(s\) run on this computer\. jobd moves to the account recursica-jobd only when no port job runs\. Wait until every port job ends, then run setup-node\.sh again\./);
  assert.ok(!fs.existsSync(path.join(s.units, "jobd.service")));
  assert.doesNotMatch(s.calls(), /useradd/);
  // After the move, a rerun leaves running jobs alone: a new jobd picks the jobs up.
  fs.writeFileSync(path.join(s.home, "fake-jobd-user"), "recursica-jobd\n");
  const again = s.run("setup-node.sh", node);
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(fs.readFileSync(path.join(s.units, "jobd.service"), "utf8"), /^User=recursica-jobd$/m);
});
