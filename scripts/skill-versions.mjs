#!/usr/bin/env node
/**
 * Versions each skill by how much the skill changed.
 *
 * Changesets versions the package, `@recursica/knowledge`, and nothing below it: no skill has a
 * package.json, so the `version` in each SKILL.md stayed at 0.1.0 while the rules changed under
 * it. This script fills that gap in three steps.
 *
 *   propose  On a branch. Compares every changed SKILL.md with the base branch, decides a bump
 *            for each, and writes `.changeset/skill-bumps-<branch>.json`. A person reads the file
 *            and changes any bump the script got wrong. Running propose again keeps those edits.
 *   check    In CI. Fails when a changed skill has no bump in any skill-bumps file.
 *   apply    At release, after `changeset version`. Takes the largest bump for each skill across
 *            every skill-bumps file, writes the new version into the skill's frontmatter, and
 *            deletes the files, the same way changesets deletes its own.
 *
 * The bump is a judgment from signals, not a proof. It reads the same signals as
 * review-skill-diff.mjs, which is why a person reviews the file:
 *
 *   major  The skill was renamed, a checklist item was removed, or the skill holds fewer rule
 *          words ("must", "never", "only" and the rest) than before. Each can mean a rule was
 *          removed or weakened.
 *   minor  A checklist item was added, the description changed (the description decides when
 *          the skill loads), a heading or a table row was added or removed, or a rule word moved
 *          or was added. Each can mean a rule was added or changed.
 *   patch  Any other change: wording, examples, typos.
 *
 * Usage:
 *   node scripts/skill-versions.mjs propose [--base origin/main] [--name <name>]
 *   node scripts/skill-versions.mjs check [--base origin/main]
 *   node scripts/skill-versions.mjs apply
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RULE_WORDS, review, ruleWords } from "./review-skill-diff.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANGESET_DIR = path.join(ROOT, ".changeset");
const BUMPS = ["patch", "minor", "major"];
const NOTE =
  "Each changed skill and the version bump it gets at the next release. The script chose each " +
  "bump from the change; change any bump that is wrong. Running propose again keeps your edits.";

const git = (...args) =>
  execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });

const slugOf = (file) => path.basename(path.dirname(file));
const prose = (t) => t.replace(/^---\n[\s\S]*?\n---\n/, "");
const description = (t) =>
  t.match(/^---\n[\s\S]*?^description:\s*(.*)$/m)?.[1] ?? "";
const checklist = (t) =>
  (
    (t.split(/^## Pre-flight checklist\s*$/m)[1] ?? "")
      .split(/^## /m)[0]
      .match(/^- \[ \]/gm) ?? []
  ).length;
const ruleTotal = (t) =>
  Object.values(ruleWords(prose(t).replace(/^#{1,6} .*$/gm, ""))).reduce(
    (a, b) => a + b,
    0,
  );

/** The bump one skill's change calls for: `{ bump, why }`, or null for no change. */
export function classify(before, after) {
  // A change to the version line alone is this script's own release edit, not a skill change.
  const unversioned = (t) => t.replace(/^(\s+version:\s*)\S+/m, "$1");
  if (unversioned(before) === unversioned(after)) return null;
  const items = [checklist(before), checklist(after)];
  if (items[1] < items[0])
    return { bump: "major", why: `checklist items ${items[0]} → ${items[1]}` };
  const words = [ruleTotal(before), ruleTotal(after)];
  if (words[1] < words[0])
    return {
      bump: "major",
      why: `rule words ${words[0]} → ${words[1]} (${RULE_WORDS.join(", ")})`,
    };
  if (items[1] > items[0])
    return { bump: "minor", why: `checklist items ${items[0]} → ${items[1]}` };
  if (description(before) !== description(after))
    return { bump: "minor", why: "description changed" };
  const signal = review(before, after).find(
    (n) =>
      /^headings |^table rows |^"[a-z ]+" (moved|added)/.test(n.message) &&
      !/headings reordered/.test(n.message),
  );
  if (signal) return { bump: "minor", why: signal.message };
  return { bump: "patch", why: "wording only" };
}

const words = (t) =>
  new Set(
    prose(t)
      .toLowerCase()
      .match(/[a-z]{4,}/g) ?? [],
  );
const overlap = (a, b) => {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
};
/**
 * The share of words two versions of a skill have in common, at or above which an added skill is
 * taken as a renamed one. Git's own rename detection compares lines, and a skill renamed and
 * rewritten in the same release shares few lines with the old file: in v0.9.0 git found two of
 * five renames. Measured on those five, a renamed skill shared 75 to 82 percent of its words with
 * the old skill, and the new undo skill shared at most 15 percent with any removed skill.
 */
export const RENAME_OVERLAP = 0.5;

/** Every skill changed between `base` and the working tree, with its proposed bump. */
export function changedSkills(base) {
  const out = {};
  const added = [];
  const deleted = [];
  const lines = git(
    "diff",
    "--no-renames",
    "--name-status",
    base,
    "--",
    "skills",
  )
    .split("\n")
    .filter(Boolean);
  for (const line of lines) {
    const [status, file] = line.split("\t");
    if (!file.endsWith("/SKILL.md")) continue;
    if (status === "A") added.push(file);
    else if (status === "D") deleted.push(file);
    else if (status === "M") {
      const before = git("show", `${base}:${file}`);
      const after = fs.readFileSync(path.join(ROOT, file), "utf8");
      const result = classify(before, after);
      if (result) out[slugOf(file)] = result;
    }
  }
  // Pair each added skill with the removed skill it most resembles. A pair is a rename, and a
  // rename breaks anything that loads the skill by name. An unpaired added skill is new, and
  // keeps the version it was written with.
  const removed = deleted.map((file) => ({
    file,
    words: words(git("show", `${base}:${file}`)),
  }));
  const pairs = added
    .flatMap((file) => {
      const w = words(fs.readFileSync(path.join(ROOT, file), "utf8"));
      return removed.map((r) => ({
        file,
        from: r.file,
        score: overlap(w, r.words),
      }));
    })
    .filter((p) => p.score >= RENAME_OVERLAP)
    .sort((a, b) => b.score - a.score);
  const used = new Set();
  for (const { file, from } of pairs) {
    if (used.has(file) || used.has(from)) continue;
    used.add(file).add(from);
    out[slugOf(file)] = { bump: "major", why: `renamed from ${slugOf(from)}` };
  }
  return out;
}

const bumpFiles = () =>
  fs.existsSync(CHANGESET_DIR)
    ? fs
        .readdirSync(CHANGESET_DIR)
        .filter((f) => /^skill-bumps-.*\.json$/.test(f))
        .map((f) => path.join(CHANGESET_DIR, f))
    : [];

const readBumps = (file) => {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const { $note, ...skills } = data;
  for (const [slug, entry] of Object.entries(skills)) {
    if (!BUMPS.includes(entry?.bump))
      throw new Error(
        `${path.relative(ROOT, file)}: ${slug} has bump "${entry?.bump}". Use patch, minor or major.`,
      );
  }
  return skills;
};

const branchName = () =>
  git("rev-parse", "--abbrev-ref", "HEAD")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

/** Writes the proposal file. Keeps a bump a person already edited; drops skills no longer changed. */
export function propose(base, name = branchName()) {
  const file = path.join(CHANGESET_DIR, `skill-bumps-${name}.json`);
  const existing = fs.existsSync(file) ? readBumps(file) : {};
  const proposed = changedSkills(base);
  const skills = {};
  for (const slug of Object.keys(proposed).sort()) {
    skills[slug] = existing[slug] ?? proposed[slug];
  }
  if (!Object.keys(skills).length) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return { file, skills };
  }
  fs.writeFileSync(
    file,
    JSON.stringify({ $note: NOTE, ...skills }, null, 2) + "\n",
  );
  return { file, skills };
}

/** Changed skills that no skill-bumps file covers. */
export function missing(base) {
  const covered = new Set(
    bumpFiles().flatMap((f) => Object.keys(readBumps(f))),
  );
  return Object.keys(changedSkills(base)).filter((s) => !covered.has(s));
}

const nextVersion = (version, bump) => {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

function locate(slug) {
  for (const category of fs.readdirSync(path.join(ROOT, "skills"))) {
    const file = path.join(ROOT, "skills", category, slug, "SKILL.md");
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/** Applies the largest bump for each skill across every file, then deletes the files. */
export function apply() {
  const files = bumpFiles();
  const largest = {};
  for (const file of files) {
    for (const [slug, { bump }] of Object.entries(readBumps(file))) {
      if (!largest[slug] || BUMPS.indexOf(bump) > BUMPS.indexOf(largest[slug]))
        largest[slug] = bump;
    }
  }
  const applied = [];
  for (const [slug, bump] of Object.entries(largest).sort()) {
    const file = locate(slug);
    if (!file) continue; // removed again after the bump was recorded
    const text = fs.readFileSync(file, "utf8");
    const current = text.match(/^---\n[\s\S]*?^\s+version:\s*(\S+)/m)?.[1];
    if (!current) throw new Error(`${slug}: no version in the frontmatter`);
    const next = nextVersion(current, bump);
    fs.writeFileSync(
      file,
      text.replace(
        /^(---\n[\s\S]*?^\s+version:\s*)\S+/m,
        (_, head) => head + next,
      ),
    );
    applied.push({ slug, bump, from: current, to: next });
  }
  for (const file of files) fs.unlinkSync(file);
  return applied;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, ...args] = process.argv.slice(2);
  const opt = (flag, fallback) =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
  const base = opt("--base", "origin/main");

  if (command === "propose") {
    const { file, skills } = propose(base, opt("--name"));
    const rel = path.relative(ROOT, file);
    if (!Object.keys(skills).length) {
      console.log(`✓ No skill changed against ${base}. No ${rel} needed.`);
    } else {
      for (const [slug, { bump, why }] of Object.entries(skills))
        console.log(`  ${bump.padEnd(5)}  ${slug}  (${why})`);
      console.log(
        `\n✓ Wrote ${rel}. Read each bump, change any that is wrong, and commit the file.`,
      );
    }
  } else if (command === "check") {
    const gaps = missing(base);
    if (gaps.length) {
      console.log(
        `✗ ${gaps.length} changed skill(s) have no version bump: ${gaps.join(", ")}.\n` +
          "  Run `npm run skills:versions` and commit the skill-bumps file it writes.",
      );
      process.exit(1);
    }
    console.log(`✓ Every skill changed against ${base} has a version bump.`);
  } else if (command === "apply") {
    const applied = apply();
    for (const { slug, bump, from, to } of applied)
      console.log(`  ${slug}  ${from} → ${to}  (${bump})`);
    console.log(`✓ ${applied.length} skill version(s) updated.`);
  } else {
    console.log(
      "Usage: node scripts/skill-versions.mjs propose|check|apply [--base origin/main] [--name <name>]",
    );
    process.exit(2);
  }
}
