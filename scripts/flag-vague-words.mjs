#!/usr/bin/env node
/**
 * Flags pronouns and vague words for a person to review (WRITING.md rule 3).
 *
 * The writing check cannot tell a clear pronoun from a vague one, so this script does not fail.
 * It lists each sentence a change adds that holds "it", "they", "these", "something" and the like,
 * and a person decides whether the reader could ask "which one?". In CI each flag is a warning on
 * the changed line of the pull request.
 *
 * Only added and changed lines are read, so a review sees what the change wrote, not the whole
 * file. `--all` reads whole files instead.
 *
 * Each run also writes the report to `.reports/vague-words.txt`, which git ignores. A report is
 * a working note for the person or agent fixing the text, never part of the repository.
 *
 *   node scripts/flag-vague-words.mjs                 # lines added since main
 *   node scripts/flag-vague-words.mjs --base origin/main
 *   node scripts/flag-vague-words.mjs --all skills/components/recursica-skill-button/SKILL.md
 *   node scripts/flag-vague-words.mjs --strict        # exit 1 when anything is flagged
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { files, prose } from "./check-writing.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Personal pronouns: always worth a look. */
const PRONOUN = /\b(it|its|it's|they|them|their|theirs)\b/gi;

/**
 * "This", "that", "these" and "those" standing alone as a pronoun: at the start of a sentence or
 * clause and followed by a verb or by punctuation, or last before a full stop ("Do not change
 * that."). "That" after a noun ("a label that does not change") is a relative pronoun with its noun
 * right beside it, so it is left alone.
 */
const DEMONSTRATIVE =
  /(?:^|[.;:!?(—–]\s*|\b(?:and|but|or|so|because|if|when|while|since|of|for|with|to|in|on|from|by)\s+)(this|that|these|those)\b(?=\s+(?:is|are|was|were|means|does|do|did|has|have|can|cannot|will|would|should|must|may|might|makes|gives|keeps|lets|covers|holds|says|shows|happens|applies|works|needs)\b|\s*[.,;:)!?]|\s*$)|\b(this|that|these|those)(?=\s*[.;:)!?])/gi;

/** Words that stand in for a specific noun. */
const VAGUE =
  /\b(something|somewhere|anything|anywhere|everything|stuff|things?|the rest|whatever|somehow|etc\.?)\b/gi;

/** The flagged words in one sentence, lowercased and in order of appearance. */
export function flagsIn(sentence) {
  const found = [];
  for (const re of [PRONOUN, DEMONSTRATIVE, VAGUE]) {
    for (const m of sentence.matchAll(re)) {
      const word = (m[1] ?? m[2] ?? m[0]).toLowerCase();
      found.push({ at: m.index + m[0].toLowerCase().lastIndexOf(word), word });
    }
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.word);
}

/** Files this applies to: the skills and the agent instructions. */
const covered = () =>
  new Set(
    files().filter((f) => /^(skills|agents|buzz-agents\/agents)\//.test(f)),
  );

/** `{ file, line, text }` for every line added since `base`, in covered files. */
function addedLines(base) {
  const want = covered();
  const diff = execFileSync(
    "git",
    ["diff", "-U0", "--no-color", base, "--", ...want],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const out = [];
  let file = null;
  let line = 0;
  for (const l of diff.split("\n")) {
    if (l.startsWith("+++ ")) {
      file = l.startsWith("+++ b/") ? l.slice(6) : null;
      continue;
    }
    const hunk = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (!file || !want.has(file)) continue;
    if (l.startsWith("+")) out.push({ file, line: line++, text: l.slice(1) });
  }
  return out;
}

/** `{ file, line, text }` for every line of the given files. */
function allLines(paths) {
  return paths.flatMap((file) =>
    fs
      .readFileSync(path.join(ROOT, file), "utf8")
      .split("\n")
      .map((text, i) => ({ file, line: i + 1, text })),
  );
}

/** Flags for a set of lines: `{ file, line, words, sentence }`. Code and quotes are skipped. */
export function flagLines(lines) {
  const out = [];
  let fenced = false;
  for (const { file, line, text } of lines) {
    if (/^\s*```/.test(text)) {
      fenced = !fenced;
      continue;
    }
    if (
      fenced ||
      /^\s*(---|name:|license:|metadata:|author:|version:|<!--)/.test(text)
    )
      continue;
    for (const sentence of prose(text).split(/(?<=[.!?])\s+/)) {
      const words = flagsIn(sentence);
      if (words.length)
        out.push({ file, line, words, sentence: sentence.trim() });
    }
  }
  return out;
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const base = args.includes("--base")
    ? args[args.indexOf("--base") + 1]
    : "main";
  const lines = args.includes("--all")
    ? allLines(args.filter((a) => !a.startsWith("--")))
    : addedLines(base);
  const flags = flagLines(lines);
  const annotate = !!process.env.GITHUB_ACTIONS;
  const report = [];
  for (const f of flags) {
    const short =
      f.sentence.length > 160 ? `${f.sentence.slice(0, 157)}…` : f.sentence;
    console.log(`${f.file}:${f.line}  ${f.words.join(", ")}  — ${short}`);
    report.push(`${f.file}:${f.line}  ${f.words.join(", ")}  — ${f.sentence}`);
    if (annotate)
      console.log(
        `::warning file=${f.file},line=${f.line},title=Which one?::"${f.words.join('", "')}" — could a reader ask which one? Name the noun if so (WRITING.md rule 3).`,
      );
  }
  const where = args.includes("--all")
    ? "the given files"
    : `lines added since ${base}`;
  const out = path.join(ROOT, ".reports", "vague-words.txt");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, report.join("\n") + (report.length ? "\n" : ""));
  if (!flags.length) {
    console.log(`✓ No pronouns or vague words in ${where}.`);
  } else {
    console.log(
      `\n! ${flags.length} sentence(s) in ${where} to read for "which one?". Each is a question for a person, not a failure.`,
    );
    if (strict) process.exit(1);
  }
}
