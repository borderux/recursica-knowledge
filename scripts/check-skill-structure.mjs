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
import { IF_USED_HEADING } from "./screen-skill-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");

/** AGENT.md, "The shape of a component skill". Other `##` sections may sit between them. */
export const COMPONENT_SECTIONS = [
  "Use it when",
  "Do not use it when",
  "What exists",
  "Rules for using it",
  "Accessibility",
  "Not your decision",
  "Load these too",
  "Uncovered — ask, do not invent",
  "Pre-flight checklist",
];
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

/** A component skill has the nine sections in order, and Accessibility has its two subsections. */
export function checkComponentShape(text) {
  const lines = withoutCode(text.split("\n"));
  const problems = [];
  const h2 = [];
  lines.forEach((l, i) => {
    const m = l.match(/^## (.+?)\s*$/);
    if (m) h2.push({ title: m[1], line: i + 1 });
  });
  const found = h2.filter((h) => COMPONENT_SECTIONS.includes(h.title));
  for (const title of COMPONENT_SECTIONS) {
    if (!found.some((h) => h.title === title))
      problems.push({ line: 1, message: `missing section \`## ${title}\`` });
  }
  const order = found.map((h) => h.title);
  const expected = COMPONENT_SECTIONS.filter((t) => order.includes(t));
  if (order.join("\n") !== expected.join("\n")) {
    const first = found.find((h, i) => h.title !== expected[i]);
    problems.push({
      line: first.line,
      message: `sections are out of order — expected \`## ${expected[found.indexOf(first)]}\` here`,
    });
  }
  const a11y = h2.find((h) => h.title === "Accessibility");
  if (a11y) {
    const next = h2.find((h) => h.line > a11y.line);
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
 * A component's `## Load these too`: skill names only, and its "only if used" list names other
 * components. A design-rules skill there would be skipped by every loader, and a component's
 * rules would arrive without the design rules that govern them.
 */
export function checkLoadLinks(text, components) {
  const start = text.search(/^## Load these too\s*$/m);
  if (start < 0) return [];
  const line0 = text.slice(0, start).split("\n").length;
  const body = text.slice(start).split(/^## (?!Load these too)/m)[0];
  const problems = [];
  let conditional = false;
  body.split("\n").forEach((l, i) => {
    if (l.startsWith("### ")) {
      conditional = l.trim() === IF_USED_HEADING;
      if (!conditional)
        problems.push({
          line: line0 + i,
          message: `unexpected heading in \`## Load these too\` — the only one allowed is \`${IF_USED_HEADING}\``,
        });
    }
    if (/\]\(/.test(l))
      problems.push({
        line: line0 + i,
        message:
          "a link in `## Load these too` — write the skill name alone; a relative path means nothing outside this repository",
      });
    if (conditional) {
      for (const m of l.matchAll(/recursica-skill-[a-z0-9-]*[a-z0-9]/g)) {
        if (!components.has(m[0]))
          problems.push({
            line: line0 + i,
            message: `\`${m[0]}\` is not a component, so it cannot be "only if the screen also uses it" — move it above the heading`,
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
