// kit/barb-limits.mjs: Barb's limits from agents/barb/runtime/hermes.md, set inside the config's own
// blocks, and the HERMES_TIMEOUT check, which prints nothing from the .env but its verdict.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { limitsFrom, setLimits, timeoutFrom, timeoutLine } from "./barb-limits.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const md = fs.readFileSync(path.join(here, "../../agents/barb/runtime/hermes.md"), "utf8");
const limits = limitsFrom(md);
const cli = (args, input) => spawnSync(process.execPath, [path.join(here, "barb-limits.mjs"), ...args], { input, encoding: "utf8" });

// Hermes's own default config.yaml: a delegation block with max_iterations and default_toolsets.
const hermesDefault = `model:
  default: x
delegation:
  max_iterations: 50
  default_toolsets:
    - terminal
    - file
    - web
platform_toolsets:
  cli:
    - hermes-cli
`;

test("the limits and HERMES_TIMEOUT come from hermes.md", () => {
  assert.deepEqual(limits, [
    [["delegation", "oneshot_max_children"], "0"],
    [["delegation", "max_concurrent_children"], "3"],
    [["delegation", "max_iterations"], "50"],
    [["tool_loop_guardrails", "loop_caps", "max_subagents"], "150"],
  ]);
  assert.equal(timeoutFrom(md), 4000);
  assert.throws(() => limitsFrom("no block"), /no yaml block/);
  assert.throws(() => timeoutFrom("no timeout"), /names no HERMES_TIMEOUT/);
});

test("Hermes's default delegation block gets the limits inside it, keeps default_toolsets, and tool_loop_guardrails is added at the top level", () => {
  const { text, notes } = setLimits(hermesDefault, limits);
  assert.equal(text, `model:
  default: x
delegation:
  max_iterations: 50
  default_toolsets:
    - terminal
    - file
    - web
  oneshot_max_children: 0
  max_concurrent_children: 3
platform_toolsets:
  cli:
    - hermes-cli

tool_loop_guardrails:
  loop_caps:
    max_subagents: 150
`);
  assert.deepEqual(notes, [
    "delegation.oneshot_max_children: 0 (added)",
    "delegation.max_concurrent_children: 3 (added)",
    "tool_loop_guardrails.loop_caps.max_subagents: 150 (added)",
  ]);
  // A second pass changes nothing.
  const again = setLimits(text, limits);
  assert.equal(again.text, text);
  assert.deepEqual(again.notes, []);
});

test("a config with neither block gets both at the top level", () => {
  const { text } = setLimits("model:\n  default: x\n", limits);
  assert.equal(text, "model:\n  default: x\n\ndelegation:\n  oneshot_max_children: 0\n  max_concurrent_children: 3\n  max_iterations: 50\n\ntool_loop_guardrails:\n  loop_caps:\n    max_subagents: 150\n");
});

test("a wrong value is replaced in place, and a right one is left alone", () => {
  const cfg = "delegation:\n  oneshot_max_children: 2   # Hermes's one-shot cap\n  max_concurrent_children: 3\n  max_iterations: 50\ntool_loop_guardrails:\n  loop_caps:\n    max_subagents: 50\n  other: 1\n";
  const { text, notes } = setLimits(cfg, limits);
  assert.equal(text, "delegation:\n  oneshot_max_children: 0\n  max_concurrent_children: 3\n  max_iterations: 50\ntool_loop_guardrails:\n  loop_caps:\n    max_subagents: 150\n  other: 1\n");
  assert.deepEqual(notes, ["delegation.oneshot_max_children: 2 -> 0", "tool_loop_guardrails.loop_caps.max_subagents: 50 -> 150"]);
});

test("a loop_caps block that is missing is added inside an existing tool_loop_guardrails", () => {
  const { text } = setLimits("delegation:\n  oneshot_max_children: 0\n  max_concurrent_children: 3\n  max_iterations: 50\ntool_loop_guardrails:\n  enabled: true\nmodel:\n  default: x\n", limits);
  assert.equal(text, "delegation:\n  oneshot_max_children: 0\n  max_concurrent_children: 3\n  max_iterations: 50\ntool_loop_guardrails:\n  enabled: true\n  loop_caps:\n    max_subagents: 150\nmodel:\n  default: x\n");
});

test("a shape the kit cannot edit safely is refused", () => {
  for (const [cfg, why] of [
    ["delegation: {max_iterations: 50}\n", /delegation in config.yaml is written on one line/],
    ["tool_loop_guardrails:\n  loop_caps: {max_subagents: 50}\n", /tool_loop_guardrails\.loop_caps in config.yaml is written on one line/],
    ["agent:\n  tool_loop_guardrails:\n    loop_caps:\n      max_subagents: 150\n", /tool_loop_guardrails under another key, at line 2, where Hermes ignores it/],
    ["delegation:\n  oneshot_max_children:\n    nested: 1\n", /delegation\.oneshot_max_children is a block in config.yaml, not a value/],
  ]) assert.throws(() => setLimits(cfg, limits), why);
});

test("HERMES_TIMEOUT: ok at or above hermes.md's value, otherwise the value it should be, and nothing else from the .env", () => {
  assert.equal(timeoutLine("A=1\nHERMES_TIMEOUT=4000\n", 4000), "HERMES_TIMEOUT ok");
  assert.equal(timeoutLine('HERMES_TIMEOUT="5000"\n', 4000), "HERMES_TIMEOUT ok");
  for (const env of ["HERMES_TIMEOUT=1200\n", "", "HERMES_TIMEOUT=\n", "HERMES_TIMEOUT=lots\n", "# HERMES_TIMEOUT=9000\n"]) {
    assert.equal(timeoutLine(env, 4000), "HERMES_TIMEOUT should be 4000 or more (agents/barb/runtime/hermes.md).", JSON.stringify(env));
  }
  // The last line wins, as a shell reading the file would.
  assert.equal(timeoutLine("HERMES_TIMEOUT=9000\nHERMES_TIMEOUT=10\n", 4000), "HERMES_TIMEOUT should be 4000 or more (agents/barb/runtime/hermes.md).");
});

test("the command line: config on stdin, the timeout line alone, and the usage", () => {
  const r = cli(["config"], hermesDefault);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^ {2}oneshot_max_children: 0$/m);
  assert.match(r.stderr, /^Barb's config\.yaml: delegation\.oneshot_max_children: 0 \(added\)$/m);
  const bad = cli(["config"], "agent:\n  tool_loop_guardrails:\n    x: 1\n");
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, "", "a refusal prints no config, so the caller writes nothing");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-limits-"));
  const env = path.join(dir, ".env");
  fs.writeFileSync(env, "SLACK_BOT_TOKEN=xoxb-secret\nKEV_ENGINE_KEY=kev-secret\nHERMES_TIMEOUT=1200\n");
  const t = cli(["timeout", env]);
  assert.equal(t.status, 0);
  assert.equal(t.stdout, "HERMES_TIMEOUT should be 4000 or more (agents/barb/runtime/hermes.md).\n");
  assert.equal(t.stderr, "");
  fs.writeFileSync(env, "KEV_ENGINE_KEY=kev-secret\nHERMES_TIMEOUT=4000\n");
  assert.equal(cli(["timeout", env]).stdout, "HERMES_TIMEOUT ok\n");
  assert.equal(cli(["timeout", path.join(dir, "missing")]).stdout, "HERMES_TIMEOUT should be 4000 or more (agents/barb/runtime/hermes.md).\n");
  assert.equal(cli([]).status, 2);
});
