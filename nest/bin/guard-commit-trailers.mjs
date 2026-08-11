#!/usr/bin/env node
/**
 * Nest-side launcher for the commit-trailer guard.
 *
 * An agent's working directory is the nest, not the knowledge checkout, so the project
 * settings Claude Code loads are `{{BUZZ_HOME}}/.claude/settings.json` — a hook wired in
 * the repository's own `.claude/settings.json` never fires for them. This is the copy
 * that does, and it forwards to the one implementation in the checkout so the rules stay
 * in one place. Same shape as `guard-published-text.mjs` beside it, and for the same
 * reason.
 *
 * Reads the PreToolUse JSON on stdin and passes it through unchanged.
 *
 * Fails OPEN, deliberately and loudly. If the checkout has moved or been deleted, the
 * alternative is denying every commit on the machine, which gets the hook removed within
 * the hour — and a guard that has been switched off protects nothing.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BUZZ_HOME = process.env.BUZZ_HOME || path.join(os.homedir(), ".buzz");
const REL = path.join("buzz-agents", "scripts", "hook-guard-commit-trailers.mjs");

/**
 * Find the checkout. The deploy clones into `<nest>/REPOS/<repo>`, so the named path is
 * tried first and a scan of siblings covers a rename or a second clone. Only a directory
 * that actually contains the script counts — an empty or half-cloned one does not.
 */
function findGuard() {
  const reposDir = path.join(BUZZ_HOME, "REPOS");
  const named = path.join(reposDir, "{{KNOWLEDGE_REPO_NAME}}", REL);
  if (fs.existsSync(named)) return named;
  let entries = [];
  try {
    entries = fs.readdirSync(reposDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const candidate = path.join(reposDir, e.name, REL);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

let payload = "";
try {
  payload = fs.readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

const guard = findGuard();
if (!guard) {
  // Say so once, on a command that was going to commit, rather than silently waving it
  // through — a silent no-op is how the last guard went unnoticed for months.
  try {
    const cmd = JSON.parse(payload)?.tool_input?.command ?? "";
    if (/\bgit\b/.test(cmd) && /\bcommit\b/.test(cmd)) {
      process.stdout.write(
        JSON.stringify({
          systemMessage:
            `Trailer guard is NOT running: no knowledge checkout found under ${path.join(BUZZ_HOME, "REPOS")}. ` +
            `This commit is unchecked. Add the operator's trailers yourself: ` +
            `--trailer "Co-authored-by: <name> <email>" --trailer "Signed-off-by: <name> <email>", ` +
            `taking both from \`git config user.name\` and \`user.email\` in the working repository.`,
        }),
      );
    }
  } catch {
    /* malformed payload: nothing useful to say */
  }
  process.exit(0);
}

try {
  const out = execFileSync(process.execPath, [guard], {
    input: payload,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  if (out) process.stdout.write(out);
} catch {
  /* the guard itself failed; do not take git down with it */
}
process.exit(0);
