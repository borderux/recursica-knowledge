import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, decideMcp } from "./upgrade.mjs";

const tags = ["@recursica/knowledge@0.11.0", "@recursica/knowledge@0.11.1", "@recursica/knowledge@0.12.0", "@recursica/knowledge@1.0.0"];

test("a release with the same first number upgrades on its own, to the newest such release", () => {
  assert.deepEqual(decide("0.11.0", tags), { action: "upgrade", tag: "@recursica/knowledge@0.12.0" });
});

test("a new major version asks once, and a skipped one stays skipped", () => {
  assert.deepEqual(decide("0.12.0", tags), { action: "ask", tag: "@recursica/knowledge@1.0.0" });
  assert.deepEqual(decide("0.12.0", tags, { asked: { "@recursica/knowledge@1.0.0": 1 } }), { action: "none" });
  assert.deepEqual(decide("0.12.0", tags, { skipped: { "@recursica/knowledge@1.0.0": 1 } }), { action: "none" });
});

test("nothing newer means nothing to do, and other tags are ignored", () => {
  assert.deepEqual(decide("1.0.0", [...tags, "v9.9.9", "@other/pkg@9.0.0"]), { action: "none" });
});

test("Border UX's MCP package: a release with the same first number goes in at once, a major version asks once", () => {
  assert.deepEqual(decideMcp("0.8.1", "0.9.0"), { action: "upgrade", version: "0.9.0" });
  assert.deepEqual(decideMcp("0.8.1", "0.8.1"), { action: "none" });
  assert.deepEqual(decideMcp("0.9.0", "1.0.0"), { action: "ask", tag: "@recursica/mcp@1.0.0" });
  assert.deepEqual(decideMcp("0.9.0", "1.0.0", { asked: { "@recursica/mcp@1.0.0": 1 } }), { action: "none" });
  assert.deepEqual(decideMcp("0.9.0", "garbage"), { action: "none" });
});

test("a release that failed once is skipped; a newer one is tried", () => {
  const state = { failed: { "@recursica/knowledge@0.12.0": 1 } };
  assert.deepEqual(decide("0.11.0", ["@recursica/knowledge@0.11.0", "@recursica/knowledge@0.12.0"], state), { action: "none" });
  assert.deepEqual(decide("0.11.0", ["@recursica/knowledge@0.12.0", "@recursica/knowledge@0.12.1"], state), { action: "upgrade", tag: "@recursica/knowledge@0.12.1" });
});
