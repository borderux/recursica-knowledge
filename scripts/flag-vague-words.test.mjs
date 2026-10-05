import { test } from "node:test";
import assert from "node:assert/strict";
import { flagsIn, flagLines } from "./flag-vague-words.mjs";

test("personal pronouns and vague words are flagged", () => {
  assert.deepEqual(flagsIn("Keep it the same size."), ["it"]);
  assert.deepEqual(flagsIn("Show something somewhere."), [
    "something",
    "somewhere",
  ]);
});

test("a demonstrative standing alone is flagged, a relative 'that' is not", () => {
  assert.deepEqual(flagsIn("This is the most common misuse."), ["this"]);
  assert.deepEqual(flagsIn("Do not change that."), ["that"]);
  assert.deepEqual(flagsIn("A label that does not change."), []);
  assert.deepEqual(flagsIn("Keep this button in the tab order."), []);
});

test("code, quotes and front matter are skipped", () => {
  const lines = [
    "---",
    "name: x",
    "---",
    'Use `it` here, as in "keep it".',
    "```",
    "it",
    "```",
    "Then it moves.",
  ].map((text, i) => ({ file: "skills/x/SKILL.md", line: i + 1, text }));
  assert.deepEqual(
    flagLines(lines).map((f) => [f.line, f.words]),
    [[8, ["it"]]],
  );
});

test("a glossary definition is skipped, because it can only change in the glossary", () => {
  const lines = [
    "Add a live region (an area of the page that a screen reader announces automatically when the area's content changes).",
    "Then its label moves.",
  ].map((text, i) => ({ file: "skills/x/SKILL.md", line: i + 1, text }));
  assert.deepEqual(
    flagLines(lines).map((f) => [f.line, f.words]),
    [[2, ["its"]]],
  );
});
