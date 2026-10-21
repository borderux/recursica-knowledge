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
//   tenant.env            TENANT, SUFFIX, COMPOSE_PROJECT_NAME, ports and DOCKER_CONTEXT for this stack
//
// Any number of nodes. Nothing here is specific to one deployment: that all lives in site.json,
// which is kept outside the repository.
//
// One site.json is one stack. A computer can hold several stacks, one per client (a tenant), each
// in its own folder with its own database, files, agents, secrets and Slack channel. site.tenant
// names the stack, and every container, volume, port and background job of the stack carries that
// name, so two stacks never share one. A client stack (site.kind "client") must also run in its
// own Docker VM (site.docker_context), so no client shares a Docker socket or network with another.
import fs from "node:fs";
import path from "node:path";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

// A backend is a cloud model unless it names a model on a computer in this site.json.
export function isCloud(backend, site) {
  const names = new Set((site.nodes ?? []).map((n) => n.name));
  const [node] = String(backend).split("/");
  return !names.has(node);
}

// A stack may call cloud models unless it is a client stack without a recorded permission.
export function cloudAllowed(site) {
  if (site.site?.kind !== "client") return true;
  return site.site?.cloud_models?.allowed === true;
}

export function validate(site) {
  const errs = [];
  const nodes = site.nodes ?? [];
  if (!site.site?.public_host) errs.push("site.public_host is required");
  const t = site.site ?? {};
  if (t.tenant !== undefined && (!SLUG.test(t.tenant) || t.tenant === "default")) errs.push(`site.tenant "${t.tenant}" must be lowercase letters, digits and hyphens, and not "default"`);
  if (t.kind !== undefined && !["internal", "client"].includes(t.kind)) errs.push("site.kind must be internal or client");
  for (const k of ["port", "preview_port", "gateway_port"]) {
    if (t[k] !== undefined && !(Number.isInteger(t[k]) && t[k] >= 1024 && t[k] <= 65535)) errs.push(`site.${k} must be a port number from 1024 to 65535`);
  }
  const ports = ["port", "preview_port", "gateway_port"].map((k) => t[k]).filter((v) => v !== undefined);
  if (new Set(ports).size !== ports.length) errs.push("site.port, site.preview_port and site.gateway_port must all differ");
  if (t.docker_context !== undefined && !/^[A-Za-z0-9._-]+$/.test(t.docker_context)) errs.push("site.docker_context must be a Docker context name");
  // Cloud models on a client stack need the client's recorded permission. Without the permission,
  // the stack runs local open-weight models only: no cloud route, and no Porter (port jobs use
  // Claude).
  const cm = t.cloud_models;
  if (cm !== undefined) {
    if (typeof cm !== "object" || cm === null || typeof cm.allowed !== "boolean") errs.push("site.cloud_models must be an object with allowed: true or false");
    else if (cm.allowed) {
      if (!cm.granted_by || typeof cm.granted_by !== "string") errs.push("site.cloud_models.granted_by must name the person who granted the permission");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cm.granted_on ?? "")) errs.push("site.cloud_models.granted_on must be the date of the permission, as YYYY-MM-DD");
      if (!["border-ramp", "client-byok"].includes(cm.payer)) errs.push("site.cloud_models.payer must be border-ramp or client-byok");
    }
  }
  if (t.kind === "client") {
    if (!t.tenant) errs.push("a client stack needs site.tenant, so its containers, ports and jobs never collide with another stack's");
    if (!t.docker_context) errs.push("a client stack needs site.docker_context: its own Docker VM (for example a Colima profile), so no client shares a Docker socket or network with another");
    if (site.data?.kev_disagreements_branch) errs.push("a client stack cannot set data.kev_disagreements_branch: review data from a client's code never leaves the client's stack");
    if (!cloudAllowed(site)) {
      for (const [route, backends] of Object.entries(site.routes ?? {})) {
        for (const b of backends) if (isCloud(b, site)) errs.push(`route ${route}: "${b}" is a cloud model, and this client stack has no recorded permission for cloud models (site.cloud_models)`);
      }
      if (site.porter) errs.push("a local-only client stack cannot run Porter: port jobs call Claude. Record the client's permission in site.cloud_models first");
    }
  }
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
  // No tenant keeps the names a single-stack install has always used, so an existing install
  // keeps its containers, volumes and jobs.
  const st = site.site ?? {};
  const tenant = st.tenant ?? "";
  const tenantEnv = [
    `TENANT=${tenant}`,
    `TENANT_KIND=${st.kind ?? "internal"}`,
    `SUFFIX=${tenant ? `-${tenant}` : ""}`,
    `COMPOSE_PROJECT_NAME=${tenant ? `cc-${tenant}` : "circlechat"}`,
    `PREVIEW_PORT=${st.preview_port ?? 5173}`,
    `GATEWAY_PORT=${st.gateway_port ?? 4000}`,
    `DOCKER_CONTEXT=${st.docker_context ?? ""}`,
    `CLOUD_MODELS=${cloudAllowed(site) ? "allowed" : "local-only"}`,
  ].join("\n") + "\n";
  return { litellm, kev, services, appEnv, jobNodes, porterEnv, watches, tenantEnv };
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
  fs.writeFileSync(path.join(out, "tenant.env"), r.tenantEnv);
  console.log(`rendered: ${site.nodes.length} node(s), ${Object.keys(site.routes ?? {}).length} route(s), ${r.kev.length} Kev engine(s), ${r.jobNodes.length} job runner(s)`);
}
