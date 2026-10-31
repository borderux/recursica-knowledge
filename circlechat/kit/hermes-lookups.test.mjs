// kit/hermes-lookups.mjs: every agent's settings that stop Hermes's model-catalog refresh and update
// checks, set inside the config's own blocks (kit/yaml-keys.mjs), printed by key name only.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SETTINGS, setLookups } from "./hermes-lookups.mjs";
import { setKeys } from "./yaml-keys.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const cli = (args, input) => spawnSync(process.execPath, [path.join(here, "hermes-lookups.mjs"), ...args], { input, encoding: "utf8" });

// The blocks as Hermes's own default config has them (hermes_cli/config_defaults.py).
const hermesDefault = `model:
  default: x
plugins:
  clone_timeout_seconds: 300
  hook_callback_timeout: 30
  load_timeout_seconds: 10
  auto_update_check_hours: 24
  auto_apply: false
model_catalog:
  enabled: true
  url: https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
  ttl_minutes: 20
  providers: {}
updates:
  check: true
  pre_update_backup: quick
`;

// The shape CircleChat writes for an agent: none of the three blocks.
const circlechat = `model:
  default: x
agent:
  reasoning_effort: medium
delegation:
  max_iterations: 50
  default_toolsets:
    - terminal
`;

test("the settings: the model catalog off, and both update checks off", () => {
  assert.deepEqual(SETTINGS, [
    [["model_catalog", "enabled"], "false"],
    [["updates", "check"], "false"],
    [["plugins", "auto_update_check_hours"], "0"],
  ]);
});

test("Hermes's default blocks get each value in place, and every other key stays", () => {
  const { text, changed } = setLookups(hermesDefault);
  assert.equal(text, hermesDefault
    .replace("  auto_update_check_hours: 24\n", "  auto_update_check_hours: 0\n")
    .replace("  enabled: true\n", "  enabled: false\n")
    .replace("  check: true\n", "  check: false\n"));
  assert.deepEqual(changed, ["model_catalog.enabled", "updates.check", "plugins.auto_update_check_hours"]);
  // A second pass changes nothing.
  const again = setLookups(text);
  assert.equal(again.text, text);
  assert.deepEqual(again.changed, []);
});

test("a config with none of the blocks gets each one at the top level, and every other key stays", () => {
  const { text, changed } = setLookups(circlechat);
  assert.equal(text, `${circlechat}\nmodel_catalog:\n  enabled: false\n\nupdates:\n  check: false\n\nplugins:\n  auto_update_check_hours: 0\n`);
  assert.equal(changed.length, 3);
  assert.equal(setLookups(text).text, text);
});

test("a shape that cannot be edited safely is refused", () => {
  for (const [cfg, why] of [
    ["model_catalog: {enabled: true}\n", /model_catalog in config.yaml is written on one line/],
    ["agent:\n  updates:\n    check: false\n", /updates under another key, at line 2, where Hermes ignores it/],
    ["model_catalog:\n  enabled:\n    x: 1\n", /model_catalog\.enabled is a block in config.yaml, not a value/],
  ]) assert.throws(() => setLookups(cfg), why);
});

test("setKeys names each change with its values in notes, and by key alone in changed", () => {
  const { notes, changed } = setKeys("updates:\n  check: true\n", [[["updates", "check"], "false"], [["model_catalog", "enabled"], "false"]]);
  assert.deepEqual(notes, ["updates.check: true -> false", "model_catalog.enabled: false (added)"]);
  assert.deepEqual(changed, ["updates.check", "model_catalog.enabled"]);
});

test("the command line: config on stdin, each change by key name only, and the usage", () => {
  const r = cli(["loki"], hermesDefault);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^model_catalog:\n {2}enabled: false$/m);
  assert.equal(r.stderr, "loki's config.yaml: set model_catalog.enabled\nloki's config.yaml: set updates.check\nloki's config.yaml: set plugins.auto_update_check_hours\n");
  const same = cli(["loki"], r.stdout);
  assert.equal(same.status, 0);
  assert.equal(same.stdout, r.stdout);
  assert.equal(same.stderr, "", "a second run prints nothing");
  const bad = cli(["loki"], "agent:\n  model_catalog:\n    enabled: true\n");
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, "", "a refusal prints no config, so the caller writes nothing");
  assert.equal(cli([]).status, 2);
});
