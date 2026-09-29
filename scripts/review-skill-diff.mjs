#!/usr/bin/env node
/**
 * Flag the changes in a skill edit that tend to move a rule, not just its wording.
 *
 * A rewrite for clarity can quietly weaken a rule: "must" becomes "should", "never" becomes
 * "rarely", an "only" falls out of a sentence, a checklist item merges into its neighbour, a token
 * name or a number disappears. Each looks like tidying in a diff, which is where they get missed.
 * This compares each changed SKILL.md with its version on a base ref and lists those changes.
 *
 * It warns rather than fails, because a real rule change produces exactly the same signals — the
 * point is that a reviewer looks at each one on purpose. `--strict` makes it fail, for a change
 * that is meant to be wording only. It was written for the readability rewrite of every skill,
 * where it found drops a whole-file count had hidden: a "must" lost in one section and gained in
 * another nets to zero, which is why rule words are counted per section too.
 *
 *   node scripts/review-skill-diff.mjs                    # against main
 *   node scripts/review-skill-diff.mjs --base origin/main --strict
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Words whose loss changes what a rule requires. Contractions are expanded before counting. */
export const RULE_WORDS = [
  "never",
  "must",
  "always",
  "exactly",
  "only",
  "cannot",
  "do not",
  "does not",
];
/** Of those, the ones whose addition can strengthen a rule — worth a look, not a warning. */
const STRENGTHENING = new Set(["never", "must", "always", "exactly"]);

const frontmatter = (t) => t.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? "";
const fences = (t) => t.match(/```[\s\S]*?```/g) ?? [];
const prose = (t) =>
  t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/```[\s\S]*?```/g, "");
const headings = (t) =>
  prose(t)
    .split("\n")
    .filter((l) => /^#{1,6} /.test(l))
    .map((l) => l.trimEnd());
const section = (t, name) =>
  t.split(new RegExp(`^## ${name}\\s*$`, "m"))[1]?.split(/^## /m)[0] ?? "";
const checklistItems = (t) =>
  (section(t, "Pre-flight checklist").match(/^- \[ \]/gm) ?? []).length;
const tableRows = (t) =>
  prose(t)
    .split("\n")
    .filter((l) => /^\s*\|/.test(l)).length;
const set = (arr) => new Set(arr);
const codeSpans = (t) =>
  set([...prose(t).matchAll(/`([^`\n]+)`/g)].map((m) => m[1]));
const links = (t) =>
  set([...prose(t).matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]));
const skillRefs = (t) =>
  set(t.match(/recursica-skill-[a-z0-9-]*[a-z0-9]/g) ?? []);
const numbers = (t) => {
  const p = prose(t)
    .replace(/`[^`\n]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]");
  return set(
    p.match(/(?<![\w.])\d+(?:\.\d+)?(?:px|%|ms|s|rem|em|x)?(?!\w)/g) ?? [],
  );
};

/** Rule-word counts for a piece of prose. */
export function ruleWords(text) {
  const p = text
    .replace(/`[^`\n]*`/g, "")
    .toLowerCase()
    .replace(/don['’]t/g, "do not")
    .replace(/doesn['’]t/g, "does not")
    .replace(/can['’]t/g, "cannot")
    .replace(/won['’]t/g, "will not")
    .replace(/isn['’]t/g, "is not")
    .replace(/aren['’]t/g, "are not");
  return Object.fromEntries(
    RULE_WORDS.map((w) => [
      w,
      (p.match(new RegExp(`\\b${w}\\b`, "g")) ?? []).length,
    ]),
  );
}

/** `## ` sections of a skill's prose, keyed by heading. The text before the first is "(intro)". */
function sections(text) {
  const out = {};
  for (const part of prose(text).split(/^(?=## )/m)) {
    if (!part.trim()) continue;
    const head = part.startsWith("## ")
      ? part.split("\n")[0].trim()
      : "(intro)";
    out[head] = (out[head] ?? "") + part;
  }
  return out;
}

/** Everything worth a reviewer's look in one skill's change: `{ level, message }[]`. */
export function review(before, after) {
  const notes = [];
  const note = (level, message) => notes.push({ level, message });
  if (frontmatter(before) !== frontmatter(after))
    note(
      "warn",
      "frontmatter changed — the description decides when the skill loads",
    );
  const ha = headings(before);
  const hb = headings(after);
  if (ha.join("\n") !== hb.join("\n")) {
    const gone = ha.filter((h) => !hb.includes(h));
    const added = hb.filter((h) => !ha.includes(h));
    note(
      "warn",
      gone.length || added.length
        ? `headings changed — removed ${JSON.stringify(gone)}, added ${JSON.stringify(added)}`
        : "headings reordered",
    );
  }
  if (checklistItems(before) !== checklistItems(after))
    note(
      "warn",
      `checklist items ${checklistItems(before)} → ${checklistItems(after)}`,
    );
  if (fences(before).join() !== fences(after).join())
    note("warn", "a fenced code block changed");
  for (const [name, get] of [
    ["code span", codeSpans],
    ["link", links],
    ["number", numbers],
    ["skill reference", skillRefs],
  ]) {
    const b = get(after);
    const lost = [...get(before)].filter((x) => !b.has(x)).sort();
    if (lost.length)
      note(
        "warn",
        `${name}${lost.length > 1 ? "s" : ""} removed: ${lost
          .slice(0, 8)
          .map((x) => JSON.stringify(x))
          .join(", ")}${lost.length > 8 ? " …" : ""}`,
      );
  }
  if (tableRows(before) !== tableRows(after))
    note("warn", `table rows ${tableRows(before)} → ${tableRows(after)}`);

  const sa = sections(before);
  const sb = sections(after);
  const ta = ruleWords(prose(before));
  const tb = ruleWords(prose(after));
  for (const w of RULE_WORDS) {
    const drops = Object.keys(sa)
      .map((h) => [h, ruleWords(sa[h])[w], sb[h] ? ruleWords(sb[h])[w] : 0])
      .filter(([, x, y]) => y < x);
    if (tb[w] < ta[w] || drops.length) {
      const where = drops.map(([h, x, y]) => `${h} ${x}→${y}`).join("; ");
      note(
        "warn",
        `"${w}" ${tb[w] < ta[w] ? `dropped ${ta[w]} → ${tb[w]}` : "moved between sections"}${where ? ` — ${where}` : ""}`,
      );
    } else if (tb[w] > ta[w] && STRENGTHENING.has(w)) {
      note(
        "info",
        `"${w}" added ${ta[w]} → ${tb[w]} — check it does not strengthen a rule`,
      );
    }
  }
  return notes;
}

const git = (...args) =>
  execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });

/** Changed skills between `base` and the working tree, each with its notes. */
export function reviewChanges(base = "main") {
  const changed = git(
    "diff",
    "--name-only",
    "--diff-filter=MD",
    base,
    "--",
    "skills",
  )
    .split("\n")
    .filter((f) => f.endsWith("/SKILL.md"));
  return changed.map((file) => {
    const before = git("show", `${base}:${file}`);
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs))
      return { file, notes: [{ level: "warn", message: "skill deleted" }] };
    return { file, notes: review(before, fs.readFileSync(abs, "utf8")) };
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const base = args.includes("--base")
    ? args[args.indexOf("--base") + 1]
    : "main";
  const strict = args.includes("--strict");
  const results = reviewChanges(base);
  const annotate = !!process.env.GITHUB_ACTIONS;
  let warnings = 0;
  for (const { file, notes } of results) {
    if (!notes.length) continue;
    console.log(file);
    for (const n of notes) {
      if (n.level === "warn") warnings++;
      console.log(`    ${n.level === "warn" ? "!" : "·"} ${n.message}`);
      if (annotate && n.level === "warn")
        console.log(
          `::warning file=${file},title=Skill rule change?::${n.message}`,
        );
    }
  }
  const summary = `${results.length} changed skill(s) against ${base}, ${warnings} change(s) to look at.`;
  if (warnings && strict) {
    console.log(`\n✗ ${summary} --strict: every one must be intended.`);
    process.exit(1);
  }
  console.log(
    `\n${warnings ? "!" : "✓"} ${summary}${warnings ? " Each may be a real rule change; look at them on purpose." : ""}`,
  );
}
