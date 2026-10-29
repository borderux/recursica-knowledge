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
//   gateway.json          the gateway's front door: each agent's routes, cloud switch and cloud key
//
// Any number of nodes. Nothing here is specific to one deployment: that all lives in site.json,
// which is kept outside the repository.
//
// One site.json is one stack. A computer can hold several stacks, one per client (a tenant), each
// in its own folder with its own database, files, agents, secrets and Slack channel. site.tenant
// names the stack, and every container, volume, port and background job of the stack carries that
// name, so two stacks never share one. A client or demo stack (site.kind "client" or "demo") must
// also run in its own Docker VM (site.docker_context), so no stack shares a Docker socket or
// network with another.
//
// A client or demo stack runs on computers picked for it (site.computers): one computer from the
// cluster's site.json, which is then the stack's control computer, or the whole cluster, whose
// control computer then runs the stack's CircleChat. The stack's site.json lists only those
// computers, so the stack's agents, jobs, models and Kev's model use only them. kit/stack-site.mjs
// writes such a site.json from the cluster's. A chosen computer's limits (nodes[].limits) make it
// act like a smaller computer, and placeStack() leaves out each model that does not fit.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

// Who pays for a stack's cloud keys: "operator", the company that runs the cluster, with a virtual
// card made for the client, or "client-byok", the client's own key. "border-ramp", the older name
// for "operator", still passes, so an existing site.json keeps working.
export const PAYERS = ["operator", "client-byok"];
export const payerOk = (p) => PAYERS.includes(p) || p === "border-ramp";

// The cluster's own stack has no site.tenant. site.stack_name names that stack: the stack's GitHub
// environment, and the stack's name in backups, Slack messages and logs. With no stack_name, the
// stack is named "cluster".
export const DEFAULT_STACK_NAME = "cluster";
export const clusterStackName = (site) => site?.site?.stack_name || DEFAULT_STACK_NAME;
// A stack's name: site.tenant for a client or demo stack, site.stack_name for the cluster's own.
export const stackName = (site) => site?.site?.tenant || clusterStackName(site);
// The stack's GitHub environment, which the "Deploy secrets" workflow names.
export const githubEnvironment = (site) => (site?.site?.tenant ? `client-${site.site.tenant}` : clusterStackName(site));

// A backend is a cloud model unless it names a model on a computer in this site.json.
export function isCloud(backend, site) {
  const names = new Set((site.nodes ?? []).map((n) => n.name));
  const [node] = String(backend).split("/");
  return !names.has(node);
}

// The cloud model providers the gateway accepts, each with the sites the provider's API answers on.
// A key holds one secret: MODEL_KEY_<NAME> in the stack's GitHub environment. Azure also needs
// the deployment's address (api_base), and Bedrock the AWS region; a Bedrock key's secret is
// "<access key id>:<secret access key>". Vertex AI signs in with a service account file, which no
// single secret holds, so a model key cannot use Vertex AI.
export const PROVIDERS = {
  anthropic: ["api.anthropic.com"], openai: ["api.openai.com"], xai: ["api.x.ai"],
  gemini: ["generativelanguage.googleapis.com"], mistral: ["api.mistral.ai"], groq: ["api.groq.com"],
  deepseek: ["api.deepseek.com"], openrouter: ["openrouter.ai"],
  azure: [".openai.azure.com", ".services.ai.azure.com"], bedrock: [".amazonaws.com"], vertex_ai: [".googleapis.com"],
};
export const CLOUD_PREFIXES = Object.keys(PROVIDERS).map((p) => `${p}/`);
const PROVIDER_HOSTS = PROVIDERS;
export const EGRESS_BASE = [".github.com", ".githubusercontent.com", "registry.npmjs.org", "pypi.org", "files.pythonhosted.org"];

// The sites a stack's agents and port jobs may reach through the outgoing filter: GitHub, the npm
// and Python package registries, each other computer of the stack, and the sites in
// site.egress.allow. No cloud model provider is ever on the list: agents and jobs reach cloud
// models only through the gateway, which holds the keys.
export function egressAllow(site) {
  const out = new Set(EGRESS_BASE);
  out.add("host.docker.internal");
  for (const n of site.nodes ?? []) {
    if (n.address && n.address !== "host.docker.internal") out.add(n.address);
    if (n.tailnet_address) out.add(n.tailnet_address);   // port jobs on other computers reach the gateway here
  }
  for (const h of site.egress?.allow ?? []) out.add(h);
  return [...out].sort();
}

// The model servers a computer runs. site.json lists each server under the node's "servers", with
// the models the server serves:
//   { "id": "mlx", "kind": "mlx-lm", "port": 8081, "models": [{ "id": "qwen-32b", "model": "<name>", "memory_gb": 20 }] }
// A route or an agent names one model as "<node>/<server id>/<model id>". An older site.json lists
// "models" on the node instead, each with its own port; each model is then named "<node>/<model id>",
// and the port 11434 counts as an Ollama server named ollama.
export const SERVER_KINDS = { ollama: ["linux", "macos", "windows"], "mlx-lm": ["macos"] };
export function clusterModels(site) {
  const out = new Map();
  for (const n of site.nodes ?? []) {
    for (const sv of n.servers ?? []) {
      for (const m of sv.models ?? []) out.set(`${n.name}/${sv.id}/${m.id}`, { n, server: sv, m });
    }
    for (const m of n.models ?? []) {
      const id = m.port === 11434 ? "ollama" : `port-${m.port}`;
      out.set(`${n.name}/${m.id}`, { n, server: { id, kind: m.port === 11434 ? "ollama" : "openai-compatible", port: m.port }, m });
    }
  }
  return out;
}

// An Ollama server's own settings, which the kit's Ollama service on a Mac runs with (kit/lib.sh
// mac_services): "context_length" (OLLAMA_CONTEXT_LENGTH, in tokens), "parallel" (OLLAMA_NUM_PARALLEL,
// the requests each model answers at once) and "keep_alive" (OLLAMA_KEEP_ALIVE, how long a model
// stays loaded: "-1" keeps each model loaded, or a time such as "30m" or 300 seconds). A setting
// left out keeps Ollama's default.
export const OLLAMA_SETTINGS = { context_length: "OLLAMA_CONTEXT_LENGTH", parallel: "OLLAMA_NUM_PARALLEL", keep_alive: "OLLAMA_KEEP_ALIVE" };
const KEEP_ALIVE = /^(-1|\d+|\d+(ms|s|m|h)|(\d+h)?(\d+m)?(\d+s)?)$/;
function ollamaSettingErrors(sv, where) {
  const set = Object.keys(OLLAMA_SETTINGS).filter((k) => sv[k] !== undefined);
  if (set.length && sv.kind !== "ollama") return [`${where}: ${set.join(", ")} ${set.length > 1 ? "are Ollama settings" : "is an Ollama setting"}, and this server is ${sv.kind}`];
  const errs = [];
  for (const k of ["context_length", "parallel"]) if (sv[k] !== undefined && !(Number.isInteger(sv[k]) && sv[k] > 0)) errs.push(`${where}: ${k} must be a whole number above 0`);
  if (sv.keep_alive !== undefined && !(["string", "number"].includes(typeof sv.keep_alive) && String(sv.keep_alive) !== "" && KEEP_ALIVE.test(String(sv.keep_alive)))) {
    errs.push(`${where}: keep_alive must be "-1", to keep each model loaded, or a time such as "30m" or 300 (seconds)`);
  }
  return errs;
}

// The control computer's Ollama server, for the kit's Ollama service on a Mac: the port, and each
// setting from site.json as NAME=value. An older site.json names the server by port 11434, with no
// settings. null when the control computer runs no Ollama server.
export function ollamaService(site) {
  const n = (site.nodes ?? []).find((x) => x.control) ?? {};
  const sv = (n.servers ?? []).find((x) => x.kind === "ollama");
  if (!sv) return (n.models ?? []).some((m) => m.port === 11434) ? { port: 11434, env: [] } : null;
  return { port: sv.port, env: Object.entries(OLLAMA_SETTINGS).filter(([k]) => sv[k] !== undefined).map(([k, name]) => `${name}=${sv[k]}`) };
}

// The secret that holds a key's value, in GitHub and in the gateway's secrets file.
export const keySecret = (name) => `MODEL_KEY_${name.toUpperCase().replace(/-/g, "_")}`;
const splitModel = (provider, model) => (String(model).startsWith(`${provider}/`) ? String(model).slice(provider.length + 1) : String(model));

// The stack's cloud keys, from site.model_keys. A stack with no model_keys block keeps working:
// the first cloud model in its routes becomes the key named default, which every agent uses, and
// the stack's ANTHROPIC_API_KEY becomes that key's secret (MODEL_KEY_DEFAULT).
export function modelKeys(site) {
  if (!cloudAllowed(site)) return {};
  if (site.model_keys) {
    return Object.fromEntries(Object.entries(site.model_keys).map(([name, k]) => [name, {
      provider: k.provider, model: splitModel(k.provider, k.model), agents: k.agents ?? [], secret: keySecret(name),
      ...(k.api_base ? { api_base: k.api_base } : {}), ...(k.api_version ? { api_version: k.api_version } : {}), ...(k.region ? { region: k.region } : {}),
    }]));
  }
  const cloud = Object.values(site.routes ?? {}).flat().find((b) => CLOUD_PREFIXES.some((p) => String(b).startsWith(p)));
  if (!cloud) return {};
  const provider = cloud.split("/")[0];
  return { default: { provider, model: splitModel(provider, cloud), agents: [], secret: keySecret("default") } };
}

// The key an agent uses: the key whose agents list names the agent, or else the key named default.
export function agentKey(keys, handle) {
  for (const [name, k] of Object.entries(keys)) if (k.agents.includes(handle)) return name;
  return keys.default ? "default" : null;
}

// What the gateway needs to know about each agent: the routes the agent's key may use (all routes
// unless site.agents lists some), the agent's cloud switch (on unless site.agents turns it off),
// and the agent's cloud key. An agent site.json never names gets the fallback.
export function gatewayConfig(site) {
  const keys = modelKeys(site);
  const cluster = clusterModels(site);
  const local = (b) => cluster.has(b);
  const all = Object.keys(site.routes ?? {});
  const handles = new Set([...Object.keys(site.agents ?? {}), ...Object.values(keys).flatMap((k) => k.agents)]);
  const agents = Object.fromEntries([...handles].sort().map((h) => [h, {
    routes: site.agents?.[h]?.routes ?? all, cloud: site.agents?.[h]?.cloud !== false, key: agentKey(keys, h),
  }]));
  return {
    agents,
    fallback: { routes: all, cloud: true, key: keys.default ? "default" : null },
    keys: Object.fromEntries(Object.entries(keys).map(([name, k]) => [name, { model: `key/${name}`, provider: k.provider }])),
    // Each route, and each cluster model, which an agent may also name as a route of its own.
    routes: Object.fromEntries([
      ...Object.entries(site.routes ?? {}).map(([r, bs]) => [r, { local: bs.some(local) }]),
      ...[...cluster.keys()].map((b) => [b, { local: true }]),
    ]),
    // The server and the model behind each name LiteLLM reports, for the spend log.
    models: Object.fromEntries([
      ...[...cluster].map(([b, { n, server, m }]) => [b, { server: `${n.name}/${server.id}`, kind: server.kind, model: m.model }]),
      ...Object.values(keys).map((k) => [`${k.provider}/${k.model}`, { server: k.provider, kind: "cloud", model: k.model }]),
    ]),
    // The other computers, whose port jobs use the gateway over Tailscale.
    nodes: (site.nodes ?? []).filter((n) => !n.control && n.address !== "host.docker.internal").map((n) => n.address),
  };
}

const AGENT = /^[a-z0-9][a-z0-9._-]{0,39}$/;

// The ports agents and port jobs may use through the outgoing filter: web (80, 443), the job runner
// (7400), Kev's model (8009) and the gateway. A model server's own port is never on the list:
// Ollama's API, for one, deletes and downloads models. Only the gateway reaches a model server,
// and the gateway does not use the filter.
export const FILTER_PORTS = [80, 443, 7400, 8009];
export function modelServerPorts(site = {}) {
  const out = new Set();
  for (const n of site.nodes ?? []) for (const m of [...(n.servers ?? []), ...(n.models ?? [])]) if (Number.isInteger(m.port)) out.add(m.port);
  return out;
}
export function filterPorts(site = {}) {
  const model = modelServerPorts(site);
  return [...new Set([...FILTER_PORTS, site.site?.gateway_port ?? 4000])].filter((p) => !model.has(p));
}

export function squidConf(site = {}) {
  return `# Written by circlechat/kit/render.mjs. Each stack's outgoing filter.
http_port 3128
pid_filename none
acl allowed dstdomain "/etc/egress/allow.txt"
# IP addresses, such as another computer's Tailscale address (100.x): name rules never match one.
acl allowed_ips dst "/etc/egress/allow-ips.txt"
acl allow_once dstdomain "/etc/egress/allow-once.txt"
# The blocked page agents see lives in the templates folder; Squid looks there for every page.
error_directory /usr/share/squid/errors/templates
acl Safe_ports port ${filterPorts(site).join(" ")}
http_access deny !Safe_ports
http_access allow allowed
http_access allow allowed_ips
http_access allow allow_once
deny_info ERR_EGRESS_BLOCKED all
http_access deny all
logformat egress %ts %>a %rm %ru %>Hs %Ss
access_log stdio:/var/log/egress/access.log logformat=egress
cache deny all
via off
forwarded_for delete
`;
}

// Personal information masking: the model gateway removes names, email addresses, phone numbers
// and similar details from each request before the request reaches a cloud model (Presidio).
// On by default for a client stack with cloud models; then the agents reach cloud models only
// through the gateway, never directly.
export function maskPii(site) {
  if (!cloudAllowed(site)) return false;
  const v = site.privacy?.mask_pii;
  return v === undefined ? site.site?.kind === "client" : v === true;
}

// A stack may call cloud models unless it is a client or demo stack without a recorded permission.
// A cloud key comes with billing, so a demo needs the same record as a client: who granted the
// permission, the date and who pays.
export const NEEDS_PERMISSION = ["client", "demo"];
export function cloudAllowed(site) {
  if (!NEEDS_PERMISSION.includes(site.site?.kind)) return true;
  return site.site?.cloud_models?.allowed === true;
}
const kindWord = (site) => (site.site?.kind === "demo" ? "demo" : "client");

// One node's model servers: each server's kind, port and models, and whether the models the
// node loads fit the memory the node gives its models (model_memory_gb).
function serverErrors(n, { leaveOut = false } = {}) {
  const errs = [];
  const servers = n.servers ?? [];
  if (n.servers !== undefined && !Array.isArray(n.servers)) return [`node ${n.name}: servers must be a list`];
  if (servers.length && n.models?.length) errs.push(`node ${n.name}: list the models under servers, not also under models`);
  const ids = new Set(), ports = new Map([[n.kev?.port, "kev"], [n.jobs?.port, "jobs"]]);
  for (const sv of servers) {
    const where = `node ${n.name}, server ${sv.id}`;
    if (!SLUG.test(sv.id ?? "")) errs.push(`node ${n.name}: server id "${sv.id}" must be a slug`);
    if (ids.has(sv.id)) errs.push(`node ${n.name}: server id "${sv.id}" is used twice`);
    ids.add(sv.id);
    if (!SERVER_KINDS[sv.kind]) errs.push(`${where}: kind must be ${Object.keys(SERVER_KINDS).join(" or ")}`);
    else if (!SERVER_KINDS[sv.kind].includes(n.os)) errs.push(`${where}: an ${sv.kind} server runs only on ${SERVER_KINDS[sv.kind].join(", ")}, and this node is ${n.os}`);
    if (!Number.isInteger(sv.port)) errs.push(`${where}: port must be a number`);
    else if (ports.has(sv.port)) errs.push(`${where}: port ${sv.port} is already used by ${ports.get(sv.port)}`);
    else ports.set(sv.port, `server ${sv.id}`);
    errs.push(...ollamaSettingErrors(sv, where));
    if (!Array.isArray(sv.models) || !sv.models.length) { errs.push(`${where}: models must list at least one model`); continue; }
    // mlx-lm's server holds one model at a time: run one server for each model.
    if (sv.kind === "mlx-lm" && sv.models.length > 1) errs.push(`${where}: an mlx-lm server serves one model. Run one mlx-lm server, on its own port, for each model`);
    const mids = new Set();
    for (const m of sv.models) {
      if (!SLUG.test(m.id ?? "")) errs.push(`${where}: model id "${m.id}" must be a slug`);
      if (mids.has(m.id)) errs.push(`${where}: model id "${m.id}" is used twice`);
      mids.add(m.id);
      if (!m.model) errs.push(`${where}, model ${m.id}: model is required, the name the server knows the model by`);
      if (!(m.memory_gb > 0)) errs.push(`${where}, model ${m.id}: memory_gb must be the memory the model needs, in GB`);
    }
  }
  // Every model a node lists stays loaded, so agents can use several at once. The models must fit.
  const loaded = [...servers.flatMap((sv) => (sv.models ?? []).map((m) => [`${sv.id}/${m.id}`, m.memory_gb])), ...(n.models ?? []).map((m) => [m.id, m.memory_gb])];
  if (servers.length && !(n.model_memory_gb > 0)) errs.push(`node ${n.name}: model_memory_gb must be the memory, in GB, this computer gives its models`);
  // A stack on picked computers leaves out each model that does not fit, instead (placeStack).
  if (n.model_memory_gb > 0 && !leaveOut) {
    const sized = loaded.filter(([, gb]) => gb > 0);
    const total = sized.reduce((a, [, gb]) => a + gb, 0);
    if (total > n.model_memory_gb) {
      errs.push(`node ${n.name}: the loaded models need ${total} GB, and the node gives its models ${n.model_memory_gb} GB (model_memory_gb): ${sized.map(([id, gb]) => `${id} ${gb} GB`).join(", ")}`);
    }
  }
  return errs;
}

// The computers picked for a client or demo stack (site.computers), and each one's limits. With the
// cluster's own site.json, also checks the stack's computers against the cluster's.
const LIMITS = { cpus: (v) => Number.isInteger(v) && v > 0, memory_gb: (v) => v > 0, model_memory_gb: (v) => v > 0 };
function computersErrors(site, cluster) {
  const errs = [];
  const t = site.site ?? {};
  const nodes = site.nodes ?? [];
  for (const n of nodes) {
    if (n.limits === undefined) continue;
    if (t.computers === undefined) { errs.push(`node ${n.name}: limits apply to a client or demo stack's computers, so set site.computers too`); continue; }
    if (typeof n.limits !== "object" || n.limits === null) { errs.push(`node ${n.name}: limits must be an object`); continue; }
    for (const [k, v] of Object.entries(n.limits)) {
      if (!LIMITS[k]) errs.push(`node ${n.name}: limits.${k} is not a limit. Use ${Object.keys(LIMITS).join(", ")}`);
      else if (!LIMITS[k](v)) errs.push(`node ${n.name}: limits.${k} must be a positive number${k === "cpus" ? " of whole cores" : ", in GB"}`);
    }
  }
  if (t.computers === undefined) return errs;
  if (!t.tenant) errs.push("site.computers is for a client or demo stack: set site.tenant too");
  const one = Array.isArray(t.computers) && t.computers.length === 1 && typeof t.computers[0] === "string";
  if (t.computers !== "cluster" && !one) return [...errs, 'site.computers must be "cluster", or a list of one computer\'s name, such as ["machine-1"]'];
  const names = nodes.map((n) => n.name);
  if (one) {
    const [name] = t.computers;
    const extra = names.filter((x) => x !== name);
    if (extra.length) errs.push(`site.computers picks ${name}, so list only ${name} in nodes, not ${extra.join(", ")}`);
    const me = nodes.find((n) => n.name === name);
    if (!me) errs.push(`site.computers picks ${name}, and nodes has no ${name}`);
    else if (!me.control) errs.push(`node ${name}: the stack's one computer is the stack's control computer, so set "control": true`);
  }
  if (!cluster) return errs;
  // The cluster's own site.json: the computers it lists, and what the cluster's own stack uses.
  const theirs = new Map((cluster.nodes ?? []).map((n) => [n.name, n]));
  for (const n of nodes) {
    const c = theirs.get(n.name);
    if (!c) { errs.push(`node ${n.name} is not a computer in the cluster's site.json`); continue; }
    if (n.jobs && c.jobs && n.jobs.port === c.jobs.port) errs.push(`node ${n.name}: jobs.port ${n.jobs.port} is the cluster's own job runner's port. Give the stack's job runner another port`);
  }
  if (t.computers === "cluster") {
    const missing = [...theirs.keys()].filter((x) => !names.includes(x));
    if (missing.length) errs.push(`site.computers is "cluster", so list every computer of the cluster: ${missing.join(", ")} missing`);
    const control = (cluster.nodes ?? []).find((n) => n.control)?.name;
    const mine = nodes.find((n) => n.control)?.name;
    if (control && mine && control !== mine) errs.push(`site.computers is "cluster", so the cluster's control computer, ${control}, is the stack's control computer, not ${mine}`);
  }
  const cs = cluster.site ?? {};
  const theirPorts = { port: cs.port ?? 8080, preview_port: cs.preview_port ?? 5173, gateway_port: cs.gateway_port ?? 4000 };
  for (const [k, v] of Object.entries(theirPorts)) if ((t[k] ?? theirPorts[k]) === v) errs.push(`site.${k} ${v} is the cluster's own stack's port. Give the stack another port`);
  return errs;
}

// A client or demo stack's models on its picked computers. Each computer gives the stack's models
// the smaller of model_memory_gb and limits.model_memory_gb. Each model that does not fit, in the
// order site.json lists them, is left out, then each route and each agent's routes drop it.
// An agent whose routes all go uses every route the stack has left. Returns the stack's site.json
// without those models, a note for each one left out, and an error when no model is left.
export function placeStack(site) {
  const out = structuredClone(site);
  const notes = [], errs = [];
  if (!site.site?.computers) return { site: out, notes, errs };
  const gone = new Set();
  for (const n of out.nodes ?? []) {
    const rooms = [n.model_memory_gb, n.limits?.model_memory_gb].filter((v) => v > 0);
    if (!rooms.length) continue;
    const room = Math.min(...rooms);
    let used = 0;
    const fits = (backend, m) => {
      const gb = m.memory_gb > 0 ? m.memory_gb : 0;
      if (used + gb <= room) { used += gb; return true; }
      gone.add(backend);
      notes.push(`Left out ${backend}: the model needs ${gb} GB, and ${n.name} has ${room - used} GB left of the ${room} GB it gives this stack's models.`);
      return false;
    };
    for (const sv of n.servers ?? []) sv.models = (sv.models ?? []).filter((m) => fits(`${n.name}/${sv.id}/${m.id}`, m));
    if (n.servers) n.servers = n.servers.filter((sv) => sv.models.length);
    if (n.models) n.models = n.models.filter((m) => fits(`${n.name}/${m.id}`, m));
  }
  if (!gone.size) return { site: out, notes, errs };
  for (const [r, bs] of Object.entries(out.routes ?? {})) {
    out.routes[r] = bs.filter((b) => !gone.has(b));
    if (!out.routes[r].length) { delete out.routes[r]; notes.push(`Left out route ${r}: none of its models runs on this stack's computers.`); }
  }
  const left = clusterModels(out);
  for (const [h, a] of Object.entries(out.agents ?? {})) {
    if (!a?.routes) continue;
    a.routes = a.routes.filter((r) => out.routes?.[r] || left.has(r));
    if (!a.routes.length) { delete a.routes; notes.push(`Agent ${h}: every model in the agent's routes is left out, so ${h} uses the stack's other routes.`); }
  }
  if (!Object.keys(out.routes ?? {}).length && !left.size) errs.push("no model of this stack fits its computers. Pick a bigger computer, raise the limits, or list a smaller model");
  return { site: out, notes, errs };
}

export function validate(site, { cluster } = {}) {
  const errs = [];
  const nodes = site.nodes ?? [];
  if (!site.site?.public_host) errs.push("site.public_host is required");
  const t = site.site ?? {};
  if (t.tenant !== undefined && (!SLUG.test(t.tenant) || t.tenant === "default")) errs.push(`site.tenant "${t.tenant}" must be lowercase letters, digits and hyphens, and not "default"`);
  if (t.kind !== undefined && !["internal", "client", "demo"].includes(t.kind)) errs.push("site.kind must be internal, client or demo");
  errs.push(...computersErrors(site, cluster));
  for (const k of ["port", "preview_port", "gateway_port"]) {
    if (t[k] !== undefined && !(Number.isInteger(t[k]) && t[k] >= 1024 && t[k] <= 65535)) errs.push(`site.${k} must be a port number from 1024 to 65535`);
  }
  const ports = ["port", "preview_port", "gateway_port"].map((k) => t[k]).filter((v) => v !== undefined);
  if (new Set(ports).size !== ports.length) errs.push("site.port, site.preview_port and site.gateway_port must all differ");
  // On a Mac, the gateway's port for port jobs is 127.0.0.1:<gateway port + 1> (setup-host.sh).
  const jobsLocal = (t.gateway_port ?? 4000) + 1;
  if ((site.nodes ?? []).find((n) => n.control)?.os === "macos" && [t.port ?? 8080, t.preview_port ?? 5173].includes(jobsLocal)) {
    errs.push(`site.gateway_port + 1 (${jobsLocal}) is the gateway's port for port jobs on a Mac, and must differ from site.port and site.preview_port`);
  }
  if (t.docker_context !== undefined && !/^[A-Za-z0-9._-]+$/.test(t.docker_context)) errs.push("site.docker_context must be a Docker context name");
  // The cluster's time zone for reboot times in Slack (cluster/actions.mjs), an IANA name.
  if (t.timezone !== undefined) { try { new Intl.DateTimeFormat("en-US", { timeZone: t.timezone }); } catch { errs.push(`site.timezone "${t.timezone}" must be a time zone name, such as Europe/Berlin`); } }
  if (t.stack_name !== undefined) {
    if (t.tenant !== undefined) errs.push("site.stack_name names the cluster's own stack. A client or demo stack takes its name from site.tenant");
    else if (!SLUG.test(t.stack_name) || t.stack_name.startsWith("client-")) errs.push(`site.stack_name "${t.stack_name}" must be lowercase letters, digits and hyphens, and must not start with "client-"`);
  }
  if (t.slack_channel_id !== undefined && !/^[CG][A-Z0-9]{6,}$/.test(t.slack_channel_id)) errs.push("site.slack_channel_id must be a Slack channel ID, such as C0123ABCD");
  // Evidence from a lockdown is encrypted to this public key (age). The private key stays in the
  // password manager, so no computer can read the evidence it uploads.
  if (site.security?.evidence_recipient !== undefined && !/^age1[0-9a-z]{58}$/.test(site.security.evidence_recipient)) errs.push("security.evidence_recipient must be an age public key (age1...)");
  // Nightly backups: restic, through an rclone remote such as "gdrive-backups:agent-backups".
  // Settings that differ by client: the git host, how agents get access to a repo, the HTTPS
  // address in front of CircleChat, and automatic upgrades.
  if (site.git?.host !== undefined && !["github", "other"].includes(site.git.host)) errs.push('git.host must be "github" or "other"');
  if (site.repos?.access !== undefined && !["service-account", "github-app", "admin-token"].includes(site.repos.access)) errs.push('repos.access must be "service-account", "github-app" or "admin-token"');
  if (site.site?.proxy !== undefined && !["tailscale", "other"].includes(site.site.proxy)) errs.push('site.proxy must be "tailscale" or "other"');
  if (site.upgrade?.auto !== undefined && typeof site.upgrade.auto !== "boolean") errs.push("upgrade.auto must be true or false");
  if (site.notify?.details !== undefined && typeof site.notify.details !== "boolean") errs.push("notify.details must be true or false");
  if (site.privacy?.mask_pii !== undefined && typeof site.privacy.mask_pii !== "boolean") errs.push("privacy.mask_pii must be true or false");
  if (site.privacy?.mask_pii === true && !cloudAllowed(site)) errs.push(`privacy.mask_pii applies to cloud model calls, and this ${kindWord(site)} stack has no recorded permission for cloud models`);
  if (site.egress !== undefined) {
    const e = site.egress;
    if (e.enabled !== undefined && typeof e.enabled !== "boolean") errs.push("egress.enabled must be true or false");
    for (const h of e.allow ?? []) if (!/^\.?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(h)) errs.push(`egress.allow: "${h}" must be a host name or an IPv4 address, such as docs.example.com, .example.com for every subdomain, or 100.64.0.5`);
    for (const h of e.allow ?? []) if (Object.values(PROVIDER_HOSTS).flat().some((p) => h === p || h.endsWith(p))) errs.push(`egress.allow: "${h}" is a cloud model provider. Agents and port jobs reach cloud models only through the gateway`);
  }
  if (site.backup !== undefined) {
    const b = site.backup;
    if (!/^[A-Za-z0-9_-]+:\S*$/.test(b?.remote ?? "")) errs.push("backup.remote must be an rclone remote and folder, such as gdrive-backups:agent-backups");
    if (b?.time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)) errs.push("backup.time must be HH:MM, in the computer's time zone");
  }
  // Cloud models on a client or demo stack need a recorded permission. Without the permission,
  // the stack runs local open-weight models only: no cloud route, and no Porter (port jobs use
  // Claude).
  const cm = t.cloud_models;
  if (cm !== undefined) {
    if (typeof cm !== "object" || cm === null || typeof cm.allowed !== "boolean") errs.push("site.cloud_models must be an object with allowed: true or false");
    else if (cm.allowed) {
      if (!cm.granted_by || typeof cm.granted_by !== "string") errs.push("site.cloud_models.granted_by must name the person who granted the permission");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cm.granted_on ?? "")) errs.push("site.cloud_models.granted_on must be the date of the permission, as YYYY-MM-DD");
      if (!payerOk(cm.payer)) errs.push("site.cloud_models.payer must be operator or client-byok");
    }
  }
  if (t.kind === "client" || t.kind === "demo") {
    if (!t.tenant) errs.push(`a ${t.kind} stack needs site.tenant, so its containers, ports and jobs never collide with another stack's`);
    if (!t.docker_context) errs.push(`a ${t.kind} stack needs site.docker_context: its own Docker VM (for example a Colima profile), so no stack shares a Docker socket or network with another`);
  }
  if (t.kind === "client" && site.data?.kev_disagreements_branch) errs.push("a client stack cannot set data.kev_disagreements_branch: review data from a client's code never leaves the client's stack");
  if (NEEDS_PERMISSION.includes(t.kind) && !cloudAllowed(site)) {
    for (const [route, backends] of Object.entries(site.routes ?? {})) {
      for (const b of backends) if (isCloud(b, site)) errs.push(`route ${route}: "${b}" is a cloud model, and this ${t.kind} stack has no recorded permission for cloud models (site.cloud_models)`);
    }
    if (site.porter) errs.push(`a local-only ${t.kind} stack cannot run Porter: Porter's port jobs need a cloud model. Record the permission in site.cloud_models first`);
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
    // The router the computer's default route must lead to (cluster/network.mjs).
    if (n.router !== undefined && !net.isIP(String(n.router))) errs.push(`node ${n.name}: router must be an IP address, such as 192.0.2.1`);
    if (n.slack_icon !== undefined && !/^:[a-z0-9_+'-]+:$/.test(n.slack_icon)) errs.push(`node ${n.name}: slack_icon must be one emoji, such as :desktop_computer:`);
    const ids = new Set();
    for (const m of n.models ?? []) {
      if (!SLUG.test(m.id ?? "")) errs.push(`node ${n.name}: model id "${m.id}" must be a slug`);
      if (ids.has(m.id)) errs.push(`node ${n.name}: model id "${m.id}" is used twice`);
      ids.add(m.id);
      if (!m.port || !m.model) errs.push(`node ${n.name}/${m.id}: port and model are required`);
    }
    errs.push(...serverErrors(n, { leaveOut: Boolean(site.site?.computers) }));
    for (const m of [...(n.servers ?? []), ...(n.models ?? [])]) {
      if ([...FILTER_PORTS, site.site?.gateway_port ?? 4000].includes(m.port)) errs.push(`node ${n.name}: model server port ${m.port} is a port agents reach through the outgoing filter. Give the model server another port`);
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
  const known = new Set(clusterModels(site).keys());
  for (const [route, backends] of Object.entries(site.routes ?? {})) {
    if (!SLUG.test(route)) errs.push(`route "${route}" must be a slug`);
    if (!Array.isArray(backends) || !backends.length) errs.push(`route ${route}: needs at least one backend`);
    for (const b of backends ?? []) {
      if (CLOUD_PREFIXES.some((p) => b.startsWith(p))) continue;
      if (!known.has(b)) errs.push(`route ${route}: unknown backend "${b}" (use <node>/<server id>/<model id>, or a cloud model: ${CLOUD_PREFIXES.map((p) => `${p}<model>`).join(", ")})`);
    }
  }
  // Cloud keys: each named key's provider, cloud model and agents. The key's value is never here.
  if (site.model_keys !== undefined) {
    const mk = site.model_keys;
    if (typeof mk !== "object" || mk === null || Array.isArray(mk)) errs.push("model_keys must be an object of named keys, such as { \"default\": { ... } }");
    else {
      if (!cloudAllowed(site) && Object.keys(mk).length) errs.push(`model_keys: this ${kindWord(site)} stack has no recorded permission for cloud models (site.cloud_models)`);
      const owner = new Map();
      for (const [name, k] of Object.entries(mk)) {
        const at = `model_keys.${name}`;
        if (!SLUG.test(name)) { errs.push(`${at}: the key name must be lowercase letters, digits and hyphens`); continue; }
        if (!k || typeof k !== "object") { errs.push(`${at} must be an object`); continue; }
        if (!PROVIDERS[k.provider]) errs.push(`${at}.provider must be one of ${Object.keys(PROVIDERS).filter((p) => p !== "vertex_ai").join(", ")}`);
        else if (k.provider === "vertex_ai") errs.push(`${at}: Vertex AI signs in with a service account file, which a model key cannot hold. Use another provider`);
        if (typeof k.model !== "string" || !k.model.trim()) errs.push(`${at}.model must name the cloud model, such as claude-sonnet-5-5`);
        else if (k.model.includes("/") && CLOUD_PREFIXES.some((p) => k.model.startsWith(p)) && !k.model.startsWith(`${k.provider}/`)) errs.push(`${at}.model "${k.model}" belongs to another provider than ${k.provider}`);
        if (k.agents !== undefined && (!Array.isArray(k.agents) || k.agents.some((a) => !AGENT.test(String(a))))) errs.push(`${at}.agents must be a list of agent handles`);
        for (const a of Array.isArray(k.agents) ? k.agents : []) {
          if (owner.has(a)) errs.push(`agent ${a} is in model_keys.${owner.get(a)} and ${at}: give each agent one key`);
          owner.set(a, name);
        }
        if (k.provider === "azure" && !/^https:\/\/\S+$/.test(k.api_base ?? "")) errs.push(`${at}.api_base must be the Azure deployment's https address`);
        if (k.provider === "bedrock" && !/^[a-z]{2}-[a-z]+-\d$/.test(k.region ?? "")) errs.push(`${at}.region must be an AWS region, such as us-east-1`);
      }
    }
  }
  // Each agent: the routes its gateway key may use, and its cloud switch (on by default).
  if (site.agents !== undefined) {
    if (typeof site.agents !== "object" || site.agents === null || Array.isArray(site.agents)) errs.push("agents must be an object keyed by agent handle");
    else for (const [h, a] of Object.entries(site.agents)) {
      if (!AGENT.test(h)) errs.push(`agents: "${h}" is not an agent handle`);
      if (!a || typeof a !== "object") { errs.push(`agents.${h} must be an object`); continue; }
      if (a.cloud !== undefined && typeof a.cloud !== "boolean") errs.push(`agents.${h}.cloud must be true or false`);
      if (a.routes !== undefined && (!Array.isArray(a.routes) || !a.routes.length)) errs.push(`agents.${h}.routes must list at least one route`);
      for (const r of Array.isArray(a.routes) ? a.routes : []) {
        if (!site.routes?.[r] && !known.has(r)) errs.push(`agents.${h}.routes: "${r}" is neither a route nor a cluster model (<node>/<server id>/<model id>)`);
      }
    }
  }
  // Routes list the cluster's models. A cloud model in a route would answer whenever the cluster
  // is busy or down, and a busy cluster is never a reason to call a cloud model. A stack with no
  // model_keys block may still name one cloud model in its routes: that model becomes the default key.
  const cloudInRoutes = Object.entries(site.routes ?? {}).flatMap(([r, bs]) => (Array.isArray(bs) ? bs : []).filter((b) => CLOUD_PREFIXES.some((p) => String(b).startsWith(p))).map((b) => [r, b]));
  if (site.model_keys) for (const [r, b] of cloudInRoutes) errs.push(`route ${r}: "${b}" is a cloud model. Routes list the cluster's models; cloud models come from model_keys`);
  else if (cloudInRoutes.length && cloudAllowed(site)) {
    const providers = new Set(cloudInRoutes.map(([, b]) => b.split("/")[0]));
    if (providers.has("vertex_ai")) errs.push("a route names a Vertex AI model, which a model key cannot hold. Add a model_keys block with another provider");
    if (new Set(cloudInRoutes.map(([, b]) => b)).size > 1) errs.push(`the routes name more than one cloud model (${[...new Set(cloudInRoutes.map(([, b]) => b))].join(", ")}). Add a model_keys block that names each key's model`);
  }
  // A port job on another computer reaches the gateway at the control computer's Tailscale address.
  const control = nodes.find((n) => n.control);
  if (control && nodes.some((n) => n.jobs && !n.control) && !control.tailnet_address) errs.push(`node ${control.name}: a job runner on another computer needs the control computer's tailnet_address, its Tailscale IP address`);
  for (const n of nodes) if (n.tailnet_address !== undefined && !/^(\d{1,3}(\.\d{1,3}){3}|[0-9a-f:]+)$/i.test(n.tailnet_address)) errs.push(`node ${n.name}: tailnet_address must be an IP address, such as 100.64.0.5`);
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
  const byKey = clusterModels(site);

  // A cluster model may take a long time to answer when the cluster is busy: the request waits.
  // hosted_vllm is LiteLLM's name for any server with the OpenAI chat API, which Ollama and mlx-lm
  // both serve at /v1. Unlike openai/, it also answers a request in Anthropic's format (a port
  // job's Claude Code) through that chat API.
  const WAIT = 86_400;
  const params = (b) => {
    const { n, server, m } = byKey.get(b);
    return { model: `hosted_vllm/${m.model}`, api_base: url(n, server.port, "/v1"), api_key: "none", timeout: WAIT, stream_timeout: WAIT };
  };
  // LiteLLM names the model that answered in the x-litellm-model-id header: "<name>|<model>", where
  // <model> is the cluster model (<node>/<server id>/<model id>) or the cloud model
  // (<provider>/<model>). The gateway looks up the model's server in gateway.json.
  const entry = (name, b, p) => ({ model_name: name, litellm_params: p, model_info: { id: `${name}|${b}` } });
  // Every cluster model under its own name, and each route as an alias of its first cluster model,
  // with the route's other cluster models as fallbacks in order. Cloud models never join a route.
  // LiteLLM reads JSON as YAML.
  const model_list = [...byKey.keys()].map((b) => entry(b, b, params(b)));
  const fallbacks = [];
  for (const [route, backends] of Object.entries(site.routes ?? {})) {
    const local = backends.filter((b) => byKey.has(b));
    if (!local.length) continue;
    model_list.push(entry(route, local[0], params(local[0])));
    if (local.length > 1) fallbacks.push({ [route]: local.slice(1) });
  }
  // Each cloud key as the model key/<name>. "file:" values are placeholders: start-litellm.py fills
  // each one from the gateway's secrets file when the gateway starts, so no key is ever in this
  // file, in an environment variable or on a command line.
  for (const [name, k] of Object.entries(modelKeys(site))) {
    const p = { model: `${k.provider}/${k.model}` };
    if (k.provider === "bedrock") Object.assign(p, { aws_access_key_id: `file:${k.secret}#1`, aws_secret_access_key: `file:${k.secret}#2`, aws_region_name: k.region });
    else p.api_key = `file:${k.secret}`;
    if (k.api_base) p.api_base = k.api_base;
    if (k.api_version) p.api_version = k.api_version;
    model_list.push(entry(`key/${name}`, p.model, p));
  }
  // LiteLLM sits on a network only the gateway's front door (router.mjs) joins. start-litellm.py
  // adds the master key the router uses, from a file in the gateway's state folder.
  const litellm = {
    model_list,
    router_settings: { fallbacks, num_retries: 1, timeout: WAIT },
    ...(maskPii(site) ? { guardrails: [{ guardrail_name: "presidio-pii", litellm_params: { guardrail: "presidio", mode: "pre_call", default_on: true } }] } : {}),
  };

  const kev = nodes
    .filter((n) => n.kev?.port)
    .sort((a, b) => (a.kev.priority ?? 99) - (b.kev.priority ?? 99))
    .map((n) => url(n, n.kev.port));

  const jobNodes = nodes
    .filter((n) => n.jobs)
    .sort((a, b) => (a.jobs.priority ?? 99) - (b.jobs.priority ?? 99))
    // jobd listens on loopback and the Tailscale address only (setup-node.sh). Porter reaches the
    // control computer's jobd at the control computer's Tailscale address: host.docker.internal is
    // Docker's bridge address on Linux.
    .map((n) => url(n.control && n.tailnet_address ? { ...n, address: n.tailnet_address } : n, n.jobs.port));
  const p = site.porter;
  const porterEnv = p ? `PORTER_OWNER=${p.owner ?? ""}\nJOBD_ALLOWED_REPOS=${p.targets.join(",")}\n` : "";
  const watches = p ? [{ repo: p.watch, hook: "PORTER" }] : [];
  // Port jobs send their model requests to the control computer's gateway: on the control computer
  // through the job network, and from another computer over Tailscale.
  const control = nodes.find((n) => n.control);
  const gatewayUrl = (n) => (n.control ? "http://cc-gateway:4000" : `http://${control?.tailnet_address}:${site.site?.gateway_port ?? 4000}`);
  // A computer's limits cap each job: no more memory than limits.memory_gb, no more jobs at once
  // than fit in it, and no more cores than limits.cpus.
  const jobs = (n) => {
    const j = { ...n.jobs, gateway_url: gatewayUrl(n) };
    const l = n.limits ?? {};
    if (l.memory_gb) {
      j.memory_gb = Math.min(j.memory_gb, l.memory_gb);
      j.slots = Math.max(1, Math.min(j.slots, Math.floor(l.memory_gb / j.memory_gb)));
    }
    if (l.cpus) j.cpus = l.cpus;
    return j;
  };
  const services = Object.fromEntries(nodes.map((n) => [n.name, { os: n.os, services: n.services ?? [], jobs: n.jobs ? jobs(n) : null, limits: n.limits ?? null }]));
  const appEnv = `APP_REPO=${site.repos.app_dir}\nAPP_REPO_GITHUB=${site.repos.app_github}\n`;
  // No tenant keeps the names a single-stack install has always used, so an existing install
  // keeps its containers, volumes and jobs.
  const st = site.site ?? {};
  const tenant = st.tenant ?? "";
  const tenantEnv = [
    `TENANT=${tenant}`,
    `STACK_NAME=${stackName(site)}`,
    `TENANT_KIND=${st.kind ?? "internal"}`,
    `SUFFIX=${tenant ? `-${tenant}` : ""}`,
    `COMPOSE_PROJECT_NAME=${tenant ? `cc-${tenant}` : "circlechat"}`,
    `PREVIEW_PORT=${st.preview_port ?? 5173}`,
    `GATEWAY_PORT=${st.gateway_port ?? 4000}`,
    `DOCKER_CONTEXT=${st.docker_context ?? ""}`,
    `CLOUD_MODELS=${cloudAllowed(site) ? "allowed" : "local-only"}`,
    `BACKUP_REMOTE=${site.backup?.remote ?? ""}`,
    `EGRESS=${site.egress?.enabled === false ? "off" : "on"}`,
    `MASK_PII=${maskPii(site) ? "on" : "off"}`,
    `GIT_HOST=${site.git?.host ?? "github"}`,
    `REPO_ACCESS=${site.repos?.access ?? "service-account"}`,
    `PROXY=${site.site?.proxy ?? "tailscale"}`,
    `UPGRADE_AUTO=${site.upgrade?.auto === true ? "on" : "off"}`,
    // Task details in Slack: on for the cluster's own stack and a demo; off for a client stack unless the client
    // allows details (notify.details), because Slack is an outside company.
    `NOTIFY_DETAILS=${(site.notify?.details ?? st.kind !== "client") ? "on" : "off"}`,
    `PUBLIC_KNOWLEDGE=${/borderux\/recursica-knowledge(\.git)?$/.test(site.repos?.knowledge ?? "") ? "yes" : "no"}`,
    `BACKUP_TIME=${site.backup?.time ?? "02:00"}`,
    // Port jobs on other computers reach the gateway at this address, over Tailscale.
    `TAILNET_ADDRESS=${control?.tailnet_address ?? ""}`,
    // The control computer's limits: the most the stack's Docker VM may have (setup-host.sh checks).
    `LIMIT_CPUS=${control?.limits?.cpus ?? ""}`,
    `LIMIT_MEMORY_GB=${control?.limits?.memory_gb ?? ""}`,
  ].join("\n") + "\n";
  const isIp = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":");
  const hosts = egressAllow(site);
  const ips = hosts.filter(isIp);
  // Squid refuses an empty list, so each list holds a placeholder that never matches.
  const egress = { allow: (hosts.filter((h) => !isIp(h)).join("\n") || "nothing.invalid") + "\n", allowIps: (ips.join("\n") || "192.0.2.1") + "\n", conf: squidConf(site) };
  return { litellm, kev, services, appEnv, jobNodes, porterEnv, watches, tenantEnv, egress, gateway: gatewayConfig(site) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, out] = process.argv.slice(2);
  if (!file || !out) { console.error("usage: render.mjs <site.json> <out dir>"); process.exit(2); }
  const given = JSON.parse(fs.readFileSync(file, "utf8"));
  // A client or demo stack's computers are checked against the cluster's own site.json.
  const cluster = process.env.CLUSTER_SITE && fs.existsSync(process.env.CLUSTER_SITE) ? JSON.parse(fs.readFileSync(process.env.CLUSTER_SITE, "utf8")) : undefined;
  const placed = placeStack(given);
  const errs = [...validate(given, { cluster }), ...placed.errs];
  if (errs.length) { console.error("site.json has problems:\n  - " + errs.join("\n  - ")); process.exit(1); }
  for (const note of placed.notes) console.log(note);
  const site = placed.site;
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
  fs.writeFileSync(path.join(out, "gateway.json"), JSON.stringify(r.gateway, null, 2) + "\n");
  fs.mkdirSync(path.join(out, "egress"), { recursive: true });
  fs.writeFileSync(path.join(out, "egress", "allow.txt"), r.egress.allow);
  fs.writeFileSync(path.join(out, "egress", "allow-ips.txt"), r.egress.allowIps);
  fs.writeFileSync(path.join(out, "egress", "squid.conf"), r.egress.conf);
  // One-time consents: the cluster agent rewrites this file. An empty list holds a name that
  // never resolves, because Squid refuses an empty list.
  const once = path.join(out, "egress", "allow-once.txt");
  if (!fs.existsSync(once)) fs.writeFileSync(once, "nothing.invalid\n");
  console.log(`rendered: ${site.nodes.length} node(s), ${Object.keys(site.routes ?? {}).length} route(s), ${r.kev.length} Kev engine(s), ${r.jobNodes.length} job runner(s)`);
}
