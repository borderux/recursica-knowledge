import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { currentKey, offGateway, scrubEnv, scrubJson, writeConfig } from "./hermes-access.mjs";
import { loadKeys, verify } from "./keys.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const ANT = "sk-ant-api03-" + "a".repeat(40);

// The shape of a config.yaml that CircleChat's install writes for an agent with an Anthropic key.
const installed = `model:
  default: claude-sonnet-5
  provider: anthropic
  base_url: https://api.anthropic.com
agent:
  reasoning_effort: medium
custom_providers: []
summary_model: claude-haiku-4-5
`;

test("the agent's config asks the gateway for the agent's route, with the agent's gateway key", () => {
  const out = writeConfig(installed, { baseUrl: "http://cc-gateway:4000/v1", key: "ccg_abc", route: "local-large" });
  assert.match(out, /^model:\n  default: local-large\n  provider: custom:gateway\nagent:/m);
  assert.match(out, /^summary_model: local-large$/m);
  assert.doesNotMatch(out, /base_url: https:\/\/api\.anthropic\.com/);
  assert.match(out, /^custom_providers:\n- name: gateway\n  base_url: "http:\/\/cc-gateway:4000\/v1"\n  api_key: "ccg_abc"\n  api_mode: chat_completions\n/m);
  assert.deepEqual(offGateway(out, "http://cc-gateway:4000/v1"), []);
  assert.equal((out.match(/^custom_providers:/gm) ?? []).length, 1);
  assert.equal(currentKey(out), "ccg_abc");
  // Run again: the same file.
  assert.equal(writeConfig(out, { baseUrl: "http://cc-gateway:4000/v1", key: "ccg_abc", route: "local-large" }), out);
});

const GW_URL = "http://cc-gateway:4000/v1";

// CircleChat's own template: the summary model sits inside compression, and the host kit's extra MCP
// servers sit beside CircleChat's own.
const template = `model:
  default: claude-sonnet-5
  provider: anthropic
compression:
  enabled: true
  threshold: 0.8
  summary_model: gemini-2.5-pro
  summary_provider: openrouter
stt:
  enabled: true
  model: base
custom_providers: []
mcp_servers:
  circlechat:
    command: node
    args:
      - /opt/data/circlechat-mcp.mjs
  recursica-mcp:
    command: sh
    args:
      - /workspace/.recursica-mcp.sh
      - /workspace/app
    enabled: true
`;

// The same home after Hermes' settings upgrade (config version 51): the provider list moved to
// providers, and the summary model to auxiliary.compression.
const upgraded = `model:
  default: local-large
  provider: custom:gateway
delegation:
  max_iterations: 50
  default_toolsets:
    - terminal
providers:
  gateway:
    api: http://cc-gateway:4000/v1
    name: gateway
    api_key: ccg_kept
    transport: chat_completions
auxiliary:
  compression:
    model: gemini-2.5-pro
  title_generation:
    provider: auto
    model: ''
_config_version: 51
`;

test("every model setting in CircleChat's template goes to the gateway, and the retired MCP server goes", () => {
  assert.notDeepEqual(offGateway(template, GW_URL), []);
  const out = writeConfig(template, { baseUrl: GW_URL, key: "ccg_abc", route: "local-large" });
  assert.deepEqual(offGateway(out, GW_URL), []);
  assert.match(out, /^compression:\n  enabled: true\n  threshold: 0\.8\n  summary_model: local-large\n/m);
  assert.doesNotMatch(out, /gemini|openrouter|summary_provider/);
  assert.match(out, /^auxiliary:\n  compression:\n    provider: custom:gateway\n    model: local-large$/m);
  assert.match(out, /^stt:\n  provider: local\n  enabled: true/m);
  assert.match(out, /^tts:\n  provider: piper$/m);
  assert.match(out, /^mcp_servers:\n  circlechat:\n    command: node\n/m, "CircleChat's own server stays");
  assert.doesNotMatch(out, /recursica-mcp/);
  assert.equal(writeConfig(out, { baseUrl: GW_URL, key: "ccg_abc", route: "local-large" }), out);
});

test("after Hermes' settings upgrade, the key is found in providers, kept, and written there once", () => {
  assert.equal(currentKey(upgraded), "ccg_kept");
  const out = writeConfig(upgraded, { baseUrl: GW_URL, key: "ccg_kept", route: "local-large" });
  assert.match(out, /^providers:\n  gateway:\n    name: gateway\n    api: "http:\/\/cc-gateway:4000\/v1"\n    api_key: "ccg_kept"\n    transport: chat_completions$/m);
  assert.doesNotMatch(out, /custom_providers/);
  assert.equal(currentKey(out), "ccg_kept");
  assert.match(out, /^  compression:\n    provider: custom:gateway\n    model: local-large$/m);
  assert.match(out, /^  title_generation:\n    provider: auto\n    model: ''$/m, "a task on auto follows the main model, and stays");
  assert.match(out, /^delegation:\n  max_iterations: 50\n/m, "delegation with no model of its own stays");
  assert.deepEqual(offGateway(out, GW_URL), []);
  assert.equal(writeConfig(out, { baseUrl: GW_URL, key: "ccg_kept", route: "local-large" }), out);
});

test("a home with both provider forms keeps exactly one gateway entry", () => {
  const both = `${upgraded}custom_providers:\n- name: gateway\n  base_url: "http://cc-gateway:4000/v1"\n  api_key: "ccg_old"\n  api_mode: chat_completions\n`;
  const out = writeConfig(both, { baseUrl: GW_URL, key: "ccg_kept", route: "local-large" });
  assert.doesNotMatch(out, /custom_providers|ccg_old/);
  assert.equal((out.match(/^  gateway:$/gm) ?? []).length, 1);
});

test("a model setting an agent added, anywhere Hermes reads one, goes to the gateway", () => {
  const added = `${upgraded.replace("_config_version: 51\n", "")}  vision:
    provider: openrouter
    model: google/gemini-2.5-flash
    base_url: https://openrouter.ai/api/v1
    api_key: sk-or-v1-${"b".repeat(40)}
    timeout: 30
fallback_providers:
- provider: gemini
  model: gemini-2.5-pro
tts:
  provider: edge
`.replace("  max_iterations: 50\n", "  max_iterations: 50\n  provider: openrouter\n  model: x-ai/grok-4\n  base_url: https://openrouter.ai/api/v1\n");
  const before = offGateway(added, GW_URL);
  for (const want of ["auxiliary.vision.provider: openrouter", "auxiliary.vision.base_url: https://openrouter.ai/api/v1", "delegation.provider: openrouter", "fallback_providers: set", "tts.provider: not a local engine"]) {
    assert.ok(before.includes(want), want);
  }
  const out = writeConfig(added, { baseUrl: GW_URL, key: "ccg_kept", route: "local-large" });
  assert.deepEqual(offGateway(out, GW_URL), []);
  assert.match(out, /^  vision:\n    provider: custom:gateway\n    model: local-large\n    timeout: 30$/m);
  assert.match(out, /^delegation:\n  provider: custom:gateway\n  model: local-large\n  max_iterations: 50\n/m);
  assert.doesNotMatch(out, /openrouter|gemini|grok|sk-or-|fallback_providers|edge/);
  // A second named provider is a setting off the gateway too.
  assert.ok(offGateway(upgraded.replace("auxiliary:", "  other:\n    api: https://api.x.ai/v1\nauxiliary:"), GW_URL).includes("providers.other: a provider other than the gateway"));
});

test("an older gateway entry, such as the master key, is replaced", () => {
  const old = installed.replace("custom_providers: []", `custom_providers:\n- name: gateway\n  base_url: "http://cc-gateway:4000/v1"\n  api_key: "sk-0123456789abcdef0123456789abcdef"\n  api_mode: chat_completions`);
  assert.equal(currentKey(old), "");
  const out = writeConfig(old, { baseUrl: "http://cc-gateway:4000/v1", key: "ccg_new", route: "r" });
  assert.doesNotMatch(out, /sk-0123/);
});

test("cloud keys are cleared out of .env and auth.json, and other settings stay", () => {
  assert.equal(scrubEnv(`ANTHROPIC_API_KEY=${ANT}\nALAN_GITHUB_PAT=ghp_x\nSOMETHING=${ANT}\nXAI_API_KEY=abc\n`), "ALAN_GITHUB_PAT=ghp_x\n");
  assert.deepEqual(scrubJson({ providers: { anthropic: { api_key: ANT, label: "x" } }, nous: { token: "keep" } }),
    { providers: { anthropic: { label: "x" } }, nous: { token: "keep" } });
});

test("the script gives the agent a key once, keeps it on a rerun, and clears the home", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-"));
  const state = fs.mkdtempSync(path.join(os.tmpdir(), "gwstate-"));
  fs.writeFileSync(path.join(home, "config.yaml"), installed.replace("custom_providers: []", `custom_providers: []\napi_key: ${ANT}`));
  fs.writeFileSync(path.join(home, ".env"), `ANTHROPIC_API_KEY=${ANT}\nKEEP=1\n`);
  fs.writeFileSync(path.join(home, "auth.json"), JSON.stringify({ anthropic: { key: ANT } }));
  const run = (...extra) => spawnSync(process.execPath, [path.join(here, "hermes-access.mjs"), home, "porter", state, "http://cc-gateway:4000/v1", "local-large", ...extra], { encoding: "utf8" });
  const first = run("env");
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /porter: model requests go to the gateway \(local-large\), with a new gateway key; cloud keys removed from \.env, auth\.json\./);
  const key = currentKey(fs.readFileSync(path.join(home, "config.yaml"), "utf8"));
  assert.deepEqual(verify(key, loadKeys(state), ""), { agent: "porter", task: null });
  for (const f of ["config.yaml", ".env", "auth.json"]) assert.doesNotMatch(fs.readFileSync(path.join(home, f), "utf8"), /sk-ant-/, f);
  const env = fs.readFileSync(path.join(home, ".env"), "utf8");
  assert.match(env, /^KEEP=1$/m);
  assert.match(env, /^CC_GATEWAY_URL=http:\/\/cc-gateway:4000$/m);
  assert.match(env, new RegExp(`^CC_GATEWAY_KEY=${key}$`, "m"));
  assert.doesNotMatch(first.stdout, new RegExp(key), "the script never prints the key");
  const again = run("env");
  assert.match(again.stdout, /\(local-large\)\.$/m, "a rerun keeps the key");
  assert.equal(currentKey(fs.readFileSync(path.join(home, "config.yaml"), "utf8")), key);
  // A new route in site.json: a rerun points the agent at the new server and model, with the same key.
  const moved = spawnSync(process.execPath, [path.join(here, "hermes-access.mjs"), home, "porter", state, "http://cc-gateway:4000/v1", "machine-2/mlx/large-mlx"], { encoding: "utf8" });
  assert.equal(moved.status, 0, moved.stderr);
  const cfg = fs.readFileSync(path.join(home, "config.yaml"), "utf8");
  assert.match(cfg, /^model:\n  default: machine-2\/mlx\/large-mlx\n  provider: custom:gateway$/m);
  assert.match(cfg, /^summary_model: machine-2\/mlx\/large-mlx$/m, "summaries move with the route");
  assert.equal(currentKey(cfg), key);
});

test("the script stops when a model setting still points past the gateway", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-"));
  // Delegation written inline cannot be rewritten line by line, so it cannot be checked either.
  fs.writeFileSync(path.join(home, "config.yaml"), `${installed}delegation: {provider: openrouter, model: x-ai/grok-4}\n`);
  const r = spawnSync(process.execPath, [path.join(here, "hermes-access.mjs"), home, "betty", fs.mkdtempSync(path.join(os.tmpdir(), "gwstate-")), GW_URL, "local-large"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /betty: these model settings .* would send requests past the gateway/);
  assert.match(r.stderr, /delegation: written inline/);
});

test("the script never reads or writes through a symlink an agent put in its home", () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
  const target = path.join(outside, "target.txt");
  const run = (home) => spawnSync(process.execPath, [path.join(here, "hermes-access.mjs"), home, "porter", fs.mkdtempSync(path.join(os.tmpdir(), "gwstate-")), "http://cc-gateway:4000/v1", "local-large", "env"], { encoding: "utf8" });
  // A symlinked config.yaml: refused, and the file the symlink names keeps its text.
  fs.writeFileSync(target, `ANTHROPIC_API_KEY=${ANT}\n`);
  const a = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-"));
  fs.symlinkSync(target, path.join(a, "config.yaml"));
  const r = run(a);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Refused: .*config\.yaml is a symlink/);
  assert.equal(fs.readFileSync(target, "utf8"), `ANTHROPIC_API_KEY=${ANT}\n`);
  // A symlinked .env: refused, before the script writes the file the symlink names.
  const b = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-"));
  fs.writeFileSync(path.join(b, "config.yaml"), installed);
  fs.symlinkSync(target, path.join(b, ".env"));
  assert.equal(run(b).status, 1);
  assert.equal(fs.readFileSync(target, "utf8"), `ANTHROPIC_API_KEY=${ANT}\n`);
  assert.ok(fs.lstatSync(path.join(b, ".env")).isSymbolicLink());
});
