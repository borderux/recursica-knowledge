import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { clusterStackName, githubEnvironment, keySecret, ollamaService, placeStack, render, stackName, validate } from "./render.mjs";
import { repoOf } from "./kev-data.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../site.example.json", import.meta.url), "utf8"));
const clone = () => structuredClone(example);

test("the example is valid", () => assert.deepEqual(validate(example), []));

test("routes become aliases with ordered fallbacks among the cluster's models", () => {
  const { litellm } = render(example);
  const alias = litellm.model_list.find((m) => m.model_name === "local-large");
  assert.equal(alias.litellm_params.api_base, "http://machine-2.example.ts.net:11434/v1");
  assert.equal(alias.litellm_params.timeout, 86400, "a request waits for a busy cluster");
  assert.equal(alias.litellm_params.model, "hosted_vllm/your-large-model");
  assert.equal(alias.model_info.id, "local-large|machine-2/ollama/large-local", "LiteLLM names the model that answered");
  assert.deepEqual(litellm.router_settings.fallbacks.find((f) => f["local-large"])["local-large"], ["machine-1/ollama/small-local"]);
  assert.equal(litellm.general_settings, undefined, "the master key comes from a file when LiteLLM starts");
});

test("each cloud key becomes key/<name>, with a placeholder the gateway fills from its secrets file", () => {
  const { litellm } = render(example);
  const key = (n) => litellm.model_list.find((m) => m.model_name === `key/${n}`).litellm_params;
  assert.deepEqual(key("default"), { model: "anthropic/claude-sonnet-5-5", api_key: "file:MODEL_KEY_DEFAULT" });
  assert.deepEqual(key("acme-grok"), { model: "xai/grok-4", api_key: "file:MODEL_KEY_ACME_GROK" });
  assert.equal(keySecret("acme-grok"), "MODEL_KEY_ACME_GROK");
  assert.doesNotMatch(JSON.stringify(litellm), /os\.environ/, "no key comes from an environment variable");
});

test("the gateway gets each agent's routes, cloud switch and key", () => {
  const g = render(example).gateway;
  assert.deepEqual(g.agents.betty, { routes: ["local-large"], cloud: true, key: "default" });
  assert.deepEqual(g.agents.loki, { routes: ["local-small"], cloud: false, key: "default" });
  assert.deepEqual(g.agents.porter, { routes: ["local-large", "local-small"], cloud: true, key: "porter" });
  assert.deepEqual(g.agents.barb.key, "acme-grok");
  assert.deepEqual(g.fallback, { routes: ["local-large", "local-small"], cloud: true, key: "default" });
  assert.deepEqual(g.keys["acme-grok"], { model: "key/acme-grok", provider: "xai" });
  assert.deepEqual(g.routes["local-large"], { local: true });
  assert.deepEqual(g.routes["machine-2/mlx/large-mlx"], { local: true }, "an agent may name one cluster model as a route");
  assert.deepEqual(g.nodes, ["machine-2.example.ts.net"]);
});

test("a stack with no model_keys block keeps working: its cloud route model becomes the default key", () => {
  const s = clone();
  delete s.model_keys;
  s.routes["local-large"].push("anthropic/claude-sonnet-5-5");
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.deepEqual(r.litellm.model_list.find((m) => m.model_name === "key/default").litellm_params, { model: "anthropic/claude-sonnet-5-5", api_key: "file:MODEL_KEY_DEFAULT" });
  assert.deepEqual(r.litellm.router_settings.fallbacks.find((f) => f["local-large"])["local-large"], ["machine-1/ollama/small-local"], "the cloud model is no fallback");
  assert.equal(r.gateway.agents.betty.key, "default");
  assert.equal(r.gateway.fallback.key, "default");
  s.routes["local-small"].push("xai/grok-4");
  assert.match(validate(s).join("\n"), /more than one cloud model/);
});

test("model_keys accept any provider the gateway supports, and catch the mistakes", () => {
  const s = clone();
  s.model_keys.gpt = { provider: "openai", model: "openai/gpt-5", agents: ["alan"] };
  s.model_keys.az = { provider: "azure", model: "gpt-5", agents: [], api_base: "https://acme.openai.azure.com" };
  s.model_keys.br = { provider: "bedrock", model: "anthropic.claude-sonnet", agents: [], region: "us-east-1" };
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.equal(r.litellm.model_list.find((m) => m.model_name === "key/gpt").litellm_params.model, "openai/gpt-5");
  assert.deepEqual(r.litellm.model_list.find((m) => m.model_name === "key/br").litellm_params,
    { model: "bedrock/anthropic.claude-sonnet", aws_access_key_id: "file:MODEL_KEY_BR#1", aws_secret_access_key: "file:MODEL_KEY_BR#2", aws_region_name: "us-east-1" });
  s.model_keys.bad = { provider: "nowhere", model: "", agents: ["barb"] };
  s.model_keys.vx = { provider: "vertex_ai", model: "gemini" };
  s.model_keys.mix = { provider: "xai", model: "anthropic/claude" };
  s.model_keys.az.api_base = "http://plain";
  s.model_keys.br.region = "mars";
  s.routes["local-small"].push("anthropic/claude-sonnet-5-5");
  const errs = validate(s).join("\n");
  assert.match(errs, /model_keys.bad.provider must be one of anthropic, openai, xai/);
  assert.match(errs, /model_keys.bad.model must name the cloud model/);
  assert.match(errs, /agent barb is in model_keys.acme-grok and model_keys.bad/);
  assert.match(errs, /Vertex AI signs in with a service account file/);
  assert.match(errs, /"anthropic\/claude" belongs to another provider than xai/);
  assert.match(errs, /model_keys.az.api_base must be the Azure deployment's https address/);
  assert.match(errs, /model_keys.br.region must be an AWS region/);
  assert.match(errs, /route local-small: "anthropic\/claude-sonnet-5-5" is a cloud model. Routes list the cluster's models/);
});

test("each agent's routes and cloud switch are checked", () => {
  const s = clone();
  s.agents.betty = { routes: ["nowhere"], cloud: "yes" };
  s.agents["Not A Handle"] = {};
  const errs = validate(s).join("\n");
  assert.match(errs, /agents.betty.routes: "nowhere" is neither a route nor a cluster model/);
  assert.match(errs, /agents.betty.cloud must be true or false/);
  assert.match(errs, /"Not A Handle" is not an agent handle/);
});

test("port jobs reach the control computer's gateway: over the job network there, over Tailscale elsewhere", () => {
  const r = render(example);
  assert.equal(r.services["machine-1"].jobs.gateway_url, "http://cc-gateway:4000");
  assert.equal(r.services["machine-2"].jobs.gateway_url, "http://100.64.0.1:4000");
  assert.match(r.tenantEnv, /^TAILNET_ADDRESS=100\.64\.0\.1$/m);
  assert.match(r.egress.allowIps, /^100\.64\.0\.1$/m);
  assert.match(r.egress.conf, /acl Safe_ports port .* 4000\n/);
  const s = clone();
  delete s.nodes[0].tailnet_address;
  assert.match(validate(s).join("\n"), /needs the control computer's tailnet_address/);
  s.nodes[0].tailnet_address = "not an address";
  assert.match(validate(s).join("\n"), /tailnet_address must be an IP address/);
});

test("agents never reach a model server's own API through the outgoing filter", () => {
  const ports = (conf) => conf.match(/^acl Safe_ports port (.*)$/m)[1].split(" ").map(Number);
  assert.deepEqual(ports(render(example).egress.conf), [80, 443, 7400, 8009, 4000], "web, the job runner, Kev's model and the gateway");
  const s = clone();
  s.nodes[1].servers.push({ id: "mlx-2", kind: "mlx-lm", port: 8082, models: [{ id: "other", model: "<name>", memory_gb: 1 }] });
  s.nodes[0].models = [{ id: "old", port: 11434, model: "<name>" }];
  delete s.nodes[0].servers;
  const open = ports(render(s).egress.conf);
  for (const p of [11434, 8082, 8081]) assert.ok(!open.includes(p), `model server port ${p} stays closed`);
  s.nodes[1].servers[1].port = 7400;
  assert.match(validate(s).join("\n"), /model server port 7400 is a port agents reach through the outgoing filter/);
});

test("kev engines are ordered by priority", () => {
  assert.deepEqual(render(example).kev, ["http://machine-2.example.ts.net:8009", "http://host.docker.internal:8009"]);
});

test("any number of nodes", () => {
  const s = clone();
  for (let i = 0; i < 25; i++) s.nodes.push({ name: `gpu-${i}`, os: "linux", address: `10.0.0.${i}`, kev: { port: 8009, priority: 10 + i }, models: [{ id: "m", port: 8000, model: "x" }] });
  s.routes.wide = s.nodes.slice(2).map((n) => `${n.name}/m`);
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.equal(r.kev.length, 27);
  assert.equal(r.litellm.router_settings.fallbacks.find((f) => f.wide).wide.length, 24);
});

test("catches the mistakes that would break a deployment", () => {
  const s = clone();
  s.nodes[1].control = true;
  s.routes.bad = ["nowhere/model"];
  s.nodes.push({ ...s.nodes[0], control: false });
  const errs = validate(s).join("\n");
  assert.match(errs, /exactly one node/);
  assert.match(errs, /unknown backend "nowhere\/model"/);
  assert.match(errs, /used twice/);
});

test("job runners are ordered by priority, and Porter gets its allowlist", () => {
  const r = render(example);
  assert.deepEqual(r.jobNodes, ["http://machine-2.example.ts.net:7400", "http://100.64.0.1:7400"], "the control computer's job runner over Tailscale");
  assert.match(r.porterEnv, /JOBD_ALLOWED_REPOS=https:\/\/github.com\/borderux\/recursica-adapter-mui-v7,/);
  assert.deepEqual(r.watches, [{ repo: "borderux/recursica-adapter-mantine-v8", hook: "PORTER" }]);
  assert.equal(r.services["machine-2"].jobs.slots, 3);
});

test("porter without a job runner, or with a bad target, is caught", () => {
  const s = clone();
  for (const n of s.nodes) delete n.jobs;
  s.porter.targets.push("git@github.com:x/y.git");
  const errs = validate(s).join("\n");
  assert.match(errs, /needs at least one node with a jobs block/);
  assert.match(errs, /must be an https clone URL/);
});

test("no tenant keeps the single-stack names", () => {
  const r = render(example);
  assert.match(r.tenantEnv, /^TENANT=$/m);
  assert.match(r.tenantEnv, /^SUFFIX=$/m);
  assert.match(r.tenantEnv, /^COMPOSE_PROJECT_NAME=circlechat$/m);
  assert.match(r.tenantEnv, /^PREVIEW_PORT=5173$/m);
  assert.match(r.tenantEnv, /^GATEWAY_PORT=4000$/m);
});

test("a tenant gets its own names and ports", () => {
  const s = clone();
  Object.assign(s.site, { tenant: "acme", kind: "client", docker_context: "colima-acme", port: 8180, preview_port: 5273, gateway_port: 4100 });
  s.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "operator" };
  delete s.data;
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.match(r.tenantEnv, /^SUFFIX=-acme$/m);
  assert.match(r.tenantEnv, /^COMPOSE_PROJECT_NAME=cc-acme$/m);
  assert.match(r.tenantEnv, /^PREVIEW_PORT=5273$/m);
  assert.match(r.tenantEnv, /^GATEWAY_PORT=4100$/m);
  assert.match(r.tenantEnv, /^DOCKER_CONTEXT=colima-acme$/m);
  assert.match(r.tenantEnv, /^TENANT_KIND=client$/m);
});

test("a client stack must have a tenant, its own Docker VM, and no review-data push", () => {
  const s = clone();
  s.site.kind = "client";
  s.data = { repo: "acme/kev-data" };
  const errs = validate(s).join("\n");
  assert.match(errs, /client stack needs site.tenant/);
  assert.match(errs, /client stack needs site.docker_context/);
  assert.match(errs, /client stack cannot set data.repo/);
});

test("Kev's review data goes to a repo named owner/name, never the knowledge repo, and the old branch setting is refused", () => {
  const check = (data) => { const s = clone(); s.data = data; return validate(s).join("\n"); };
  assert.doesNotMatch(check({ repo: "acme/recursica-kev-data" }), /data\./);
  assert.doesNotMatch(check({ repo: "" }), /data\./);
  assert.match(check({ repo: "https://github.com/acme/kev-data" }), /data.repo must be owner\/name/);
  const kb = repoOf(clone().repos.knowledge);
  assert.match(check({ repo: kb.toUpperCase() }), /data.repo cannot be the knowledge repo/);
  assert.match(check({ kev_disagreements_branch: "data/kev" }), /data.kev_disagreements_branch is gone/);
});

test("a stack's three ports must differ, and the tenant name is a slug", () => {
  const s = clone();
  Object.assign(s.site, { tenant: "Bad Name", port: 8080, preview_port: 8080 });
  const errs = validate(s).join("\n");
  assert.match(errs, /site.tenant "Bad Name"/);
  assert.match(errs, /must all differ/);
});

function clientStack() {
  const s = clone();
  Object.assign(s.site, { tenant: "acme", kind: "client", docker_context: "colima-acme", port: 8180, preview_port: 5273, gateway_port: 4100 });
  delete s.data;
  return s;
}

test("a client stack is local-only until the client's permission is recorded", () => {
  const s = clientStack();
  s.routes["local-small"].push("anthropic/claude-sonnet-5-5");
  const errs = validate(s).join("\n");
  assert.match(errs, /is a cloud model, and this client stack has no recorded permission/);
  assert.match(errs, /model_keys: this client stack has no recorded permission/);
  if (s.porter) assert.match(errs, /local-only client stack cannot run Porter/);
  const local = clientStack();
  delete local.porter; delete local.model_keys;
  for (const k of Object.keys(local.routes)) local.routes[k] = local.routes[k].filter((b) => !b.startsWith("anthropic/"));
  for (const k of Object.keys(local.routes)) if (!local.routes[k].length) delete local.routes[k];
  assert.deepEqual(validate(local), []);
  assert.match(render(local).tenantEnv, /^CLOUD_MODELS=local-only$/m);
  assert.deepEqual(render(local).gateway.keys, {});
});

test("cloud models on a client stack need who granted the permission, when, and who pays", () => {
  const s = clientStack();
  s.site.cloud_models = { allowed: true };
  const errs = validate(s).join("\n");
  assert.match(errs, /granted_by must name the person/);
  assert.match(errs, /granted_on must be the date/);
  assert.match(errs, /payer must be operator or client-byok/);
  s.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "client-byok" };
  assert.deepEqual(validate(s), []);
  assert.match(render(s).tenantEnv, /^CLOUD_MODELS=allowed$/m);
});

test("the cluster's own stack may call cloud models", () => {
  assert.match(render(example).tenantEnv, /^CLOUD_MODELS=allowed$/m);
});

test("backup settings are checked and passed to the setup", () => {
  const s = clone();
  s.backup = { remote: "gdrive-backups:agent-backups", time: "02:30" };
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.match(r.tenantEnv, /^BACKUP_REMOTE=gdrive-backups:agent-backups$/m);
  assert.match(r.tenantEnv, /^BACKUP_TIME=02:30$/m);
  s.backup = { remote: "no colon", time: "25:00" };
  const errs = validate(s).join("\n");
  assert.match(errs, /backup.remote must be an rclone remote/);
  assert.match(errs, /backup.time must be HH:MM/);
});

test("the evidence key must be an age public key", () => {
  const s = clone();
  s.security = { evidence_recipient: "not-a-key" };
  assert.match(validate(s).join("\n"), /age public key/);
  s.security.evidence_recipient = "age1" + "q".repeat(58);
  assert.deepEqual(validate(s), []);
});

test("the outgoing filter allows GitHub, the registries and the stack's computers, and never a model provider", () => {
  const r = render(example);
  assert.match(r.egress.allow, /^\.github\.com$/m);
  assert.match(r.egress.allow, /^registry\.npmjs\.org$/m);
  assert.doesNotMatch(r.egress.allow, /anthropic|x\.ai|openai/);
  assert.match(r.egress.conf, /http_access deny all/);
  const s = clone();
  s.egress = { allow: ["api.anthropic.com", "api.x.ai", "docs.example.com"] };
  const errs = validate(s).join("\n");
  assert.match(errs, /"api.anthropic.com" is a cloud model provider. Agents and port jobs reach cloud models only through the gateway/);
  assert.match(errs, /"api.x.ai" is a cloud model provider/);
  assert.doesNotMatch(errs, /docs.example.com/);
});

test("masking is on by default for a client stack with cloud models, and keeps agents off the providers", () => {
  const s = clone();
  Object.assign(s.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  s.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "client-byok" };
  delete s.data;
  const r = render(s);
  assert.match(r.tenantEnv, /^MASK_PII=on$/m);
  assert.equal(r.litellm.guardrails[0].litellm_params.guardrail, "presidio");
  assert.doesNotMatch(r.egress.allow, /anthropic/);
  s.privacy = { mask_pii: false };
  assert.match(render(s).tenantEnv, /^MASK_PII=off$/m);
  assert.doesNotMatch(render(s).egress.allow, /anthropic/, "masking is a separate setting: agents never reach a provider");
  assert.match(render(example).tenantEnv, /^MASK_PII=off$/m);
});

test("the per-client settings are checked", () => {
  const s = clone();
  s.git = { host: "other" };
  s.repos.access = "admin-token";
  s.site.proxy = "other";
  s.upgrade = { auto: true };
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.match(r.tenantEnv, /^GIT_HOST=other$/m);
  assert.match(r.tenantEnv, /^REPO_ACCESS=admin-token$/m);
  assert.match(r.tenantEnv, /^UPGRADE_AUTO=on$/m);
  s.git.host = "gitlab-ish"; s.repos.access = "magic";
  const errs = validate(s).join("\n");
  assert.match(errs, /git.host must be/);
  assert.match(errs, /repos.access must be/);
});

test("a computer's IP address goes on the filter's IP list, where name rules cannot miss it", () => {
  const s = clone();
  s.nodes[1].address = "100.101.102.103";
  const r = render(s);
  assert.match(r.egress.allowIps, /^100\.101\.102\.103$/m);
  assert.doesNotMatch(r.egress.allow, /100\.101/);
  assert.match(r.egress.conf, /acl allowed_ips dst "\/etc\/egress\/allow-ips.txt"/);
  const none = clone();
  delete none.nodes[0].tailnet_address; delete none.nodes[1].jobs; delete none.porter;
  assert.match(render(none).egress.allowIps, /192\.0\.2\.1/);
});

test("a computer runs several model servers, and an agent can name any server and model", () => {
  const { litellm, gateway } = render(example);
  const mlx = litellm.model_list.find((m) => m.model_name === "machine-2/mlx/large-mlx");
  assert.deepEqual([mlx.litellm_params.model, mlx.litellm_params.api_base], ["hosted_vllm/your-org/your-large-model-mlx", "http://machine-2.example.ts.net:8081/v1"]);
  assert.equal(mlx.model_info.id, "machine-2/mlx/large-mlx|machine-2/mlx/large-mlx");
  assert.deepEqual(gateway.agents.barb.routes, ["machine-2/mlx/large-mlx"]);
  // The spend log's server and model, for each name LiteLLM reports.
  assert.deepEqual(gateway.models["machine-2/mlx/large-mlx"], { server: "machine-2/mlx", kind: "mlx-lm", model: "your-org/your-large-model-mlx" });
  assert.deepEqual(gateway.models["machine-2/ollama/large-local"], { server: "machine-2/ollama", kind: "ollama", model: "your-large-model" });
  assert.deepEqual(gateway.models["xai/grok-4"], { server: "xai", kind: "cloud", model: "grok-4" });
  // Moving an agent to another server and model is a site.json change.
  const s = clone();
  s.agents.betty.routes = ["machine-2/ollama/large-local"];
  assert.deepEqual(validate(s), []);
  assert.deepEqual(render(s).gateway.agents.betty.routes, ["machine-2/ollama/large-local"]);
});

test("the config check refuses loaded models that don't fit a computer's memory, and names each model", () => {
  const s = clone();
  s.nodes[1].model_memory_gb = 64;
  assert.deepEqual(validate(s), ["node machine-2: the loaded models need 80 GB, and the node gives its models 64 GB (model_memory_gb): ollama/large-local 40 GB, mlx/large-mlx 40 GB"]);
  delete s.nodes[1].model_memory_gb;
  delete s.nodes[1].servers[0].models[0].memory_gb;
  const errs = validate(s).join("\n");
  assert.match(errs, /node machine-2: model_memory_gb must be the memory, in GB, this computer gives its models/);
  assert.match(errs, /server ollama, model large-local: memory_gb must be the memory the model needs/);
});

test("each model server's kind, port and models are checked", () => {
  const s = clone();
  const m1 = s.nodes[0];
  m1.servers.push(
    { id: "mlx", kind: "mlx-lm", port: 8081, models: [{ id: "a", model: "x", memory_gb: 1 }] },
    { id: "other", kind: "vllm", port: 8009, models: [] },
    { id: "ollama", kind: "ollama", port: 11500, models: [{ id: "b", memory_gb: 1 }] },
  );
  s.nodes[1].servers[1].models.push({ id: "second", model: "y", memory_gb: 1 });
  s.nodes[1].models = [{ id: "old", port: 9000, model: "z" }];
  const errs = validate(s).join("\n");
  assert.match(errs, /node machine-1, server mlx: an mlx-lm server runs only on macos, and this node is linux/);
  assert.match(errs, /node machine-1, server other: kind must be ollama or mlx-lm/);
  assert.match(errs, /node machine-1, server other: port 8009 is already used by kev/);
  assert.match(errs, /node machine-1, server other: models must list at least one model/);
  assert.match(errs, /node machine-1: server id "ollama" is used twice/);
  assert.match(errs, /node machine-1, server ollama, model b: model is required/);
  assert.match(errs, /node machine-2, server mlx: an mlx-lm server serves one model/);
  assert.match(errs, /node machine-2: list the models under servers, not also under models/);
});

test("an Ollama server's settings are checked, and the kit's Ollama service gets each one", () => {
  const s = clone();
  const sv = s.nodes.find((n) => n.control).servers.find((x) => x.kind === "ollama");
  assert.deepEqual(ollamaService(s), { port: 11434, env: [] }, "a setting left out keeps Ollama's default");
  Object.assign(sv, { context_length: 131072, parallel: 4, keep_alive: "-1" });
  assert.deepEqual(validate(s), []);
  assert.deepEqual(ollamaService(s), { port: 11434, env: ["OLLAMA_CONTEXT_LENGTH=131072", "OLLAMA_NUM_PARALLEL=4", "OLLAMA_KEEP_ALIVE=-1"] });
  for (const k of ["30m", "1h30m", "300", 300, -1]) { sv.keep_alive = k; assert.deepEqual(validate(s), [], String(k)); }
  Object.assign(sv, { context_length: 0, parallel: 1.5, keep_alive: "forever" });
  const errs = validate(s).join("\n");
  assert.match(errs, /server ollama: context_length must be a whole number above 0/);
  assert.match(errs, /server ollama: parallel must be a whole number above 0/);
  assert.match(errs, /server ollama: keep_alive must be "-1", to keep each model loaded, or a time such as "30m"/);
  // A setting with a space or a quote never reaches the service's command line.
  Object.assign(sv, { context_length: 131072, parallel: 4, keep_alive: "1h; rm -rf ~" });
  assert.match(validate(s).join("\n"), /keep_alive must be/);
  const t = clone();
  const mlx = t.nodes.flatMap((n) => n.servers ?? []).find((x) => x.kind === "mlx-lm");
  mlx.parallel = 2;
  assert.match(validate(t).join("\n"), new RegExp(`server ${mlx.id}: parallel is an Ollama setting, and this server is mlx-lm`));
  // An older site.json names the Ollama server by port 11434, with no settings.
  const old = clone();
  const c = old.nodes.find((n) => n.control);
  c.models = [{ id: "large-local", port: 11434, model: "x", context_length: 99 }];
  delete c.servers;
  assert.deepEqual(ollamaService(old), { port: 11434, env: [] });
});

test("a site.json with one Ollama server, in the older form, keeps working", () => {
  const s = clone();
  for (const n of s.nodes) delete n.servers, delete n.model_memory_gb;
  s.nodes[1].models = [{ id: "large-local", port: 11434, model: "your-large-model", context: 131072 }];
  s.routes = { "local-large": ["machine-2/large-local"] };
  s.agents = { betty: { routes: ["local-large"] } };
  assert.deepEqual(validate(s), []);
  const { litellm, gateway } = render(s);
  const alias = litellm.model_list.find((m) => m.model_name === "local-large");
  assert.deepEqual([alias.litellm_params.model, alias.litellm_params.api_base, alias.model_info.id],
    ["hosted_vllm/your-large-model", "http://machine-2.example.ts.net:11434/v1", "local-large|machine-2/large-local"]);
  assert.deepEqual(gateway.models["machine-2/large-local"], { server: "machine-2/ollama", kind: "ollama", model: "your-large-model" });
});

test("a client or demo stack's picked computers and limits are checked, against the cluster's site.json too", () => {
  const s = clone();
  Object.assign(s.site, { tenant: "acme", kind: "demo", port: 8180, preview_port: 5273, gateway_port: 4100 });
  assert.match(validate(s).join("\n"), /a demo stack needs site.docker_context/);
  s.site.docker_context = "colima-acme";
  s.site.computers = ["machine-2"];
  s.nodes[1].limits = { cpus: 2.5, disk_gb: 10 };
  let errs = validate(s).join("\n");
  assert.match(errs, /site.computers picks machine-2, so list only machine-2 in nodes, not machine-1/);
  assert.match(errs, /node machine-2: the stack's one computer is the stack's control computer/);
  assert.match(errs, /node machine-2: limits.cpus must be a positive number of whole cores/);
  assert.match(errs, /node machine-2: limits.disk_gb is not a limit/);
  s.site.computers = "cluster";
  s.nodes[1].limits = { cpus: 2 };
  const cluster = clone();
  cluster.nodes.push({ name: "machine-3", os: "linux", address: "machine-3.example.ts.net" });
  errs = validate(s, { cluster }).join("\n");
  assert.match(errs, /site.computers is "cluster", so list every computer of the cluster: machine-3 missing/);
  assert.match(errs, /node machine-1: jobs.port 7400 is the cluster's own job runner's port/);
  s.site.port = 8080;
  assert.match(validate(s, { cluster }).join("\n"), /site.port 8080 is the cluster's own stack's port/);
  s.site.computers = "some";
  assert.match(validate(s).join("\n"), /site.computers must be "cluster", or a list of one computer's name/);
  const plain = clone();
  plain.nodes[0].limits = { cpus: 2 };
  assert.match(validate(plain).join("\n"), /limits apply to a client or demo stack's computers, so set site.computers too/);
});

test("a stack on picked computers leaves out a model that does not fit, where the cluster's own stack is refused", () => {
  const s = clone();
  s.nodes[1].model_memory_gb = 64;
  assert.match(validate(s).join("\n"), /the loaded models need 80 GB/);
  Object.assign(s.site, { tenant: "acme", kind: "demo", docker_context: "colima-acme", computers: "cluster", port: 8180, preview_port: 5273, gateway_port: 4100 });
  for (const n of s.nodes) if (n.jobs) n.jobs.port = 7410;
  delete s.model_keys; delete s.porter;   // a demo with no recorded permission for cloud models
  assert.deepEqual(validate(s, { cluster: example }), []);
  assert.deepEqual(placeStack(s).notes[0], "Left out machine-2/mlx/large-mlx: the model needs 40 GB, and machine-2 has 24 GB left of the 64 GB it gives this stack's models.");
});

test("on a Mac control computer, site.gateway_port + 1 stays free for the gateway's port for port jobs", () => {
  const s = clone();
  s.site.preview_port = 4001;
  assert.deepEqual(validate(s), [], "Linux publishes the port for port jobs on the Tailscale address");
  s.nodes[0].os = "macos";
  assert.match(validate(s).join("\n"), /site\.gateway_port \+ 1 \(4001\) is the gateway's port for port jobs on a Mac/);
});

test("site.stack_name names the cluster's own stack, \"cluster\" by default; a client stack takes site.tenant", () => {
  assert.equal(clusterStackName(example), "cluster");
  assert.equal(githubEnvironment(example), "cluster");
  assert.match(render(example).tenantEnv, /^STACK_NAME=cluster$/m);
  const s = clone();
  s.site.stack_name = "ops";
  assert.deepEqual(validate(s), []);
  assert.equal(githubEnvironment(s), "ops");
  assert.match(render(s).tenantEnv, /^STACK_NAME=ops$/m);
  for (const bad of ["Ops", "client-ops", "a b"]) {
    s.site.stack_name = bad;
    assert.match(validate(s).join("\n"), /site\.stack_name ".*" must be lowercase letters, digits and hyphens, and must not start with "client-"/, bad);
  }
  const t = clone();
  Object.assign(t.site, { tenant: "acme", stack_name: "ops" });
  assert.match(validate(t).join("\n"), /site\.stack_name names the cluster's own stack/);
  delete t.site.stack_name;
  assert.equal(stackName(t), "acme");
  assert.equal(githubEnvironment(t), "client-acme");
});

test("the payer \"operator\" is the company that runs the cluster; the older \"border-ramp\" still passes", () => {
  for (const payer of ["operator", "client-byok", "border-ramp"]) {
    const s = clone();
    Object.assign(s.site, { tenant: "acme", kind: "demo" });
    s.site.cloud_models = { allowed: true, granted_by: "Person A", granted_on: "2026-10-20", payer };
    assert.doesNotMatch(validate(s).join("\n"), /payer/, payer);
  }
});

test("site.timezone takes a time zone name", () => {
  const s = clone();
  s.site.timezone = "Europe/Berlin";
  assert.deepEqual(validate(s), []);
  s.site.timezone = "Mars/Olympus";
  assert.match(validate(s).join("\n"), /site\.timezone "Mars\/Olympus" must be a time zone name/);
});

test("a computer's slack_icon is one emoji", () => {
  const s = clone();
  s.nodes[0].slack_icon = ":desktop_computer:";
  assert.deepEqual(validate(s), []);
  s.nodes[0].slack_icon = "desktop";
  assert.match(validate(s).join("\n"), /node machine-1: slack_icon must be one emoji, such as :desktop_computer:/);
});

test("a computer's router is an IP address", () => {
  const s = clone();
  s.nodes[0].router = "192.0.2.1";
  assert.deepEqual(validate(s), []);
  s.nodes[0].router = "the office router";
  assert.match(validate(s).join("\n"), /node machine-1: router must be an IP address, such as 192\.0\.2\.1/);
});

test("github_apps: each app is checked, the token service gets a port, and port jobs get the service's address", () => {
  const s = clone();
  assert.equal(render(s).tenantEnv.match(/^GITHUB_APPS=(.*)$/m)[1], "off", "no github_apps block: no push access");
  s.github_apps = { porter: { app_id: 1, installation_id: 2, slug: "acme-porter", repos: ["acme/adapter"], permissions: { contents: "write", pull_requests: "write" } } };
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.match(r.tenantEnv, /^GITHUB_APPS=on$/m);
  assert.match(r.tenantEnv, /^GITHUB_TOKEN_PORT=4010$/m);
  assert.match(r.egress.conf, /acl Safe_ports port .*\b4010\b/, "port jobs reach the token service through the outgoing filter");
  const control = s.nodes.find((n) => n.control);
  const withJobs = Object.values(r.services).find((v) => v.jobs);
  if (withJobs && control.tailnet_address) assert.equal(withJobs.jobs.github_token_url, `http://${control.tailnet_address}:4010`);
  s.site.github_token_port = s.site.gateway_port ?? 4000;
  assert.ok(validate(s).some((e) => /github_token_port/.test(e)));
  delete s.site.github_token_port;
  s.github_apps.porter.permissions.contents = "read";
  assert.ok(validate(s).some((e) => /permissions.contents must be "write"/.test(e)));
});

test("github_apps: a client stack that uses the public knowledge repo gets no app for Alan", () => {
  const s = clone();
  Object.assign(s.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  s.repos.knowledge = "https://github.com/borderux/recursica-knowledge";
  s.github_apps = { alan: { app_id: 1, installation_id: 2, slug: "acme-alan", repos: ["acme/knowledge"], permissions: { contents: "write", pull_requests: "write", issues: "write" } } };
  assert.ok(validate(s).some((e) => /github_apps.alan: this client stack uses the public knowledge repo/.test(e)));
});
