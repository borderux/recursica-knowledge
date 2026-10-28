#!/usr/bin/env node
// Write a client or demo stack's site.json from the cluster's own site.json, for the computers
// picked for the stack: one computer, or the whole cluster. No dependencies: node only.
//
//   node stack-site.mjs <cluster site.json> <stack> <client|demo> <computer name|cluster> [limits]
//     limits: --cpus <n> --memory-gb <n> --model-memory-gb <n>, for each picked computer
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

export function stackSite(cluster, { stack, kind, computers, limits = {}, tenantsDir = path.join(os.homedir(), "tenants") }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(stack ?? "")) throw new Error(`stack name "${stack}" must be lowercase letters, digits and hyphens`);
  if (!["client", "demo"].includes(kind)) throw new Error("kind must be client or demo");
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
      "Check repos and notify, and add model_keys only when the stack may call cloud models (circlechat/README.md, \"Clients\").",
    ],
    site,
    repos: structuredClone(cluster.repos),
    nodes,
    routes,
    ...(Object.keys(agents).length ? { agents } : {}),
    notify: { slack: false },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const limits = {};
  const flags = { "--cpus": "cpus", "--memory-gb": "memory_gb", "--model-memory-gb": "model_memory_gb" };
  const plain = [];
  for (let i = 0; i < args.length; i++) {
    if (flags[args[i]]) { limits[flags[args[i]]] = Number(args[++i]); continue; }
    plain.push(args[i]);
  }
  const [file, stack, kind, computers] = plain;
  if (!computers) { console.error("usage: stack-site.mjs <cluster site.json> <stack> <client|demo> <computer name|cluster> [--cpus n] [--memory-gb n] [--model-memory-gb n]"); process.exit(2); }
  try {
    const out = stackSite(JSON.parse(fs.readFileSync(file, "utf8")), { stack, kind, computers, limits });
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } catch (e) { console.error(e.message); process.exit(1); }
}
