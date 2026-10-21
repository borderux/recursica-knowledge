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
