import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { agentPeers, warnings, clusterStackName, followsMain, githubEnvironment, keySecret, ollamaService, placeStack, render, stackName, validate } from "./render.mjs";
import { repoOf } from "./kev-data.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../site.example.json", import.meta.url), "utf8"));
const clone = () => structuredClone(example);

test("the example is valid", () => assert.deepEqual(validate(example), []));

test("a site.json with CircleChat 1.x's settings still loads, with a warning for each one", () => {
  assert.deepEqual(warnings(example), []);
  const s = clone();
  s.site.circlechat = "retired";
  s.site.check_account = "agent-check@example.com";
  s.cloud_approvers = [{ email: "person-a@example.com", slack_user: "U0PERSONA1" }];
  s.notify = { slack: true, events: ["approval_pending"], people: [{ email: "person-a@example.com", slack_user: "U0PERSONA1" }], details: false };
  assert.deepEqual(validate(s), []);
  const w = warnings(s).join("\n");
  for (const name of ["site.circlechat", "site.check_account", "cloud_approvers", "notify.slack", "notify.events", "notify.people"]) assert.match(w, new RegExp(`${name.replace(".", "\\.")} is no longer read`), name);
  assert.doesNotMatch(w, /notify\.details/);
  const r = render(s);
  assert.doesNotMatch(r.tenantEnv, /^(CIRCLECHAT|NOTIFY_EVENTS|NOTIFY_PEOPLE|CLOUD_APPROVERS|CLOUD_APPROVER_SLACK)=/m);
  assert.match(r.tenantEnv, /^NOTIFY_DETAILS=off$/m);
  assert.equal(r.gateway.circlechat, undefined);
  assert.equal(r.watches, undefined);
  const dir = fs.mkdtempSync(new URL("file:///tmp/").pathname + "render-warn-");
  fs.writeFileSync(`${dir}/site.json`, JSON.stringify(s));
  const out = spawnSync(process.execPath, [new URL("./render.mjs", import.meta.url).pathname, `${dir}/site.json`, `${dir}/out`], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^Warning: site\.circlechat is no longer read/m);
  assert.ok(fs.existsSync(`${dir}/out/tenant.env`));
  assert.equal(fs.existsSync(`${dir}/out/watches.json`), false);
});

test("updates.follow is \"releases\" by default, or \"main\", and only in the cluster's own site.json", () => {
  assert.equal(followsMain(example), false);
  const s = clone();
  for (const v of ["releases", "main"]) {
    s.updates = { follow: v };
    assert.deepEqual(validate(s), [], v);
    assert.equal(followsMain(s), v === "main");
  }
  for (const v of ["tags", true, ""]) {
    s.updates = { follow: v };
    assert.match(validate(s).join("\n"), /updates\.follow must be "releases" or "main"/, String(v));
  }
  s.updates = { follow: "main" };
  s.site.tenant = "acme";
  assert.match(validate(s).join("\n"), /updates\.follow is for the cluster's own site\.json only/);
});

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
  assert.deepEqual(g.agents.porter, { routes: ["coder"], cloud: true, key: "porter" }, "Porter asks for the coder route, by its role");
  assert.deepEqual(g.agents.barb.key, "acme-grok");
  assert.deepEqual(g.fallback, { routes: [], cloud: false, key: null }, "a handle site.json does not list gets no route and no cloud model");
  assert.deepEqual(g.keys["acme-grok"], { model: "key/acme-grok", provider: "xai" });
  assert.deepEqual(g.routes["local-large"], { local: true, models: ["machine-2/ollama/large-local", "machine-1/ollama/small-local"] }, "a route's cluster models in order, for the spend log's wait at a model server");
  assert.deepEqual(g.routes["machine-2/mlx/large-mlx"], { local: true }, "an agent may name one cluster model as a route");
  assert.deepEqual(g.nodes, ["machine-2.example.ts.net"]);
});

test("the gateway gets each cluster model's slots, the server's parallel, for the spend log's wait at the model server", () => {
  const s = clone();
  s.nodes[0].servers[0].parallel = 4;
  assert.deepEqual(validate(s), []);
  const g = render(s).gateway;
  assert.equal(g.models["machine-1/ollama/small-local"].parallel, 4);
  assert.equal(g.models["machine-2/ollama/large-local"].parallel, null, "a server with no parallel in site.json: the server's default, unknown to the gateway");
  assert.equal(g.models["machine-2/mlx/large-mlx"].parallel, 1);
  assert.equal(g.models["xai/grok-4"].parallel, undefined, "a cloud model has no slots");
});

test("each agent on the RecursicaChat 2.0 server gets a gateway handle of its own, rc-<handle>, with the agent's routes and cloud switch", () => {
  const s = clone();
  s.site.gateway_local_port = 4005;
  s.recursicachat = { account: "agent-sync@example.com" };
  s.agents.loki.recursicachat = { model: "local-small", budget_usd: 5 };
  assert.deepEqual(validate(s), []);
  const g = render(s).gateway;
  assert.deepEqual(g.agents["rc-loki"], g.agents.loki, "the same routes, cloud switch and key as the agent");
  assert.deepEqual(g.agents["rc-loki"].routes, ["local-small"]);
  assert.equal(g.agents["rc-loki"].cloud, false);
  assert.equal(g.agents["rc-betty"], undefined, "only agents with a recursicachat block");
});

// A task's Model use setting on the RecursicaChat 2.0 server: the gateway asks the server's gateway
// listener for each task's choice, and the server's own key file holds the same key.
test("gateway.json names the server's gateway listener, its key file, the stall and each agent's handle there", () => {
  const s = clone();
  s.site.gateway_local_port = 4005;
  s.recursicachat = {};
  s.agents.loki.recursicachat = { model: "local-small", budget_usd: 5 };
  assert.deepEqual(validate(s), []);
  assert.deepEqual(render(s).gateway.recursicachat_tasks, {
    url: "http://host.docker.internal:3101",
    key_file: "/state/rc-tasks.key",
    stall_minutes: 15,
    handles: { "rc-loki": "loki" },
  });
  s.site.cloud_models = { stall_minutes: 20 };
  assert.deepEqual(validate(s), [], "the cluster's own stack may set the stall alone");
  assert.equal(render(s).gateway.recursicachat_tasks.stall_minutes, 20);
  assert.equal(render(example).gateway.recursicachat_tasks, undefined, "no RecursicaChat server: no task source");
});

test("gateway.json carries the stack's permission for cloud models", () => {
  assert.equal(render(example).gateway.cloud_allowed, true, "the cluster's own stack");
  const local = clientStack();
  delete local.porter; delete local.model_keys;
  for (const k of Object.keys(local.routes)) local.routes[k] = local.routes[k].filter((b) => !b.startsWith("anthropic/"));
  for (const k of Object.keys(local.routes)) if (!local.routes[k].length) delete local.routes[k];
  assert.equal(render(local).gateway.cloud_allowed, false, "a client stack without the recorded permission");
});

test("site.cloud_models.stall_minutes is a whole number of minutes, and a client stack still records its permission", () => {
  for (const v of [0, 1441, 2.5, "15", null]) {
    const s = clone();
    s.site.cloud_models = { stall_minutes: v };
    assert.match(validate(s).join("\n"), /site\.cloud_models\.stall_minutes must be a whole number of minutes from 1 to 1440/, String(v));
  }
  const ok = clone();
  ok.site.cloud_models = { stall_minutes: 1440 };
  assert.deepEqual(validate(ok), []);
  const c = clientStack();
  c.site.cloud_models = { stall_minutes: 20 };
  assert.match(validate(c).join("\n"), /site\.cloud_models must be an object with allowed: true or false/);
  const internal = clone();
  internal.site.cloud_models = {};
  assert.match(validate(internal).join("\n"), /site\.cloud_models must be an object with allowed: true or false/, "an empty block is still a mistake");
});

test("site.gateway_local_port may not take the server's gateway listener's port", () => {
  const s = clone();
  s.recursicachat = {};
  s.site.gateway_local_port = 3101;
  assert.match(validate(s).join("\n"), /site\.gateway_local_port \(3101\) is already the RecursicaChat 2\.0 server's gateway listener/);
});

// A program in recursicachat.services with a gateway block: svc-<name> in gateway.json, with only its
// routes, no cloud model, and its two caps.
function withJudge() {
  const s = clone();
  s.site.gateway_local_port = 4005;
  s.site.timezone = "America/New_York";
  s.routes.judge = ["machine-2/ollama/large-local"];
  s.recursicachat = { services: [{ name: "example-service", agents: ["designer"], account: "_program", file: "/opt/program/run/token", gateway: { routes: ["judge"], max_parallel: 4, daily_requests: 5000 } }] };
  return s;
}

test("a service's gateway block gives gateway.json the handle svc-<name>, its routes, its caps and the cluster's time zone", () => {
  const s = withJudge();
  assert.deepEqual(validate(s), []);
  const g = render(s).gateway;
  assert.deepEqual(g.agents["svc-example-service"], { routes: ["judge"], cloud: false, key: null, service: true, max_parallel: 4, daily_requests: 5000 });
  assert.equal(g.timezone, "America/New_York");
  assert.deepEqual(g.agents.betty, render(example).gateway.agents.betty, "an agent's entry is unchanged, with no caps");
  assert.equal(render(example).gateway.timezone, undefined, "a stack with no service gateway keeps gateway.json as it was");
  delete s.site.timezone;
  assert.equal(render(s).gateway.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone, "without site.timezone, the control computer's own time zone");
  const none = withJudge();
  delete none.recursicachat.services[0].gateway;
  assert.equal(render(none).gateway.agents["svc-example-service"], undefined, "a service without a gateway block gets no handle");
});

test("a service's gateway block takes local routes only, whole numbers in bounds, and no other setting", () => {
  const bad = (change, re) => {
    const s = withJudge();
    change(s, s.recursicachat.services[0]);
    assert.match(validate(s).join("\n"), re);
  };
  bad((s, e) => { e.gateway.routes = ["no-such-route"]; }, /"no-such-route" is not one of site\.json's routes/);
  bad((s, e) => { e.gateway.routes = ["machine-2/ollama/large-local"]; }, /is not one of site\.json's routes/);
  bad((s, e) => { delete s.model_keys; s.routes.judge.push("anthropic/claude-sonnet-5-5"); }, /route judge must list cluster models only, never a cloud model/);
  bad((s, e) => { e.gateway.routes = []; }, /gateway\.routes must list at least one/);
  bad((s, e) => { e.gateway.routes = ["judge", "judge"]; }, /lists a route twice/);
  for (const v of [0, 65, 2.5, "4", undefined]) bad((s, e) => { e.gateway.max_parallel = v; }, /max_parallel must be a whole number from 1 to 64/);
  for (const v of [0, 1_000_001, 1.5, "5000", undefined]) bad((s, e) => { e.gateway.daily_requests = v; }, /daily_requests must be a whole number from 1 to 1000000/);
  bad((s, e) => { e.gateway.cloud = true; }, /gateway\.cloud is not a setting/);
  bad((s, e) => { e.gateway = ["judge"]; }, /gateway must be an object/);
  bad((s) => { delete s.site.gateway_local_port; }, /gateway needs site\.gateway_local_port/);
  bad((s, e) => { e.name = "a".repeat(37); }, /at most 36 characters with a gateway block/);
  bad((s) => { s.agents["svc-example"] = { routes: ["judge"] }; }, /handles starting with svc- belong to the programs/);
  bad((s) => { s.model_keys.default.agents = ["svc-example-service"]; }, /starts with svc-/);
  bad((s) => { s.recursicachat.sessions = [{ email: "person-a@example.com", account: "_program", file: "/opt/program/run/example-service.gateway-key" }]; }, /gateway key file .* is another entry's file/);
});

test("a program that only asks models gets its gateway handle, caps and Kev computers, and validates with no agents", () => {
  const s = withJudge();
  s.recursicachat.services.push({ name: "example-eval", account: "_program", file: "/opt/example-evals/example-eval.gateway-key", gateway: { routes: ["judge"], max_parallel: 4, daily_requests: 2000, kev: ["machine-2"] } });
  assert.deepEqual(validate(s), []);
  assert.deepEqual(render(s).gateway.agents["svc-example-eval"], { routes: ["judge"], cloud: false, key: null, service: true, max_parallel: 4, daily_requests: 2000, kev: ["http://machine-2.example.ts.net:8009"] });
  assert.deepEqual(render(s).gateway.agents["svc-example-service"], { routes: ["judge"], cloud: false, key: null, service: true, max_parallel: 4, daily_requests: 5000 }, "the other program is unchanged");
});

// gateway.kev: the computers whose Kev-engine a service's key may reach, best first, as engine URLs in
// gateway.json. The gateway runs in Docker, so an engine on a loopback address is refused.
test("a service's gateway.kev gives gateway.json its Kev-engines' URLs, in the block's order", () => {
  const s = withJudge();
  s.recursicachat.services[0].gateway.kev = ["machine-2", "machine-1"];
  assert.deepEqual(validate(s), []);
  assert.deepEqual(render(s).gateway.agents["svc-example-service"].kev, ["http://machine-2.example.ts.net:8009", "http://host.docker.internal:8009"],
    "machine-2 names no --host, so its address; machine-1 listens on 0.0.0.0, so its address too");
  const own = withJudge();
  own.nodes[1].services = [{ name: "kev-engine", command: "uv run python -m kev.serve --port 8009 --host 192.0.2.7" }];
  own.recursicachat.services[0].gateway.kev = ["machine-2"];
  assert.deepEqual(render(own).gateway.agents["svc-example-service"].kev, ["http://192.0.2.7:8009"], "an engine's own --host wins");
  assert.equal(render(withJudge()).gateway.agents["svc-example-service"].kev, undefined, "no gateway.kev, no Kev-engine for the key");
});

test("a service's gateway.kev names computers that run a Kev-engine the gateway can reach, each once", () => {
  const bad = (kev, re, change = () => {}) => {
    const s = withJudge();
    change(s);
    s.recursicachat.services[0].gateway.kev = kev;
    assert.match(validate(s).join("\n"), re);
  };
  bad([], /gateway\.kev must list at least one computer that runs Kev-engine/);
  bad("machine-1", /gateway\.kev must list at least one computer/);
  bad(["machine-1", "machine-1"], /gateway\.kev lists a computer twice/);
  bad(["machine-9"], /"machine-9" is not one of site\.json's nodes/);
  bad(["machine-2"], /node machine-2 runs no Kev-engine/, (s) => { delete s.nodes[1].kev; });
  bad(["machine-1"], /Kev-engine listens on 127\.0\.0\.1 only, which the gateway, in Docker, can't reach/, (s) => {
    s.nodes[0].services = s.nodes[0].services.map((x) => (x.name === "kev-engine" ? { ...x, command: x.command.replace("0.0.0.0", "127.0.0.1") } : x));
  });
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
  assert.equal(r.gateway.fallback.key, null, "the fallback holds no key");
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
  assert.equal(r.services["machine-2"].jobs.slots, 3);
});

test("porter needs a coder route, and Porter's own routes include it: port jobs ask for the coder route, never a model", () => {
  const none = clone();
  delete none.routes.coder;
  delete none.agents.porter;
  assert.ok(validate(none).some((e) => /porter needs a coder route in routes/.test(e)));
  const other = clone();
  other.agents.porter.routes = ["local-large"];
  assert.ok(validate(other).some((e) => /agents\.porter\.routes must include coder: .* local-large/.test(e)), "the gateway would send a port job's requests to local-large");
  const fallback = clone();
  delete fallback.agents.porter;
  delete fallback.model_keys.porter;
  assert.deepEqual(validate(fallback), [], "with no routes of its own, Porter may use every route, coder included");
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
  assert.doesNotMatch(errs, /Porter|porter/, "a local-only stack runs Porter on its local coder route");
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
  assert.deepEqual(gateway.models["machine-2/mlx/large-mlx"], { server: "machine-2/mlx", kind: "mlx-lm", model: "your-org/your-large-model-mlx", parallel: 1 }, "an mlx-lm server answers one request at a time");
  assert.deepEqual(gateway.models["machine-2/ollama/large-local"], { server: "machine-2/ollama", kind: "ollama", model: "your-large-model", parallel: null }, "no parallel in site.json: the server's own default, so no wait is estimated");
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

test("a model's own context_length and keep_alive reach Ollama in every request for the model", () => {
  const s = clone();
  const mac = s.nodes.find((n) => n.name === "machine-2");
  const ollama = mac.servers.find((x) => x.kind === "ollama");
  Object.assign(ollama, { context_length: 131072, parallel: 4, keep_alive: "-1" });
  ollama.models.push({ id: "coder-local", model: "qwen3-coder:30b", memory_gb: 10, keep_alive: "10m" });
  s.routes.coder = ["machine-2/ollama/coder-local"];
  assert.deepEqual(validate(s), []);
  const params = (r, name) => r.litellm.model_list.find((m) => m.model_name === name).litellm_params;
  let r = render(s);
  // A model that sets neither keeps exactly the parameters it had, and the server's settings.
  assert.deepEqual(params(r, "machine-2/ollama/large-local"),
    { model: "hosted_vllm/your-large-model", api_base: "http://machine-2.example.ts.net:11434/v1", api_key: "none", timeout: 86_400, stream_timeout: 86_400 });
  // keep_alive alone: the same OpenAI-compatible API, with keep_alive in each request's body.
  const keepOnly = { model: "hosted_vllm/qwen3-coder:30b", api_base: "http://machine-2.example.ts.net:11434/v1", api_key: "none", timeout: 86_400, stream_timeout: 86_400, extra_body: { keep_alive: "10m" } };
  assert.deepEqual(params(r, "machine-2/ollama/coder-local"), keepOnly);
  assert.deepEqual(params(r, "coder"), keepOnly, "the route gets the model's settings too");
  // Ollama reads a string as a Go duration, which needs a unit, so a value without one goes as a number.
  for (const [v, sent] of [["-1", -1], [-1, -1], ["0", 0], ["600", 600], [600, 600], ["1h30m", "1h30m"]]) {
    ollama.models[1].keep_alive = v;
    assert.deepEqual(validate(s), [], String(v));
    assert.deepEqual(params(render(s), "coder").extra_body, { keep_alive: sent }, String(v));
  }
  // context_length: Ollama's own chat API, the only one that takes a context length per request.
  Object.assign(ollama.models[1], { context_length: 65536, keep_alive: "10m" });
  assert.deepEqual(validate(s), []);
  r = render(s);
  const native = { model: "ollama_chat/qwen3-coder:30b", api_base: "http://machine-2.example.ts.net:11434", num_ctx: 65536, keep_alive: "10m", drop_params: true, timeout: 86_400, stream_timeout: 86_400 };
  assert.deepEqual(params(r, "machine-2/ollama/coder-local"), native);
  assert.deepEqual(params(r, "coder"), native);
  assert.equal(r.litellm.model_list.find((m) => m.model_name === "coder").model_info.id, "coder|machine-2/ollama/coder-local", "the spend log still names the model");
  delete ollama.models[1].keep_alive;
  assert.ok(!("keep_alive" in params(render(s), "coder")), "without keep_alive, the server's keep_alive applies");
  assert.equal(params(render(s), "local-large").model, "hosted_vllm/your-large-model", "the other models keep the OpenAI-compatible API");
});

test("the config check refuses a model's wrong context_length or keep_alive, and still counts a model that unloads when idle", () => {
  const s = clone();
  const mac = s.nodes.find((n) => n.name === "machine-2");
  const ollama = mac.servers.find((x) => x.kind === "ollama");
  const mlx = mac.servers.find((x) => x.kind === "mlx-lm");
  Object.assign(ollama.models[0], { context_length: 0, keep_alive: "forever" });
  let errs = validate(s).join("\n");
  assert.match(errs, /node machine-2, server ollama, model large-local: context_length must be a whole number above 0, such as 65536/);
  assert.match(errs, /node machine-2, server ollama, model large-local: keep_alive must be "-1", to keep the model loaded, "0", to unload the model after each answer, or a time such as "10m" or 600 \(seconds\)/);
  for (const v of [1.5, "65536", -1]) {
    Object.assign(ollama.models[0], { context_length: v, keep_alive: "10m" });
    assert.match(validate(s).join("\n"), /model large-local: context_length must be a whole number above 0/, String(v));
  }
  // A setting with a space or a quote never reaches a request.
  Object.assign(ollama.models[0], { context_length: 65536, keep_alive: "1h; rm -rf ~" });
  assert.match(validate(s).join("\n"), /model large-local: keep_alive must be/);
  delete ollama.models[0].context_length, delete ollama.models[0].keep_alive;
  mlx.models[0].keep_alive = "10m";
  mlx.models[0].context_length = 65536;
  errs = validate(s).join("\n");
  assert.match(errs, new RegExp(`node machine-2, server mlx, model ${mlx.models[0].id}: context_length, keep_alive are Ollama settings, and this server is mlx-lm`));
  delete mlx.models[0].keep_alive, delete mlx.models[0].context_length;
  assert.deepEqual(validate(s), []);
  // A model that loads on demand still needs its memory each time it loads, beside the others.
  ollama.models.push({ id: "coder-local", model: "qwen3-coder:30b", memory_gb: 20, keep_alive: "10m", context_length: 65536 });
  assert.match(validate(s).join("\n"), /node machine-2: the loaded models need 100 GB, and the node gives its models 96 GB \(model_memory_gb\): ollama\/large-local 40 GB, ollama\/coder-local 20 GB, mlx\/large-mlx 40 GB/);
  // In the older form, a model has no server to take the settings.
  const old = clone();
  for (const n of old.nodes) delete n.servers, delete n.model_memory_gb;
  old.nodes[1].models = [{ id: "large-local", port: 11434, model: "your-large-model", keep_alive: "10m" }];
  old.routes = { "local-large": ["machine-2/large-local"], coder: ["machine-2/large-local"] };
  old.agents = { betty: { routes: ["local-large"] } };
  assert.match(validate(old).join("\n"), /node machine-2, model large-local: keep_alive needs the model under an Ollama server in servers/);
});

test("a site.json with one Ollama server, in the older form, keeps working", () => {
  const s = clone();
  for (const n of s.nodes) delete n.servers, delete n.model_memory_gb;
  s.nodes[1].models = [{ id: "large-local", port: 11434, model: "your-large-model", context: 131072 }];
  s.routes = { "local-large": ["machine-2/large-local"], coder: ["machine-2/large-local"] };
  s.agents = { betty: { routes: ["local-large"] } };
  assert.deepEqual(validate(s), []);
  const { litellm, gateway } = render(s);
  const alias = litellm.model_list.find((m) => m.model_name === "local-large");
  assert.deepEqual([alias.litellm_params.model, alias.litellm_params.api_base, alias.model_info.id],
    ["hosted_vllm/your-large-model", "http://machine-2.example.ts.net:11434/v1", "local-large|machine-2/large-local"]);
  assert.deepEqual(gateway.models["machine-2/large-local"], { server: "machine-2/ollama", kind: "ollama", model: "your-large-model", parallel: null });
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

test("site.gateway_local_port: a free port on the cluster's own stack, in tenant.env; unset by default", () => {
  assert.match(render(example).tenantEnv, /^GATEWAY_LOCAL_PORT=$/m);
  const s = clone();
  s.site.gateway_local_port = 4002;
  assert.deepEqual(validate(s), []);
  assert.match(render(s).tenantEnv, /^GATEWAY_LOCAL_PORT=4002$/m);
});

test("site.gateway_local_port is refused when it is not a port, clashes with another port, or is on a client or demo stack", () => {
  const errs = (patch, edit) => { const s = clone(); Object.assign(s.site, patch); edit?.(s); return validate(s).join("\n"); };
  for (const bad of ["4002", 4002.5, 80, 70000]) assert.match(errs({ gateway_local_port: bad }), /site\.gateway_local_port must be a port number from 1024 to 65535/, String(bad));
  assert.match(errs({ gateway_local_port: example.site.port ?? 8080 }), /is already site\.port/);
  assert.match(errs({ gateway_local_port: example.site.preview_port ?? 5173 }), /is already site\.preview_port/);
  assert.match(errs({ gateway_local_port: 4000 }), /is already site\.gateway_port/);
  assert.match(errs({ gateway_local_port: 4001 }), /is already site\.gateway_port \+ 1/);
  assert.match(errs({ gateway_local_port: 4101, gateway_port: 4100 }), /is already site\.gateway_port \+ 1/);
  assert.match(errs({ gateway_local_port: 7400 }), /is already a port of the outgoing filter/);
  const modelPort = example.nodes.flatMap((n) => [...(n.servers ?? []), ...(n.models ?? [])]).find((m) => m.port >= 1024).port;
  assert.match(errs({ gateway_local_port: modelPort }), /model server/);
  assert.match(errs({ gateway_local_port: 7500 }, (s) => { s.nodes[0].jobs.port = 7500; }), /is already node \S+'s job runner/);
  assert.match(errs({ gateway_local_port: 4002, tenant: "acme", kind: "demo" }), /for the cluster's own stack only/);
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

// A Linux helper computer with the kit's Ollama server (kit/ollama.mjs, kit/setup-ollama.sh).
const helperSettings = { context_length: 8192, parallel: 2, keep_alive: "-1", kv_cache_type: "q8_0", max_loaded_models: 1 };
function withHelper(server = {}) {
  const s = clone();
  s.nodes.push({ name: "machine-3", os: "linux", address: "100.64.0.9", model_memory_gb: 6,
    servers: [{ id: "ollama", kind: "ollama", port: 11434, ...helperSettings, models: [{ id: "judge-small", model: "qwen3:4b", memory_gb: 5 }], ...server }] });
  return s;
}

test("a Linux helper's Ollama server becomes the node's ollama block, with the pinned release and site.json's settings", () => {
  const s = withHelper({ listen: "100.64.0.9" });
  assert.deepEqual(validate(s), []);
  const spec = render(s).services["machine-3"].ollama;
  assert.equal(spec.version, "0.40.15");
  assert.match(spec.archives.amd64.url, /^https:\/\/github\.com\/ollama\/ollama\/releases\/download\/v0\.40\.15\/ollama-linux-amd64\.tar\.zst$/);
  assert.match(spec.archives.amd64.sha256, /^[0-9a-f]{64}$/);
  assert.equal(spec.listen, "100.64.0.9");
  assert.equal(spec.port, 11434);
  assert.deepEqual(spec.models, ["qwen3:4b"]);
  assert.deepEqual(spec.env, ["OLLAMA_CONTEXT_LENGTH=8192", "OLLAMA_NUM_PARALLEL=2", "OLLAMA_KEEP_ALIVE=-1", "OLLAMA_KV_CACHE_TYPE=q8_0", "OLLAMA_MAX_LOADED_MODELS=1", "OLLAMA_FLASH_ATTENTION=1"]);
  // Without listen, the server listens on the computer's address.
  assert.equal(render(withHelper()).services["machine-3"].ollama.listen, "100.64.0.9");
  // The control computer and a Mac get no ollama block: the Mac's Ollama is a LaunchDaemon.
  for (const n of example.nodes) assert.equal(render(s).services[n.name].ollama, null, n.name);
});

test("a trial server on 127.0.0.1 stays out of the gateway, and no route or agent may name the server's models", () => {
  const s = withHelper({ listen: "127.0.0.1" });
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.equal(r.services["machine-3"].ollama.listen, "127.0.0.1");
  assert.ok(!r.litellm.model_list.some((m) => m.model_name === "machine-3/ollama/judge-small"), "the gateway gets no entry for a model it cannot reach");
  assert.ok(!Object.hasOwn(r.gateway.routes, "machine-3/ollama/judge-small"));
  s.routes.judge = ["machine-3/ollama/judge-small"];
  s.agents = { ...(s.agents ?? {}), loki: { routes: ["machine-3/ollama/judge-small"] } };
  const errs = validate(s).join("\n");
  assert.match(errs, /route judge: "machine-3\/ollama\/judge-small" is on a trial Ollama server, which listens on 127\.0\.0\.1 only/);
  assert.match(errs, /agents\.loki\.routes: "machine-3\/ollama\/judge-small" is on a trial Ollama server/);
  // Once the server listens on the computer's address, the route reaches the model.
  s.nodes.at(-1).servers[0].listen = "100.64.0.9";
  assert.deepEqual(validate(s), []);
  const entry = render(s).litellm.model_list.find((m) => m.model_name === "judge");
  assert.equal(entry.litellm_params.api_base, "http://100.64.0.9:11434/v1");
});

test("the config check refuses a Linux helper's Ollama server with models that don't fit, or with a wrong setting", () => {
  let s = withHelper();
  delete s.nodes.at(-1).servers[0].max_loaded_models;
  s.nodes.at(-1).servers[0].models.push({ id: "second", model: "gemma3:4b", memory_gb: 3 });
  assert.match(validate(s).join("\n"), /node machine-3: the loaded models need 8 GB, and the node gives its models 6 GB \(model_memory_gb\): ollama\/judge-small 5 GB, ollama\/second 3 GB/);
  s = withHelper();
  delete s.nodes.at(-1).model_memory_gb;
  assert.match(validate(s).join("\n"), /node machine-3: model_memory_gb must be the memory, in GB, this computer gives its models/);
  s = withHelper({ listen: "0.0.0.0", kv_cache_type: "q5", max_loaded_models: 0 });
  let errs = validate(s).join("\n");
  assert.match(errs, /server ollama: listen must be "127\.0\.0\.1", for a trial, or the computer's address, 100\.64\.0\.9/);
  assert.match(errs, /server ollama: kv_cache_type must be "f16", "q8_0", "q4_0"/);
  assert.match(errs, /server ollama: max_loaded_models must be a whole number above 0/);
  s = withHelper();
  s.nodes.at(-1).servers.push({ id: "ollama-2", kind: "ollama", port: 11435, models: [{ id: "x", model: "x", memory_gb: 1 }] });
  assert.match(validate(s).join("\n"), /node machine-3: the kit runs one Ollama server on a Linux helper computer/);
  s = withHelper();
  s.nodes.at(-1).address = "machine-3.example.ts.net";
  assert.match(validate(s).join("\n"), /node machine-3: the kit's Ollama server listens on the computer's address, so the address must be an IPv4 address/);
  // listen belongs to a Linux helper's server only.
  s = clone();
  s.nodes.find((n) => n.control).servers.find((x) => x.kind === "ollama").listen = "127.0.0.1";
  assert.match(validate(s).join("\n"), /listen is for an Ollama server on a Linux helper computer/);
});

test("the control computer's Ollama service gets the new settings too, with flash attention for a compressed working memory", () => {
  const s = clone();
  const sv = s.nodes.find((n) => n.control).servers.find((x) => x.kind === "ollama");
  Object.assign(sv, { kv_cache_type: "f16", max_loaded_models: 2 });
  assert.deepEqual(validate(s), []);
  assert.deepEqual(ollamaService(s).env, ["OLLAMA_KV_CACHE_TYPE=f16", "OLLAMA_MAX_LOADED_MODELS=2"], "f16 needs no flash attention");
  sv.kv_cache_type = "q4_0";
  assert.deepEqual(ollamaService(s).env, ["OLLAMA_KV_CACHE_TYPE=q4_0", "OLLAMA_MAX_LOADED_MODELS=2", "OLLAMA_FLASH_ATTENTION=1"]);
});

test("with max_loaded_models, the memory check counts only the largest models an Ollama server keeps loaded", () => {
  const two = (k, room) => {
    const s = withHelper({ max_loaded_models: k });
    const n = s.nodes.at(-1);
    n.model_memory_gb = room;
    n.servers[0].models = [{ id: "small", model: "gemma3:4b", memory_gb: 3 }, { id: "large", model: "qwen3:4b-instruct-2507", memory_gb: 5 }];
    return validate(s).join("\n");
  };
  // One model loaded at a time: the larger model, 5 GB, must fit.
  assert.equal(two(1, 6), "");
  assert.equal(two(1, 5), "");
  assert.match(two(1, 4), /node machine-3: the loaded models need 5 GB, and the node gives its models 4 GB \(model_memory_gb\): ollama\/large 5 GB\. server ollama keeps 1 of its 2 models loaded \(max_loaded_models\)/);
  // Two at a time, or as many as the server lists: every model counts.
  assert.match(two(2, 6), /the loaded models need 8 GB, and the node gives its models 6 GB \(model_memory_gb\): ollama\/small 3 GB, ollama\/large 5 GB$/);
  assert.match(two(3, 6), /the loaded models need 8 GB/);
  // Without max_loaded_models, every listed model stays loaded.
  const s = withHelper();
  const n = s.nodes.at(-1);
  delete n.servers[0].max_loaded_models;
  n.servers[0].models.push({ id: "second", model: "gemma3:4b", memory_gb: 5 });
  n.model_memory_gb = 6;
  assert.match(validate(s).join("\n"), /the loaded models need 10 GB/);
  // Each server counts on its own, and an mlx-lm server's model always counts.
  const t = clone();
  const mac = t.nodes.find((x) => x.os === "macos");
  const ollama = mac.servers.find((x) => x.kind === "ollama");
  const mlx = mac.servers.find((x) => x.kind === "mlx-lm");
  ollama.models = [{ ...ollama.models[0], memory_gb: 30 }, { id: "b", model: "b", memory_gb: 40 }];
  ollama.max_loaded_models = 1;
  mlx.models = [{ ...mlx.models[0], memory_gb: 20 }];
  mac.model_memory_gb = 60;
  assert.deepEqual(validate(t), []);
  mac.model_memory_gb = 59;
  assert.match(validate(t).join("\n"), new RegExp(`the loaded models need 60 GB, and the node gives its models 59 GB \\(model_memory_gb\\): ollama/b 40 GB, mlx/${mlx.models[0].id} 20 GB\\. server ollama keeps 1 of its 2 models loaded`));
});

test("each cluster agent watches the other computers at their Tailscale addresses, and this computer at 127.0.0.1", () => {
  const s = clone();
  assert.deepEqual(agentPeers(s, "machine-2"), { "machine-1": "http://100.64.0.1:7500", "machine-2": "http://127.0.0.1:7500" }, "the control computer's tailnet_address, not host.docker.internal");
  assert.deepEqual(agentPeers(s, "machine-1"), { "machine-1": "http://127.0.0.1:7500", "machine-2": "http://machine-2.example.ts.net:7500" });
  s.nodes[1].tailnet_address = "fd7a:115c:a1e0::2";
  assert.equal(agentPeers(s, "machine-1")["machine-2"], "http://[fd7a:115c:a1e0::2]:7500");
  assert.deepEqual(warnings(clone()).filter((w) => /cluster agent/.test(w)), []);
  delete s.nodes[0].tailnet_address;
  assert.equal(agentPeers(s, "machine-2")["machine-1"], undefined, "no address the other computers reach");
  assert.ok(warnings(s).includes("node machine-1: no other computer's cluster agent can reach machine-1, so nothing watches machine-1. Set tailnet_address for machine-1 to the computer's Tailscale address"));
});
