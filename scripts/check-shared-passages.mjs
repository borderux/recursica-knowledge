#!/usr/bin/env node
/**
 * Paragraphs repeated across skills stay word for word what skills/meta/SHARED-PASSAGES.md says.
 *
 * The same reasoning as the glossary check, applied to rules instead of definitions: a skill is
 * served on its own, so a rule it depends on is written into it, and the copies then drift. The
 * label-placement rule had reached seven wordings across sixteen skills before this existed.
 *
 * A unit — a paragraph, or one list item — that begins with a passage's opening is claimed by it,
 * and has to match one of the passages sharing that opening from its first word. Text a skill adds
 * after the passage is its own. A passage with a "Required when" pattern must appear in every
 * component skill whose `## What exists` section matches it.
 *
 *   node scripts/check-shared-passages.mjs      # exit 1 on any mismatch
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listSkills } from "./check-skill-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PASSAGES = path.join(ROOT, "skills", "meta", "SHARED-PASSAGES.md");

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `{a|b}` → a regex alternation; everything else literal. */
export function toPattern(passage) {
  let out = "";
  let i = 0;
  while (i < passage.length) {
    const open = passage.indexOf("{", i);
    if (open < 0) {
      out += escape(passage.slice(i));
      break;
    }
    const close = passage.indexOf("}", open);
    if (close < 0)
      throw new Error(
        `unclosed "{" in passage: ${passage.slice(open, open + 30)}`,
      );
    out += escape(passage.slice(i, open));
    out += `(?:${passage
      .slice(open + 1, close)
      .split("|")
      .map(escape)
      .join("|")})`;
    i = close + 1;
  }
  // The passage must end at a boundary: the end of the unit, a space, or punctuation.
  return new RegExp(`^${out}(?=$|\\s|[.,;:])`);
}

/** Parse the passages file: `[{ id, startsWith, requiredWhen, text, pattern }]`. */
export function parsePassages(text) {
  const passages = [];
  for (const block of text.split(/^## /m).slice(1)) {
    const id = block.split("\n")[0].trim();
    const field = (label) =>
      block.match(
        new RegExp(`^${label}:\\s*\\n+\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``, "m"),
      )?.[1];
    const startsWith = field("Starts with");
    const passage = field("Passage");
    if (!startsWith && !passage) continue; // prose sections such as "How the check reads this file"
    if (!startsWith || !passage)
      throw new Error(`passage "${id}" needs both "Starts with" and "Passage"`);
    if (!passage.startsWith(startsWith))
      throw new Error(
        `passage "${id}" does not begin with its own "Starts with"`,
      );
    const requiredWhen = field("Required when");
    passages.push({
      id,
      startsWith,
      requiredWhen,
      text: passage,
      pattern: toPattern(passage),
    });
  }
  if (passages.length === 0) throw new Error("no passages found");
  return passages;
}

/** Paragraphs and list items, with their line numbers. Frontmatter and fenced code are skipped. */
export function units(text) {
  const lines = text.split("\n");
  const out = [];
  let fenced = false;
  let start = lines[0] === "---" ? lines.indexOf("---", 1) + 1 : 0;
  let buf = [];
  let bufLine = 0;
  const flush = () => {
    if (buf.length) out.push({ line: bufLine, text: buf.join(" ") });
    buf = [];
  };
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) {
      flush();
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (!l.trim() || /^#{1,6} /.test(l) || l.startsWith("|")) {
      flush();
      continue;
    }
    if (/^\s*(- |\d+\. )/.test(l)) flush();
    if (!buf.length) bufLine = i + 1;
    buf.push(l.trim());
  }
  flush();
  return out;
}

/** The problems in one skill. */
export function checkText(text, passages, { component = false } = {}) {
  const problems = [];
  const matched = new Set();
  for (const unit of units(text)) {
    const claiming = passages.filter((p) => unit.text.startsWith(p.startsWith));
    if (!claiming.length) continue;
    const hit = claiming.find((p) => p.pattern.test(unit.text));
    if (hit) matched.add(hit.id);
    else {
      problems.push({
        line: unit.line,
        message: `begins like ${claiming.map((p) => `"${p.id}"`).join(" or ")} but does not match it`,
        found: unit.text,
        expected: claiming.map((p) => p.text),
      });
    }
  }
  if (component) {
    const exists =
      text.split(/^## What exists\s*$/m)[1]?.split(/^## /m)[0] ?? "";
    for (const p of passages) {
      if (
        p.requiredWhen &&
        exists.includes(p.requiredWhen) &&
        !matched.has(p.id)
      ) {
        problems.push({
          line: 1,
          message: `\`## What exists\` mentions ${p.requiredWhen}, so "${p.id}" is required and missing`,
        });
      }
    }
  }
  return { problems, matched };
}

/** Check every skill. */
export function checkAll({ passagesFile = PASSAGES, skills } = {}) {
  const passages = parsePassages(fs.readFileSync(passagesFile, "utf8"));
  const list = listSkills(skills);
  const problems = [];
  const uses = Object.fromEntries(passages.map((p) => [p.id, 0]));
  for (const { category, file } of list) {
    const result = checkText(fs.readFileSync(file, "utf8"), passages, {
      component: category === "components",
    });
    for (const id of result.matched) uses[id]++;
    for (const p of result.problems)
      problems.push({ file: path.relative(ROOT, file), ...p });
  }
  for (const [id, n] of Object.entries(uses)) {
    if (n === 0)
      problems.push({
        file: path.relative(ROOT, passagesFile),
        line: 1,
        message: `passage "${id}" is used by no skill — remove it`,
      });
  }
  return { skills: list.length, passages: passages.length, uses, problems };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { skills, passages, uses, problems } = checkAll();
  for (const p of problems) {
    console.log(`${p.file}:${p.line}  ${p.message}`);
    if (p.found) console.log(`    found:    ${p.found.slice(0, 400)}`);
    for (const e of p.expected ?? [])
      console.log(`    expected: ${e.slice(0, 400)}`);
  }
  const summary = `${passages} shared passages across ${skills} skills (${Object.entries(
    uses,
  )
    .map(([id, n]) => `${id} ×${n}`)
    .join(", ")}).`;
  if (problems.length) {
    console.log(`\n✗ ${problems.length} problem(s). ${summary}`);
    process.exit(1);
  }
  console.log(`✓ ${summary}`);
}
