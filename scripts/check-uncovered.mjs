#!/usr/bin/env node
/**
 * Every topic a checklist names as an open question is actually in the skill's
 * `## Open questions: ask, do not decide` section.
 *
 * Most checklists end with an item like "Open questions were asked about, not decided: progress,
 * success, and retrying." That list is a summary of the open-questions section, written separately
 * from it, and the two drift: the autocomplete checklist still names clearing as uncovered after
 * the rules decided it. An agent reading that item stops and asks about something the skill has
 * already answered — or, reading the rules, concludes the checklist is stale and trusts neither.
 *
 * This is a heuristic, and it says so. A topic counts as present when at least half its
 * significant words (after trimming plural and -ing endings) appear in one open-question bullet. It
 * catches a topic missing from the section; it cannot tell whether a topic that is present has
 * since been decided somewhere else in the skill. Those are for docs/open-questions.md.
 *
 *   node scripts/check-uncovered.mjs      # exit 1 on any unmatched topic
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listSkills } from "./check-skill-structure.mjs";
import { UNCOVERED_HEADING, sectionBody } from "./lib/skill-sections.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Known and logged as an open item in docs/open-questions.md, keyed `slug: topic`. An entry whose topic now
 * matches fails the check, so this cannot outlive the problem it records.
 */
export const KNOWN = {};

const STOP = new Set(
  "a an the and or of to in on for with that it its is are be by as at from any how what when where which who whether nothing above all more than one two own this there their they you your has have not no".split(
    " ",
  ),
);

export function stem(word) {
  let w = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const suffix of ["ing", "ies", "es", "ed", "s"]) {
    if (w.length > 4 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w.slice(0, 6);
}

/** The significant word stems of a phrase. */
export function significant(text) {
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  return new Set(
    words.filter((w) => w.length > 2 && !STOP.has(w.toLowerCase())).map(stem),
  );
}

/** Topics a checklist line names as uncovered, or `[]` if it names none. */
export function namedTopics(line) {
  // The writing guide's form, "Open questions were asked about, not decided: a, b.", and the two
  // older ones, "…the uncovered list: a, b." and "Uncovered items were asked about, not decided:
  // a, b." Missing a form lets every checklist written in it slip past.
  const m =
    line.match(/uncovered list\s*(?::|—)\s*(.+?)\.?$/) ??
    line.match(
      /(?:Open questions|Uncovered items) were asked about, not decided\s*:\s*(.+?)\.?$/,
    );
  if (!m) return [];
  return m[1]
    .replace(/^above all,\s*/, "")
    .split(/,\s*(?:and\s+|or\s+)?|\s+and\s+(?=[a-z])/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** The bullets of a skill's `## Open questions: ask, do not decide` section, each as a set of stems. */
export function uncoveredBullets(text) {
  const section = sectionBody(text, "uncovered");
  return section
    .split(/\n(?=- )/)
    .filter((b) => b.trim().startsWith("- "))
    .map(significant);
}

/** Topics named in checklists that match no open-question bullet: `[{ line, topic }]`. */
export function checkText(text) {
  const bullets = uncoveredBullets(text);
  const problems = [];
  text.split("\n").forEach((line, i) => {
    if (!/^- \[ \]/.test(line)) return;
    for (const topic of namedTopics(line)) {
      const words = significant(topic);
      const needed = Math.ceil(words.size / 2);
      const best = Math.max(
        0,
        ...bullets.map((b) => [...words].filter((w) => b.has(w)).length),
      );
      if (best < needed) problems.push({ line: i + 1, topic });
    }
  });
  return problems;
}

/** Check every skill. */
export function checkAll({ skills, known = KNOWN } = {}) {
  const problems = [];
  const acknowledged = [];
  const seen = new Set();
  let topics = 0;
  for (const { slug, file } of listSkills(skills)) {
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split("\n"))
      if (/^- \[ \]/.test(line)) topics += namedTopics(line).length;
    for (const p of checkText(text)) {
      const key = `${slug}: ${p.topic}`;
      seen.add(key);
      (known[key] ? acknowledged : problems).push({
        file: path.relative(ROOT, file),
        key,
        ...p,
      });
    }
  }
  for (const key of Object.keys(known)) {
    if (!seen.has(key)) {
      problems.push({
        file: "scripts/check-uncovered.mjs",
        line: 1,
        key,
        topic: key,
        stale: true,
      });
    }
  }
  return { topics, problems, acknowledged };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { topics, problems, acknowledged } = checkAll();
  for (const p of problems) {
    console.log(
      p.stale
        ? `${p.file}  KNOWN lists "${p.key}", which now matches — remove the entry and resolve its item in docs/open-questions.md`
        : `${p.file}:${p.line}  the checklist names "${p.topic}" as an open question, but \`## ${UNCOVERED_HEADING}\` has no bullet about it`,
    );
  }
  for (const p of acknowledged)
    console.log(`  · known, logged in docs/open-questions.md: ${p.key}`);
  if (problems.length) {
    console.log(
      `\n✗ ${problems.length} problem(s) among ${topics} topics named as open questions.`,
    );
    process.exit(1);
  }
  console.log(
    `✓ ${topics} topics named as open questions in checklists; each matches a bullet in \`## ${UNCOVERED_HEADING}\`.`,
  );
}
