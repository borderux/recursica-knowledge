import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { placeStack, render, validate } from "./render.mjs";
import { QUESTION, stackSite } from "./stack-site.mjs";

const cluster = JSON.parse(fs.readFileSync(new URL("../site.example.json", import.meta.url), "utf8"));
const tenantsDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "tenants-"));

test("a stack on one computer lists only that computer, as its control computer", () => {
  const s = stackSite(cluster, { stack: "acme", kind: "client", computers: "machine-2", tenantsDir: tenantsDir() });
  assert.deepEqual(s.nodes.map((n) => [n.name, n.control]), [["machine-2", true]]);
  assert.deepEqual(s.site.computers, ["machine-2"]);
  assert.equal(s.site.docker_context, "colima-acme", "the stack's CircleChat runs in the stack's own VM");
  assert.equal(s.site.public_host, "machine-2.example.ts.net");
  assert.deepEqual(validate(s, { cluster }), []);
  // Agents, jobs, models and Kev's model use only the picked computer.
  const r = render(placeStack(s).site);
  assert.deepEqual(r.kev, ["http://machine-2.example.ts.net:8009"]);
  assert.deepEqual(r.jobNodes, ["http://machine-2.example.ts.net:7410"]);
  assert.ok(r.litellm.model_list.every((m) => !String(m.litellm_params.api_base ?? "").includes("host.docker.internal")), "no model on machine-1");
  assert.deepEqual(s.routes, { "local-large": ["machine-2/ollama/large-local"], "local-small": ["machine-2/ollama/large-local"] });
});

test("a stack on the whole cluster lists every computer, and the cluster's control computer runs its CircleChat", () => {
  const s = stackSite(cluster, { stack: "acme", kind: "demo", computers: "cluster", cloud: null, tenantsDir: tenantsDir() });
  assert.deepEqual(s.nodes.map((n) => [n.name, Boolean(n.control)]), [["machine-1", true], ["machine-2", false]]);
  assert.equal(s.site.computers, "cluster");
  assert.equal(s.nodes[0].tailnet_address, "100.64.0.1", "port jobs on machine-2 reach the stack's gateway over Tailscale");
  assert.deepEqual(validate(s, { cluster }), []);
});

test("the shared model servers and Kev's model stay the cluster's: the stack gets no services, and its own ports", () => {
  const dir = tenantsDir();
  const first = stackSite(cluster, { stack: "acme", kind: "demo", computers: "cluster", cloud: null, tenantsDir: dir });
  assert.ok(first.nodes.every((n) => n.services.length === 0));
  assert.deepEqual([first.site.port, first.site.preview_port, first.site.gateway_port, first.nodes[0].jobs.port], [8180, 5273, 4100, 7410]);
  assert.deepEqual(first.nodes[1].servers, cluster.nodes[1].servers, "the stack uses the same servers");
  fs.mkdirSync(path.join(dir, "acme", "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(dir, "acme", "circlechat", "site.json"), JSON.stringify(first));
  const second = stackSite(cluster, { stack: "beta", kind: "client", computers: "machine-1", tenantsDir: dir });
  assert.deepEqual([second.site.port, second.site.preview_port, second.site.gateway_port, second.nodes[0].jobs.port], [8181, 5274, 4101, 7411]);
  assert.throws(() => stackSite(cluster, { stack: "acme", kind: "demo", computers: "nowhere", cloud: null, tenantsDir: dir }), /no computer named nowhere/);
  assert.throws(() => stackSite(cluster, { stack: "acme", kind: "internal", computers: "cluster", tenantsDir: dir }), /kind must be client or demo/);
});

test("limits make a computer act like a smaller one: smaller jobs, fewer cores, and only the models that fit", () => {
  const s = stackSite(cluster, { stack: "acme", kind: "demo", computers: "machine-2", limits: { cpus: 4, memory_gb: 24, model_memory_gb: 48 }, cloud: null, tenantsDir: tenantsDir() });
  assert.deepEqual(validate(s, { cluster }), []);
  const placed = placeStack(s);
  assert.deepEqual(placed.notes, [
    "Left out machine-2/mlx/large-mlx: the model needs 40 GB, and machine-2 has 8 GB left of the 48 GB it gives this stack's models.",
    "Agent barb: every model in the agent's routes is left out, so barb uses the stack's other routes.",
  ]);
  const r = render(placed.site);
  assert.equal(r.litellm.model_list.find((m) => m.model_name === "machine-2/mlx/large-mlx"), undefined);
  assert.equal(r.gateway.agents.barb.routes.join(), "local-large,local-small");
  assert.deepEqual(r.services["machine-2"].jobs, { port: 7410, slots: 1, memory_gb: 16, priority: 1, gateway_url: "http://cc-gateway:4000", cpus: 4 });
  assert.match(r.tenantEnv, /^LIMIT_CPUS=4$/m);
  assert.match(r.tenantEnv, /^LIMIT_MEMORY_GB=24$/m);
  // A PC with 16 GB of GPU memory runs no 40 GB model.
  const pc = stackSite(cluster, { stack: "acme", kind: "demo", computers: "machine-2", limits: { model_memory_gb: 16 }, cloud: null, tenantsDir: tenantsDir() });
  const none = placeStack(pc);
  assert.deepEqual(none.errs, ["no model of this stack fits its computers. Pick a bigger computer, raise the limits, or list a smaller model"]);
});

// The script as a person runs it, in a terminal (util-linux script gives it one), or as Claude Code
// runs it, with no terminal and CLAUDECODE set.
const script = new URL("./stack-site.mjs", import.meta.url).pathname;
const example = new URL("../site.example.json", import.meta.url).pathname;
const env = (extra = {}) => { const e = { ...process.env, HOME: fs.mkdtempSync(path.join(os.tmpdir(), "home-")), ...extra }; delete e.CLAUDECODE; return e; };
const unattended = (...args) => spawnSync(process.execPath, [script, example, "acme", "demo", "machine-1", ...args], { encoding: "utf8", env: env({ CLAUDECODE: "1" }) });
const hasPty = process.platform === "linux" && spawnSync("script", ["--version"]).status === 0;
function atKeyboard(answers, ...args) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "out-")), "site.json");
  const cmd = [process.execPath, script, example, "acme", "demo", "machine-1", ...args].map((a) => `'${a}'`).join(" ");
  const r = spawnSync("script", ["-qec", `${cmd} > '${out}'`, "/dev/null"], { input: answers.map((a) => a + "\n").join(""), encoding: "utf8", env: env() });
  return { ...r, site: fs.existsSync(out) && fs.statSync(out).size ? JSON.parse(fs.readFileSync(out, "utf8")) : null };
}

test("a demo needs a recorded permission for cloud models, the same as a client stack", () => {
  const s = stackSite(cluster, { stack: "acme", kind: "demo", computers: "machine-1", cloud: null, tenantsDir: tenantsDir() });
  s.model_keys = { default: { provider: "anthropic", model: "claude-sonnet-5-5", agents: [] } };
  assert.match(validate(s).join("\n"), /model_keys: this demo stack has no recorded permission for cloud models/);
  s.site.cloud_models = { allowed: true, granted_by: "Person A" };
  const errs = validate(s).join("\n");
  assert.match(errs, /site.cloud_models.granted_on must be the date/);
  assert.match(errs, /site.cloud_models.payer must be border-ramp or client-byok/);
  s.routes["local-small"].push("anthropic/claude-sonnet-5-5");
  delete s.model_keys; s.site.cloud_models = { allowed: false };
  assert.match(validate(s).join("\n"), /route local-small: "anthropic\/claude-sonnet-5-5" is a cloud model, and this demo stack has no recorded permission/);
  assert.throws(() => stackSite(cluster, { stack: "acme", kind: "demo", computers: "machine-1", tenantsDir: tenantsDir() }), /a demo needs an answer about cloud keys/);
});

test("without a person at the keyboard, a demo needs --cloud-keys, and the script never picks yes", () => {
  const none = unattended();
  assert.equal(none.status, 1);
  assert.match(none.stderr, /A demo needs --cloud-keys none, or --cloud-keys <provider>:<model>,\.\.\. with --granted-by and --payer, when no person is at the keyboard/);
  assert.match(none.stderr, /never answers yes on its own/);
  assert.equal(none.stdout, "");
  const local = unattended("--cloud-keys", "none");
  assert.equal(local.status, 0, local.stderr);
  const s = JSON.parse(local.stdout);
  assert.deepEqual(s.site.cloud_models, { allowed: false });
  assert.equal(s.model_keys, undefined);
  assert.ok(Object.values(s.routes).flat().every((b) => b.startsWith("machine-1/")), "no cloud route");
  assert.deepEqual(validate(s, { cluster }), []);
  const half = unattended("--cloud-keys", "anthropic:claude-sonnet-5-5");
  assert.equal(half.status, 1);
  assert.match(half.stderr, /needs who granted the permission/);
});

test("--cloud-keys with providers records the keys and the permission, and no key value", () => {
  const r = unattended("--cloud-keys", "anthropic:claude-sonnet-5-5,xai:grok-4", "--granted-by", "Person A", "--payer", "border-ramp", "--granted-on", "2026-10-28");
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(r.stdout);
  assert.deepEqual(s.site.cloud_models, { allowed: true, granted_by: "Person A", granted_on: "2026-10-28", payer: "border-ramp" });
  assert.deepEqual(s.model_keys, { default: { provider: "anthropic", model: "claude-sonnet-5-5", agents: [] }, xai: { provider: "xai", model: "grok-4", agents: [] } });
  assert.deepEqual(validate(s, { cluster }), []);
  assert.match(r.stderr, /outside Claude Code: circlechat\/deploy\/set-model-keys\.sh .* MODEL_KEY_DEFAULT, MODEL_KEY_XAI/);
  assert.equal(unattended("--cloud-keys", "bedrock:x", "--granted-by", "A", "--payer", "border-ramp").status, 1, "Bedrock and Azure go in by hand");
});

test("at the keyboard, the demo setup asks, and no is the default", { skip: !hasPty && "needs util-linux script for a terminal" }, () => {
  for (const answer of ["", "n", "no"]) {
    const r = atKeyboard([answer]);
    assert.equal(r.status, 0, r.stdout);
    assert.ok(r.stdout.includes(QUESTION));
    assert.deepEqual(r.site.site.cloud_models, { allowed: false }, `answer "${answer}"`);
    assert.equal(r.site.model_keys, undefined);
  }
});

test("at the keyboard, yes asks for the providers, who granted the permission and who pays", { skip: !hasPty && "needs util-linux script for a terminal" }, () => {
  const r = atKeyboard(["y", "xai:grok-4", "Person B", "client-byok"]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Which providers and models\?[\s\S]*Who granted the permission[\s\S]*Who pays/);
  assert.deepEqual(r.site.model_keys, { default: { provider: "xai", model: "grok-4", agents: [] } });
  assert.equal(r.site.site.cloud_models.granted_by, "Person B");
  assert.equal(r.site.site.cloud_models.payer, "client-byok");
  assert.match(r.site.site.cloud_models.granted_on, /^\d{4}-\d{2}-\d{2}$/);
});
