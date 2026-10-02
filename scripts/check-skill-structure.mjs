#!/usr/bin/env node
/**
 * The structural rules AGENT.md states for skills, checked instead of remembered.
 *
 * Each of these was a sentence a reviewer had to recall: frontmatter that parses, a `name` that
 * matches its folder, a description under the limit, the nine sections of a component skill in
 * order, cross-references that point at something real. All of them held when this was written —
 * except tables. Nineteen of them rendered as raw pipes for months, through a formatting hook that
 * ran on every commit, because a two-column table with a three-column separator is valid enough
 * for a formatter and invalid for GitHub. So the table rules are the ones with a known history.
 *
 *   node scripts/check-skill-structure.mjs      # exit 1 on any problem
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  COMPONENT_ROLES,
  IF_USED_HEADING,
  LOAD_HEADING,
  h2s,
  headingFor,
} from "./lib/skill-sections.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");

/**
 * AGENT.md, "The shape of a component skill": the nine sections, by role. Each heading names its
 * component ("When to use a button"), so a role is matched by shape, not by string; the inventory
 * has no fixed shape and is the section right before "Rules for …". Other `##` sections may sit
 * between them, except between the inventory and "Rules for …".
 */
export { COMPONENT_ROLES };
export const ACCESSIBILITY_SUBSECTIONS = [
  "Screen readers",
  "Keyboard and non-mouse navigation",
];
export const DESCRIPTION_LIMIT = 1024;
/**
 * The house limit, well under the format's. A description is loaded to choose a skill — every
 * session in some hosts, every list_skills call over MCP — so its length is paid whether or not
 * the skill is used. They were cut from about 950 characters to about 350 with no loss in
 * routing (scripts/routing-eval.mjs), and this keeps them there.
 */
export const DESCRIPTION_TARGET = 450;

/** Every skill: `{ slug, category, file }`, found the way the packager and MCP server find them. */
export function listSkills(dir = SKILLS) {
  const out = [];
  const walk = (d, category) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(d, entry.name);
      const file = path.join(full, "SKILL.md");
      if (fs.existsSync(file)) out.push({ slug: entry.name, category, file });
      else walk(full, entry.name);
    }
  };
  walk(dir, null);
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Blank out fenced code, keeping line numbers, so examples inside it are not checked. */
function withoutCode(lines) {
  let fenced = false;
  return lines.map((l) => {
    if (/^\s*```/.test(l)) {
      fenced = !fenced;
      return "";
    }
    return fenced ? "" : l;
  });
}

/** Frontmatter: parses, has a `name` equal to the folder, and a description within the limit. */
export function checkFrontmatter(text, slug) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return [{ line: 1, message: "no frontmatter block" }];
  let data;
  try {
    data = YAML.parse(m[1]);
  } catch (e) {
    return [
      {
        line: 1,
        message: `frontmatter is not valid YAML — ${e.message.split("\n")[0]}`,
      },
    ];
  }
  const problems = [];
  if (data?.name !== slug)
    problems.push({
      line: 1,
      message: `frontmatter \`name\` is "${data?.name}", but the folder is "${slug}"`,
    });
  if (typeof data?.description !== "string" || !data.description.trim()) {
    problems.push({ line: 1, message: "frontmatter has no `description`" });
  } else if (data.description.length > DESCRIPTION_TARGET) {
    problems.push({
      line: 1,
      message: `\`description\` is ${data.description.length} characters; the house limit is ${DESCRIPTION_TARGET} (the format allows ${DESCRIPTION_LIMIT}) — say what it covers, when to use it, and what to use instead, then rerun scripts/routing-eval.mjs`,
    });
  }
  return problems;
}

/**
 * Where each role's heading sits in a component skill's `##` headings: `{ role, label, at }`, with
 * `at` the index into `h2s(text)`, or -1 when the skill has no such section.
 */
export function locateRoles(text) {
  const heads = h2s(text);
  const at = {};
  for (const r of COMPONENT_ROLES) {
    if (r.match) at[r.role] = heads.findIndex((h) => r.match(h.title));
  }
  // The inventory is found by position — right before "Rules for …", after "When not to use …" —
  // so a missing one shows as another role's heading in that place.
  const inv = headingFor(text, "inventory");
  const taken =
    inv && COMPONENT_ROLES.some((r) => r.match && r.match(inv.title));
  at.inventory =
    inv && !taken ? heads.findIndex((h) => h.index === inv.index) : -1;
  return COMPONENT_ROLES.map((r) => ({ ...r, at: at[r.role] }));
}

/** A component skill has the nine sections in order, and Accessibility has its two subsections. */
export function checkComponentShape(text) {
  const lines = withoutCode(text.split("\n"));
  const problems = [];
  const heads = h2s(text);
  const roles = locateRoles(text);
  for (const r of roles) {
    if (r.at >= 0) continue;
    const where =
      r.role === "inventory"
        ? " — the section right before `## Rules for …`"
        : "";
    problems.push({
      line: 1,
      message: `missing section \`## ${r.label}\`${where}`,
    });
  }
  const found = roles.filter((r) => r.at >= 0);
  const inOrder = [...found].sort((x, y) => x.at - y.at);
  const first = inOrder.find((r, i) => r !== found[i]);
  if (first) {
    const expected = found[inOrder.indexOf(first)];
    problems.push({
      line: heads[first.at].line,
      message: `sections are out of order — expected \`## ${expected.label}\` here`,
    });
  }
  const a11y = heads.find((h) => h.title === "Accessibility");
  if (a11y) {
    const next = heads.find((h) => h.line > a11y.line);
    const sub = lines
      .slice(a11y.line, next ? next.line - 1 : lines.length)
      .map((l) => l.match(/^### (.+?)\s*$/)?.[1])
      .filter(Boolean);
    if (sub.join("\n") !== ACCESSIBILITY_SUBSECTIONS.join("\n")) {
      problems.push({
        line: a11y.line,
        message: `\`## Accessibility\` should hold exactly ${ACCESSIBILITY_SUBSECTIONS.map((s) => `\`### ${s}\``).join(" and ")}, in that order — found ${sub.length ? sub.map((s) => `\`### ${s}\``).join(", ") : "none"}`,
      });
    }
  }
  return problems;
}

/** Every `recursica-skill-*` name and every relative link resolves to something on disk. */
export function checkReferences(text, file, slugs) {
  const problems = [];
  const lines = text.split("\n");
  const body = withoutCode(lines);
  body.forEach((l, i) => {
    for (const m of l.matchAll(/recursica-skill-[a-z0-9-]*[a-z0-9]/g)) {
      if (!slugs.has(m[0]))
        problems.push({ line: i + 1, message: `\`${m[0]}\` is not a skill` });
    }
    for (const m of l.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split("#")[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
        problems.push({
          line: i + 1,
          message: `link target \`${m[1]}\` does not exist`,
        });
      }
    }
  });
  return problems;
}

/**
 * A component's `## Skills to read with this one`: skill names only, and its "only if used" list names other
 * components. A design-rules skill there would be skipped by every loader, and a component's
 * rules would arrive without the design rules that govern them.
 */
export function checkLoadLinks(text, components) {
  const head = h2s(text).find((h) => h.title === LOAD_HEADING);
  if (!head) return [];
  const line0 = head.line;
  const rest = text.slice(head.index);
  const end = rest.slice(1).search(/^## /m);
  const body = end < 0 ? rest : rest.slice(0, end + 1);
  const problems = [];
  let conditional = false;
  body.split("\n").forEach((l, i) => {
    if (l.startsWith("### ")) {
      conditional = l.trim() === IF_USED_HEADING;
      if (!conditional)
        problems.push({
          line: line0 + i,
          message: `unexpected heading in \`## ${LOAD_HEADING}\` — the only one allowed is \`${IF_USED_HEADING}\``,
        });
    }
    if (/\]\(/.test(l))
      problems.push({
        line: line0 + i,
        message: `a link in \`## ${LOAD_HEADING}\` — write the skill name alone; a relative path means nothing outside this repository`,
      });
    if (conditional) {
      for (const m of l.matchAll(/recursica-skill-[a-z0-9-]*[a-z0-9]/g)) {
        if (!components.has(m[0]))
          problems.push({
            line: line0 + i,
            message: `\`${m[0]}\` is not a component, so it cannot be "only if the screen also uses those components" — move it above the heading`,
          });
      }
    }
  });
  return problems;
}

/** Cells in a table row as GitHub splits them: on every pipe not escaped with a backslash. */
export function cells(row) {
  const parts = row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/);
  return parts.length;
}
const isRow = (l) => l.trimStart().startsWith("|");
const isSeparator = (l) =>
  isRow(l) && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l);

/**
 * Tables that GitHub will not render the way they read:
 *   - a separator row whose cell count differs from the header — the whole table shows as text
 *   - a body row with a different cell count — cells are dropped or padded silently
 *   - a pipe-led block with no separator row at all — shows as text
 *   - a line straight after a table with no blank line — GitHub pulls it into the table as a row
 */
export function checkTables(text) {
  const lines = withoutCode(text.split("\n"));
  const problems = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isRow(lines[i]) || (i > 0 && isRow(lines[i - 1]))) continue;
    const header = cells(lines[i]);
    if (!isSeparator(lines[i + 1] ?? "")) {
      problems.push({
        line: i + 1,
        message:
          "a line starting with `|` that is not a table — no separator row under it",
      });
      while (isRow(lines[i + 1] ?? "")) i++;
      continue;
    }
    const sep = cells(lines[i + 1]);
    if (sep !== header)
      problems.push({
        line: i + 2,
        message: `separator row has ${sep} cells, header has ${header} — the table will not render`,
      });
    let j = i + 2;
    for (; j < lines.length && isRow(lines[j]); j++) {
      const n = cells(lines[j]);
      if (n !== header)
        problems.push({
          line: j + 1,
          message: `row has ${n} cells, header has ${header}`,
        });
    }
    if (j < lines.length && lines[j].trim() !== "") {
      problems.push({
        line: j + 1,
        message:
          "no blank line after the table — this line renders as a table row",
      });
    }
    i = j - 1;
  }
  return problems;
}

/** Run every check on every skill. */
export function checkAll({ skills = SKILLS } = {}) {
  const list = listSkills(skills);
  const slugs = new Set(list.map((s) => s.slug));
  const components = new Set(
    list.filter((s) => s.category === "components").map((s) => s.slug),
  );
  const problems = [];
  for (const { slug, category, file } of list) {
    const text = fs.readFileSync(file, "utf8");
    const found = [
      ...checkFrontmatter(text, slug),
      ...(category === "components"
        ? [...checkComponentShape(text), ...checkLoadLinks(text, components)]
        : []),
      ...checkReferences(text, file, slugs),
      ...checkTables(text),
    ];
    for (const p of found)
      problems.push({ file: path.relative(ROOT, file), ...p });
  }
  return { skills: list.length, problems };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { skills, problems } = checkAll();
  for (const p of problems) console.log(`${p.file}:${p.line}  ${p.message}`);
  if (problems.length) {
    console.log(
      `\n✗ ${problems.length} structural problem(s) across ${skills} skills.`,
    );
    process.exit(1);
  }
  console.log(
    `✓ ${skills} skills: frontmatter, component sections, references, and tables.`,
  );
}
