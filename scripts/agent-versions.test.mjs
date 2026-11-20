import { test } from "node:test";
import assert from "node:assert/strict";

import { agentsIn, compare, gaps, versionOf } from "./agent-versions.mjs";

const agent = (version) =>
  `---\nname: designer\ndescription: Designs screens.\nlicense: MIT\nmetadata:\n  author: team@example.com\n  version: ${version}\n  portability: any\n---\n\nYou are the designer.\n`;

test("every file in an agent's folder counts as that agent's change", () => {
  assert.deepEqual(
    agentsIn([
      "agents/designer/SKILL.md",
      "agents/designer/platform/session.md",
      "agents/reviewer/subagents/checker/SKILL.md",
      "agents/reviewer/runtime/claude-code.json",
      "portable/circlechat/agents/designer/SOUL.md",
      "agents/README.md",
    ]),
    ["designer", "reviewer"],
  );
});

test("the version is read from metadata in the frontmatter", () => {
  assert.equal(versionOf(agent("0.3.0")), "0.3.0");
  assert.equal(versionOf(agent('"1.2.3"')), "1.2.3");
  assert.equal(
    versionOf("---\nname: designer\n---\n\n  version: 9.9.9\n"),
    null,
  );
  assert.equal(versionOf(agent("next")), null);
  assert.equal(versionOf("no frontmatter"), null);
});

test("versions compare by number, not as text", () => {
  assert.ok(compare("0.10.0", "0.9.0") > 0);
  assert.ok(compare("1.0.0", "0.99.99") > 0);
  assert.equal(compare("0.2.0", "0.2.0"), 0);
  assert.ok(compare("0.2.0", "0.2.1") < 0);
});

const run = (before, after) =>
  gaps(
    ["designer"],
    () => before,
    () => after,
  );

test("a changed agent with the same version fails", () => {
  assert.deepEqual(run(agent("0.2.0"), agent("0.2.0")), [
    { name: "designer", why: "version is 0.2.0, and needs to be above 0.2.0" },
  ]);
});

test("a changed agent with a lower version fails", () => {
  assert.equal(run(agent("0.2.0"), agent("0.1.9")).length, 1);
});

test("a raised version passes, whatever the size of the step", () => {
  assert.deepEqual(run(agent("0.2.0"), agent("0.3.0")), []);
  assert.deepEqual(run(agent("0.2.0"), agent("0.2.1")), []);
  assert.deepEqual(run(agent("0.2.0"), agent("1.0.0")), []);
});

test("a new agent keeps the version it was written with", () => {
  assert.deepEqual(run(null, agent("0.1.0")), []);
});

test("a removed agent needs no version", () => {
  assert.deepEqual(run(agent("0.2.0"), null), []);
});

test("a changed agent with no version fails", () => {
  assert.equal(run(agent("0.2.0"), "---\nname: designer\n---\n").length, 1);
  assert.equal(run(null, "---\nname: designer\n---\n").length, 1);
});
