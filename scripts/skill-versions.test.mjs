import { test } from "node:test";
import assert from "node:assert/strict";

import { classify } from "./skill-versions.mjs";

const skill = ({
  description = "Rules for the thing.",
  body = "",
  checklist = [],
} = {}) =>
  `---\nname: recursica-skill-thing\ndescription: ${description}\nmetadata:\n  version: 0.1.0\n---\n\n# Thing\n\n## Rules\n\n${body}\n\n## Pre-flight checklist\n\n${checklist.map((c) => `- [ ] ${c}`).join("\n")}\n`;

const base = skill({
  body: "**Never put a form in a card.** A card holds one object.",
  checklist: ["No form is in a card.", "Every card has a peer."],
});

test("an unchanged skill gets no bump", () => {
  assert.equal(classify(base, base), null);
});

test("a wording change is a patch", () => {
  const after = base.replace(
    "A card holds one object.",
    "A card shows one object.",
  );
  assert.deepEqual(classify(base, after), {
    bump: "patch",
    why: "wording only",
  });
});

test("a removed checklist item is major", () => {
  const after = skill({
    body: "**Never put a form in a card.** A card holds one object.",
    checklist: ["No form is in a card."],
  });
  assert.equal(classify(base, after).bump, "major");
});

test("a dropped rule word is major", () => {
  const after = base.replace(
    "**Never put a form in a card.**",
    "**Avoid a form in a card.**",
  );
  assert.equal(classify(base, after).bump, "major");
});

test("a rule word that changes form but not count is not major", () => {
  const before = base.replace(
    "**Never put a form in a card.**",
    "**A form must not go in a card.**",
  );
  assert.notEqual(classify(before, base).bump, "major");
});

test("an added checklist item is minor", () => {
  const after = skill({
    body: "**Never put a form in a card.** A card holds one object.",
    checklist: [
      "No form is in a card.",
      "Every card has a peer.",
      "Cards come in sets.",
    ],
  });
  assert.equal(classify(base, after).bump, "minor");
});

test("a changed description is minor", () => {
  const after = base.replace(
    "Rules for the thing.",
    "Rules for the thing and its parts.",
  );
  assert.deepEqual(classify(base, after), {
    bump: "minor",
    why: "description changed",
  });
});

test("removal outranks addition when both happen", () => {
  const after = skill({
    description: "A new description.",
    body: "A card holds one object.",
    checklist: [
      "No form is in a card.",
      "Every card has a peer.",
      "Cards come in sets.",
    ],
  });
  assert.equal(classify(base, after).bump, "major");
});

test("a change to the version line alone gets no bump", () => {
  assert.equal(
    classify(base, base.replace("version: 0.1.0", "version: 0.2.0")),
    null,
  );
});
