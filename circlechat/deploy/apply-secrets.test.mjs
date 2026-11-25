// Runs apply-secrets.sh against a throwaway home folder, with no restart.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import crypto from "node:crypto";

const here = path.dirname(new URL(import.meta.url).pathname);
const example = JSON.parse(fs.readFileSync(path.join(here, "..", "site.example.json"), "utf8"));
const control = example.nodes.find((n) => n.control).name;

// A stand-in for the kit's check (kit/check-kit.sh, tested in kit/check-kit.test.mjs): passes, or
// refuses the kit with the given message.
function fakeKitCheck(kit, refuse = "") {
  fs.mkdirSync(path.join(kit, "circlechat", "kit"), { recursive: true });
  fs.writeFileSync(path.join(kit, "circlechat", "kit", "check-kit.sh"), refuse ? `echo "${refuse}"; exit 1\n` : "exit 0\n");
}

// A home folder with the stack's folder under CircleChat 1.x's old name, ~/circlechat. The helper
// uses the old folder until a person moves it to ~/recursica-stack (migrate-off-1x.sh).
function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "stacks-"));
  fakeKitCheck(path.join(home, "kit"));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
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

// Stand-ins for uname, which reports the given system, and chown, which records each call. The
// chown stand-in sits outside PATH, the way /usr/sbin/chown sits outside the runner's PATH, and
// CHOWN names the stand-in.
function fakeSystem(home, system) {
  const bin = path.join(home, "bin"), sbin = path.join(home, "sbin"), log = path.join(home, "chown.log");
  fs.mkdirSync(bin, { recursive: true }); fs.mkdirSync(sbin, { recursive: true });
  fs.writeFileSync(path.join(bin, "uname"), `#!/usr/bin/env bash\necho ${system}\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(sbin, "chown"), `#!/usr/bin/env bash\necho "chown $*" >> "${log}"\n`, { mode: 0o755 });
  return { env: { PATH: `${bin}:${process.env.PATH}`, CHOWN: path.join(sbin, "chown") }, bin, sbin, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "") };
}

test("writes each known secret to the file that uses it, and keeps other lines", () => {
  const { home, conf } = setup();
  fs.writeFileSync(path.join(home, ".recursica-node.env"), "PORTER_GITHUB_PAT=ghp_old\n", { mode: 0o600 });
  const r = apply(conf, ["cluster", control, "false"],
    "MODEL_KEY_ACME_GROK=xai-1\nANTHROPIC_API_KEY=new\nALAN_GITHUB_PAT=ghp_a\nJOBD_TOKEN=jt\nPORTER_ANTHROPIC_API_KEY=pk\nGITHUB_TOKEN=ignored\nPATH=/x\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const env = fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8");
  assert.match(env, /^KEEP=1$/m);
  assert.doesNotMatch(env, /ANTHROPIC_API_KEY|MODEL_KEY|GITHUB_TOKEN|PATH=/, ".env holds no cloud key, and the old one is gone");
  // Each cloud key goes to the gateway's secrets file; ANTHROPIC_API_KEY is the default key.
  const keys = path.join(home, "circlechat", "model-keys.env");
  assert.equal(fs.readFileSync(keys, "utf8"), "MODEL_KEY_ACME_GROK=xai-1\nMODEL_KEY_DEFAULT=new\n");
  assert.equal(fs.statSync(keys).mode & 0o777, 0o600);
  // The agents' personal access tokens are retired: none is written.
  assert.doesNotMatch(env, /GITHUB_PAT/);
  assert.match(r.stdout, /ALAN_GITHUB_PAT is retired/);
  // The port jobs' computers get no cloud key.
  const nodeEnv = fs.readFileSync(path.join(home, ".recursica-node.env"), "utf8");
  assert.doesNotMatch(nodeEnv, /ANTHROPIC_API_KEY|pk|PORTER_GITHUB_PAT/);
  assert.match(r.stdout, /PORTER_ANTHROPIC_API_KEY skipped: port jobs use the gateway/);
  assert.equal(fs.statSync(path.join(home, ".recursica-node.env")).mode & 0o777, 0o600);
});

test("the stack's folder is ~/recursica-stack once the folder exists, and ~/circlechat before", () => {
  const { home, conf } = setup();
  const fresh = path.join(home, "recursica-stack");
  fs.mkdirSync(fresh);
  fs.writeFileSync(path.join(fresh, "site.json"), JSON.stringify({ ...example, site: { ...example.site, stack_name: "ops" } }));
  const r = apply(conf, ["ops", control, "false"], "JOBD_TOKEN=jt\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(fresh, ".env"), "utf8"), /^JOBD_TOKEN=jt$/m);
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /JOBD_TOKEN/);
  // A client stack: ~/tenants/<name>/stack once the folder exists.
  const dir = path.join(home, "tenants", "acme", "stack");
  fs.mkdirSync(dir, { recursive: true });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  const t = apply(conf, ["client-acme", control, "false"], "JOBD_TOKEN=jt\n");
  assert.equal(t.status, 0, t.stdout + t.stderr);
  assert.match(fs.readFileSync(path.join(dir, ".env"), "utf8"), /^JOBD_TOKEN=jt$/m);
});

test("the agent check's password is retired with CircleChat 1.x: never written, and named in the output", () => {
  const { home, conf } = setup();
  const pw = "check-password-0123456789abcdef";
  const r = apply(conf, ["cluster", control, "false"], `CC_CHECK_PASSWORD=${pw}\n`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /CC_CHECK_PASSWORD is retired/);
  assert.ok(!r.stdout.includes(pw), "the password is never printed");
  assert.ok(!fs.existsSync(path.join(home, "circlechat", "agent-check.env")));
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /CC_CHECK_PASSWORD/);
});

test("on a Mac, the gateway's secrets file belongs to the owner, and on Linux to root", () => {
  for (const [system, owned] of [["Darwin", true], ["Linux", false]]) {
    const { home, conf } = setup();
    const fake = fakeSystem(home, system);
    const r = apply(conf, ["cluster", control, "false"], "MODEL_KEY_DEFAULT=k\n", fake.env);
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
  const r = apply(conf, ["cluster", control, "false"], "MODEL_KEY_DEFAULT=k\nJOBD_TOKEN=jt\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: .*model-keys\.env is a symlink/);
  assert.equal(fs.readFileSync(target, "utf8"), "untouched\n");
  assert.ok(fs.lstatSync(keys).isSymbolicLink());
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /JOBD_TOKEN/);
});

test("the Kev data jobs' old token is retired: never written, and removed from kev-data.env", () => {
  const { home, conf } = setup();
  const cc = path.join(home, "circlechat"), file = path.join(cc, "kev-data.env");
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ ...example, data: { repo: "acme/kev-data" } }));
  fs.writeFileSync(file, "KEV_DATA_GITHUB_TOKEN=ghs_app\nKEV_DATA_GITHUB_PAT=ghp_old\n", { mode: 0o600 });
  let r = apply(conf, ["cluster", control, "false"], "KEV_DATA_GITHUB_PAT=ghp_k\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /KEV_DATA_GITHUB_PAT is retired: the Kev notes push gets a token from the push's GitHub App/);
  assert.equal(fs.readFileSync(file, "utf8"), "KEV_DATA_GITHUB_TOKEN=ghs_app\n", "the app's token stays");
  // Never in .env, which containers read.
  assert.doesNotMatch(fs.readFileSync(path.join(cc, ".env"), "utf8"), /ghp_k/);
  // A symlink at the file: the helper never writes through the symlink.
  fs.rmSync(file);
  const target = path.join(home, "elsewhere.txt");
  fs.writeFileSync(target, "KEV_DATA_GITHUB_PAT=untouched\n");
  fs.symlinkSync(target, file);
  r = apply(conf, ["cluster", control, "false"], "JOBD_TOKEN=jt\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /KEV_DATA_GITHUB_PAT left in .*kev-data\.env: the file is a symlink/);
  assert.equal(fs.readFileSync(target, "utf8"), "KEV_DATA_GITHUB_PAT=untouched\n");
});

test("the Kev notes push's private key goes to kev-data.pem, only with data.github_app and data.repo", () => {
  const { home, conf } = setup();
  const keys = path.join(home, "app-keys"), f = path.join(keys, "cluster", "kev-data.pem");
  let r = apply(conf, ["cluster", control, "false"], `APP_KEY_KEV_DATA=${PEM}\n`, { AGENT_STACKS_APP_KEYS: keys });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /APP_KEY_KEV_DATA skipped: site.json's github_apps has no agent for the key, and data.github_app is not the key's app/);
  assert.ok(!fs.existsSync(f));
  fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify({ ...example, data: { repo: "acme/kev-data", github_app: { app_id: 3, installation_id: 30, slug: "acme-kev-data" } } }));
  r = apply(conf, ["cluster", control, "false"], `APP_KEY_KEV_DATA=${PEM}\n`, { AGENT_STACKS_APP_KEYS: keys });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(f, "utf8"), /^-----BEGIN RSA PRIVATE KEY-----\n/);
  assert.equal(fs.statSync(f).mode & 0o777, 0o600);
  assert.ok(!fs.existsSync(path.join(home, "circlechat", "kev-data.env")) || !/PRIVATE KEY/.test(fs.readFileSync(path.join(home, "circlechat", "kev-data.env"), "utf8")));
});

test("refuses a provider's own credential names, which used to land in .env", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["cluster", control, "false"], "SLACK_BOT_TOKEN=x\nAZURE_API_KEY=k\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: AZURE_API_KEY goes in a MODEL_KEY_<NAME> secret now/);
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /SLACK_BOT_TOKEN/);
});

test("refuses a stack name outside the cluster's stack name and client-<name>", () => {
  const { conf } = setup();
  const r = apply(conf, ["prod", control, "false"], "");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Stack "prod" must be cluster \(site\.stack_name in the cluster's site\.json\) or client-<name>\./);
  assert.notEqual(apply(conf, ["client-../x", control, "false"], "").status, 0);
});

test("the cluster's own stack takes the name in site.stack_name, and only that name", () => {
  const { home, conf } = setup();
  fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify({ ...example, site: { ...example.site, stack_name: "ops" } }));
  const r = apply(conf, ["ops", control, "false"], "JOBD_TOKEN=jt\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /^JOBD_TOKEN=jt$/m);
  const old = apply(conf, ["cluster", control, "false"], "JOBD_TOKEN=x\n");
  assert.equal(old.status, 1);
  assert.match(old.stdout, /must be ops \(site\.stack_name/);
});

test("refuses a client stack whose site.json is not on this computer", () => {
  const { conf } = setup();
  const r = apply(conf, ["client-acme", control, "false"], "ANTHROPIC_API_KEY=x\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /No .*tenants\/acme\/stack\/site.json/);
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

test("unlock refuses the cluster's own stack, which has no disk image", () => {
  const { conf } = setup();
  const r = apply(conf, ["--unlock", "cluster", control], "STACK_DISK_KEY=x\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Only a client stack has an encrypted disk image/);
});

test("the cluster's secrets go to the cluster file, for the cluster's own stack only", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["cluster", control, "false"], "SLACK_BOT_TOKEN=xoxb-1\nTOTP_SECRET_PERSON_A=ABC\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const f = fs.readFileSync(path.join(home, "agent-cluster.env"), "utf8");
  assert.match(f, /^SLACK_BOT_TOKEN=xoxb-1$/m);
  assert.match(f, /^TOTP_SECRET_PERSON_A=ABC$/m);
});

const helper = example.nodes.find((n) => !n.control).name;
const CLUSTER_SECRETS = "SLACK_APP_TOKEN=xapp-1\nSLACK_BOT_TOKEN=xoxb-1\nSLACK_CHANNEL_ID=C0123\nCLUSTER_TOKEN=ct\nAPPROVERS=U012=person_a,U034=person_b\nTOTP_SECRET_PERSON_A=ABCDEFGH\nTOTP_SECRET_PERSON_B=IJKLMNOP\n";
const CONTROL_ONLY = /^(SLACK_APP_TOKEN|APPROVERS|TOTP_SECRET_[A-Z0-9_]*)=/m;

test("the control computer gets every cluster secret", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["cluster", control, "false"], CLUSTER_SECRETS);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const f = fs.readFileSync(path.join(home, "agent-cluster.env"), "utf8");
  for (const k of ["SLACK_APP_TOKEN", "SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID", "CLUSTER_TOKEN", "APPROVERS", "TOTP_SECRET_PERSON_A", "TOTP_SECRET_PERSON_B"]) assert.match(f, new RegExp(`^${k}=`, "m"), k);
});

test("a helper gets only the bot token, the channel and the cluster token, never the app token, APPROVERS or a TOTP secret", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["cluster", helper, "false"], CLUSTER_SECRETS);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(path.join(home, "agent-cluster.env"), "utf8"), "SLACK_BOT_TOKEN=xoxb-1\nSLACK_CHANNEL_ID=C0123\nCLUSTER_TOKEN=ct\n");
  for (const k of ["SLACK_APP_TOKEN", "APPROVERS", "TOTP_SECRET_PERSON_A", "TOTP_SECRET_PERSON_B"]) {
    assert.match(r.stdout, new RegExp(`  ${k} skipped: only the control computer's Slack app reads ${k}\n`), k);
  }
  assert.ok(!r.stdout.includes("ABCDEFGH") && !r.stdout.includes("xapp-1"), "a secret's value is never printed");
});

test("a deploy to a helper removes each control-only line the helper's file holds, and names each line", () => {
  for (const input of [CLUSTER_SECRETS, "SLACK_BOT_TOKEN=xoxb-2\n", "JOBD_TOKEN=jt\n"]) {
    const { home, conf } = setup();
    const file = path.join(home, "agent-cluster.env");
    fs.writeFileSync(file, "SLACK_APP_TOKEN=xapp-old\nSLACK_BOT_TOKEN=xoxb-old\nAPPROVERS=U012=person_a\nTOTP_SECRET_PERSON_A=OLDOLDOL\nCLUSTER_TOKEN=ct-old\nTOTP_SECRET_PERSON_B=OLDOLDOM\n", { mode: 0o600 });
    const r = apply(conf, ["cluster", helper, "false"], input);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const f = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(f, CONTROL_ONLY, `after a deploy of ${JSON.stringify(input)}`);
    assert.match(f, /^SLACK_BOT_TOKEN=xoxb-/m);
    assert.match(f, /^CLUSTER_TOKEN=ct/m);
    for (const k of ["SLACK_APP_TOKEN", "APPROVERS", "TOTP_SECRET_PERSON_A", "TOTP_SECRET_PERSON_B"]) assert.match(r.stdout, new RegExp(`  ${k} removed from ${file}\n`), k);
    assert.match(r.stdout, /The cluster agent holds the removed secrets until the agent restarts\./);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600, "the file keeps mode 600");
  }
});

test("a client stack's deploy never touches the cluster file", () => {
  const { home, conf } = setup();
  const file = path.join(home, "agent-cluster.env");
  fs.writeFileSync(file, "TOTP_SECRET_PERSON_A=ABCDEFGH\n", { mode: 0o600 });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client" });
  fs.mkdirSync(path.join(home, "tenants", "acme", "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "tenants", "acme", "circlechat", "site.json"), JSON.stringify(site));
  const r = apply(conf, ["client-acme", helper, "false"], CLUSTER_SECRETS);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(file, "utf8"), "TOTP_SECRET_PERSON_A=ABCDEFGH\n");
});

// A private key in PEM form, as the workflow passes the key: each line break as the two characters \n.
const PEM = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEAtest+key/body=\\n-----END RSA PRIVATE KEY-----\\n";

test("each GitHub App's private key goes to a root-owned file outside the stack's folder, and only for an agent in github_apps", () => {
  const { home, conf } = setup();
  const site = structuredClone(example);
  site.github_apps = { alan: { app_id: 1, installation_id: 2, slug: "acme-alan", repos: ["acme/knowledge"], permissions: { contents: "write", pull_requests: "write", issues: "write" } } };
  fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify(site));
  const keys = path.join(home, "app-keys");
  const r = apply(conf, ["cluster", control, "false"], `APP_KEY_ALAN=${PEM}\nAPP_KEY_BETTY=${PEM}\n`, { AGENT_STACKS_APP_KEYS: keys });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const f = path.join(keys, "cluster", "alan.pem");
  assert.equal(fs.readFileSync(f, "utf8"), "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAtest+key/body=\n-----END RSA PRIVATE KEY-----\n");
  assert.equal(fs.statSync(f).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(keys, "cluster")).mode & 0o777, 0o700);
  assert.match(r.stdout, /APP_KEY_BETTY skipped: site.json's github_apps has no agent for the key/);
  assert.ok(!fs.existsSync(path.join(keys, "cluster", "betty.pem")));
  // No key reaches the stack's folder: no .env and nothing a backup takes.
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /PRIVATE KEY|MIIEow/);
  // A value that is not a private key is skipped.
  const bad = apply(conf, ["cluster", control, "false"], "APP_KEY_ALAN=ghp_notakey\n", { AGENT_STACKS_APP_KEYS: keys });
  assert.match(bad.stdout, /APP_KEY_ALAN skipped: the value is not a private key in PEM form/);
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
  const r = apply(conf, ["cluster", control, "false"], "ANTHROPIC_API_KEY=new\n");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Refusing the kit checkout/);
  assert.equal(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), before);
});

test("on a Mac, the secrets helper never looks chown up in PATH", () => {
  const { home, conf } = setup();
  const fake = fakeSystem(home, "Darwin");
  // A chown on PATH that records each call. On a Mac, the helper calls /usr/sbin/chown instead.
  fs.copyFileSync(path.join(fake.sbin, "chown"), path.join(fake.bin, "chown"));
  fs.chmodSync(path.join(fake.bin, "chown"), 0o755);
  apply(conf, ["cluster", control, "false"], "MODEL_KEY_DEFAULT=k\nJOBD_TOKEN=jt\n", { PATH: fake.env.PATH, CHOWN: "" });
  assert.equal(fake.calls(), "");
});

// A deploy with restart: stand-ins for sudo, which runs the command as this account, and for the
// kit's setup-host.sh, which records what it got.
function restartRun(system) {
  const { home, conf } = setup();
  const fake = fakeSystem(home, system);
  const log = path.join(home, "calls.log");
  const kit = path.join(home, "kit", "circlechat");
  fs.writeFileSync(path.join(fake.bin, "sudo"), `#!/usr/bin/env bash\necho "sudo $*" >> "${log}"\nwhile [ $# -gt 0 ]; do case "$1" in -u) shift 2 ;; -H|-n) shift ;; *) break ;; esac; done\nexec "$@"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(fake.bin, "docker"), `#!/usr/bin/env bash\necho "docker $*" >> "${log}"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(kit, "setup-host.sh"), `echo "setup-host $* helper=\${KIT_ROOT_STEPS:-} pwd=$(pwd) cc=$CC_DIR" >> "${log}"\nIFS= read -r line || true; echo "setup-host stdin=$line" >> "${log}"\n`);
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { home, conf, fake, calls, run: (input = "MODEL_KEY_DEFAULT=k\nRESTIC_PASSWORD=r\n") => apply(conf, ["cluster", control, "true"], input, fake.env) };
}

test("a deploy needs no sudo from the owner: root prepares the gateway's files, and the owner runs only Docker", () => {
  for (const system of ["Linux", "Darwin"]) {
    const t = restartRun(system);
    const r = t.run();
    assert.equal(r.status, 0, system + r.stdout + r.stderr);
    assert.doesNotMatch(r.stderr, /getcwd/);
    const gw = path.join(t.home, "circlechat", "gateway-state");
    assert.equal(fs.statSync(gw).mode & 0o777, 0o700);
    assert.match(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), /^sk-[0-9a-f]{48}\n$/);
    assert.equal(fs.statSync(path.join(gw, "litellm-master.key")).mode & 0o777, 0o600);
    // CircleChat 1.x's database is gone: no password and no address for the router's role.
    for (const f of ["db-password", "db.url"]) assert.ok(!fs.existsSync(path.join(gw, f)), f);
    assert.ok(!fs.existsSync(path.join(t.home, "circlechat", "cloud-approvals")), "no secrets for cloud-model requests");
    const calls = t.calls();
    // The owner's run: the Docker steps only, from /, in the stack's folder, with nothing on stdin.
    assert.match(calls, /^sudo -u \S+ -H env KIT_ROOT_STEPS=1 .* bash \S+\/setup-host\.sh --secrets-only$/m);
    assert.match(calls, new RegExp(`^setup-host --secrets-only helper=1 pwd=/ cc=${path.join(t.home, "circlechat").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    assert.match(calls, /^setup-host stdin=$/m);
    // No database dump and no key check: both belonged to CircleChat 1.x.
    assert.doesNotMatch(calls, /pg_dump|key-check/);
    // On a Mac, the owner gets the state folder and each file the helper wrote, and no whole folder.
    // On Linux, root keeps them. (The node secrets file goes to the owner on both.)
    const chowns = t.fake.calls().split("\n").filter((c) => c.startsWith("chown -h "));
    if (system === "Darwin") {
      assert.ok(chowns.includes(`chown -h ${os.userInfo().username} ${gw}`), chowns.join("\n"));
      assert.ok(chowns.some((c) => c.includes(`${gw}/.new.`)), "each new file in the state folder");
      assert.ok(t.fake.calls().split("\n").every((c) => !/ -R /.test(c)), "no chown of a whole folder");
    } else assert.deepEqual(chowns, []);
    // A second deploy keeps the master key.
    const key = fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8");
    assert.equal(t.run().status, 0);
    assert.equal(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), key);
  }
});

test("the helper replaces a master key that is a symlink, and never writes through it", () => {
  const t = restartRun("Linux");
  const gw = path.join(t.home, "circlechat", "gateway-state");
  fs.mkdirSync(gw, { recursive: true });
  const outside = path.join(t.home, "outside.txt");
  fs.writeFileSync(outside, "text of another file\n");
  fs.symlinkSync(outside, path.join(gw, "litellm-master.key"));
  assert.equal(t.run().status, 0);
  assert.equal(fs.readFileSync(outside, "utf8"), "text of another file\n");
  assert.ok(!fs.lstatSync(path.join(gw, "litellm-master.key")).isSymbolicLink());
  assert.match(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), /^sk-[0-9a-f]{48}\n$/);
});

test("the helper refuses a symlinked gateway state folder, and a hard-linked secrets file", () => {
  const a = restartRun("Linux");
  const target = path.join(a.home, "elsewhere");
  fs.mkdirSync(target);
  fs.symlinkSync(target, path.join(a.home, "circlechat", "gateway-state"));
  const r = a.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Refused: .*gateway-state is a symlink/);
  assert.deepEqual(fs.readdirSync(target), []);
  assert.doesNotMatch(a.calls(), /setup-host/);
  const b = restartRun("Linux");
  const keys = path.join(b.home, "circlechat", "model-keys.env");
  fs.writeFileSync(path.join(b.home, "other.env"), "");
  fs.linkSync(path.join(b.home, "other.env"), keys);
  const r2 = b.run();
  assert.equal(r2.status, 1);
  assert.match(r2.stdout, /Refused: .*model-keys\.env is a symlink or has a second hard link/);
  assert.equal(fs.readFileSync(path.join(b.home, "other.env"), "utf8"), "");
});

test("the RustDesk server's backup secret goes only to the computer that runs the server", () => {
  const { home, conf } = setup();
  const site = structuredClone(example);
  site.nodes.push({ name: "machine-3", os: "linux", address: "100.64.0.7",
    rustdesk: { image: `docker.io/rustdesk/rustdesk-server-pro@sha256:${"a".repeat(64)}`, console_host: "machine-3.example.ts.net" } });
  fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify(site));
  const pw = "rustdesk-backup-0123456789abcdef";
  let r = apply(conf, ["cluster", "machine-3", "false"], `RUSTDESK_RESTIC_PASSWORD=${pw}\n`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(path.join(home, ".recursica-node.env"), "utf8"), `RUSTDESK_RESTIC_PASSWORD=${pw}\n`);
  assert.ok(!r.stdout.includes(pw), "the secret is never printed");
  // The control computer, which runs no RustDesk server, gets nothing.
  fs.rmSync(path.join(home, ".recursica-node.env"));
  r = apply(conf, ["cluster", control, "false"], `RUSTDESK_RESTIC_PASSWORD=${pw}\nJOBD_TOKEN=jt\n`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(fs.readFileSync(path.join(home, ".recursica-node.env"), "utf8"), /RUSTDESK/);
  assert.doesNotMatch(fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8"), /RUSTDESK/);
});

test("every secret the deploy workflow passes is one the helper reads", () => {
  const yml = fs.readFileSync(path.join(here, "deploy-secrets.yml"), "utf8");
  const passed = [...yml.matchAll(/secrets\.([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]);
  assert.ok(!passed.includes("CC_CHECK_PASSWORD"), "the agent check's password is retired with CircleChat 1.x");
  assert.ok(passed.includes("RUSTDESK_RESTIC_PASSWORD"), "the RustDesk backup's secret is in the workflow's list");
  const known = new RegExp(/^KNOWN='(.*)'$/m.exec(fs.readFileSync(path.join(here, "apply-secrets.sh"), "utf8"))[1]);
  for (const name of passed) assert.ok(known.test(name), `${name} is passed by the workflow and ignored by the helper`);
});

// A deploy with restart on a computer with stand-ins for systemctl and launchctl, and a stand-in for
// Slack's chat.postMessage. installed: the services that exist; failing: the services that fail to
// restart.
const helperName = example.nodes.find((n) => !n.control).name;
async function restartWorld({ system = "Linux", installed = [], failing = [], slackOk = true } = {}) {
  const { home, conf } = setup();
  const fake = fakeSystem(home, system);
  const log = path.join(home, "units.log");
  const list = (name, items) => { const f = path.join(home, name); fs.writeFileSync(f, items.map((x) => `${x}\n`).join("")); return f; };
  const inst = list("installed", installed), fail = list("failing", failing);
  fs.writeFileSync(path.join(fake.bin, "systemctl"), `#!/usr/bin/env bash
echo "systemctl $*" >> "${log}"
case "$1" in
  cat) grep -qx "\${2%.service}" "${inst}" ;;
  restart) ! grep -qx "\${2%.service}" "${fail}" ;;
  is-active) exit 0 ;;
esac
`, { mode: 0o755 });
  fs.writeFileSync(path.join(fake.bin, "launchctl"), `#!/usr/bin/env bash
echo "launchctl $*" >> "${log}"
u="\${@: -1}"; u="\${u#system/io.recursica.}"
case "$1" in
  print) grep -qx "$u" "${inst}" ;;
  kickstart) ! grep -qx "$u" "${fail}" ;;
esac
`, { mode: 0o755 });
  // The cluster's file holds the bot token and the channel, as on every computer.
  fs.writeFileSync(path.join(home, "agent-cluster.env"), "SLACK_BOT_TOKEN=xoxb-test\nSLACK_CHANNEL_ID=C0CLUSTER\nCLUSTER_TOKEN=ct\n", { mode: 0o600 });
  const posts = [];
  const slack = http.createServer((q, s) => { let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => {
    posts.push({ auth: q.headers.authorization, body: JSON.parse(b) }); s.setHeader("content-type", "application/json"); s.end(JSON.stringify(slackOk ? { ok: true } : { ok: false, error: "not_in_channel" })); }); });
  await new Promise((r) => slack.listen(0, "127.0.0.1", r));
  const env = { ...fake.env, AGENT_STACKS_SLACK_API: `http://127.0.0.1:${slack.address().port}/api` };
  const run = (computer, input, restart = "true", extra = [], more = {}) => new Promise((resolve) => {
    const p = spawn("bash", [path.join(here, "apply-secrets.sh"), "cluster", computer, restart, ...extra], {
      env: { ...process.env, AGENT_STACKS_CONF: conf, AGENT_CLUSTER_ENV: path.join(home, "agent-cluster.env"), ...env, ...more } });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => (stdout += d)); p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => resolve({ status, stdout, stderr }));
    p.stdin.end(input);
  });
  const units = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { home, conf, bin: fake.bin, log, run, posts, units, close: () => slack.close() };
}
const restarts = (units) => units.split("\n").filter((l) => / restart | kickstart /.test(l));

test("an unchanged value restarts nothing", async () => {
  const w = await restartWorld({ installed: ["jobd", "kev-engine", "mlx-large", "cluster-agent"] });
  try {
    fs.writeFileSync(path.join(w.home, ".recursica-node.env"), "JOBD_TOKEN=jt\nKEV_API_KEY=kk\n", { mode: 0o600 });
    let r = await w.run(helperName, "JOBD_TOKEN=jt\nSLACK_BOT_TOKEN=xoxb-test\nCLUSTER_TOKEN=ct\n");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /  JOBD_TOKEN unchanged in /);
    assert.match(r.stdout, /  CLUSTER_TOKEN unchanged in /);
    assert.match(r.stdout, /No value a service reads changed, so nothing restarted\./);
    r = await w.run(control, "KEV_API_KEY=kk\n");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(restarts(w.units()), [], "no service restarted");
    assert.deepEqual(w.posts, [], "no post for an unchanged value");
  } finally { w.close(); }
});

test("a changed KEV_API_KEY restarts nothing, and posts in the cluster's channel that kev-engine needs a restart by a person", async () => {
  for (const system of ["Linux", "Darwin"]) {
    const w = await restartWorld({ system, installed: ["jobd", "kev-engine", "cluster-agent"] });
    try {
      fs.writeFileSync(path.join(w.home, ".recursica-node.env"), "KEV_API_KEY=old-kev-key\n", { mode: 0o600 });
      for (const restart of ["true", "false"]) {
        const value = `new-kev-key-${restart}`;
        const r = await w.run(control, `KEV_API_KEY=${value}\n`, restart);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(fs.readFileSync(path.join(w.home, ".recursica-node.env"), "utf8"), new RegExp(`^KEV_API_KEY=${value}$`, "m"), "the value is written");
        assert.match(r.stdout, /  kev-engine not restarted: a deploy never restarts kev-engine\. KEV_API_KEY changed, so kev-engine needs a restart by a person\./);
        assert.match(r.stdout, /  Posted in the cluster's channel: kev-engine needs a restart by a person\./);
        assert.ok(!r.stdout.includes(value), "the value is never printed");
      }
      assert.deepEqual(restarts(w.units()), [], `${system}: kev-engine and every other service keep running`);
      assert.equal(w.posts.length, 2);
      for (const p of w.posts) {
        assert.equal(p.auth, "Bearer xoxb-test");
        assert.equal(p.body.channel, "C0CLUSTER");
        assert.equal(p.body.username, control);
        assert.match(p.body.text, new RegExp(`kev-engine on ${control} needs a restart by a person: the secrets deploy of stack cluster changed KEV_API_KEY\\.`));
        assert.ok(!p.body.text.includes("new-kev-key"), "the post never holds the value");
      }
    } finally { w.close(); }
  }
});

test("a failed post says so in the log, and the deploy still restarts nothing", async () => {
  const w = await restartWorld({ installed: ["kev-engine"], slackOk: false });
  try {
    const r = await w.run(control, "KEV_API_KEY=changed\n");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /  The post in the cluster's channel failed \(Slack answered not_in_channel\)\. Restart kev-engine by hand when the engine is idle\./);
    assert.deepEqual(restarts(w.units()), []);
  } finally { w.close(); }
});

test("a service that is missing or fails to restart is never reported as restarted", async () => {
  for (const system of ["Linux", "Darwin"]) {
    let w = await restartWorld({ system, installed: [] });
    try {
      const r = await w.run(helperName, "JOBD_TOKEN=new-token\n");
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, new RegExp(`  jobd is not installed on ${helperName}: nothing restarted\\n`));
      assert.doesNotMatch(r.stdout, /restarted jobd/);
    } finally { w.close(); }
    w = await restartWorld({ system, installed: ["jobd"], failing: ["jobd"] });
    try {
      const r = await w.run(helperName, "JOBD_TOKEN=new-token\n");
      assert.equal(r.status, 1, "a failed restart fails the deploy");
      assert.match(r.stdout, /  jobd failed to restart\n/);
      assert.match(r.stdout, /Failed to restart: jobd\./);
      assert.doesNotMatch(r.stdout, /restarted jobd/);
    } finally { w.close(); }
    w = await restartWorld({ system, installed: ["jobd", "mlx-large"] });
    try {
      const r = await w.run(helperName, "JOBD_TOKEN=new-token\n");
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /  restarted jobd\n/);
      assert.doesNotMatch(r.stdout, /mlx-large/, "a service that reads no changed value keeps running");
    } finally { w.close(); }
  }
});

// A key rotation's world: restartWorld, with a stand-in kev-engine, a stand-in for the control
// computer's cluster agent, and stand-ins for ss and netstat that report the open connections.
// The engine takes the key in the node secrets file at each restart that the systemctl or launchctl
// stand-in records, as kev-engine reads KEV_API_KEY at its start.
async function rotationWorld({ system = "Linux", barb = "none", oldKit = false, connections = 0, answering = false } = {}) {
  const w = await restartWorld({ system, installed: ["kev-engine", "jobd", "cluster-agent"] });
  const nodeEnv = path.join(w.home, ".recursica-node.env");
  fs.writeFileSync(nodeEnv, "KEV_API_KEY=old-kev-key\n", { mode: 0o600 });
  const engine = { key: "old-kev-key", restarts: 0, answered: 7, reads: 0 };
  const started = () => (w.units().match(/ (restart kev-engine|kickstart -k system\/io\.recursica\.kev-engine)/g) ?? []).length;
  const kev = http.createServer((q, s) => {
    if (started() > engine.restarts) { engine.restarts = started(); engine.key = /^KEV_API_KEY=(.*)$/m.exec(fs.readFileSync(nodeEnv, "utf8"))[1]; }
    engine.reads++;
    if (answering) engine.answered++;
    if (q.headers.authorization !== `Bearer ${engine.key}`) { s.statusCode = 401; return s.end("{}"); }
    s.setHeader("content-type", "application/json");
    s.end(JSON.stringify({ models: [{ name: "kev-latest", batches: { count: 3, requests: engine.answered, queued: 0 } }] }));
  });
  const agentAuth = [];
  const agent = http.createServer((q, s) => {
    agentAuth.push(q.headers.authorization);
    s.setHeader("content-type", "application/json");
    s.end(JSON.stringify({ ok: true, computer: control, services: [], ...(oldKit ? {} : { barb }) }));
  });
  await new Promise((r) => kev.listen(0, "127.0.0.1", r));
  await new Promise((r) => agent.listen(0, "127.0.0.1", r));
  // The site's engine listens on the stand-in's port, and the control computer's agent at 127.0.0.1.
  const siteFile = path.join(w.home, "circlechat", "site.json");
  const site = JSON.parse(fs.readFileSync(siteFile, "utf8"));
  for (const n of site.nodes) { if (n.kev) n.kev.port = kev.address().port; if (n.control) n.tailnet_address = "127.0.0.1"; }
  site.nodes.find((n) => !n.control).services = [{ name: "kev-engine", command: "kev", dir: "/k", secret_env: ["KEV_API_KEY"] }];
  fs.writeFileSync(siteFile, JSON.stringify(site));
  const count = path.join(w.home, "connections");
  fs.writeFileSync(count, String(connections));
  fs.writeFileSync(path.join(w.bin, "ss"), `#!/usr/bin/env bash\necho "ss $*" >> "${w.log}"\nfor _ in $(seq 1 "$(cat "${count}")"); do echo "0 0 127.0.0.1:8009 127.0.0.1:50000"; done\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(w.bin, "netstat"), `#!/usr/bin/env bash\necho "netstat $*" >> "${w.log}"\necho "Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)"\nfor _ in $(seq 1 "$(cat "${count}")"); do echo "tcp4       0      0  127.0.0.1.${kev.address().port}    127.0.0.1.50000        ESTABLISHED"; done\necho "tcp4       0      0  127.0.0.1.50001        127.0.0.1.${kev.address().port}    ESTABLISHED"\n`, { mode: 0o755 });
  const more = { AGENT_STACKS_AGENT_PORT: String(agent.address().port), AGENT_STACKS_KEV_IDLE_WAIT: "0", AGENT_STACKS_KEV_READY_SECONDS: "10" };
  const rotate = (computer, input, extra) => w.run(computer, input, "true", extra, more);
  const key = () => /^KEV_API_KEY=(.*)$/m.exec(fs.readFileSync(nodeEnv, "utf8"))[1];
  return { ...w, engine, agentAuth, rotate, key, setConnections: (n) => fs.writeFileSync(count, String(n)),
    close: () => { w.close(); kev.close(); agent.close(); } };
}
const proof = (key) => crypto.createHash("sha256").update(`kev-rotation\n${key}`).digest("hex");

test("a rotation's check writes nothing, and passes only while Barb isn't running and kev-engine is idle", async () => {
  for (const system of ["Linux", "Darwin"]) {
    for (const barb of ["none", "idle"]) {
      const w = await rotationWorld({ system, barb });
      try {
        const r = await w.rotate(control, "KEV_API_KEY=new-kev-key\nJOBD_TOKEN=new-token\n", ["check"]);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(r.stdout, barb === "none" ? /  Barb isn't running: RecursicaChat has no agent named Barb\./ : /  Barb isn't running: Barb has no turn queued or running/);
        assert.match(r.stdout, /  kev-engine is idle: no connection open, nothing queued, and no request answered in 0 seconds\./);
        assert.match(r.stdout, new RegExp(`kev-engine on ${control} may stop for the key rotation\\. Nothing was written\\.`));
        assert.equal(w.key(), "old-kev-key");
        assert.ok(!fs.existsSync(path.join(w.home, "circlechat", ".env")) || !/JOBD_TOKEN/.test(fs.readFileSync(path.join(w.home, "circlechat", ".env"), "utf8")), "nothing written");
        assert.deepEqual(restarts(w.units()), []);
        assert.deepEqual(w.agentAuth, ["Bearer ct"], "the agent is asked with the cluster token");
      } finally { w.close(); }
    }
  }
});

test("a rotation's check fails, and says why, when Barb runs, the state can't be read, or kev-engine is busy", async () => {
  const cases = [
    [{ barb: "busy: 1 agent message(s) queued or in a turn" }, /  Barb is running \(1 agent message\(s\) queued or in a turn\)\./],
    [{ barb: "unknown" }, /  Barb's state is unknown: the RecursicaChat server's database can't be read\./],
    [{ oldKit: true }, /  Barb's state can't be read: the cluster agent on \S+ reports no state for Barb, so it runs an older kit\./],
    [{ connections: 1 }, /  kev-engine is not idle: 1 connection\(s\) open to port \d+\./],
    [{ system: "Darwin", connections: 2 }, /  kev-engine is not idle: 2 connection\(s\) open to port \d+\./],
    [{ answering: true }, /  kev-engine is not idle: it answered 1 request\(s\) in the last 0 seconds\./],
  ];
  for (const [opts, why] of cases) {
    const w = await rotationWorld(opts);
    try {
      const r = await w.rotate(control, "KEV_API_KEY=new-kev-key\n", ["check"]);
      assert.equal(r.status, 1, JSON.stringify(opts));
      assert.match(r.stdout, why);
      assert.match(r.stdout, /kev-engine on \S+ may not stop now\. Nothing was written\./);
      assert.equal(w.key(), "old-kev-key");
      assert.deepEqual(restarts(w.units()), []);
    } finally { w.close(); }
  }
});

test("a rotation writes the new key and restarts kev-engine once; a second run restarts nothing", async () => {
  for (const system of ["Linux", "Darwin"]) {
    for (const computer of [control, helperName]) {
      const w = await rotationWorld({ system });
      try {
        let r = await w.rotate(computer, "KEV_API_KEY=new-kev-key\n", [proof("new-kev-key")]);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(w.key(), "new-kev-key");
        assert.equal(restarts(w.units()).length, 1, `${system} ${computer}: one restart`);
        assert.match(restarts(w.units())[0], system === "Linux" ? /systemctl restart kev-engine\.service/ : /launchctl kickstart -k system\/io\.recursica\.kev-engine/);
        assert.match(r.stdout, /  restarted kev-engine\n  kev-engine answers with the new key after about 0 seconds\./);
        assert.doesNotMatch(r.stdout, /needs a restart by a person/);
        assert.equal(w.engine.key, "new-kev-key");
        assert.deepEqual(w.posts, []);
        assert.ok(!r.stdout.includes("new-kev-key") && !r.stdout.includes("old-kev-key"), "no key in the log");
        r = await w.rotate(computer, "KEV_API_KEY=new-kev-key\n", [proof("new-kev-key")]);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(restarts(w.units()).length, 1, "the same rotation again restarts nothing");
      } finally { w.close(); }
    }
  }
});

test("a rotation with a wrong proof, a failed check, or restart off writes nothing and restarts nothing", async () => {
  let w = await rotationWorld();
  try {
    let r = await w.rotate(control, "KEV_API_KEY=new-kev-key\nJOBD_TOKEN=new-token\n", [proof("another-key")]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /Refused: kev_rotation doesn't match KEV_API_KEY\. Only rotate-tokens\.sh starts a key rotation\. Nothing was written\./);
    r = await w.run(control, "KEV_API_KEY=new-kev-key\n", "false", [proof("new-kev-key")]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /Refused: a key rotation needs restart on\. Nothing was written\./);
    assert.equal(w.key(), "old-kev-key");
    assert.doesNotMatch(fs.readFileSync(path.join(w.home, ".recursica-node.env"), "utf8"), /JOBD_TOKEN/);
  } finally { w.close(); }
  w = await rotationWorld({ barb: "busy: 1 agent message(s) queued or in a turn" });
  try {
    const r = await w.rotate(control, "KEV_API_KEY=new-kev-key\nJOBD_TOKEN=new-token\n", [proof("new-kev-key")]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /  Barb is running/);
    assert.equal(w.key(), "old-kev-key", "kev-engine keeps the key in its file");
    assert.doesNotMatch(fs.readFileSync(path.join(w.home, ".recursica-node.env"), "utf8"), /JOBD_TOKEN/, "nothing else is written either");
    assert.deepEqual(restarts(w.units()), []);
  } finally { w.close(); }
});

test("a rotation's check reads the engine's counts with the key, and an engine on another key fails the check", async () => {
  const w = await rotationWorld();
  try {
    w.engine.key = "a-key-the-file-does-not-hold";
    const r = await w.rotate(control, "KEV_API_KEY=new-kev-key\n", [proof("new-kev-key")]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /  kev-engine is not idle: kev-engine refused the key in the secrets file, so the engine runs with another key\./);
    assert.equal(w.key(), "old-kev-key");
    assert.deepEqual(restarts(w.units()), []);
  } finally { w.close(); }
});

test("a changed JOBD_TOKEN or KEV_ENGINE_KEY in the control computer's .env recreates no gateway", async () => {
  const w = await restartWorld({ installed: ["jobd"] });
  try {
    const r = await w.run(control, "JOBD_TOKEN=jt-new\nKEV_ENGINE_KEY=kek-new\n");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(fs.readFileSync(path.join(w.home, "circlechat", ".env"), "utf8"), /^KEV_ENGINE_KEY=kek-new$/m);
    assert.match(r.stdout, /  restarted jobd\n/, "jobd reads JOBD_TOKEN from the node secrets file");
    assert.doesNotMatch(r.stdout, /gateway recreated|Secrets applied/, "the gateway reads neither value");
    assert.deepEqual(restarts(w.units()).length, 1);
  } finally { w.close(); }
});
