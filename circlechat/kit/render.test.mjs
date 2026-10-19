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
  assert.equal(alias.litellm_params.api_base, "http://big-mac.example.ts.net:11434/v1");
  assert.deepEqual(litellm.router_settings.fallbacks.find((f) => f["local-large"])["local-large"],
    ["control-pc/small-local", "anthropic/claude-sonnet-5-5"]);
  assert.equal(litellm.model_list.find((m) => m.model_name === "anthropic/claude-sonnet-5-5").litellm_params.api_key,
    "os.environ/ANTHROPIC_API_KEY");
});

test("kev engines are ordered by priority", () => {
  assert.deepEqual(render(example).kev, ["http://big-mac.example.ts.net:8009", "http://host.docker.internal:8009"]);
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
  assert.deepEqual(r.jobNodes, ["http://big-mac.example.ts.net:7400", "http://host.docker.internal:7400"]);
  assert.match(r.porterEnv, /JOBD_ALLOWED_REPOS=https:\/\/github.com\/borderux\/recursica-adapter-mui-v7,/);
  assert.deepEqual(r.watches, [{ repo: "borderux/recursica-adapter-mantine-v8", hook: "PORTER" }]);
  assert.equal(r.services["big-mac"].jobs.slots, 3);
});

test("porter without a job runner, or with a bad target, is caught", () => {
  const s = clone();
  for (const n of s.nodes) delete n.jobs;
  s.porter.targets.push("git@github.com:x/y.git");
  const errs = validate(s).join("\n");
  assert.match(errs, /needs at least one node with a jobs block/);
  assert.match(errs, /must be an https clone URL/);
});
