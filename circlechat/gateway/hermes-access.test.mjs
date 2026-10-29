import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { currentKey, scrubEnv, scrubJson, writeConfig } from "./hermes-access.mjs";
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
  assert.match(out, /custom_providers:\n- name: gateway\n  base_url: "http:\/\/cc-gateway:4000\/v1"\n  api_key: "ccg_abc"\n  api_mode: chat_completions\n$/);
  assert.equal((out.match(/^custom_providers:/gm) ?? []).length, 1);
  assert.equal(currentKey(out), "ccg_abc");
  // Run again: the same file.
  assert.equal(writeConfig(out, { baseUrl: "http://cc-gateway:4000/v1", key: "ccg_abc", route: "local-large" }), out);
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
