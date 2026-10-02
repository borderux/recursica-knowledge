/**
 * Tests for the skill structure check.
 *
 * The table tests are built from the two defects that shipped: a two-column table with a
 * three-column separator, and a table with a paragraph directly under it. Both passed the
 * formatting hook, rendered wrongly on GitHub, and went unnoticed across 18 skills.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkFrontmatter,
  checkComponentShape,
  checkReferences,
  checkTables,
  cells,
  checkAll,
  checkLoadLinks,
  COMPONENT_ROLES,
} from "./check-skill-structure.mjs";

const fm = (body) => `---\n${body}\n---\n\n# X\n`;
const component = (sections) =>
  sections.map((s) => `## ${s}\n\nText.\n`).join("\n");
const a11y =
  "## Accessibility\n\n### Screen readers\n\n- a\n\n### Keyboard and non-mouse navigation\n\n- b\n";
/** A heading of each role, the way a skill about a widget writes them. */
const SECTIONS = [
  "When to use a widget",
  "When not to use a widget",
  "Widget styles, sizes and states",
  "Rules for widgets",
  "Accessibility",
  "Styling the widget sets itself",
  "Skills to read with this one",
  "Open questions: ask, do not decide",
  "Pre-flight checklist",
];
const full = () =>
  SECTIONS.map((s) =>
    s === "Accessibility" ? a11y : `## ${s}\n\nText.\n`,
  ).join("\n");

test("frontmatter: a matching name and a short description pass", () => {
  assert.deepEqual(
    checkFrontmatter(
      fm("name: recursica-skill-x\ndescription: Use it — for x."),
      "recursica-skill-x",
    ),
    [],
  );
});

test("frontmatter: an unquoted colon-space breaks YAML, and the check says so", () => {
  const [p] = checkFrontmatter(
    fm("name: recursica-skill-x\ndescription: Use it: for x: and y"),
    "recursica-skill-x",
  );
  assert.match(p.message, /not valid YAML/);
});

test("frontmatter: a name that differs from the folder, and an over-long description, are reported", () => {
  const long = "a".repeat(1025);
  const messages = checkFrontmatter(
    fm(`name: recursica-skill-y\ndescription: ${long}`),
    "recursica-skill-x",
  ).map((p) => p.message);
  assert.equal(messages.length, 2);
  assert.match(messages[0], /folder is "recursica-skill-x"/);
  assert.match(messages[1], /1025 characters; the house limit is 450/);
});

test("component shape: the test fixture names one heading per role, in order", () => {
  assert.equal(SECTIONS.length, COMPONENT_ROLES.length);
  COMPONENT_ROLES.forEach((r, i) => {
    if (r.match) assert.ok(r.match(SECTIONS[i]), `${r.role}: ${SECTIONS[i]}`);
  });
});

test("component shape: all nine sections in order, extra sections between them allowed", () => {
  // Between "When not to use" and the inventory, as the card skill has.
  const text = full().replace(
    "## Widget styles, sizes and states",
    "## An extra section\n\nText.\n\n## Widget styles, sizes and states",
  );
  assert.deepEqual(checkComponentShape(text), []);
});

test("component shape: the inventory is whatever precedes 'Rules for', and missing when a known role does", () => {
  const renamed = full().replace(
    "## Widget styles, sizes and states",
    "## Widget parts",
  );
  assert.deepEqual(checkComponentShape(renamed), []);
  const missing = checkComponentShape(
    full().replace("## Widget styles, sizes and states\n\nText.\n", ""),
  ).map((p) => p.message);
  assert.equal(missing.length, 1, missing.join("\n"));
  assert.match(
    missing[0],
    /missing section `## <Component> parts, styles, sizes or states`/,
  );
});

test("component shape: a missing section and a swapped pair are both reported", () => {
  const order = [...SECTIONS];
  [order[3], order[5]] = [order[5], order[3]];
  const swapped = checkComponentShape(
    component(order.filter((s) => s !== "Accessibility")) + a11y,
  );
  assert.ok(swapped.some((p) => /out of order/.test(p.message)));
  const missing = checkComponentShape(
    full().replace("## Skills to read with this one\n\nText.\n", ""),
  );
  assert.deepEqual(
    missing.map((p) => p.message),
    ["missing section `## Skills to read with this one`"],
  );
});

test("component shape: Accessibility needs exactly its two subsections", () => {
  const text = full().replace(
    "### Keyboard and non-mouse navigation",
    "### Keyboard",
  );
  assert.match(
    checkComponentShape(text)[0].message,
    /found `### Screen readers`, `### Keyboard`/,
  );
});

test("references: an unknown skill name and a broken relative link are reported; code is skipped", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "structure-"));
  const file = path.join(dir, "SKILL.md");
  fs.writeFileSync(path.join(dir, "real.md"), "");
  const text =
    "See `recursica-skill-real` and `recursica-skill-gone`, [ok](real.md), [bad](nope.md), [web](https://x.y).\n```\nrecursica-skill-in-code\n```\n";
  const messages = checkReferences(
    text,
    file,
    new Set(["recursica-skill-real"]),
  ).map((p) => p.message);
  assert.deepEqual(messages, [
    "`recursica-skill-gone` is not a skill",
    "link target `nope.md` does not exist",
  ]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("cells splits on unescaped pipes only, the way GitHub does", () => {
  assert.equal(cells("| a | b |"), 2);
  assert.equal(cells("| a \\| b | c |"), 2);
  assert.equal(
    cells("| `x|y` | c |"),
    3,
    "a pipe inside a code span still splits a GitHub table cell",
  );
});

test("tables: the separator-count defect that shipped in 18 skills is caught", () => {
  const [p] = checkTables("| A | B |\n| --- | --- | --- |\n| 1 | 2 |\n");
  assert.match(p.message, /separator row has 3 cells, header has 2/);
});

test("tables: a paragraph straight after a table is caught", () => {
  const [p] = checkTables(
    "| A | B |\n| --- | --- |\n| 1 | 2 |\n**Next paragraph.**\n",
  );
  assert.equal(p.line, 4);
  assert.match(p.message, /no blank line after the table/);
});

test("tables: a short row, and pipes with no separator, are caught; a correct table is not", () => {
  assert.match(
    checkTables("| A | B |\n| --- | --- |\n| 1 |\n")[0].message,
    /row has 1 cells/,
  );
  assert.match(
    checkTables("| not | a table |\n| still | not |\n")[0].message,
    /no separator row/,
  );
  assert.deepEqual(
    checkTables("| A | B |\n| :-- | --: |\n| 1 | 2 |\n\nText.\n"),
    [],
  );
});

test("every skill in the repository passes", () => {
  const { skills, problems } = checkAll();
  assert.ok(skills >= 60, `expected the whole family, read ${skills}`);
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line} ${p.message}`),
    [],
  );
});

test("Skills to read with this one: a link, a stray heading, and a design-rules skill under 'only if used' are caught", () => {
  const comps = new Set(["recursica-skill-card"]);
  const ok =
    "## Skills to read with this one\n\n- `recursica-skill-forms` — why.\n\n### Only if the screen also uses those components\n\n- `recursica-skill-card` — alt.\n\n## Open questions: ask, do not decide\n\n### Not checked\n";
  assert.deepEqual(checkLoadLinks(ok, comps), []);
  const bad =
    "## Skills to read with this one\n\n- [`recursica-skill-forms`](../forms/SKILL.md) — why.\n\n### Maybe\n\n### Only if the screen also uses those components\n\n- `recursica-skill-tables` — rules.\n";
  const messages = checkLoadLinks(bad, comps).map((p) => p.message);
  assert.equal(messages.length, 3, messages.join("\n"));
});
