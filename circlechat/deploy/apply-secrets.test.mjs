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

function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "stacks-"));
  fs.mkdirSync(path.join(home, "circlechat", "hermes-homes", ".hermes-alan"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat", "site.json"), JSON.stringify(example));
  fs.writeFileSync(path.join(home, "circlechat", ".env"), "KEEP=1\nANTHROPIC_API_KEY=old\n");
  const conf = path.join(home, "conf");
  fs.writeFileSync(conf, `OWNER=${os.userInfo().username}\nOWNER_HOME=${home}\nKIT=/nonexistent\nNODE_BIN=${process.execPath}\n`);
  return { home, conf };
}

function apply(conf, args, input) {
  return spawnSync("bash", [path.join(here, "apply-secrets.sh"), ...args], {
    input,
    env: { ...process.env, AGENT_STACKS_CONF: conf, AGENT_CLUSTER_ENV: path.join(path.dirname(conf), "agent-cluster.env") },
    encoding: "utf8",
  });
}

test("writes each known secret to the file that uses it, and keeps other lines", () => {
  const { home, conf } = setup();
  const r = apply(conf, ["border", control, "false"],
    "ANTHROPIC_API_KEY=new\nALAN_GITHUB_PAT=ghp_a\nPORTER_ANTHROPIC_API_KEY=pk\nGITHUB_TOKEN=ignored\nPATH=/x\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const env = fs.readFileSync(path.join(home, "circlechat", ".env"), "utf8");
  assert.match(env, /^KEEP=1$/m);
  assert.match(env, /^ANTHROPIC_API_KEY=new$/m);
  assert.doesNotMatch(env, /GITHUB_TOKEN|PATH=/);
  const alan = fs.readFileSync(path.join(home, "circlechat", "hermes-homes", ".hermes-alan", ".env"), "utf8");
  assert.match(alan, /^ALAN_GITHUB_PAT=ghp_a$/m);
  const nodeEnv = fs.readFileSync(path.join(home, ".recursica-node.env"), "utf8");
  assert.match(nodeEnv, /^ANTHROPIC_API_KEY=pk$/m);
  assert.equal(fs.statSync(path.join(home, ".recursica-node.env")).mode & 0o777, 0o600);
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

test("refuses a cloud key for a local-only client stack, and writes nothing", () => {
  const { home, conf } = setup();
  const dir = path.join(home, "tenants", "acme", "circlechat");
  fs.mkdirSync(dir, { recursive: true });
  const site = structuredClone(example);
  Object.assign(site.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  const r = apply(conf, ["client-acme", control, "false"], "SLACK_WEBHOOK_URL=https://x\nANTHROPIC_API_KEY=k\n");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Refused: ANTHROPIC_API_KEY is a cloud model key/);
  assert.equal(fs.existsSync(path.join(dir, ".env")), false);
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
  const r = apply(conf, ["border", control, "false"], "SLACK_BOT_TOKEN=xoxb-1\nTOTP_SECRET_AARON=ABC\n");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const f = fs.readFileSync(path.join(home, "agent-cluster.env"), "utf8");
  assert.match(f, /^SLACK_BOT_TOKEN=xoxb-1$/m);
  assert.match(f, /^TOTP_SECRET_AARON=ABC$/m);
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
