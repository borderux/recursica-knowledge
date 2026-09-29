/**
 * Tests for the routing eval. The model run itself is manual — it needs a model — but the
 * fixture and the scorer must stay honest: every expected skill exists, and a wrong or missing
 * answer is counted as a miss rather than skipped.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { REQUESTS, descriptions, prompt, score } from "./routing-eval.mjs";

const requests = JSON.parse(fs.readFileSync(REQUESTS, "utf8"));

test("every request expects a skill that exists", () => {
  const skills = descriptions();
  for (const r of requests)
    assert.ok(skills[r.skill], `${r.skill} is not a skill`);
  assert.ok(requests.length >= 50);
});

test("the prompt lists every skill and every request", () => {
  const p = prompt(requests);
  for (const slug of Object.keys(descriptions()))
    assert.ok(p.includes(`- ${slug}: `), slug);
  assert.ok(p.includes(`${requests.length}. ${requests.at(-1).request}`));
});

test("a wrong answer and a missing answer are both misses", () => {
  const answer = Object.fromEntries(
    requests.map((r, i) => [String(i + 1), r.skill]),
  );
  answer["1"] = "recursica-skill-nope";
  delete answer["2"];
  const { correct, misses } = score(answer, requests);
  assert.equal(correct, requests.length - 2);
  assert.deepEqual(
    misses.map((m) => m.n),
    [1, 2],
  );
});
