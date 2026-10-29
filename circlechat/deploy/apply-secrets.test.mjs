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

test("the Kev data jobs' token goes to a file of its own, only with data.repo in site.json", () => {
  const { home, conf } = setup();
  const cc = path.join(home, "circlechat"), file = path.join(cc, "kev-data.env");
  // No data.repo: the push is off, and the token is not written.
  let r = apply(conf, ["cluster", control, "false"], "KEV_DATA_GITHUB_PAT=ghp_k\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /KEV_DATA_GITHUB_PAT skipped: site.json sets no data.repo/);
  assert.ok(!fs.existsSync(file));
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ ...example, data: { repo: "acme/kev-data" } }));
  r = apply(conf, ["cluster", control, "false"], "KEV_DATA_GITHUB_PAT=ghp_k\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(file, "utf8"), "KEV_DATA_GITHUB_PAT=ghp_k\n");
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  // Never in .env, which containers read, and never in an agent's home.
  assert.doesNotMatch(fs.readFileSync(path.join(cc, ".env"), "utf8"), /ghp_k/);
  assert.ok(!fs.existsSync(path.join(cc, "hermes-homes", ".hermes-alan", ".env")));
  assert.doesNotMatch(r.stdout, /no agent kev_data/);
  // A symlink at the file: refused, and nothing written.
  fs.rmSync(file);
  const target = path.join(home, "elsewhere.txt");
  fs.writeFileSync(target, "untouched\n");
  fs.symlinkSync(target, file);
  r = apply(conf, ["cluster", control, "false"], "KEV_DATA_GITHUB_PAT=ghp_k\nJOBD_TOKEN=jt\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: .*kev-data\.env is a symlink/);
  assert.equal(fs.readFileSync(target, "utf8"), "untouched\n");
  assert.doesNotMatch(fs.readFileSync(path.join(cc, ".env"), "utf8"), /JOBD_TOKEN/);
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

// A deploy with restart: stand-ins for sudo, which runs the command as this account, for Docker,
// which prints a database dump, and for the kit's setup-host.sh and key check, which record what
// each one got.
function restartRun(system, { keyCheckExit = 0 } = {}) {
  const { home, conf } = setup();
  const fake = fakeSystem(home, system);
  const log = path.join(home, "calls.log");
  const kit = path.join(home, "kit", "circlechat");
  fs.mkdirSync(path.join(kit, "gateway"), { recursive: true });
  fs.writeFileSync(path.join(fake.bin, "sudo"), `#!/usr/bin/env bash\necho "sudo $*" >> "${log}"\nwhile [ $# -gt 0 ]; do case "$1" in -u) shift 2 ;; -H|-n) shift ;; *) break ;; esac; done\nexec "$@"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(fake.bin, "docker"), `#!/usr/bin/env bash\necho "docker $*" >> "${log}"\necho "dump of the database"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(kit, "setup-host.sh"), `echo "setup-host $* helper=\${KIT_ROOT_STEPS:-} pwd=$(pwd)" >> "${log}"\nIFS= read -r pw; echo "setup-host password=$pw" >> "${log}"\n`);
  fs.writeFileSync(path.join(kit, "gateway", "key-check.mjs"), `import fs from "node:fs";\nfs.appendFileSync(${JSON.stringify(log)}, "key-check " + process.argv.slice(2).join(" | ") + " stdin=" + fs.readFileSync(0, "utf8").trim() + "\\n");\nprocess.exit(${keyCheckExit});\n`);
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { home, conf, fake, calls, run: (input = "MODEL_KEY_DEFAULT=k\nRESTIC_PASSWORD=r\n") => apply(conf, ["cluster", control, "true"], input, fake.env) };
}

test("a deploy needs no sudo from the owner: root prepares the gateway's files, the owner runs only Docker, and root runs the key check", () => {
  for (const system of ["Linux", "Darwin"]) {
    const t = restartRun(system);
    const r = t.run();
    assert.equal(r.status, 0, system + r.stdout + r.stderr);
    assert.doesNotMatch(r.stderr, /getcwd/);
    const gw = path.join(t.home, "circlechat", "gateway-state");
    assert.equal(fs.statSync(gw).mode & 0o777, 0o700);
    const pw = fs.readFileSync(path.join(gw, "db-password"), "utf8").trim();
    assert.match(pw, /^[0-9a-f]{48}$/);
    assert.match(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), /^sk-[0-9a-f]{48}\n$/);
    assert.equal(fs.readFileSync(path.join(gw, "db.url"), "utf8"), `postgres://cc_gateway_read:${pw}@postgres:5432/circlechat\n`);
    for (const f of ["db-password", "litellm-master.key", "db.url"]) assert.equal(fs.statSync(path.join(gw, f)).mode & 0o777, 0o600, f);
    const calls = t.calls();
    // The owner's run: the Docker steps only, from /, with the password on stdin and never in ps.
    assert.match(calls, /^sudo -u \S+ -H env KIT_ROOT_STEPS=1 .* bash \S+\/setup-host\.sh --secrets-only$/m);
    assert.doesNotMatch(calls, new RegExp(`^sudo .*${pw}`, "m"));
    assert.match(calls, /^setup-host --secrets-only helper=1 pwd=\/$/m);
    assert.match(calls, new RegExp(`^setup-host password=${pw}$`, "m"));
    // The key check, after the owner's run: the owner's database dump, read by root's key check.
    assert.ok(calls.indexOf("setup-host --secrets-only") < calls.indexOf("key-check "));
    assert.match(calls, /^docker compose exec -T postgres pg_dump -U postgres circlechat$/m);
    assert.match(calls, new RegExp(`^key-check --secrets \\| \\S+/model-keys\\.env \\| --stdin \\| CircleChat's database \\| \\S+/hermes-homes stdin=dump of the database$`, "m"));
    // On a Mac, the owner gets the state folder and each file the helper wrote, and no whole folder.
    // On Linux, root keeps them. (The node secrets file goes to the owner on both.)
    const chowns = t.fake.calls().split("\n").filter((c) => c.startsWith("chown -h "));
    if (system === "Darwin") {
      assert.ok(chowns.includes(`chown -h ${os.userInfo().username} ${gw}`), chowns.join("\n"));
      assert.ok(chowns.some((c) => c.includes(`${gw}/.new.`)), "each new file in the state folder");
      assert.ok(t.fake.calls().split("\n").every((c) => !/ -R /.test(c)), "no chown of a whole folder");
    } else assert.deepEqual(chowns, []);
    // A second deploy keeps the password and the master key.
    const key = fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8");
    assert.equal(t.run().status, 0);
    assert.equal(fs.readFileSync(path.join(gw, "db-password"), "utf8").trim(), pw);
    assert.equal(fs.readFileSync(path.join(gw, "litellm-master.key"), "utf8"), key);
  }
});

test("a deploy fails when the key check finds a cloud key", () => {
  const t = restartRun("Linux", { keyCheckExit: 1 });
  assert.equal(t.run().status, 1);
});

test("the helper replaces a database password that a kit did not make, and never writes through a symlink", () => {
  const t = restartRun("Linux");
  const gw = path.join(t.home, "circlechat", "gateway-state");
  fs.mkdirSync(gw, { recursive: true });
  const outside = path.join(t.home, "outside.txt");
  fs.writeFileSync(outside, "text of another file\n");
  fs.symlinkSync(outside, path.join(gw, "db-password"));
  fs.symlinkSync(outside, path.join(gw, "db.url"));
  assert.equal(t.run().status, 0);
  assert.equal(fs.readFileSync(outside, "utf8"), "text of another file\n");
  assert.ok(!fs.lstatSync(path.join(gw, "db.url")).isSymbolicLink());
  assert.doesNotMatch(fs.readFileSync(path.join(gw, "db.url"), "utf8"), /another file/);
  assert.match(fs.readFileSync(path.join(gw, "db-password"), "utf8"), /^[0-9a-f]{48}\n$/);
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
