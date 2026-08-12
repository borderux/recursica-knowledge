#!/usr/bin/env node
/**
 * Which skills apply to a screen — computed, not judged.
 *
 * This is the piece that makes a design review mechanical, and it exists because of a specific
 * gap in the skills family. Every component skill has a `## Load these too` section pointing
 * upward at the design-rules skills it depends on. No design-rules skill points back down, and
 * the router's decision table names 20 of 20 design-rules skills and **0 of 39 component
 * skills**. So descending the router never yields a component skill name — an agent has to
 * decide for itself which components are "on the screen", and that judgment is where things get
 * missed. A `Breadcrumb` that arrived from a scaffolding example did not feel *placed*, so its
 * skill was never opened and it shipped with four accessibility defects.
 *
 * The import statement has no such ambiguity. `import { Badge, Table } from
 * '@recursica/mantine-adapter'` is a complete, machine-readable list of the components on that
 * screen, and it fires on the import rather than on anybody's sense of what counts as placed.
 *
 * Usage:
 *   node scripts/screen-skill-manifest.mjs <file.jsx> [more.jsx ...]
 *   node scripts/screen-skill-manifest.mjs --json <file.jsx>
 *   node scripts/screen-skill-manifest.mjs --self-check
 *
 * Exit codes: 0 fine · 1 an import matched nothing (reported, never silently dropped) · 2 the
 * map itself is stale against the skills on disk.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");

/**
 * The adapter's own export list, from `RECURSICA_COMPONENTS` in
 * `@recursica/adapter-common`. Kept here so the map can be checked for completeness without the
 * package installed; `--self-check` reports drift if the package is present and disagrees.
 */
const ADAPTER_COMPONENTS = [
  "Accordion", "AssistiveElement", "Autocomplete", "Avatar", "Badge", "Breadcrumb", "Button",
  "Card", "Checkbox", "Chip", "Container", "DatePicker", "Dropdown", "EmptyValueRenderer", "Flex",
  "FormControlLayout", "FormControlWrapper", "Grid", "Group", "HoverCard", "Label", "Layer",
  "Link", "Loader", "Menu", "Modal", "NumberInput", "Pagination", "Panel", "Popover", "Radio",
  "ReadOnlyField", "SegmentedControl", "Slider", "Stack", "Stepper", "Switch", "Table", "Tabs",
  "Text", "TextArea", "TextField", "TimePicker", "Timeline", "Title", "Toast", "Tooltip",
  "TransferList",
];

/**
 * Where a component goes when **no component skill of that name exists at all.**
 *
 * These are routing decisions, not spellings. Every entry answers "this component has no skill of
 * its own — which design rules govern it?", which is a judgment nobody can derive from a string.
 *
 * **Deliberately not a spelling table.** An earlier version of this file hardcoded four more
 * entries so that `TextArea` would find `recursica-skill-textarea`, `Radio` would find
 * `radio-button`, and `HoverCard` and `Popover` would both find `hover-card-popover`. That was the
 * wrong instinct: those are name variations of the same thing, and matching them is a job for
 * comparison rather than for a lookup table somebody has to maintain. `skillFor` below normalises
 * both sides and resolves all four without an entry here. Keep it that way — a hand-maintained
 * alias list goes stale the first time a skill is renamed, and it goes stale silently.
 *
 * `kind` is what the reviewer does with it:
 *   design — no component skill exists; these design-rules skills own it instead
 */
const ROUTES = {
  // Layout primitives. No component skill by design — how regions are divided is a composition
  // question, so the rules live in the design-rules layer.
  Group: { kind: "design", skills: ["recursica-skill-screen-scaffolding"] },
  Stack: { kind: "design", skills: ["recursica-skill-screen-scaffolding"] },
  Flex: { kind: "design", skills: ["recursica-skill-screen-scaffolding"] },
  Container: { kind: "design", skills: ["recursica-skill-screen-scaffolding"] },

  // `Grid` also lands on scaffolding, but note that the layout grid itself is on that skill's
  // own "uncovered — ask, do not invent" list: eight or twelve columns is named as the thing
  // pages must align to and explicitly deferred to a skill that does not exist yet. So this
  // route is the closest owner rather than a complete answer, and a screen leaning on the grid
  // is a question for a person.
  Grid: { kind: "design", skills: ["recursica-skill-screen-scaffolding"] },

  // A layer is its own system with four levels and token-owned properties.
  Layer: { kind: "design", skills: ["recursica-skill-layers"] },

  // Type. Which element and which variant is a semantics question, not a component one.
  //
  // `Text` needs to be here for a second reason: normalised matching finds both `textarea` and
  // `text-field` for it and correctly refuses to guess. An explicit route is the answer to a
  // genuine ambiguity, which is what this table is for.
  Text: { kind: "design", skills: ["recursica-skill-typography-semantics"] },
  Title: { kind: "design", skills: ["recursica-skill-typography-semantics"] },

  // Form scaffolding. These carry `formLayout` and the assistive-text slot for every field, so
  // the rules that govern them are the form rules.
  FormControlLayout: { kind: "design", skills: ["recursica-skill-forms"] },
  FormControlWrapper: { kind: "design", skills: ["recursica-skill-forms"] },

  // The absent-value renderer. `recursica-skill-tables` owns what an empty cell must say.
  EmptyValueRenderer: { kind: "design", skills: ["recursica-skill-tables"] },
};

/**
 * Design-rules skills that apply to every screen regardless of what it imports.
 *
 * These are the ones whose subject is the screen itself — what it holds, how it is composed, how
 * it names things — so no import can signal them. A reviewer that only followed imports would
 * never check any of them, and the defects found by hand on this app were mostly here.
 */
const ALWAYS = [
  "recursica-skill-screen-scaffolding",
  "recursica-skill-screen-priority",
  "recursica-skill-system-conventions",
  "recursica-skill-typography-semantics",
  "recursica-skill-naming-terminology",
  "recursica-skill-layers",
  "recursica-skill-responsive-behavior",
  "recursica-skill-defaults",
  "recursica-skill-icon-semantics",
];

const CATEGORIES = ["components", "design-rules", "meta", "psychology"];

/** Where a skill slug lives, or null if no such skill is on disk. */
function locate(slug) {
  for (const category of CATEGORIES) {
    const p = path.join(SKILLS, category, slug, "SKILL.md");
    if (fs.existsSync(p)) return path.relative(ROOT, p);
  }
  return null;
}

/** Every adapter component named in an import from the adapter, across the given source. */
export function adapterImports(source) {
  const found = new Set();
  const re = /import\s*\{([^}]*)\}\s*from\s*["']@recursica\/mantine-adapter["']/g;
  for (const m of source.matchAll(re)) {
    for (const raw of m[1].split(",")) {
      // `Link as RouterLink` is a rename; the imported name is what identifies the component.
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) found.add(name);
    }
  }
  return [...found].sort();
}

/** Every component skill slug on disk, with punctuation stripped for comparison. */
function componentSkills() {
  const dir = path.join(SKILLS, "components");
  return fs.readdirSync(dir)
    .filter((slug) => fs.existsSync(path.join(dir, slug, "SKILL.md")))
    .map((slug) => ({ slug, flat: slug.replace("recursica-skill-", "").replace(/-/g, "") }));
}

/**
 * The component skill for an export name, matched rather than looked up.
 *
 * A component name and its skill's slug are the same word with different punctuation, so compare
 * them with the punctuation removed instead of maintaining a table of spellings. This resolves the
 * four that a kebab-case guess misses, with no entry for any of them:
 *
 *   TextArea   → textarea            (exact, once the hyphen stops mattering)
 *   Radio      → radio-button        (the skill name is longer)
 *   HoverCard  → hover-card-popover  (ditto)
 *   Popover    → hover-card-popover  (matches the tail)
 *
 * **Returns `ambiguous` rather than guessing when more than one skill matches.** `Text` hits both
 * `textarea` and `text-field`, and picking either would be wrong in a way nothing downstream could
 * detect. A name that lands here needs a human decision, which is what `ROUTES` records.
 */
export function skillFor(name) {
  const flat = name.toLowerCase();
  const skills = componentSkills();

  const exact = skills.filter((s) => s.flat === flat);
  if (exact.length === 1) return { match: "exact", slugs: [exact[0].slug] };

  // A skill whose name extends the component's — `Radio` inside `radio-button` — or ends with it,
  // as `Popover` does in `hover-card-popover`.
  const partial = skills.filter((s) => s.flat.startsWith(flat) || s.flat.endsWith(flat));
  if (partial.length === 1) return { match: "partial", slugs: [partial[0].slug] };
  if (partial.length > 1) return { match: "ambiguous", slugs: partial.map((s) => s.slug).sort() };

  return { match: "none", slugs: [] };
}

/** What one imported name resolves to. */
export function resolveImport(name) {
  // A route wins over a match: it is a decision somebody made, including for the ambiguous cases
  // that matching deliberately refuses to resolve.
  if (ROUTES[name]) return { name, ...ROUTES[name] };

  const { match, slugs } = skillFor(name);
  if (match === "exact" || match === "partial") return { name, kind: "component", skills: slugs, match };
  // Reported, never guessed at. An ambiguous name is a gap in ROUTES, and it says so.
  if (match === "ambiguous") return { name, kind: "ambiguous", skills: [], candidates: slugs };
  return { name, kind: "unmapped", skills: [] };
}

/**
 * The text of one `## ` section of a skill, up to the next `## ` heading or end of file.
 *
 * Sliced rather than matched with a lookahead. The obvious regex —
 * `/^## Name\n([\s\S]*?)(?=\n## |\n*$)/m` — captures the empty string, because under the `m` flag
 * `$` matches the end of *any* line, so the lazy group is satisfied immediately. It looks correct,
 * it never throws, and it returns nothing for every skill. It shipped in the first draft of this
 * file and was caught only by noticing that a screen importing `Badge` did not pull in
 * `recursica-skill-badges-chips` even though that skill is the first cross-link `recursica-skill-badge`
 * lists. **A silent-empty parse is exactly the failure this whole reviewer is meant to prevent**, so
 * `--self-check` now asserts the cross-links are non-empty.
 */
function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) return null;
  const from = start + heading.length + 5;
  const next = text.indexOf("\n## ", from);
  return next === -1 ? text.slice(from) : text.slice(from, next);
}

/** The `## Load these too` skill slugs a skill file names. */
function loadTheseToo(relPath) {
  const body = section(fs.readFileSync(path.join(ROOT, relPath), "utf8"), "Load these too");
  if (!body) return [];
  return [...new Set(body.match(/recursica-skill-[a-z0-9-]+/g) ?? [])];
}

/**
 * Every local source file a screen reaches, following relative imports transitively.
 *
 * Without this the manifest is wrong in the way that matters most. A route that renders a table
 * through a shared wrapper — `import { DataTable } from '../shell/DataTable.jsx'` — imports no
 * adapter `Table` of its own, so an import scan of that one file yields no table component and
 * `recursica-skill-tables` never loads. That was true of the first screen this was run against,
 * and the tables skill is where most of the rules it was violating live.
 *
 * So the unit of review is the screen and the shell it is built from, not one file. Only relative
 * specifiers are followed: a bare specifier is a package, and the adapter is handled by name.
 */
export function localGraph(entry, seen = new Set()) {
  const abs = path.resolve(entry);
  if (seen.has(abs) || !fs.existsSync(abs)) return seen;
  seen.add(abs);
  const source = fs.readFileSync(abs, "utf8");
  for (const m of source.matchAll(/(?:from|import)\s*["'](\.[^"']+)["']/g)) {
    const target = path.resolve(path.dirname(abs), m[1]);
    for (const candidate of [target, `${target}.jsx`, `${target}.js`, path.join(target, "index.jsx")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) { localGraph(candidate, seen); break; }
    }
  }
  return seen;
}

/**
 * The skill set for one or more source files.
 *
 * Transitively closes over `## Load these too`, because a component skill is explicit that it is
 * incomplete on its own — loading `Table` without the tables design rules reliably produces
 * something individually correct and collectively wrong.
 */
export function manifest(entries) {
  // The screen plus every local file it reaches. See `localGraph` for why one file is not enough.
  const files = new Set();
  for (const e of entries) for (const f of localGraph(e)) files.add(f);

  const imports = new Set();
  for (const f of files) {
    for (const name of adapterImports(fs.readFileSync(f, "utf8"))) imports.add(name);
  }

  const resolved = [...imports].sort().map(resolveImport);
  const unmapped = resolved.filter((r) => r.kind === "unmapped").map((r) => r.name);
  const ambiguous = resolved.filter((r) => r.kind === "ambiguous")
    .map((r) => `${r.name} (could be ${r.candidates.join(" or ")})`);

  // Breadth-first over `## Load these too`, so a skill reached only through another still lands.
  const seen = new Set();
  const queue = [...resolved.flatMap((r) => r.skills), ...ALWAYS];
  const missing = [];
  while (queue.length) {
    const slug = queue.shift();
    if (seen.has(slug)) continue;
    const where = locate(slug);
    if (!where) { missing.push(slug); continue; }
    seen.add(slug);
    queue.push(...loadTheseToo(where));
  }

  const skills = [...seen].sort().map((slug) => ({ slug, path: locate(slug) }));
  return {
    entries: entries.map((f) => path.relative(ROOT, f)),
    files: [...files].map((f) => path.relative(ROOT, f)).sort(),
    imports: resolved,
    skills,
    // Never a silent drop. An import nobody mapped and a skill named by a cross-link but absent
    // from disk are both reported: a reviewer that quietly skips a component reads exactly like
    // one that cleared it.
    uncovered: {
      unmappedImports: unmapped,
      ambiguousImports: ambiguous,
      missingSkills: [...new Set(missing)].sort(),
    },
  };
}

/** The map against the skills actually on disk. Catches a renamed or deleted skill. */
function selfCheck() {
  const problems = [];

  for (const name of ADAPTER_COMPONENTS) {
    const r = resolveImport(name);
    if (r.kind === "unmapped") problems.push(`${name}: no skill matched and no entry in ROUTES`);
    if (r.kind === "ambiguous") problems.push(`${name}: matches ${r.candidates.join(" and ")} — needs a ROUTES entry`);
    for (const slug of r.skills) if (!locate(slug)) problems.push(`${name} -> ${slug}: no such skill on disk`);
  }
  for (const slug of ALWAYS) if (!locate(slug)) problems.push(`ALWAYS names ${slug}, which is not on disk`);
  for (const name of Object.keys(ROUTES)) {
    if (!ADAPTER_COMPONENTS.includes(name)) problems.push(`ROUTES has ${name}, which the adapter does not export`);
    // A route for a component that *does* have its own skill is a route that should not exist.
    const m = skillFor(name);
    if (m.match === "exact") problems.push(`ROUTES has ${name}, but ${m.slugs[0]} matches it exactly — drop the route`);
  }

  // Every skill must have a checklist, because that is what a checker walks. A skill with none
  // would return "no findings" indistinguishably from a real pass.
  //
  // Every component skill must also yield at least one cross-link. That assertion exists because
  // the first version of the parser returned an empty list for all 39 of them and looked fine —
  // the closure silently added nothing and the design-rules layer was quietly underpopulated.
  // Asserting non-empty is what turns that from invisible into a failed check.
  let items = 0;
  let links = 0;
  for (const category of CATEGORIES) {
    const dir = path.join(SKILLS, category);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const p = path.join(dir, slug, "SKILL.md");
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, "utf8");
      const checklist = section(text, "Pre-flight checklist");
      const n = checklist ? (checklist.match(/^- \[ \]/gm) ?? []).length : 0;
      if (n === 0) problems.push(`${category}/${slug}: no pre-flight checklist items`);
      items += n;

      if (category === "components") {
        const cross = loadTheseToo(path.relative(ROOT, p));
        if (cross.length === 0) problems.push(`components/${slug}: '## Load these too' parsed to nothing`);
        links += cross.length;
      }
    }
  }

  if (problems.length) {
    console.error(`✗ ${problems.length} problem${problems.length > 1 ? "s" : ""}:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(2);
  }
  console.log(`✓ ${ADAPTER_COMPONENTS.length} adapter components all resolve.`);
  console.log(`✓ ${Object.keys(ROUTES).length} routes for components with no skill of their own, ${ALWAYS.length} always-on skills.`);
  console.log(`✓ ${items} pre-flight checklist items across every skill.`);
  console.log(`✓ ${links} cross-links parsed from the 39 component skills.`);
}

// Only when run as a command. Without this guard the CLI executes on import, so the test file
// printing a usage message and exiting 1 was the first thing `node --test` did.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const args = invokedDirectly ? process.argv.slice(2) : null;
if (!invokedDirectly) {
  // Imported as a module. Nothing to do.
} else if (args.includes("--self-check")) {
  selfCheck();
} else {
  const json = args.includes("--json");
  const files = args.filter((a) => !a.startsWith("--"));
  if (!files.length) {
    console.error("usage: screen-skill-manifest.mjs [--json] <file.jsx> ...   |   --self-check");
    process.exit(1);
  }
  const result = manifest(files);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`${result.entries.join(", ")}`);
    console.log(`reads ${result.files.length} local file${result.files.length === 1 ? "" : "s"}: ${result.files.map((f) => path.basename(f)).join(", ")}\n`);
    console.log(`imports (${result.imports.length}):`);
    for (const i of result.imports) {
      const tail = i.kind === "unmapped" ? "UNMAPPED"
        : i.kind === "ambiguous" ? `AMBIGUOUS — ${i.candidates.join(" or ")}`
        : `${i.kind} → ${i.skills.join(", ")}${i.match === "partial" ? " (matched)" : ""}`;
      console.log(`  ${i.name.padEnd(20)} ${tail}`);
    }
    console.log(`\nskills to load (${result.skills.length}):`);
    for (const s of result.skills) console.log(`  ${s.slug}`);
    const { unmappedImports, ambiguousImports, missingSkills } = result.uncovered;
    if (unmappedImports.length || ambiguousImports.length || missingSkills.length) {
      console.log("\nuncovered — reported rather than skipped:");
      for (const u of unmappedImports) console.log(`  import with no skill: ${u}`);
      for (const a of ambiguousImports) console.log(`  import matching several skills: ${a}`);
      for (const m of missingSkills) console.log(`  cross-link to a missing skill: ${m}`);
    }
  }
  if (result.uncovered.unmappedImports.length) process.exit(1);
}
