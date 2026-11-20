#!/usr/bin/env node
/**
 * Fails a pull request that changes an agent's files without raising the agent's version.
 *
 * An agent is everything in `agents/<name>/`: SKILL.md, platform/, runtime/, subagents/ and
 * PORTING.md. Its version is `metadata.version` in `agents/<name>/SKILL.md`. Each place an agent
 * runs keeps its own copy, so the version is how anyone can tell which rules a running agent has.
 * Loki's rules changed in one pull request while the version stayed at 0.2.0.
 *
 * Unlike a skill's version, an agent's version is raised by hand in the pull request that makes
 * the change. Nothing releases agents, so no later step could raise it:
 *
 *   patch  wording only: the agent does the same things
 *   minor  a new behavior, tool, question or file the agent reads
 *   major  a behavior removed or narrowed, a tool taken away, or the agent renamed
 *
 * A new agent keeps the version it was written with. A removed agent needs no version.
 *
 * Usage:
 *   node scripts/agent-versions.mjs check [--base origin/main]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The agent names whose files the given repository paths touch. */
export function agentsIn(files) {
  const names = new Set();
  for (const file of files) {
    const m = /^agents\/([^/]+)\/./.exec(file);
    if (m) names.add(m[1]);
  }
  return [...names].sort();
}

/** `metadata.version` from an agent's SKILL.md, or null when there is none. */
export function versionOf(text) {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (!front) return null;
  const v =
    /^metadata:\s*\n(?:[ \t]+.*\n)*?[ \t]+version:\s*["']?([^\s"']+)["']?\s*$/m.exec(
      front + "\n",
    )?.[1];
  return v && /^\d+\.\d+\.\d+$/.test(v) ? v : null;
}

/** Negative, zero or positive, as `a` is below, equal to or above `b`. */
export function compare(a, b) {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/**
 * Each changed agent whose version did not rise, with the reason. `before` and `after` give an
 * agent's SKILL.md on the base branch and on the pull request, or null where there is none.
 */
export function gaps(names, before, after) {
  const out = [];
  for (const name of names) {
    const now = after(name);
    if (now === null) continue; // the agent was removed
    const next = versionOf(now);
    if (!next) {
      out.push({
        name,
        why: "agents/" + name + "/SKILL.md has no metadata.version like 1.2.3",
      });
      continue;
    }
    const was = before(name);
    if (was === null) continue; // a new agent keeps its version
    const prev = versionOf(was);
    if (prev && compare(next, prev) <= 0)
      out.push({
        name,
        why: `version is ${next}, and needs to be above ${prev}`,
      });
  }
  return out;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, ...args] = process.argv.slice(2);
  const base = args.includes("--base")
    ? args[args.indexOf("--base") + 1]
    : "origin/main";
  if (command !== "check") {
    console.log(
      "Usage: node scripts/agent-versions.mjs check [--base origin/main]",
    );
    process.exit(2);
  }
  const git = (...a) =>
    execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
  const files = git("diff", "--no-renames", "--name-only", base, "--", "agents")
    .split("\n")
    .filter(Boolean);
  const names = agentsIn(files);
  const skill = (name) => `agents/${name}/SKILL.md`;
  const before = (name) => {
    try {
      return git("show", `${base}:${skill(name)}`);
    } catch {
      return null;
    }
  };
  const after = (name) => {
    const file = path.join(ROOT, skill(name));
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  };
  const found = gaps(names, before, after);
  if (found.length) {
    for (const { name, why } of found) console.log(`✗ ${name}: ${why}.`);
    console.log(
      "\n  A change to any file in agents/<name>/ raises metadata.version in agents/<name>/SKILL.md:\n" +
        "  patch for wording, minor for a new behavior, major for a behavior removed or narrowed.",
    );
    process.exit(1);
  }
  console.log(
    names.length
      ? `✓ Every agent changed against ${base} has a higher version: ${names.join(", ")}.`
      : `✓ No agent changed against ${base}.`,
  );
}
