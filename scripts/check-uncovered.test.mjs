/**
 * Tests for the checklist-versus-Uncovered check.
 *
 * The matching is a heuristic, so these pin down both edges of it: the paraphrases that real
 * checklists use have to pass, and a topic the section never mentions has to fail. The first draft
 * failed on "nesting depth" against "How deep parent-child checkboxes may nest", because it cut
 * words to a fixed length instead of trimming their endings.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stem,
  namedTopics,
  checkText,
  checkAll,
  KNOWN,
} from "./check-uncovered.mjs";

const skill = (checklist, uncovered) =>
  `## Uncovered — ask, do not invent\n\n${uncovered.map((u) => `- **${u}** More.`).join("\n")}\n\n## Pre-flight checklist\n\n${checklist}\n`;

test("stem trims plural and -ing endings so related words meet", () => {
  assert.equal(stem("nesting"), stem("nest"));
  assert.equal(stem("chips"), stem("chip"));
  assert.equal(
    stem("Retrying"),
    stem("retry").slice(0, stem("Retrying").length),
  );
});

test("namedTopics reads both list styles and ignores items that name none", () => {
  assert.deepEqual(
    namedTopics(
      "- [ ] You invented nothing from the uncovered list: progress, success, and retrying.",
    ),
    ["progress", "success", "retrying"],
  );
  assert.deepEqual(
    namedTopics(
      "- [ ] You invented nothing from the uncovered list — above all, the edit control.",
    ),
    ["the edit control"],
  );
  assert.deepEqual(
    namedTopics("- [ ] You invented nothing from the uncovered list."),
    [],
  );
});

test("paraphrased topics that real checklists use are matched", () => {
  const text = skill(
    "- [ ] You invented nothing from the uncovered list: nesting depth, and chips.",
    [
      "How deep parent-child checkboxes may nest.",
      "The file chip and the clear icon.",
    ],
  );
  assert.deepEqual(checkText(text), []);
});

test("a topic the Uncovered section never mentions is reported with its line", () => {
  const text = skill(
    "- [ ] You invented nothing from the uncovered list: loading, and clearing.",
    ["Loading states."],
  );
  assert.deepEqual(checkText(text), [{ line: 7, topic: "clearing" }]);
});

test("every checklist topic in the repository matches, apart from the logged ones", () => {
  const { topics, problems, acknowledged } = checkAll();
  assert.ok(
    topics >= 50,
    `expected dozens of named topics, found ${topics} — is the parser matching?`,
  );
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line} ${p.topic}`),
    [],
  );
  assert.equal(acknowledged.length, Object.keys(KNOWN).length);
});
