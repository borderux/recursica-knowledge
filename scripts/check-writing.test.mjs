import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  britishWords,
  youCount,
  phrasesFound,
  problemsIn,
  readingGrade,
  skillWordsFound,
  longSentences,
} from "./check-writing.mjs";

const SCRIPT = path.join(import.meta.dirname, "check-writing.mjs");

test("British spellings are caught in their other forms too", () => {
  const found = britishWords(
    "The colours, the behavioural cue, a labelled field, it was centred, we recognised it.",
  );
  assert.equal(found.length, 5, found.join("; "));
  assert.deepEqual(
    britishWords(
      "The colors, a labeled field, centered, recognized, advertised, a promise.",
    ),
    [],
  );
});

test("code and quoted interface text keep their own spelling", () => {
  assert.deepEqual(
    britishWords('Use `colour` in the API, and the label reads "Colour".'),
    [],
  );
});

test("an agent's identity line is the one allowed use of you", () => {
  assert.equal(youCount("You are Betty, the designer agent for Recursica."), 0);
  assert.equal(youCount("You are Betty. You build screens."), 1);
  assert.equal(youCount("Use a table. A badge holds one value."), 0);
  assert.equal(youCount('The button says "Save your changes".'), 0);
});

test("the vague phrases are caught", () => {
  assert.deepEqual(phrasesFound("A badge reads as good news."), [
    "\\breads (as|like)\\b",
  ]);
  assert.deepEqual(phrasesFound("A badge looks like good news."), []);
});

test("you is checked in skills and agents, not in the repository's own docs", () => {
  const text = "Then you run the build.";
  assert.ok(
    problemsIn("skills/components/x/SKILL.md", text).some(
      (p) => p.rule === "you",
    ),
  );
  assert.ok(
    problemsIn("agents/betty/SKILL.md", text).some((p) => p.rule === "you"),
  );
  assert.ok(!problemsIn("AGENT.md", text).some((p) => p.rule === "you"));
});

test("the reading grade rises with long sentences and long words", () => {
  const plain = "Use a table. A badge holds one value. Keep the label short.";
  const dense =
    "Implementations necessitating comprehensive accessibility considerations invariably require substantially more sophisticated architectural deliberation than conventional alternatives.";
  assert.ok(readingGrade(plain) < 5, String(readingGrade(plain)));
  assert.ok(readingGrade(dense) >= 10, String(readingGrade(dense)));
  assert.ok(
    problemsIn("skills/components/x/SKILL.md", dense).some(
      (p) => p.rule === "grade",
    ),
  );
  assert.ok(!problemsIn("AGENT.md", dense).some((p) => p.rule === "grade"));
});

test("filler and insider words are caught, and chart axes are allowed in the chart skill", () => {
  assert.deepEqual(phrasesFound("The label must work on its own."), [
    "\\bon its own\\b",
  ]);
  assert.deepEqual(
    skillWordsFound(
      "skills/components/recursica-skill-x/SKILL.md",
      "Set the size axis with a React prop, whatever the design shows.",
    ),
    ["whatever", "axis", "React", "prop"],
  );
  assert.deepEqual(
    skillWordsFound(
      "skills/design-rules/recursica-skill-data-visualization/SKILL.md",
      "Label both axes.",
    ),
    [],
  );
  assert.ok(
    !problemsIn("AGENT.md", "Set the axis.").some((p) => p.rule === "words"),
  );
});

test("a sentence over 20 words is caught, in prose, lists and table cells", () => {
  const long =
    "Use a checkbox when the persona can pick any number of options from a short list that fits on one screen without scrolling.";
  assert.equal(longSentences(long).length, 1);
  assert.equal(longSentences(`- ${long}`).length, 1);
  assert.equal(longSentences(`| Checkbox | ${long} |`).length, 1);
  assert.deepEqual(longSentences("Use a checkbox. Keep the list short."), []);
  assert.ok(
    problemsIn("skills/components/x/SKILL.md", long).some(
      (p) => p.rule === "length",
    ),
  );
  assert.ok(!problemsIn("AGENT.md", long).some((p) => p.rule === "length"));
});

test("glossary definitions and the open-questions line are fixed wording, so not counted", () => {
  assert.deepEqual(
    longSentences(
      "Each control is a tab stop (a place the Tab key lands) in the order the persona reads the fields on the screen.",
    ),
    [],
  );
  assert.deepEqual(
    longSentences(
      "- [ ] Open questions were asked about, not decided: progress, success, retrying, empty states, errors, loading, paging, sorting, filtering, selection, bulk actions and export.",
    ),
    [],
  );
});

test("every covered file passes, apart from the logged gaps", () => {
  execFileSync(process.execPath, [SCRIPT], { stdio: "pipe" });
});
