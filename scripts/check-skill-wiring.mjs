#!/usr/bin/env node
/**
 * Every skill is wired to the agents that use it.
 *
 * A skill on disk is not a skill anyone uses. Betty finds a rule through the design router; Barb
 * and Kev apply only the skills the manifest hands them; an agent reaches a skill by its
 * description, which the routing evaluation tests; a package install needs the skill listed. Miss
 * one and the skill is present, passes every other check, and is never applied. Three design-rules
 * skills were in exactly that state for the reviewers when this was written — reachable from no
 * screen — and nothing had said so.
 *
 * So adding or renaming a skill is not finished until this passes:
 *
 *   every skill           listed in .claude-plugin/marketplace.json and in llms.txt
 *   every skill but meta  at least one request in scripts/fixtures/routing-requests.json
 *   design-rules          named in the design router, which is how a builder finds it
 *   design-rules          reachable by the reviewers: in the manifest's ALWAYS, in a ROUTES entry,
 *                         or in some component skill's `## Load these too` (not under "only if
 *                         used", which the manifest follows for components the screen imports and
 *                         never for a design-rules skill)
 *   psychology            cited by a design-rules skill or the router, which is the only way an
 *                         agent is ever sent to one
 *
 * KNOWN holds the gaps that predate the check, each with its reason. An entry fails once its gap
 * is closed, so the list cannot outlive the problem — same convention as check-uncovered.mjs.
 *
 * Exit: 0 wired, 1 a gap.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALWAYS, ROUTES, crossLinks } from "./screen-skill-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORIES = ["components", "design-rules", "psychology", "meta"];
const ROUTER = "skills/meta/recursica-skill-design-router/SKILL.md";

/** `<slug>: <rule>` → why it is still open. */
export const KNOWN = {
  // Predate the routing evaluation's coverage requirement.
  "recursica-skill-button: routing": "no routing request yet",
  "recursica-skill-card: routing": "no routing request yet",
  "recursica-skill-checkbox: routing": "no routing request yet",
  "recursica-skill-label: routing": "no routing request yet",
  "recursica-skill-modal: routing": "no routing request yet",
  "recursica-skill-radio-button: routing": "no routing request yet",
  "recursica-skill-table: routing": "no routing request yet",
  "recursica-skill-tabs: routing": "no routing request yet",
  "recursica-skill-tooltip: routing": "no routing request yet",
  "recursica-skill-buttons-links: routing": "no routing request yet",
  "recursica-skill-navigation: routing": "no routing request yet",
  "recursica-skill-screen-scaffolding: routing": "no routing request yet",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

export function listSkills(root = ROOT) {
  return CATEGORIES.flatMap((category) => {
    const dir = path.join(root, "skills", category);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((slug) => fs.existsSync(path.join(dir, slug, "SKILL.md")))
      .map((slug) => ({
        category,
        slug,
        file: `skills/${category}/${slug}/SKILL.md`,
      }));
  });
}

/** Which rules each skill fails, as `<slug>: <rule>` keys. Pure, so the tests can feed it. */
export function findGaps({
  skills,
  marketplace,
  llms,
  routingSkills,
  router,
  always,
  routes,
  componentNeeds,
  citations,
}) {
  const gaps = [];
  const reviewerReach = new Set([
    ...always,
    ...Object.values(routes).flatMap((r) => r.skills ?? []),
    ...componentNeeds,
  ]);
  for (const { category, slug } of skills) {
    if (!marketplace.includes(`/${slug}"`)) gaps.push(`${slug}: marketplace`);
    if (!llms.includes(slug)) gaps.push(`${slug}: llms`);
    if (category !== "meta" && !routingSkills.has(slug))
      gaps.push(`${slug}: routing`);
    if (category === "design-rules") {
      if (!router.includes(slug)) gaps.push(`${slug}: router`);
      if (!reviewerReach.has(slug)) gaps.push(`${slug}: reviewers`);
    }
    if (category === "psychology" && !citations.includes(slug))
      gaps.push(`${slug}: cited`);
  }
  return gaps;
}

const WHAT = {
  marketplace:
    "is not listed in .claude-plugin/marketplace.json, so a package install never ships it",
  llms: "is not listed in llms.txt",
  routing:
    "has no request in scripts/fixtures/routing-requests.json, so nothing tests that agents find it by its description",
  router: "is not named in the design router, so a builder is never sent to it",
  reviewers:
    'is reachable from no screen — add it to ALWAYS or ROUTES in scripts/screen-skill-manifest.mjs, or to a component skill\'s `## Load these too` above the "only if" heading — so Barb and Kev never apply it',
  cited:
    "is cited by no design-rules skill and not by the router, so no agent is ever sent to it",
};

function gather() {
  const skills = listSkills();
  const componentNeeds = skills
    .filter((s) => s.category === "components")
    .flatMap((s) => crossLinks(read(s.file)).needs);
  const citations = skills
    .filter((s) => s.category === "design-rules")
    .map((s) => read(s.file))
    .concat(read(ROUTER))
    .join("\n");
  return {
    skills,
    marketplace: read(".claude-plugin/marketplace.json"),
    llms: read("llms.txt"),
    routingSkills: new Set(
      JSON.parse(read("scripts/fixtures/routing-requests.json")).map(
        (r) => r.skill,
      ),
    ),
    router: read(ROUTER),
    always: ALWAYS,
    routes: ROUTES,
    componentNeeds,
    citations,
  };
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const input = gather();
  const gaps = findGaps(input);
  const problems = [];
  for (const key of gaps) if (!KNOWN[key]) problems.push(key);
  for (const key of Object.keys(KNOWN))
    if (!gaps.includes(key)) problems.push(`${key} (KNOWN)`);

  for (const key of gaps.filter((k) => KNOWN[k]))
    console.log(`  · known: ${key} — ${KNOWN[key]}`);
  for (const p of problems) {
    if (p.endsWith("(KNOWN)")) {
      console.log(
        `${p.replace(" (KNOWN)", "")}  is wired now — remove it from KNOWN in scripts/check-skill-wiring.mjs`,
      );
    } else {
      const [slug, rule] = p.split(": ");
      console.log(`${slug}  ${WHAT[rule]}`);
    }
  }
  if (problems.length) {
    console.log(
      `\n✗ ${problems.length} skill(s) not wired to the agents that use them.`,
    );
    process.exit(1);
  }
  console.log(
    `✓ ${input.skills.length} skills wired to the router, the reviewers, the routing evaluation and the package.`,
  );
}
