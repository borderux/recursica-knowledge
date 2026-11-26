// The port job's script (porter-job/run.sh) asks the gateway for the coder route, never a model:
// site.json maps the route to a model. Read as text; nothing here runs the job.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const script = fs.readFileSync(new URL("./porter-job/run.sh", import.meta.url), "utf8");
const code = script.split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");

test("Claude Code in a port job asks for the coder route, for its own requests and every model name it would choose", () => {
  assert.match(code, /^ROUTE=coder$/m);
  assert.match(code, /--model "\$ROUTE"/);
  for (const v of ["ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"]) {
    assert.match(code, new RegExp(`\\b${v}="\\$ROUTE"`), `${v} is the route`);
  }
});

test("the port job names no model and takes no model setting", () => {
  assert.doesNotMatch(code, /\b(opus|sonnet|haiku|claude-[a-z]+-\d|gpt-|qwen|grok-)/i);
  assert.doesNotMatch(code, /PORTER_MODEL/);
});
