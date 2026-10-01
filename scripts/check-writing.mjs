#!/usr/bin/env node
/**
 * The parts of WRITING.md a script can check.
 *
 *   spelling   American English: no British spellings, in any file this covers
 *   you        no "you" or "your" in skills and agent instructions, apart from an agent's
 *              identity line ("You are Betty, …"), code and quoted text
 *   phrase     none of the vague phrases WRITING.md lists under rule 3
 *
 * Code, inline code and text in double quotes are skipped: they quote an interface, a value or
 * a bad example, and keep their own words. WRITING.md itself is skipped, because it has to quote
 * every pattern it forbids.
 *
 * KNOWN lists files that still break a rule, with the rule. It exists so the guide and its check
 * can land before every file is rewritten. An entry fails once its file is clean, so the list
 * only shrinks — the same convention as check-uncovered.mjs.
 *
 * Exit: 0 clean, 1 a problem.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** British form → American form. Matched as word stems, so "colours" and "behavioural" are caught. */
export const BRITISH = {
  colour: "color",
  behaviour: "behavior",
  honour: "honor",
  favour: "favor",
  flavour: "flavor",
  labour: "labor",
  neighbour: "neighbor",
  centre: "center",
  centred: "centered",
  licence: "license",
  defence: "defense",
  offence: "offense",
  catalogue: "catalog",
  analyse: "analyze",
  analysing: "analyzing",
  grey: "gray",
  judgement: "judgment",
  acknowledgement: "acknowledgment",
  whilst: "while",
  amongst: "among",
  learnt: "learned",
  towards: "toward",
  artefact: "artifact",
  programme: "program",
  labelled: "labeled",
  labelling: "labeling",
  unlabelled: "unlabeled",
  mislabelled: "mislabeled",
  cancelled: "canceled",
  cancelling: "canceling",
  modelled: "modeled",
  modelling: "modeling",
  travelled: "traveled",
  signalled: "signaled",
  signalling: "signaling",
  focussed: "focused",
};

/** -ise and -isation verbs; the words that end that way in American English are excluded. */
const ISE = /\b([a-z]+)(is(?:e|es|ed|ing)|isations?|isable)\b/gi;
const ISE_STEMS = new Set([
  "apolog",
  "author",
  "capital",
  "categor",
  "central",
  "critic",
  "custom",
  "editorial",
  "emphas",
  "familiar",
  "final",
  "general",
  "global",
  "harmon",
  "initial",
  "local",
  "maxim",
  "memor",
  "minim",
  "minimal",
  "modern",
  "normal",
  "optim",
  "organ",
  "personal",
  "priorit",
  "rational",
  "real",
  "recogn",
  "sanit",
  "serial",
  "special",
  "stabil",
  "standard",
  "summar",
  "symbol",
  "synchron",
  "token",
  "util",
  "visual",
]);

export const PHRASES = [
  /how something works/i,
  /what the shape means/i,
  /\ba way of\b/i,
  /\bthe thing\b/i,
  /\breads (as|like)\b/i,
  /\b(earns?|earned|earning)\b/i,
  /\bshape of (the|its) data\b|\bdata's shape\b/i,
];

const YOU =
  /\b(you|your|yours|yourself|yourselves|you're|you've|you'll|you'd)\b/gi;

/** Prose only: no front-matter keys other than description, no code, no quoted text. */
export function prose(text) {
  return text
    .replace(/<!--\s*platform:[a-z0-9-]+\s*-->/g, "")
    .replace(/^## [a-z0-9-]+$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/"[^"\n]*"/g, "")
    .replace(/“[^”\n]*”/g, "");
}

export function britishWords(text) {
  const found = [];
  const t = prose(text);
  // Longest form first, and one report per position, so "centred" is not also a "centre".
  const taken = new Set();
  for (const [uk, us] of Object.entries(BRITISH).sort(
    (x, y) => y[0].length - x[0].length,
  )) {
    const rx = new RegExp(`\\b${uk}`, "gi");
    for (const m of t.matchAll(rx)) {
      if (taken.has(m.index)) continue;
      taken.add(m.index);
      found.push(`${m[0]} → ${us}`);
    }
  }
  for (const m of t.matchAll(ISE)) {
    if (ISE_STEMS.has(m[1].toLowerCase()))
      found.push(`${m[0]} → ${m[1]}${m[2].replace(/is/, "iz")}`);
  }
  return found;
}

/**
 * An agent's identity line is allowed: "You are <Name>", or the first "You are" that starts a
 * line ("You are one checker in a Recursica design review").
 */
export function youCount(text) {
  const t = prose(text)
    .replace(/(^|[.!?]\s+|\n)You are [A-Z][a-z]+\b/g, "$1")
    .replace(/(^|\n)You are\b/, "$1");
  return [...t.matchAll(YOU)].length;
}

export function phrasesFound(text) {
  const t = prose(text);
  return PHRASES.filter((p) => p.test(t)).map((p) => p.source);
}

function list(dir, pattern) {
  const out = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (pattern.test(path.relative(ROOT, p)))
        out.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, dir));
  return out.sort();
}

export function files() {
  const top = ["AGENT.md", "README.md", "CONTRIBUTING.md", "llms.txt"].filter(
    (f) => fs.existsSync(path.join(ROOT, f)),
  );
  return [
    ...list("skills", /^skills\/.+\.md$/),
    ...list(
      "agents",
      /^agents\/[^/]+\/(SKILL\.md|PORTING\.md|platform\/.+\.md|subagents\/[^/]+\/(SKILL\.md|platform\/.+\.md))$/,
    ),
    ...list("docs", /^docs\/CONTRIBUTING_[^/]+\.md$/),
    ...top,
  ];
}

/** Which rules "you" applies to: the knowledge and the agents, not the repo's own docs yet. */
const youApplies = (f) => f.startsWith("skills/") || f.startsWith("agents/");

/** `<file>: <rule>` → why it is still open. */
export const KNOWN = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts", "fixtures", "writing-known.json"),
    "utf8",
  ),
);

export function problemsIn(f, text) {
  const out = [];
  const uk = britishWords(text);
  if (uk.length)
    out.push({ rule: "spelling", detail: [...new Set(uk)].join(", ") });
  if (youApplies(f)) {
    const n = youCount(text);
    if (n) out.push({ rule: "you", detail: `${n} use(s) of "you" or "your"` });
  }
  const ph = phrasesFound(text);
  if (ph.length) out.push({ rule: "phrase", detail: ph.join(", ") });
  return out;
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const failures = [];
  const seen = new Set();
  let known = 0;
  for (const f of files()) {
    for (const p of problemsIn(
      f,
      fs.readFileSync(path.join(ROOT, f), "utf8"),
    )) {
      const key = `${f}: ${p.rule}`;
      seen.add(key);
      if (KNOWN[key]) known++;
      else failures.push(`${f}  ${p.rule}: ${p.detail}`);
    }
  }
  for (const key of Object.keys(KNOWN)) {
    if (!seen.has(key))
      failures.push(
        `${key}  is clean now — remove it from scripts/fixtures/writing-known.json`,
      );
  }
  if (known)
    console.log(
      `  · ${known} known file-and-rule pair(s) waiting on a rewrite (scripts/fixtures/writing-known.json)`,
    );
  if (failures.length) {
    for (const f of failures) console.log(f);
    console.log(`\n✗ ${failures.length} writing problem(s). See WRITING.md.`);
    process.exit(1);
  }
  console.log(
    `✓ ${files().length} files follow the checked rules in WRITING.md.`,
  );
}
