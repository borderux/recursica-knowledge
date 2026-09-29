/**
 * Tests for the skill-diff review.
 *
 * The per-section test is the one to keep. Counting rule words over the whole file let a "must"
 * dropped in one section hide behind a "must" added in another, and seven such drops went through
 * the readability rewrite that way before the count was split by section.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { review, ruleWords } from "./review-skill-diff.mjs";

const skill = (body, fm = "name: x\ndescription: y") =>
  `---\n${fm}\n---\n\n# X\n\n${body}\n`;
const messages = (before, after) =>
  review(skill(before), skill(after)).map((n) => `${n.level}: ${n.message}`);

test("a wording change with every rule word, heading, and item intact is clean", () => {
  const before =
    "## Rules\n\nYou must never pass it.\n\n## Pre-flight checklist\n\n- [ ] It was never passed.";
  const after =
    "## Rules\n\nYou must never pass this.\n\n## Pre-flight checklist\n\n- [ ] You never passed it.";
  assert.deepEqual(messages(before, after), []);
});

test("contractions count as their long forms", () => {
  assert.deepEqual(ruleWords("Don't. Doesn't. Can't."), {
    ...ruleWords(""),
    "do not": 1,
    "does not": 1,
    cannot: 1,
  });
});

test("a dropped rule word is flagged with the section it left", () => {
  const [m] = messages(
    "## Rules\n\nIt must be set.",
    "## Rules\n\nIt should be set.",
  );
  assert.match(m, /^warn: "must" dropped 1 → 0 — ## Rules 1→0/);
});

test("a rule word moved between sections is flagged even though the total is unchanged", () => {
  const before = "## Rules\n\nIt must be set.\n\n## Accessibility\n\nText.";
  const after =
    "## Rules\n\nIt is set.\n\n## Accessibility\n\nIt must be announced.";
  const found = messages(before, after);
  assert.ok(
    found.some((m) => /"must" moved between sections — ## Rules 1→0/.test(m)),
    found.join("\n"),
  );
});

test("an added strengthening word is noted, not warned", () => {
  assert.deepEqual(
    messages("## Rules\n\nSet it.", "## Rules\n\nAlways set it."),
    ['info: "always" added 0 → 1 — check it does not strengthen a rule'],
  );
});

test("lost code spans, numbers, skill references, and a merged checklist item are each flagged", () => {
  const before =
    "## Rules\n\nPass `formLayout`, up to 5, see `recursica-skill-forms`.\n\n## Pre-flight checklist\n\n- [ ] One.\n- [ ] Two.";
  const after =
    "## Rules\n\nPass the prop, up to a few.\n\n## Pre-flight checklist\n\n- [ ] One and two.";
  const found = messages(before, after).join("\n");
  for (const expected of [
    /checklist items 2 → 1/,
    /code spans removed: "formLayout", "recursica-skill-forms"/,
    /number removed: "5"/,
    /skill reference removed/,
  ]) {
    assert.match(found, expected);
  }
});

test("frontmatter and heading changes are flagged", () => {
  const found = review(
    skill("## Rules\n\nText.", "name: x\ndescription: y"),
    skill("## Rules for it\n\nText.", "name: x\ndescription: z"),
  ).map((n) => n.message);
  assert.ok(found.some((m) => /frontmatter changed/.test(m)));
  assert.ok(
    found.some((m) =>
      /headings changed — removed \["## Rules"\], added \["## Rules for it"\]/.test(
        m,
      ),
    ),
  );
});
