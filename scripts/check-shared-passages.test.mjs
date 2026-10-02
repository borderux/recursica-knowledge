/**
 * Tests for the shared-passages check.
 *
 * The drift this exists for was not a typo. The label-placement rule reached seven wordings, and
 * the four that differed most had a different opening sentence entirely — so a check keyed on the
 * opening would never have seen them. That is why a passage's opening is declared rather than
 * inferred, and why the corpus test also asserts how many skills each passage reaches.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toPattern,
  parsePassages,
  units,
  checkText,
  checkAll,
} from "./check-shared-passages.mjs";

const FILE = `# Shared passages

## How the check reads this file

Prose with no fenced fields is skipped.

## prop-column

Starts with:

\`\`\`text
**The third column
\`\`\`

Required when:

\`\`\`text
React prop
\`\`\`

Passage:

\`\`\`text
**The third column is the prop.** A blank cell means {none|no single prop}.
\`\`\`

## checklist

Starts with:

\`\`\`text
- [ ] \`layouts\` matches
\`\`\`

Passage:

\`\`\`text
- [ ] \`layouts\` matches every other field{ in the form|}
\`\`\`
`;

const passages = parsePassages(FILE);

test("parsePassages reads each passage and skips prose sections", () => {
  assert.deepEqual(
    passages.map((p) => p.id),
    ["prop-column", "checklist"],
  );
  assert.equal(passages[0].requiredWhen, "React prop");
});

test("parsePassages refuses a passage that does not begin with its own opening", () => {
  const bad = FILE.replace(
    "**The third column is the prop.**",
    "**A third column is the prop.**",
  );
  assert.throws(() => parsePassages(bad), /does not begin with its own/);
});

test("{a|b} permits exactly the listed alternatives, and {a|} permits nothing", () => {
  const re = toPattern("one {two|three} four{ five|}.");
  assert.ok(re.test("one two four."));
  assert.ok(re.test("one three four five."));
  assert.equal(re.test("one six four."), false);
});

test("a passage must end at a boundary, so a word run on past it is a mismatch", () => {
  const re = toPattern("Pass it explicitly.");
  assert.ok(re.test("Pass it explicitly. Then more of the skill's own."));
  assert.equal(
    toPattern("matches every field").test("matches every fieldset"),
    false,
  );
});

test("units splits paragraphs and list items and skips code and tables", () => {
  const text =
    "---\nname: x\n---\n\nPara one\ncontinues.\n\n- [ ] item one\n- [ ] item two\n\n```\n**The third column in code\n```\n\n| **The third column | in a table |\n";
  assert.deepEqual(
    units(text).map((u) => u.text),
    ["Para one continues.", "- [ ] item one", "- [ ] item two"],
  );
});

test("a copy that matches passes, extra sentences after it are the skill's own", () => {
  const text =
    "**The third column is the prop.** A blank cell means none. This skill adds a sentence.\n";
  assert.deepEqual(checkText(text, passages).problems, []);
});

test("a drifted copy is reported with the wording it should have", () => {
  const { problems } = checkText(
    "**The third column is the prop.** A blank cell means nothing at all.\n",
    passages,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /"prop-column"/);
  assert.deepEqual(problems[0].expected, [passages[0].text]);
});

test("a required passage missing from a component skill is reported, and only for components", () => {
  const skill =
    "## When not to use a widget\n\nText.\n\n## Widget styles, sizes and states\n\n| Axis | Options | React prop |\n\n## Rules for widgets\n\nNo passage here.\n";
  assert.match(
    checkText(skill, passages, { component: true }).problems[0].message,
    /required and missing/,
  );
  assert.deepEqual(checkText(skill, passages).problems, []);
});

test("every skill in the repository matches skills/meta/SHARED-PASSAGES.md", () => {
  const { problems, uses } = checkAll();
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line} ${p.message}`),
    [],
  );
  // Every component skill with an Axis table carries the note on design-system names.
  assert.ok(
    uses["adapter-names"] >= 18,
    `adapter-names reached ${uses["adapter-names"]} skills`,
  );
  assert.ok(
    uses["one-placement-per-form"] >= 15,
    `one-placement-per-form reached ${uses["one-placement-per-form"]} skills`,
  );
});
