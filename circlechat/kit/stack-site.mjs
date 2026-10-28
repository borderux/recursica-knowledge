#!/usr/bin/env node
// Write a client or demo stack's site.json from the cluster's own site.json, for the computers
// picked for the stack: one computer, or the whole cluster. No dependencies: node only.
//
//   node stack-site.mjs <cluster site.json> <stack> <client|demo> <computer name|cluster> [limits] [cloud keys]
//     limits: --cpus <n> --memory-gb <n> --model-memory-gb <n>, for each picked computer
//     cloud keys, for a demo: --cloud-keys none, or --cloud-keys <provider>:<model>,... with
//       --granted-by "<person>" --payer border-ramp|client-byok [--granted-on YYYY-MM-DD]
//
// A cloud key comes with billing, so a demo needs a recorded permission, as a client stack does.
// With a person at the keyboard, the script asks whether the demo gets cloud keys; the answer is no
// unless the person types y. Without a person at the keyboard, such as from Claude Code, a demo
// needs --cloud-keys, and the script stops without it: it never answers yes on its own. The key
// values never pass through this script: the person adds them with deploy/set-model-keys.sh.
//
// The stack's site.json lists only the picked computers. With one computer, that computer is the
// stack's control computer. With the whole cluster, the cluster's control computer is.
//
// The cluster's own stack starts each model server and Kev's model (each node's "services"). The
// stack lists the same servers and models, with no services, so those servers serve both stacks.
// They keep no data. The stack gets its own gateway, keys, job runner and ports: the first ports
// no other stack in ~/tenants uses. The stack's routes and agents keep only the picked computers'
// models. The result goes to stdout; check repos, notify and the rest before the first setup.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { PROVIDERS, keySecret } from "./render.mjs";

// The providers a demo can take here: one key and one model each. Azure and Bedrock need more
// settings, so add them to site.json by hand.
export const DEMO_PROVIDERS = Object.keys(PROVIDERS).filter((p) => !["azure", "bedrock", "vertex_ai"].includes(p));
export const QUESTION = "Give this demo cloud model keys, such as Claude or Grok, with billing attached? [y/N]";

// "<provider>:<model>,..." as a list of { provider, model }.
export function parseKeys(text) {
  const out = [];
  for (const part of String(text).split(",").map((x) => x.trim()).filter(Boolean)) {
    const i = part.indexOf(":");
    const provider = i > 0 ? part.slice(0, i) : "", model = i > 0 ? part.slice(i + 1) : "";
    if (!DEMO_PROVIDERS.includes(provider) || !model) throw new Error(`"${part}" must be <provider>:<model>, with a provider from ${DEMO_PROVIDERS.join(", ")}`);
    out.push({ provider, model });
  }
  if (!out.length) throw new Error("name at least one provider and model, such as anthropic:claude-sonnet-5-5");
  return out;
}

// A demo's cloud keys: null for none, or the providers and the recorded permission. The first key
// is the key named default, which every agent uses. Each other key is named for its provider;
// name its agents in site.json.
function cloudBlocks(cloud) {
  if (!cloud) return { cloud_models: { allowed: false } };
  if (!cloud.granted_by) throw new Error("a demo with cloud keys needs who granted the permission (--granted-by)");
  if (!["border-ramp", "client-byok"].includes(cloud.payer)) throw new Error("a demo with cloud keys needs who pays: --payer border-ramp or --payer client-byok");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cloud.granted_on ?? "")) throw new Error("the permission's date must be YYYY-MM-DD (--granted-on)");
  const model_keys = {};
  cloud.providers.forEach(({ provider, model }, i) => {
    let name = i === 0 ? "default" : provider;
    for (let n = 2; model_keys[name]; n++) name = `${provider}-${n}`;
    model_keys[name] = { provider, model, agents: [] };
  });
  return { cloud_models: { allowed: true, granted_by: cloud.granted_by, granted_on: cloud.granted_on, payer: cloud.payer }, model_keys };
}

const FIRST = { port: 8180, preview_port: 5273, gateway_port: 4100, jobs: 7410 };

// Every port the cluster's stack and the other stacks in ~/tenants already use.
function takenPorts(cluster, tenantsDir) {
  const sites = [cluster];
  if (fs.existsSync(tenantsDir)) {
    for (const t of fs.readdirSync(tenantsDir)) {
      const f = path.join(tenantsDir, t, "circlechat", "site.json");
      try { sites.push(JSON.parse(fs.readFileSync(f, "utf8"))); } catch { /* a locked stack, or no site.json */ }
    }
  }
  const taken = new Set([8080, 5173, 4000]);
  for (const s of sites) {
    for (const k of ["port", "preview_port", "gateway_port"]) if (s.site?.[k]) taken.add(s.site[k]);
    for (const n of s.nodes ?? []) {
      for (const p of [n.jobs?.port, n.kev?.port, ...(n.servers ?? []).map((sv) => sv.port), ...(n.models ?? []).map((m) => m.port)]) if (p) taken.add(p);
    }
  }
  return taken;
}

// cloud: for a demo, null (no cloud keys) or { providers, granted_by, granted_on, payer }.
export function stackSite(cluster, { stack, kind, computers, limits = {}, cloud, tenantsDir = path.join(os.homedir(), "tenants") }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(stack ?? "")) throw new Error(`stack name "${stack}" must be lowercase letters, digits and hyphens`);
  if (!["client", "demo"].includes(kind)) throw new Error("kind must be client or demo");
  if (kind === "demo" && cloud === undefined) throw new Error("a demo needs an answer about cloud keys: none, or the providers and the permission");
  const cloudPart = kind === "demo" ? cloudBlocks(cloud) : {};
  const all = cluster.nodes ?? [];
  const picked = computers === "cluster" ? all : all.filter((n) => n.name === computers);
  if (!picked.length) throw new Error(`no computer named ${computers} in the cluster's site.json. Pick one of ${all.map((n) => n.name).join(", ")}, or cluster`);
  const taken = takenPorts(cluster, tenantsDir);
  const free = (from) => { let p = from; while (taken.has(p)) p++; taken.add(p); return p; };
  const site = {
    public_host: cluster.site?.public_host,
    ...(cluster.site?.proxy ? { proxy: cluster.site.proxy } : {}),
    tenant: stack, kind, docker_context: `colima-${stack}`,
    computers: computers === "cluster" ? "cluster" : [computers],
    port: free(FIRST.port), preview_port: free(FIRST.preview_port), gateway_port: free(FIRST.gateway_port),
    ...(cloudPart.cloud_models ? { cloud_models: cloudPart.cloud_models } : {}),
  };
  const jobsPort = free(FIRST.jobs);
  const nodes = picked.map((c) => {
    const n = structuredClone(c);
    // The cluster's own stack starts the shared model servers and Kev's model.
    n.services = [];
    if (n.jobs) n.jobs.port = jobsPort;
    if (computers !== "cluster") {
      n.control = true;
      // The stack's job runner is on this computer, so no job reaches the gateway over Tailscale.
      if (!c.control) delete n.tailnet_address;
    }
    if (Object.keys(limits).length) n.limits = { ...limits };
    return n;
  });
  // On one computer, the stack's address is that computer's own name, when site.json has one.
  if (computers !== "cluster" && !picked[0].control && /[a-z]/i.test(picked[0].address ?? "") && picked[0].address !== "host.docker.internal") site.public_host = picked[0].address;
  const names = new Set(nodes.map((n) => n.name));
  const onPicked = (b) => names.has(String(b).split("/")[0]);
  // Only the picked computers' models: a cloud model never joins a stack's route.
  const routes = {};
  for (const [r, bs] of Object.entries(cluster.routes ?? {})) {
    const kept = bs.filter(onPicked);
    if (kept.length) routes[r] = kept;
  }
  const agents = {};
  for (const [h, a] of Object.entries(cluster.agents ?? {})) {
    const kept = (a.routes ?? Object.keys(routes)).filter((r) => routes[r] || onPicked(r));
    if (kept.length) agents[h] = { ...a, routes: kept };
  }
  return {
    $comment: [
      `The ${kind} stack ${stack}, on ${computers === "cluster" ? "every computer of the cluster" : `one computer, ${computers}`}. Written by circlechat/kit/stack-site.mjs.`,
      "The model servers and Kev's model belong to the cluster's own stack, which starts them: they serve this stack too, and keep no data.",
      kind === "demo"
        ? (cloudPart.model_keys ? `Cloud keys: ${Object.entries(cloudPart.model_keys).map(([n, k]) => `${n} (${k.provider}, ${keySecret(n)})`).join(", ")}. Add each key's value with circlechat/deploy/set-model-keys.sh.` : "No cloud keys: this demo runs on local models only.")
        : "Check repos and notify. Add model_keys only after the client's permission is in site.cloud_models (circlechat/README.md, \"Clients\").",
    ],
    site,
    repos: structuredClone(cluster.repos),
    nodes,
    routes,
    ...(cloudPart.model_keys ? { model_keys: cloudPart.model_keys } : {}),
    ...(Object.keys(agents).length ? { agents } : {}),
    notify: { slack: false },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const limits = {};
  const flags = { "--cpus": "cpus", "--memory-gb": "memory_gb", "--model-memory-gb": "model_memory_gb" };
  const opts = { "--cloud-keys": "keys", "--granted-by": "granted_by", "--granted-on": "granted_on", "--payer": "payer" };
  const given = {};
  const plain = [];
  for (let i = 0; i < args.length; i++) {
    if (flags[args[i]]) { limits[flags[args[i]]] = Number(args[++i]); continue; }
    if (opts[args[i]]) { given[opts[args[i]]] = args[++i] ?? ""; continue; }
    plain.push(args[i]);
  }
  const [file, stack, kind, computers] = plain;
  if (!computers) { console.error("usage: stack-site.mjs <cluster site.json> <stack> <client|demo> <computer name|cluster> [--cpus n] [--memory-gb n] [--model-memory-gb n] [--cloud-keys none|<provider>:<model>,... --granted-by <person> --payer border-ramp|client-byok]"); process.exit(2); }
  // A person at the keyboard: a terminal on both ends, and not a Claude Code session.
  const person = Boolean(process.stdin.isTTY && process.stderr.isTTY && !process.env.CLAUDECODE);
  const today = new Date().toISOString().slice(0, 10);
  try {
    let cloud;
    if (kind === "demo") {
      if (given.keys === undefined && !person) {
        throw new Error("A demo needs --cloud-keys none, or --cloud-keys <provider>:<model>,... with --granted-by and --payer, when no person is at the keyboard to answer: " + QUESTION + " The setup never answers yes on its own.");
      }
      // Each answer is the next line typed, so an answer typed ahead waits for its question.
      const rl = person ? readline.createInterface({ input: process.stdin, output: process.stderr }) : null;
      const lines = [], waiting = [];
      rl?.on("line", (l) => (waiting.length ? waiting.shift()(l) : lines.push(l)));
      rl?.on("close", () => { while (waiting.length) waiting.shift()(""); });
      const ask = async (q) => {
        if (!rl) return "";
        process.stderr.write(q + " ");
        return (lines.length ? lines.shift() : await new Promise((r) => waiting.push(r))).trim();
      };
      let keys = given.keys;
      if (keys === undefined) keys = /^y(es)?$/i.test(await ask(QUESTION)) ? await ask(`Which providers and models? Give each as <provider>:<model>, comma-separated, such as anthropic:claude-sonnet-5-5,xai:grok-4. Providers: ${DEMO_PROVIDERS.join(", ")}.`) : "none";
      if (keys === "none") cloud = null;
      else {
        cloud = { providers: parseKeys(keys), granted_by: given.granted_by, granted_on: given.granted_on ?? today, payer: given.payer };
        if (!cloud.granted_by && rl) cloud.granted_by = await ask("Who granted the permission for cloud models?");
        if (!cloud.payer && rl) cloud.payer = await ask("Who pays: border-ramp (a virtual card) or client-byok (the client's own key)?");
      }
      rl?.close();
    }
    const out = stackSite(JSON.parse(fs.readFileSync(file, "utf8")), { stack, kind, computers, limits, cloud });
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    if (out.model_keys) console.error(`Next, in your own terminal, outside Claude Code: circlechat/deploy/set-model-keys.sh <this site.json> <owner/private repo>. It asks for each key's value: ${Object.keys(out.model_keys).map(keySecret).join(", ")}.`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
