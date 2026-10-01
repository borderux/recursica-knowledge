import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  britishWords,
  youCount,
  phrasesFound,
  problemsIn,
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

test("every covered file passes, apart from the logged gaps", () => {
  execFileSync(process.execPath, [SCRIPT], { stdio: "pipe" });
});
