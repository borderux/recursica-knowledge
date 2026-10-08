#!/usr/bin/env node
/**
 * The parts of WRITING.md a script can check.
 *
 *   spelling   American English: no British spellings, in any file this covers
 *   you        no "you" or "your" in skills and agent instructions, apart from an agent's
 *              identity line ("You are Betty, …"), code and quoted text
 *   phrase     none of the vague phrases WRITING.md lists under rule 5, nor "on its own" or "its own way"
 *   words      in a skill: no "whatever", "axis", "React" or "prop" (rule 4)
 *   grade      a Flesch-Kincaid grade below 10 (a 9th-grade reading level) in skills and agent
 *              instructions
 *   length     no sentence longer than 20 words in skills and agent instructions, table cells
 *              included, glossary definitions and the open-questions checklist line left out.
 *              `node scripts/check-writing.mjs --long <file>…` lists each long sentence.
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
import { GLOSSARY, parseGlossary } from "./check-glossary.mjs";

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
  /\bon its own\b/i,
  /\bits own way\b/i,
];

/**
 * Words a skill never uses (WRITING.md rule 4): a vague stand-in, an insider word a designer would
 * not say, and code names that tie a skill to one language. The chart skill's axes are chart axes.
 */
export const SKILL_WORDS = [
  { re: /\bwhatever\b/i, label: "whatever" },
  {
    re: /\b(axis|axes)\b/i,
    label: "axis",
    except: /recursica-skill-data-visualization/,
  },
  { re: /\bReact\b/, label: "React" },
  { re: /\bprops?\b/i, label: "prop" },
];

export function skillWordsFound(file, text) {
  const t = prose(text);
  return SKILL_WORDS.filter(
    (w) => !(w.except && w.except.test(file)) && w.re.test(t),
  ).map((w) => w.label);
}

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

/** Rough syllable count, the usual vowel-group estimate. */
function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/**
 * The sentences of the prose. Front matter, headings, code and quoted text are left out, and so
 * are tables unless `tables` is set, which adds each table cell as its own line. Every line
 * counts as the end of a sentence, so a list item without a full stop is not merged into the
 * next one.
 */
export function sentences(text, { tables = false } = {}) {
  const lines = prose(text.replace(/^---\n[\s\S]*?\n---\n/, ""))
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((l) => l.trim())
    .flatMap((l) =>
      tables && l.startsWith("|")
        ? /^\|[\s:|-]+\|$/.test(l)
          ? []
          : l.split(/(?<!\\)\|/).map((c) => c.trim())
        : [l],
    )
    .filter((l) => l && !/^(#|\||<)/.test(l))
    .map((l) =>
      l
        .replace(/^(?:[-*]\s+(?:\[[ x]\]\s+)?|\d+\.\s+)/, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[*_]/g, ""),
    )
    .map((l) => (/[.!?]$/.test(l) ? l : `${l.replace(/[:;]$/, "")}.`));
  return lines
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const wordsOf = (s) => s.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];

/**
 * Flesch-Kincaid grade of the prose, tables left out. Sentences of one or two words are left
 * out, so short labels do not pull the grade down.
 */
export function readingGrade(text) {
  const kept = sentences(text)
    .map(wordsOf)
    .filter((words) => words.length > 2);
  const words = kept.flat();
  if (!words.length) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return (
    0.39 * (words.length / kept.length) + 11.8 * (syl / words.length) - 15.59
  );
}

export const SENTENCE_LIMIT = 20;

let definitions;
/** The glossary's definitions. A skill must copy each one word for word, so none is counted. */
function glossaryDefinitions() {
  definitions ??= new Set(
    [...parseGlossary(fs.readFileSync(GLOSSARY, "utf8")).values()].flat(),
  );
  return definitions;
}

/**
 * Every sentence longer than the limit, table cells included, with its word count. Two kinds of
 * fixed wording are not counted: a glossary definition in brackets, and the checklist line that
 * lists the open questions, which check-uncovered.mjs reads as one line.
 */
export function longSentences(text) {
  const defs = glossaryDefinitions();
  const counted = text
    .replace(/\s\(([^()]*)\)/g, (m, inner) =>
      defs.has(
        inner
          .replace(/\s+/g, " ")
          .trim()
          .replace(/[.;,:]$/, ""),
      )
        ? ""
        : m,
    )
    .replace(
      /^.*(?:Open questions|Uncovered items) were asked about, not decided\s*:.*$/gm,
      "",
    );
  return sentences(counted, { tables: true })
    .map((s) => ({ sentence: s, words: wordsOf(s).length }))
    .filter((s) => s.words > SENTENCE_LIMIT);
}

export const GRADE_LIMIT = 10;

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
    ...handWrittenBuzzPrompts(),
    ...list("docs", /^docs\/CONTRIBUTING_[^/]+\.md$/),
    ...top,
  ];
}

/**
 * A Buzz prompt with no source under agents/ is written by hand, so it is checked directly. A
 * prompt built from agents/<name>/ follows its source.
 */
function handWrittenBuzzPrompts() {
  return list(
    "buzz-agents/agents",
    /^buzz-agents\/agents\/[^/]+\/SYSTEM_PROMPT\.md$/,
  ).filter((f) => !fs.existsSync(path.join(ROOT, "agents", f.split("/")[2])));
}

/** Which rules "you" and the grade apply to: the knowledge and the agents, not the repo's docs. */
const youApplies = (f) =>
  f.startsWith("skills/") ||
  f.startsWith("agents/") ||
  f.startsWith("buzz-agents/agents/");

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
  if (f.startsWith("skills/")) {
    const w = skillWordsFound(f, text);
    if (w.length) out.push({ rule: "words", detail: w.join(", ") });
  }
  if (youApplies(f)) {
    const n = longSentences(text).length;
    if (n)
      out.push({
        rule: "length",
        detail: `${n} sentence(s) over ${SENTENCE_LIMIT} words`,
      });
  }
  if (youApplies(f)) {
    const g = readingGrade(text);
    if (g >= GRADE_LIMIT)
      out.push({
        rule: "grade",
        detail: `reading grade ${g.toFixed(1)}, above 9th grade`,
      });
  }
  return out;
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly && process.argv[2] === "--long") {
  for (const f of process.argv.slice(3)) {
    for (const s of longSentences(fs.readFileSync(f, "utf8")))
      console.log(`${f}  ${s.words} words: ${s.sentence}`);
  }
} else if (invokedDirectly) {
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
