/**
 * Tests for the glossary check.
 *
 * The last test is the one that matters: it runs the check over the real skills, which is what
 * makes a drifting definition fail CI. It also asserts that the check found definitions at all,
 * because a pattern that silently matches nothing passes every file — no throw, no mismatch, just
 * a check that stopped checking.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseGlossary,
  findDefinitions,
  checkText,
  checkAll,
} from "./check-glossary.mjs";

const GLOSSARY = `# Glossary

Prose above the table is ignored, including | pipes | like these |.

## Terms

| Term | Also written as | Definition | Where |
| --- | --- | --- | --- |
| tab stop | | a place the Tab key lands | |
| affordance | affordances | a visible cue that tells the user they can act on something | |
| unadvertised affordance | | a control that is deliberately not promoted | |
| channel | | a way of carrying meaning | usual |
| channel | | the way a message reaches the user | delivery |
| tenant | | the organization whose account the application runs under | |
`;

const forms = parseGlossary(GLOSSARY);

test("parseGlossary maps every spelling to its definitions, and keeps both meanings of a term", () => {
  assert.deepEqual(forms.get("tab stop"), ["a place the Tab key lands"]);
  assert.deepEqual(forms.get("affordances"), forms.get("affordance"));
  assert.deepEqual(forms.get("channel"), [
    "a way of carrying meaning",
    "the way a message reaches the user",
  ]);
  assert.equal(forms.has("term"), false, "the header row is not a term");
});

test("parseGlossary refuses a glossary with no Terms table rather than checking nothing", () => {
  assert.throws(
    () => parseGlossary("# Glossary\n\nNo table here.\n"),
    /no `## Terms` section/,
  );
});

test("a matching definition passes and a drifted one is reported with what was expected", () => {
  assert.deepEqual(
    checkText(
      "Every checkbox is a tab stop (a place the Tab key lands).",
      forms,
    ),
    [],
  );
  const [problem] = checkText(
    "Every checkbox is a tab stop (where Tab goes).",
    forms,
  );
  assert.equal(problem.form, "tab stop");
  assert.equal(problem.found, "where Tab goes");
  assert.deepEqual(problem.expected, ["a place the Tab key lands"]);
});

test("either meaning of a two-meaning term is accepted", () => {
  assert.deepEqual(
    checkText("a single channel (a way of carrying meaning)", forms),
    [],
  );
  assert.deepEqual(
    checkText("splits the channel (the way a message reaches the user)", forms),
    [],
  );
});

test("the longest term wins, so a compound term is checked against its own row", () => {
  // Read as "affordance (…)", this correct definition would be reported as a mismatch.
  assert.deepEqual(
    checkText(
      "an unadvertised affordance (a control that is deliberately not promoted)",
      forms,
    ),
    [],
  );
});

test("bold markers and a possessive between the term and the bracket are allowed", () => {
  const found = findDefinitions(
    "never the tenant's** (the organization whose account the application runs under).",
    forms,
  );
  assert.equal(found.length, 1);
  assert.deepEqual(
    checkText("never the tenant's** (the org).", forms).length,
    1,
  );
});

test("a term inside a longer word is not a match", () => {
  assert.deepEqual(
    findDefinitions("a subaffordance (something else)", forms),
    [],
  );
});

test("references and examples in brackets are not read as definitions", () => {
  for (const text of [
    "a tab stop (see recursica-skill-forms)",
    "a tab stop (e.g. a button)",
    "a tab stop (for example, a link)",
    "a tab stop (Tab and Shift+Tab)",
    "a tab stop (`tabindex=0`)",
  ]) {
    assert.deepEqual(findDefinitions(text, forms), [], text);
  }
});

test("frontmatter and fenced code are skipped, and line numbers still point at the right line", () => {
  const text = [
    "---",
    "description: a tab stop (wrong on purpose)",
    "---",
    "```",
    "a tab stop (also wrong)",
    "```",
    "",
    "A tab stop (wrong here).",
  ].join("\n");
  const problems = checkText(text, forms);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 8);
});

test("known gap: a definition written as a sentence is not checked", () => {
  // Stated in the glossary's "What the check does not do". If this starts failing, the check got
  // wider — update that section rather than deleting this test.
  assert.deepEqual(
    findDefinitions("A tab stop is wherever Tab happens to go.", forms),
    [],
  );
});

test("checkAll reads skills in category folders and ignores files that are not skills", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glossary-"));
  const skills = path.join(dir, "skills");
  fs.mkdirSync(path.join(skills, "meta"), { recursive: true });
  fs.mkdirSync(path.join(skills, "components", "recursica-skill-x"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(skills, "meta", "GLOSSARY.md"), GLOSSARY);
  fs.writeFileSync(
    path.join(skills, "components", "recursica-skill-x", "SKILL.md"),
    "A tab stop (drifted).\n",
  );
  fs.writeFileSync(
    path.join(skills, "components", "NOTES.md"),
    "A tab stop (not a skill, not read).\n",
  );
  const result = checkAll({
    glossary: path.join(skills, "meta", "GLOSSARY.md"),
    skills,
  });
  assert.equal(result.files, 1);
  assert.equal(result.problems.length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("every definition in the real skills matches skills/meta/GLOSSARY.md", () => {
  const { files, definitions, problems } = checkAll();
  assert.ok(
    files >= 60,
    `expected the whole skills family, read ${files} skills`,
  );
  assert.ok(
    definitions >= 100,
    `expected hundreds of in-place definitions, found ${definitions} — is the pattern matching?`,
  );
  assert.deepEqual(
    problems.map(
      (p) =>
        `${p.file}:${p.line} ${p.form} — found "${p.found}", expected "${p.expected.join('" or "')}"`,
    ),
    [],
  );
});
