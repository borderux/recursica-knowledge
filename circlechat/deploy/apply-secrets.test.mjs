// Runs apply-secrets.sh against a throwaway home folder, with no restart.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const example = JSON.parse(fs.readFileSync(path.join(here, "..", "site.example.json"), "utf8"));
const control = example.nodes.find((n) => n.control).name;

// A stand-in for the kit's check (kit/check-kit.sh, tested in kit/check-kit.test.mjs): passes, or
// refuses the kit with the given message.
function fakeKitCheck(kit, refuse = "") {
  fs.mkdirSync(path.join(kit, "circlechat", "kit"), { recursive: true });
  fs.writeFileSync(path.join(kit, "circlechat", "kit", "check-kit.sh"), refuse ? `echo "${refuse}"; exit 1\n` : "exit 0\n");
}

function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "stacks-"));
  fakeKitCheck(path.join(home, "kit"));
  fs.mkdirSync(path.join(home, "circlechat", "hermes-homes", ".hermes-alan"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify(example));
  fs.writeFileSync(path.join(home, "circlechat", ".env"), "KEEP=1\nANTHROPIC_API_KEY=old\n");
  const conf = path.join(home, "conf");
  fs.writeFileSync(conf, `OWNER=${os.userInfo().username}\nOWNER_HOME=${home}\nKIT=${path.join(home, "kit")}\nNODE_BIN=${process.execPath}\n`);
  return { home, conf };
}

function apply(conf, args, input, env = {}) {
  return spawnSync("bash", [path.join(here, "apply-secrets.sh"), ...args], {
    input,
    env: { ...process.env, AGENT_STACKS_CONF: conf, AGENT_CLUSTER_ENV: path.join(path.dirname(conf), "agent-cluster.env"), ...env },
    encoding: "utf8",
  });
}

// Stand-ins for uname, which reports the given system, and chown, which records each call.
function fakeSystem(home, system) {
  const bin = path.join(home, "bin"), log = path.join(home, "chown.log");
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, "uname"), `#!/usr/bin/env bash\necho ${system}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "chown"), `#!/usr/bin/env bash\necho "chown $*" >> "${log}"\n`, { mode: 0o755 });
  return { env: { PATH: `${bin}:${process.env.PATH}` }, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "") };
}

test("writes each known secret to the file that uses it, and keeps other lines", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["border", control, "false"],
    "MODEL_KEY_ACME_GROK=xai-1\nANTHROPIC_API_KEY=new\nALAN_GITHUB_PAT=ghp_a\nJOBD_TOKEN=jt\nPORTER_ANTHROPIC_API_KEY=pk\nGITHUB_TOKEN=ignored\nPATH=/x\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const env = fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8");
  assert.match(env, /^KEEP=1$/m);
  assert.doesNotMatch(env, /ANTHROPIC_API_KEY|MODEL_KEY|GITHUB_TOKEN|PATH=/, ".env holds no cloud key, and the old one is gone");
  // Each cloud key goes to the gateway's secrets file; ANTHROPIC_API_KEY is the default key.
  const keys = path.join(home, "circlechat", "model-keys.env");
  assert.equal(fs.readFileSync(keys, "utf8"), "MODEL_KEY_ACME_GROK=xai-1\nMODEL_KEY_DEFAULT=new\n");
  assert.equal(fs.statSync(keys).mode & 0o777, 0o600);
  const alan = fs.readFileSync(path.join(home, "circlechat", "hermes-homes", ".hermes-alan", ".env"), "utf8");
  assert.match(alan, /^ALAN_GITHUB_PAT=ghp_a$/m);
  // The port jobs' computers get no cloud key.
  const nodeEnv = fs.readFileSync(path.join(home, ".recursica-node.env"), "utf8");
  assert.doesNotMatch(nodeEnv, /ANTHROPIC_API_KEY|pk/);
  assert.match(r.stdout, /PORTER_ANTHROPIC_API_KEY skipped: port jobs use the gateway/);
  assert.equal(fs.statSync(path.join(home, ".recursica-node.env")).mode & 0o777, 0o600);
});

test("on a Mac, the gateway's secrets file belongs to the owner, and on Linux to root", () => {
  for (const [system, owned] of [["Darwin", true], ["Linux", false]]) {
    const { home, conf } = setup();
    const fake = fakeSystem(home, system);
    const r = apply(conf, ["border", control, "false"], "MODEL_KEY_DEFAULT=k\n", fake.env);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const keys = path.join(home, "circlechat", "model-keys.env");
    const call = `chown -h ${os.userInfo().username} ${keys}`;
    assert.equal(fake.calls().split("\n").includes(call), owned, `${system}: ${fake.calls()}`);
    assert.equal(fs.statSync(keys).mode & 0o777, 0o600);
  }
});

test("refuses to write the cloud keys through a symlink, and writes nothing", () => {
  const { home, conf } = setup();
  const target = path.join(home, "elsewhere.txt");
  fs.writeFileSync(target, "untouched\n");
  const keys = path.join(home, "circlechat", "model-keys.env");
  fs.symlinkSync(target, keys);
  const r = apply(conf, ["border", control, "false"], "MODEL_KEY_DEFAULT=k\nJOBD_TOKEN=jt\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: .*model-keys\.env is a symlink/);
  assert.equal(fs.readFileSync(target, "utf8"), "untouched\n");
  assert.ok(fs.lstatSync(keys).isSymbolicLink());
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /JOBD_TOKEN/);
});

test("refuses a provider's own credential names, which used to land in .env", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["border", control, "false"], "SLACK_BOT_TOKEN=x\nAZURE_API_KEY=k\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: AZURE_API_KEY goes in a MODEL_KEY_<NAME> secret now/);
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /SLACK_BOT_TOKEN/);
});

test("refuses a stack name outside border and client-<name>", () => {
  const { conf } = setup();
  assert.notEqual(apply(conf, ["prod", control, "false"], "").status, 0);
  assert.notEqual(apply(conf, ["client-../x", control, "false"], "").status, 0);
});

test("refuses a client stack whose site.json is not on this computer", () => {
  const { conf } = setup();
  const r = apply(conf, ["client-acme", control, "false"], "ANTHROPIC_API_KEY=x\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /No .*tenants\/acme\/circlechat\/site.json/);
});

for (const kind of ["client", "demo"]) test(`refuses a cloud key for a local-only ${kind} stack, and writes nothing`, () => {
  const { home, conf } = setup();
  const dir = path.join(home, "tenants", "acme", "circlechat");
  fs.mkdirSync(dir, { recursive: true });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind, docker_context: "colima-acme" });
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  const r = apply(conf, ["client-acme", control, "false"], "SLACK_WEBHOOK_URL=https://x\nANTHROPIC_API_KEY=k\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: ANTHROPIC_API_KEY is a cloud model key/);
  assert.equal(fs.existsSync(path.join(dir, ".env")), false);
  const k = apply(conf, ["client-acme", control, "false"], "MODEL_KEY_DEFAULT=k\n");
  assert.match(k.stdout, /Refused: MODEL_KEY_DEFAULT is a cloud model key/);
  assert.equal(fs.existsSync(path.join(dir, "model-keys.env")), false);
});

test("a client stack's secrets file sits inside the client's folder", () => {
  const { home, conf } = setup();
  const dir = path.join(home, "tenants", "acme", "circlechat");
  fs.mkdirSync(dir, { recursive: true });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  site.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "client-byok" };
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  const r = apply(conf, ["client-acme", control, "false"], "JOBD_TOKEN=jt\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(home, "tenants", "acme", "node.env"), "utf8"), /^JOBD_TOKEN=jt$/m);
});

test("unlock refuses Border's stack, which has no disk image", () => {
  const { conf } = setup();
  const r = apply(conf, ["--unlock", "border", control], "STACK_DISK_KEY=x\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Only a client stack has an encrypted disk image/);
});

test("the cluster's secrets go to the cluster file, for the border stack only", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["border", control, "false"], "SLACK_BOT_TOKEN=xoxb-1\nTOTP_SECRET_PERSON_A=ABC\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const f = fs.readFileSync(path.join(home, "agent-cluster.env"), "utf8");
  assert.match(f, /^SLACK_BOT_TOKEN=xoxb-1$/m);
  assert.match(f, /^TOTP_SECRET_PERSON_A=ABC$/m);
});

test("a client stack never gets Alan's token for the public repo", () => {
  const { home, conf } = setup();
  const dir = path.join(home, "tenants", "acme", "circlechat");
  fs.mkdirSync(dir, { recursive: true });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  const r = apply(conf, ["client-acme", control, "false"], "ALAN_GITHUB_PAT=ghp_x\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: stack client-acme uses the public knowledge repo/);
});

test("a client stack with its own knowledge fork may hold Alan's token", () => {
  const { home, conf } = setup();
  const dir = path.join(home, "tenants", "acme", "circlechat");
  fs.mkdirSync(path.join(dir, "hermes-homes", ".hermes-alan"), { recursive: true });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  site.repos.knowledge = "https://git.acme.example/design/recursica-knowledge";
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  const r = apply(conf, ["client-acme", control, "false"], "ALAN_GITHUB_PAT=ghp_x\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("on Linux, unlock opens the LUKS image itself, then starts the VM as the owner with no key", { skip: process.platform !== "linux" }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "stacks-"));
  const bin = path.join(home, "bin");
  const kit = path.join(home, "kit");
  const log = path.join(home, "log");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(kit, "circlechat", "tenant"), { recursive: true });
  // stdin=<n> is the length of what the call read on stdin.
  const stub = (file, name) => fs.writeFileSync(file, `#!/usr/bin/env bash\nin="$(cat)"; echo "${name} $* stdin=\${#in}" >> "${log}"\n`, { mode: 0o755 });
  stub(path.join(bin, "helper"), "helper");
  stub(path.join(kit, "circlechat", "tenant", "disk-image.sh"), "disk-image.sh");
  fakeKitCheck(kit);
  fs.writeFileSync(path.join(bin, "sudo"), '#!/usr/bin/env bash\n[ "$1" = -n ] && shift; exec "$@"\n', { mode: 0o755 });
  const conf = path.join(home, "conf");
  fs.writeFileSync(conf, `OWNER=${os.userInfo().username}\nOWNER_HOME=${home}\nKIT=${kit}\nNODE_BIN=${process.execPath}\n`);
  const env = { ...process.env, AGENT_STACKS_CONF: conf, AGENT_STACKS_DISK: path.join(bin, "helper"), PATH: `${bin}:${process.env.PATH}` };
  const run = (args, input) => spawnSync("bash", [path.join(here, "apply-secrets.sh"), ...args], { env, input, encoding: "utf8" });
  let r = run(["--unlock", "client-acme", control], `STACK_DISK_KEY=${"k".repeat(32)}\n`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  r = run(["--lock", "client-acme", control], "");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(fs.readFileSync(log, "utf8").trim().split("\n"), [
    "helper open acme stdin=32",
    "disk-image.sh unlock acme stdin=0",
    "disk-image.sh stop-vm acme stdin=0",
    "helper close acme stdin=0",
  ]);
});

test("refuses a kit checkout that fails the kit check, and writes nothing", () => {
  const { home, conf } = setup();
  fakeKitCheck(path.join(home, "kit"), "Refusing the kit checkout: the checkout sits inside the agents' workspace.");
  const before = fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8");
  const r = apply(conf, ["border", control, "false"], "ANTHROPIC_API_KEY=new\n");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Refusing the kit checkout/);
  assert.equal(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), before);
});
