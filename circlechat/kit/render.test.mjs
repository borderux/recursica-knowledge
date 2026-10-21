import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { render, validate } from "./render.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../site.example.json", import.meta.url), "utf8"));
const clone = () => structuredClone(example);

test("the example is valid", () => assert.deepEqual(validate(example), []));

test("routes become aliases with ordered fallbacks", () => {
  const { litellm } = render(example);
  const alias = litellm.model_list.find((m) => m.model_name === "local-large");
  assert.equal(alias.litellm_params.api_base, "http://machine-2.example.ts.net:11434/v1");
  assert.deepEqual(litellm.router_settings.fallbacks.find((f) => f["local-large"])["local-large"],
    ["machine-1/small-local", "anthropic/claude-sonnet-5-5"]);
  assert.equal(litellm.model_list.find((m) => m.model_name === "anthropic/claude-sonnet-5-5").litellm_params.api_key,
    "os.environ/ANTHROPIC_API_KEY");
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
  assert.deepEqual(r.jobNodes, ["http://machine-2.example.ts.net:7400", "http://host.docker.internal:7400"]);
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
  s.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "border-ramp" };
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
  s.data = { kev_disagreements_branch: "data/kev" };
  const errs = validate(s).join("\n");
  assert.match(errs, /client stack needs site.tenant/);
  assert.match(errs, /client stack needs site.docker_context/);
  assert.match(errs, /cannot set data.kev_disagreements_branch/);
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
  const errs = validate(s).join("\n");
  assert.match(errs, /is a cloud model, and this client stack has no recorded permission/);
  if (s.porter) assert.match(errs, /local-only client stack cannot run Porter/);
  const local = clientStack();
  delete local.porter;
  for (const k of Object.keys(local.routes)) local.routes[k] = local.routes[k].filter((b) => !b.startsWith("anthropic/"));
  for (const k of Object.keys(local.routes)) if (!local.routes[k].length) delete local.routes[k];
  assert.deepEqual(validate(local), []);
  assert.match(render(local).tenantEnv, /^CLOUD_MODELS=local-only$/m);
});

test("cloud models on a client stack need who granted the permission, when, and who pays", () => {
  const s = clientStack();
  s.site.cloud_models = { allowed: true };
  const errs = validate(s).join("\n");
  assert.match(errs, /granted_by must name the person/);
  assert.match(errs, /granted_on must be the date/);
  assert.match(errs, /payer must be border-ramp or client-byok/);
  s.site.cloud_models = { allowed: true, granted_by: "Person A, acme.com", granted_on: "2026-10-20", payer: "client-byok" };
  assert.deepEqual(validate(s), []);
  assert.match(render(s).tenantEnv, /^CLOUD_MODELS=allowed$/m);
});

test("Border's own stack may call cloud models", () => {
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

test("the outgoing filter allows GitHub, the registries and the stack's computers; cloud providers only with permission", () => {
  const r = render(example);
  assert.match(r.egress.allow, /^\.github\.com$/m);
  assert.match(r.egress.allow, /^registry\.npmjs\.org$/m);
  assert.match(r.egress.allow, /^api\.anthropic\.com$/m);
  assert.match(r.egress.conf, /http_access deny all/);
  const local = clone();
  Object.assign(local.site, { tenant: "acme", kind: "client", docker_context: "colima-acme" });
  delete local.porter; delete local.data;
  for (const k of Object.keys(local.routes)) { local.routes[k] = local.routes[k].filter((b) => !b.startsWith("anthropic/")); if (!local.routes[k].length) delete local.routes[k]; }
  assert.doesNotMatch(render(local).egress.allow, /anthropic/);
  local.egress = { allow: ["api.anthropic.com"] };
  assert.match(validate(local).join("\n"), /cloud model provider/);
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
  assert.match(render(s).egress.allow, /api\.anthropic\.com/);
  assert.match(render(example).tenantEnv, /^MASK_PII=off$/m);
});

test("cloud models through Bedrock, Vertex AI or Azure are allowed, and the per-client settings are checked", () => {
  const s = clone();
  s.routes["claude-bedrock"] = ["bedrock/anthropic.claude-sonnet"];
  s.git = { host: "other" };
  s.repos.access = "admin-token";
  s.site.proxy = "other";
  s.upgrade = { auto: true };
  assert.deepEqual(validate(s), []);
  const r = render(s);
  assert.match(r.tenantEnv, /^GIT_HOST=other$/m);
  assert.match(r.tenantEnv, /^REPO_ACCESS=admin-token$/m);
  assert.match(r.tenantEnv, /^UPGRADE_AUTO=on$/m);
  assert.match(r.egress.allow, /\.amazonaws\.com/);
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
  assert.match(render(example).egress.allowIps, /192\.0\.2\.1/);
});
