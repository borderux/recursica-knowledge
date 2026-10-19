#!/usr/bin/env node
// Turn one site.json into everything the kit installs. No dependencies: node only.
//
//   node render.mjs <site.json> <out dir>
//
// Writes:
//   litellm.yaml          the model gateway: every node's models, every route, fallbacks in order
//   kev-engines.txt       Kev-engine URLs, best first, comma-separated (Kev fails over in order)
//   services/<node>.json  the long-running services each node runs (setup-node.sh installs them)
//   app.env               APP_REPO / APP_REPO_GITHUB, substituted into agent personas at install
//   job-nodes.txt         job runner URLs, best first (Porter sends each adapter port to the first with room)
//   porter.env            PORTER_OWNER, JOBD_ALLOWED_REPOS
//   watches.json          the releases the release watcher announces
//
// Any number of nodes. Nothing here is specific to one deployment: that all lives in site.json,
// which is kept outside the repository.
import fs from "node:fs";
import path from "node:path";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function validate(site) {
  const errs = [];
  const nodes = site.nodes ?? [];
  if (!site.site?.public_host) errs.push("site.public_host is required");
  for (const k of ["knowledge", "app", "app_dir", "app_github"]) if (!site.repos?.[k]) errs.push(`repos.${k} is required`);
  if (site.repos?.app_dir && !/^[A-Za-z0-9._-]+$/.test(site.repos.app_dir)) errs.push("repos.app_dir must be a plain folder name");
  if (site.repos?.app_github && !/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(site.repos.app_github)) errs.push("repos.app_github must be owner/name");
  if (!nodes.length) errs.push("at least one node is required");
  const names = new Set();
  for (const n of nodes) {
    if (!SLUG.test(n.name ?? "")) errs.push(`node name "${n.name}" must be lowercase letters, digits and hyphens`);
    if (names.has(n.name)) errs.push(`node name "${n.name}" is used twice`);
    names.add(n.name);
    if (!n.address) errs.push(`node ${n.name}: address is required`);
    if (!["linux", "macos", "windows"].includes(n.os)) errs.push(`node ${n.name}: os must be linux, macos or windows`);
    const ids = new Set();
    for (const m of n.models ?? []) {
      if (!SLUG.test(m.id ?? "")) errs.push(`node ${n.name}: model id "${m.id}" must be a slug`);
      if (ids.has(m.id)) errs.push(`node ${n.name}: model id "${m.id}" is used twice`);
      ids.add(m.id);
      if (!m.port || !m.model) errs.push(`node ${n.name}/${m.id}: port and model are required`);
    }
    if (n.jobs) {
      if (!Number.isInteger(n.jobs.port) || !Number.isInteger(n.jobs.slots) || n.jobs.slots < 1) errs.push(`node ${n.name}: jobs needs an integer port and slots >= 1`);
      if (!(n.jobs.memory_gb > 0)) errs.push(`node ${n.name}: jobs.memory_gb must be a positive number`);
    }
    for (const s of n.services ?? []) {
      if (!SLUG.test(s.name ?? "")) errs.push(`node ${n.name}: service name "${s.name}" must be a slug`);
      if (!s.command || !s.dir) errs.push(`node ${n.name}/${s.name}: command and dir are required`);
    }
  }
  const controls = nodes.filter((n) => n.control);
  if (controls.length !== 1) errs.push(`exactly one node must have "control": true (found ${controls.length})`);
  const known = new Set(nodes.flatMap((n) => (n.models ?? []).map((m) => `${n.name}/${m.id}`)));
  for (const [route, backends] of Object.entries(site.routes ?? {})) {
    if (!SLUG.test(route)) errs.push(`route "${route}" must be a slug`);
    if (!Array.isArray(backends) || !backends.length) errs.push(`route ${route}: needs at least one backend`);
    for (const b of backends ?? []) {
      if (b.startsWith("anthropic/")) continue;
      if (!known.has(b)) errs.push(`route ${route}: unknown backend "${b}" (use <node>/<model id> or anthropic/<model>)`);
    }
  }
  if (site.porter) {
    const p = site.porter;
    if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(p.watch ?? "")) errs.push("porter.watch must be owner/name");
    if (!Array.isArray(p.targets) || !p.targets.length) errs.push("porter.targets needs at least one repository URL");
    for (const t of p.targets ?? []) if (!/^https:\/\/[^\s,]+$/.test(t)) errs.push(`porter.targets: "${t}" must be an https clone URL`);
    if (!nodes.some((n) => n.jobs)) errs.push("porter needs at least one node with a jobs block");
  }
  return errs;
}

const url = (n, port, suffix = "") => `http://${n.address}:${port}${suffix}`;

export function render(site) {
  const nodes = site.nodes;
  const byKey = new Map();
  for (const n of nodes) for (const m of n.models ?? []) byKey.set(`${n.name}/${m.id}`, { n, m });

  const params = (b) => {
    if (b.startsWith("anthropic/")) return { model: b, api_key: "os.environ/ANTHROPIC_API_KEY" };
    const { n, m } = byKey.get(b);
    return { model: `openai/${m.model}`, api_base: url(n, m.port, "/v1"), api_key: "none" };
  };
  // Every backend under its own name, and each route as an alias of its first backend, with the
  // rest as fallbacks in order. LiteLLM reads JSON as YAML.
  const used = new Set([...byKey.keys(), ...Object.values(site.routes ?? {}).flat()]);
  const model_list = [...used].map((b) => ({ model_name: b, litellm_params: params(b) }));
  const fallbacks = [];
  for (const [route, backends] of Object.entries(site.routes ?? {})) {
    model_list.push({ model_name: route, litellm_params: params(backends[0]) });
    if (backends.length > 1) fallbacks.push({ [route]: backends.slice(1) });
  }
  const litellm = {
    model_list,
    router_settings: { fallbacks, num_retries: 1, timeout: 600 },
    general_settings: { master_key: "os.environ/LITELLM_MASTER_KEY" },
  };

  const kev = nodes
    .filter((n) => n.kev?.port)
    .sort((a, b) => (a.kev.priority ?? 99) - (b.kev.priority ?? 99))
    .map((n) => url(n, n.kev.port));

  const jobNodes = nodes
    .filter((n) => n.jobs)
    .sort((a, b) => (a.jobs.priority ?? 99) - (b.jobs.priority ?? 99))
    .map((n) => url(n, n.jobs.port));
  const p = site.porter;
  const porterEnv = p ? `PORTER_OWNER=${p.owner ?? ""}\nJOBD_ALLOWED_REPOS=${p.targets.join(",")}\n` : "";
  const watches = p ? [{ repo: p.watch, hook: "PORTER" }] : [];
  const services = Object.fromEntries(nodes.map((n) => [n.name, { os: n.os, services: n.services ?? [], jobs: n.jobs ?? null }]));
  const appEnv = `APP_REPO=${site.repos.app_dir}\nAPP_REPO_GITHUB=${site.repos.app_github}\n`;
  return { litellm, kev, services, appEnv, jobNodes, porterEnv, watches };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, out] = process.argv.slice(2);
  if (!file || !out) { console.error("usage: render.mjs <site.json> <out dir>"); process.exit(2); }
  const site = JSON.parse(fs.readFileSync(file, "utf8"));
  const errs = validate(site);
  if (errs.length) { console.error("site.json has problems:\n  - " + errs.join("\n  - ")); process.exit(1); }
  const r = render(site);
  fs.mkdirSync(path.join(out, "services"), { recursive: true });
  fs.writeFileSync(path.join(out, "litellm.yaml"), JSON.stringify(r.litellm, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "kev-engines.txt"), r.kev.join(",") + "\n");
  for (const [name, s] of Object.entries(r.services)) fs.writeFileSync(path.join(out, "services", `${name}.json`), JSON.stringify(s, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "app.env"), r.appEnv);
  fs.writeFileSync(path.join(out, "job-nodes.txt"), r.jobNodes.join(",") + "\n");
  fs.writeFileSync(path.join(out, "porter.env"), r.porterEnv);
  fs.writeFileSync(path.join(out, "watches.json"), JSON.stringify(r.watches) + "\n");
  console.log(`rendered: ${site.nodes.length} node(s), ${Object.keys(site.routes ?? {}).length} route(s), ${r.kev.length} Kev engine(s), ${r.jobNodes.length} job runner(s)`);
}
