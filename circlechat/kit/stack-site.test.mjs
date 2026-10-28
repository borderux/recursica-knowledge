import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { placeStack, render, validate } from "./render.mjs";
import { stackSite } from "./stack-site.mjs";

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
  const s = stackSite(cluster, { stack: "acme", kind: "demo", computers: "cluster", tenantsDir: tenantsDir() });
  assert.deepEqual(s.nodes.map((n) => [n.name, Boolean(n.control)]), [["machine-1", true], ["machine-2", false]]);
  assert.equal(s.site.computers, "cluster");
  assert.equal(s.nodes[0].tailnet_address, "100.64.0.1", "port jobs on machine-2 reach the stack's gateway over Tailscale");
  assert.deepEqual(validate(s, { cluster }), []);
});

test("the shared model servers and Kev's model stay the cluster's: the stack gets no services, and its own ports", () => {
  const dir = tenantsDir();
  const first = stackSite(cluster, { stack: "acme", kind: "demo", computers: "cluster", tenantsDir: dir });
  assert.ok(first.nodes.every((n) => n.services.length === 0));
  assert.deepEqual([first.site.port, first.site.preview_port, first.site.gateway_port, first.nodes[0].jobs.port], [8180, 5273, 4100, 7410]);
  assert.deepEqual(first.nodes[1].servers, cluster.nodes[1].servers, "the stack uses the same servers");
  fs.mkdirSync(path.join(dir, "acme", "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(dir, "acme", "circlechat", "site.json"), JSON.stringify(first));
  const second = stackSite(cluster, { stack: "beta", kind: "client", computers: "machine-1", tenantsDir: dir });
  assert.deepEqual([second.site.port, second.site.preview_port, second.site.gateway_port, second.nodes[0].jobs.port], [8181, 5274, 4101, 7411]);
  assert.throws(() => stackSite(cluster, { stack: "acme", kind: "demo", computers: "nowhere", tenantsDir: dir }), /no computer named nowhere/);
  assert.throws(() => stackSite(cluster, { stack: "acme", kind: "internal", computers: "cluster", tenantsDir: dir }), /kind must be client or demo/);
});

test("limits make a computer act like a smaller one: smaller jobs, fewer cores, and only the models that fit", () => {
  const s = stackSite(cluster, { stack: "acme", kind: "demo", computers: "machine-2", limits: { cpus: 4, memory_gb: 24, model_memory_gb: 48 }, tenantsDir: tenantsDir() });
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
  const pc = stackSite(cluster, { stack: "acme", kind: "demo", computers: "machine-2", limits: { model_memory_gb: 16 }, tenantsDir: tenantsDir() });
  const none = placeStack(pc);
  assert.deepEqual(none.errs, ["no model of this stack fits its computers. Pick a bigger computer, raise the limits, or list a smaller model"]);
});
