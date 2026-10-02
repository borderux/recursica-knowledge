#!/usr/bin/env node
/**
 * Every component skill's inventory section matches the token file it says it was taken
 * from.
 *
 * Each component skill lists the axes and options a component has — "`states`: `error`,
 * `disabled`" — and tells the agent never to pass anything else. Those lists were written by hand
 * from `recursica_ui-kit.json`, and nothing compared them since. A list that has drifted is the
 * worst kind of wrong for an agent: it passes a variant that is not there, or refuses one that is,
 * and does it with the skill's full authority.
 *
 * The token file comes from `@recursica/official-release`, pinned exactly in package.json, so a
 * release bump is a visible change that this check then re-verifies. A mismatch that is known
 * and waiting on the owner is listed in KNOWN below, with the question it is logged under.
 *
 *   node scripts/check-kit-inventory.mjs      # exit 1 on any mismatch
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { sectionBody } from "./lib/skill-sections.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENTS = path.join(ROOT, "skills", "components");
const PACKAGE = "@recursica/official-release";

/**
 * Mismatches that are known and waiting on a decision, keyed as `compare` keys them. Each one is
 * an item in docs/open-questions.md: the skill states something the kit contradicts, and changing
 * the skill changes what agents are told they may pass, which is the owner's call. Listing one
 * here keeps CI green without hiding it — the run still prints every entry — and an entry the
 * skill and kit have stopped disagreeing about fails the check, so this list cannot go stale.
 */
export const KNOWN = {};

/** Load the kit's component map and the release version it came from. */
export function loadKit() {
  const require = createRequire(path.join(ROOT, "package.json"));
  let dir;
  try {
    dir = path.dirname(require.resolve(`${PACKAGE}/package.json`));
  } catch {
    throw new Error(`${PACKAGE} is not installed — run \`npm install\` first`);
  }
  const version = JSON.parse(
    fs.readFileSync(path.join(dir, "package.json"), "utf8"),
  ).version;
  const kit = JSON.parse(
    fs.readFileSync(path.join(dir, "recursica_ui-kit.json"), "utf8"),
  );
  return { version, components: kit["ui-kit"].components };
}

const ticks = (s) => [...s.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
const bare = (s) => (/^`[a-z0-9-]+`$/.test(s) ? s.slice(1, -1) : null);

/**
 * Read a skill's inventory section — the one right after "When not to use …" — into
 * `{ components: Set<name>, axes: Map<component, Map<axis, option[]>> }`.
 *
 * Handles the three shapes the skills use:
 *   | Axis | Options | React prop |          — the component is the one the section names
 *   | Axis | Options | On |                  — the "On" column names the component
 *   | Component | Axis | Options |           — so does the first column ("Spec" too)
 * A table whose header has no "Axis" column is not an inventory and is skipped.
 */
export function readInventory(text, known) {
  const section = sectionBody(text, "inventory");
  if (!section) return null;
  const components = new Set();
  for (const m of section.matchAll(/ui-kit\.components\.([a-z0-9-]+)/g))
    components.add(m[1]);
  // The line naming the spec — "… `ui-kit.components.table`, `table-cell`, `table-header`." —
  // can name more specs after the first.
  const taken =
    section
      .split("\n")
      .find(
        (l) => l.startsWith("Taken from") || l.includes("ui-kit.components."),
      ) ?? "";
  for (const name of ticks(taken)) if (known.has(name)) components.add(name);
  const primary = [...components][0];

  const axes = new Map();
  const add = (comp, axis, options) => {
    components.add(comp);
    if (!axes.has(comp)) axes.set(comp, new Map());
    if (axis) axes.get(comp).set(axis, options);
  };

  let header = null;
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) {
      header = null;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!header) {
      header = cells.map((c) => c.toLowerCase());
      continue;
    }
    const ai = header.indexOf("axis");
    if (ai < 0) continue;
    const ci = header.findIndex(
      (h) => h === "component" || h === "spec" || h === "on",
    );
    const comp = ci >= 0 ? bare(cells[ci]) : primary;
    if (!comp) continue;
    const axis = bare(cells[ai]);
    const options = ticks(cells[header.indexOf("options")] ?? "");
    // "(none)", "—", "variants | None…": the skill says this spec has no axes.
    if (!axis || axis === "variants" || options.length === 0)
      add(comp, null, []);
    else add(comp, axis, options);
  }
  return { components, axes };
}

/**
 * Every axis a spec defines, at any depth, with the union of its options. The kit nests some axes
 * inside an option of another — a chip's `states` sits under each of its `selection-states` — and
 * a skill describes those as axes of the component, so reading only the top level would call a
 * correct skill wrong.
 */
export function kitAxes(spec) {
  const axes = {};
  const walk = (node) => {
    if (!node || typeof node !== "object" || "$value" in node) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "variants" && value && typeof value === "object") {
        for (const [axis, options] of Object.entries(value)) {
          axes[axis] ??= {};
          for (const option of Object.keys(options)) axes[axis][option] = true;
        }
      }
      walk(value);
    }
  };
  walk(spec);
  return axes;
}

/**
 * Compare one skill's inventory with the kit. Each problem has a stable `key` — `comp.axis` for an
 * axis, `comp.axis.option` for an option — so a known one can be recorded in KNOWN.
 *
 * An axis the kit gives to one spec counts as listed when the skill lists the same axis, with the
 * same options, on another spec it covers. The kit repeats some axes across a component's parts —
 * the three tab `styles` on `tabs` and on `tabs-item` — and the skills describe those once.
 */
export function compare(inventory, kit) {
  const problems = [];
  const listed = (axis, options) =>
    [...inventory.axes.values()].some(
      (m) => m.has(axis) && same(m.get(axis), options),
    );
  for (const comp of inventory.components) {
    const spec = kit[comp];
    if (!spec) {
      problems.push({
        key: comp,
        message: `\`${comp}\` is not a component in the kit`,
      });
      continue;
    }
    const kitAx = kitAxes(spec);
    const skillAxes = inventory.axes.get(comp) ?? new Map();
    for (const [axis, opts] of Object.entries(kitAx)) {
      if (!skillAxes.has(axis) && !listed(axis, Object.keys(opts))) {
        problems.push({
          key: `${comp}.${axis}`,
          message: `\`${comp}\` has the axis \`${axis}\` in the kit (${Object.keys(
            opts,
          )
            .map((o) => `\`${o}\``)
            .join(", ")}) that the skill does not list`,
        });
      }
    }
    for (const [axis, options] of skillAxes) {
      if (!kitAx[axis]) {
        problems.push({
          key: `${comp}.${axis}`,
          message: `\`${comp}\` has no axis \`${axis}\` in the kit, but the skill lists one`,
        });
        continue;
      }
      const kitOptions = Object.keys(kitAx[axis]);
      for (const o of options.filter((o) => !kitOptions.includes(o))) {
        problems.push({
          key: `${comp}.${axis}.${o}`,
          message: `\`${comp}.${axis}\` lists \`${o}\`, which the kit does not have`,
        });
      }
      for (const o of kitOptions.filter((o) => !options.includes(o))) {
        problems.push({
          key: `${comp}.${axis}.${o}`,
          message: `\`${comp}.${axis}\` in the kit has \`${o}\`, which the skill does not list`,
        });
      }
    }
  }
  return problems;
}

const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/** Check every component skill. Known mismatches are reported apart, and a stale one fails. */
export function checkAll({ kit = loadKit(), known = KNOWN } = {}) {
  const names = new Set(Object.keys(kit.components));
  const problems = [];
  const acknowledged = [];
  const seen = new Set();
  let compared = 0;
  for (const slug of fs.readdirSync(COMPONENTS).sort()) {
    const file = path.join(COMPONENTS, slug, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const inventory = readInventory(fs.readFileSync(file, "utf8"), names);
    const rel = path.relative(ROOT, file);
    if (!inventory || inventory.components.size === 0) {
      problems.push({
        file: rel,
        key: slug,
        message: "no inventory section naming a kit component",
      });
      continue;
    }
    compared += inventory.components.size;
    for (const p of compare(inventory, kit.components)) {
      seen.add(p.key);
      (known[p.key] ? acknowledged : problems).push({ file: rel, ...p });
    }
  }
  for (const key of Object.keys(known)) {
    if (!seen.has(key)) {
      problems.push({
        file: "scripts/check-kit-inventory.mjs",
        key,
        message: `KNOWN lists \`${key}\`, but the skill and the kit now agree — remove the entry, and move its item in docs/open-questions.md to the resolved list`,
      });
    }
  }
  return { version: kit.version, compared, problems, acknowledged };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { version, compared, problems, acknowledged } = checkAll();
  for (const p of problems) console.log(`${p.file}\n    ${p.message}`);
  if (acknowledged.length) {
    console.log(
      `${acknowledged.length} known mismatch(es), logged in docs/open-questions.md:`,
    );
    for (const p of acknowledged)
      console.log(
        `  · ${p.file.replace("skills/components/", "")}: ${p.message}`,
      );
  }
  const summary = `${compared} kit specs across the component skills, against ${PACKAGE}@${version}.`;
  if (problems.length) {
    console.log(`\n✗ ${problems.length} inventory mismatch(es). ${summary}`);
    process.exit(1);
  }
  console.log(`✓ ${summary}`);
}
