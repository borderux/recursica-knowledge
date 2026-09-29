#!/usr/bin/env node
/**
 * Every in-place definition of a glossary term matches the glossary.
 *
 * The skills define their terms where they use them — "a tab stop (a place the Tab key lands)" —
 * because a skill is served on its own, by the MCP server and in its package, and a definition one
 * link away is one an agent skips. The cost of that is the same definition copied into dozens of
 * files with nothing keeping the copies alike. `skills/meta/GLOSSARY.md` is the one source, and
 * this is the thing that holds the copies to it.
 *
 * What it reads is deliberately narrow: a listed term, then a bracket, then a lowercase definition.
 * A definition written as a sentence is not seen, and a term that is never defined is not reported.
 * The glossary's own "What the check does not do" section says the same, and both need changing
 * together if this does.
 *
 *   node scripts/check-glossary.mjs      # exit 1 on any mismatch
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");
export const GLOSSARY = path.join(SKILLS, "meta", "GLOSSARY.md");

/** Brackets that open like this are a reference or an example, not a definition. */
const NOT_A_DEFINITION = /^(see |e\.g\.|for example)/;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (s) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;,:]$/, "");

/**
 * Parse the glossary's `## Terms` table into a map from every inline form (the term and each
 * "also written as" spelling, lowercased) to the definitions accepted for it. A term with two
 * meanings has two rows, so a form can carry more than one definition.
 */
export function parseGlossary(text) {
  const section = text.split(/^## Terms\s*$/m)[1];
  if (!section) throw new Error("glossary has no `## Terms` section");
  const forms = new Map();
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    const [term, also, definition] = cells;
    if (!term || term === "Term" || /^-+$/.test(term)) continue;
    if (!definition)
      throw new Error(`glossary term "${term}" has no definition`);
    const spellings = [term, ...(also ? also.split(",") : [])]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    for (const form of spellings) {
      if (!forms.has(form)) forms.set(form, []);
      forms.get(form).push(normalize(definition));
    }
  }
  if (forms.size === 0)
    throw new Error("glossary `## Terms` table has no rows");
  return forms;
}

/** The prose a skill's reader sees: frontmatter and fenced code blanked out, line count kept. */
function prose(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text
    .replace(/^---\n[\s\S]*?\n---\n/, blank)
    .replace(/```[\s\S]*?```/g, blank);
}

/**
 * Every bracketed definition of a listed term in `text`: `{ line, form, found }`. Longest forms
 * are tried first, so "unadvertised affordance (…)" is claimed by that row and never re-read as
 * "affordance (…)". Bold or italic markers may sit between the term and the bracket, and a
 * possessive `'s` is allowed — "the tenant's** (…)".
 */
export function findDefinitions(text, forms) {
  const sorted = [...forms.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(?<![A-Za-z-])(${sorted.map(escape).join("|")})(?:['’]s)?[*_]*\\s\\(([^()]*)\\)`,
    "gi",
  );
  const body = prose(text);
  const out = [];
  for (const m of body.matchAll(pattern)) {
    const found = m[2].trim();
    if (!/^[a-z]/.test(found) || NOT_A_DEFINITION.test(found)) continue;
    const line = body.slice(0, m.index).split("\n").length;
    out.push({ line, form: m[1].toLowerCase(), found: normalize(found) });
  }
  return out;
}

/** Mismatches in one skill's text: `{ line, form, found, expected }`. */
export function checkText(text, forms) {
  return findDefinitions(text, forms)
    .filter(({ form, found }) => !forms.get(form).includes(found))
    .map((d) => ({ ...d, expected: forms.get(d.form) }));
}

function skillFiles(dir = SKILLS) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    const skill = path.join(full, "SKILL.md");
    if (fs.existsSync(skill)) out.push(skill);
    else out.push(...skillFiles(full));
  }
  return out.sort();
}

/** Check every skill against the glossary. */
export function checkAll({ glossary = GLOSSARY, skills = SKILLS } = {}) {
  const forms = parseGlossary(fs.readFileSync(glossary, "utf8"));
  const files = skillFiles(skills);
  let definitions = 0;
  const problems = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    definitions += findDefinitions(text, forms).length;
    for (const p of checkText(text, forms))
      problems.push({ file: path.relative(ROOT, file), ...p });
  }
  return { files: files.length, terms: forms.size, definitions, problems };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { files, terms, definitions, problems } = checkAll();
  for (const p of problems) {
    console.log(`${p.file}:${p.line}  ${p.form}`);
    console.log(`    found:    ${p.found}`);
    for (const e of p.expected) console.log(`    expected: ${e}`);
  }
  const summary = `${definitions} in-place definitions across ${files} skills, checked against ${terms} glossary spellings.`;
  if (problems.length) {
    console.log(
      `\n✗ ${problems.length} definition(s) differ from skills/meta/GLOSSARY.md. ${summary}`,
    );
    process.exit(1);
  }
  console.log(`✓ ${summary}`);
  console.log(
    "  Not checked: definitions written as sentences, and terms that are never defined.",
  );
}
