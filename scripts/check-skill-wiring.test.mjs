import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findGaps } from "./check-skill-wiring.mjs";

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "check-skill-wiring.mjs",
);

const wired = {
  skills: [],
  marketplace: "",
  llms: "",
  routingSkills: new Set(),
  router: "",
  always: [],
  routes: {},
  componentNeeds: [],
  citations: "",
};

test("a new design-rules skill wired nowhere fails every rule that applies to it", () => {
  const gaps = findGaps({
    ...wired,
    skills: [{ category: "design-rules", slug: "recursica-skill-new" }],
  });
  assert.deepEqual(gaps.sort(), [
    "recursica-skill-new: llms",
    "recursica-skill-new: marketplace",
    "recursica-skill-new: reviewers",
    "recursica-skill-new: router",
    "recursica-skill-new: routing",
  ]);
});

test("a design-rules skill wired everywhere passes", () => {
  const slug = "recursica-skill-new";
  const gaps = findGaps({
    ...wired,
    skills: [{ category: "design-rules", slug }],
    marketplace: `"./skills/design-rules/${slug}"`,
    llms: slug,
    routingSkills: new Set([slug]),
    router: `\`${slug}\``,
    always: [slug],
  });
  assert.deepEqual(gaps, []);
});

test("the reviewers can reach a skill through ROUTES or a component's needs, not only ALWAYS", () => {
  const base = {
    ...wired,
    skills: [{ category: "design-rules", slug: "recursica-skill-new" }],
    marketplace: '/recursica-skill-new"',
    llms: "recursica-skill-new",
    routingSkills: new Set(["recursica-skill-new"]),
    router: "recursica-skill-new",
  };
  assert.deepEqual(
    findGaps({
      ...base,
      routes: { Shell: { skills: ["recursica-skill-new"] } },
    }),
    [],
  );
  assert.deepEqual(
    findGaps({ ...base, componentNeeds: ["recursica-skill-new"] }),
    [],
  );
});

test("the router needs no routing request of its own; a psychology skill needs a citation", () => {
  const gaps = findGaps({
    ...wired,
    skills: [
      { category: "meta", slug: "recursica-skill-design-router" },
      { category: "psychology", slug: "recursica-skill-research" },
    ],
    marketplace: '/recursica-skill-design-router" /recursica-skill-research"',
    llms: "recursica-skill-design-router recursica-skill-research",
    routingSkills: new Set(["recursica-skill-research"]),
  });
  assert.deepEqual(gaps, ["recursica-skill-research: cited"]);
});

test("every skill in the repository is wired, apart from the logged gaps", () => {
  // Exit 1 means a gap outside KNOWN, or a KNOWN entry that is fixed and should be removed.
  execFileSync(process.execPath, [SCRIPT], { stdio: "pipe" });
});
