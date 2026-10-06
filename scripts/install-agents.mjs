#!/usr/bin/env node
/**
 * Install the design agents into Claude Code, and keep them current.
 *
 * Each place an agent runs keeps its own copy, and a copy does not update when this repository
 * does. On the machine this was written for, three copies of Barb and Betty had drifted apart —
 * one behind by the object map, one reading a knowledge checkout six commits old — and nothing
 * said so. Buzz has `sync-prompts.mjs` and CircleChat has `circlechat/sync-skills.sh`; Claude
 * Code had nothing.
 *
 * So, into ~/.claude/agents by default (every project on the machine):
 *
 *   an artifact with no {{TOKEN}}   a symlink to it. It is current the moment this checkout is.
 *   an artifact with tokens         a filled-in copy, stamped with the artifact it came from, so
 *                                   `--check` can say it is stale. A symlink would hand the agent
 *                                   the raw `{{WORKSPACE_ROOT}}`.
 *
 * The token values come from where this checkout sits, which is what they mean:
 *   KNOWLEDGE_REPO_NAME   this checkout's folder name
 *   WORKSPACE_ROOT        the folder that holds it
 * `--knowledge-repo-name` and `--workspace-root` override them.
 *
 * Only the agents that touch no client data. Claire, Stu and Loki are not installed here: their
 * isolation is a data fence a prompt cannot carry, and a copy in every project on the machine is
 * the opposite of a fence. See their PORTING.md.
 *
 * A project's own .claude/agents overrides these for that project. `--check` names any such copy
 * under WORKSPACE_ROOT, because an old copy there is how an agent stays out of date after this
 * has run.
 *
 * Usage:
 *   npm run agents:install                     install or refresh
 *   npm run agents:install -- --check          report, change nothing; exit 1 if anything is stale
 *   npm run agents:install -- --target <dir>   somewhere other than ~/.claude/agents
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detokenize, TOKEN_PATTERN } from "../buzz-agents/lib/placeholders.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = path.join(ROOT, "portable", "claude-code", "agents");

/** The agents that are safe to install everywhere: none of them reaches client data. */
export const AGENTS = [
  "betty",
  "barb",
  "checker",
  "feisty",
  "alan",
  "edie",
  "comparer",
];

const STAMP = "# installed-from:";

export function sha(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Fill a tokenized artifact and stamp it. The stamp is a YAML comment inside the front matter,
 * which Claude Code ignores and which survives being read back.
 */
export function render(text, values, source) {
  const { text: filled, missing } = detokenize(text, values);
  if (missing.length) return { missing };
  const stamp = `${STAMP} ${source} ${sha(text)} — rerun \`npm run agents:install\` after pulling`;
  if (!filled.startsWith("---\n"))
    return { text: `${stamp}\n${filled}`, missing: [] };
  return { text: `---\n${stamp}\n${filled.slice(4)}`, missing: [] };
}

/** What is at `dest` now, compared with what the artifact at `src` should put there. */
export function status(src, dest) {
  const text = fs.readFileSync(src, "utf8");
  const tokenized = new RegExp(TOKEN_PATTERN.source).test(text);
  let st;
  try {
    st = fs.lstatSync(dest);
  } catch {
    return { tokenized, state: "missing" };
  }
  if (st.isSymbolicLink()) {
    const to = path.resolve(path.dirname(dest), fs.readlinkSync(dest));
    if (!tokenized && to === src) return { tokenized, state: "current" };
    return { tokenized, state: "stale", why: `links to ${to}` };
  }
  const installed = fs.readFileSync(dest, "utf8");
  const m = installed.match(/^# installed-from: (\S+) ([0-9a-f]{16})/m);
  if (!m)
    return {
      tokenized,
      state: "foreign",
      why: "a copy this script did not write",
    };
  if (!tokenized)
    return { tokenized, state: "stale", why: "a copy where a link belongs" };
  if (m[1] !== src)
    return { tokenized, state: "stale", why: `copied from ${m[1]}` };
  return m[2] === sha(text)
    ? { tokenized, state: "current" }
    : {
        tokenized,
        state: "stale",
        why: "the agent has changed since it was installed",
      };
}

/** Project-level copies under the workspace, which override the installed ones in that project. */
export function projectCopies(workspaceRoot, names) {
  const found = [];
  let entries = [];
  try {
    entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    for (const n of names) {
      const f = path.join(
        workspaceRoot,
        e.name,
        ".claude",
        "agents",
        `${n}.md`,
      );
      if (fs.existsSync(f)) found.push(f);
    }
  }
  return found;
}

function arg(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const target = path.resolve(
    arg(args, "--target") ?? path.join(os.homedir(), ".claude", "agents"),
  );
  const values = {
    KNOWLEDGE_REPO_NAME:
      arg(args, "--knowledge-repo-name") ?? path.basename(ROOT),
    WORKSPACE_ROOT: path.resolve(
      arg(args, "--workspace-root") ?? path.dirname(ROOT),
    ),
  };

  console.log(`Agents from ${ARTIFACTS}`);
  console.log(`  into ${target}`);
  console.log(
    `  KNOWLEDGE_REPO_NAME=${values.KNOWLEDGE_REPO_NAME}  WORKSPACE_ROOT=${values.WORKSPACE_ROOT}\n`,
  );
  if (!check) fs.mkdirSync(target, { recursive: true });

  let problems = 0;
  for (const name of AGENTS) {
    const src = path.join(ARTIFACTS, `${name}.md`);
    const dest = path.join(target, `${name}.md`);
    if (!fs.existsSync(src)) {
      console.log(
        `  ✗ ${name}: no artifact at ${src} — run npm run agents:build`,
      );
      problems++;
      continue;
    }
    const s = status(src, dest);
    if (s.state === "current") {
      console.log(
        `  ✓ ${name}: current (${s.tokenized ? "filled-in copy" : "link"})`,
      );
      continue;
    }
    if (s.state === "foreign") {
      console.log(
        `  ✗ ${name}: ${dest} is ${s.why}. Move it aside and rerun; it is not overwritten.`,
      );
      problems++;
      continue;
    }
    if (check) {
      console.log(`  ✗ ${name}: ${s.state}${s.why ? ` — ${s.why}` : ""}`);
      problems++;
      continue;
    }
    fs.rmSync(dest, { force: true });
    if (s.tokenized) {
      const out = render(fs.readFileSync(src, "utf8"), values, src);
      if (out.missing?.length) {
        console.log(
          `  ✗ ${name}: no value for ${out.missing.map((t) => `{{${t}}}`).join(", ")}`,
        );
        problems++;
        continue;
      }
      fs.writeFileSync(dest, out.text);
      console.log(`  ✓ ${name}: wrote a filled-in copy`);
    } else {
      fs.symlinkSync(src, dest);
      console.log(`  ✓ ${name}: linked`);
    }
  }

  const overriding = projectCopies(values.WORKSPACE_ROOT, AGENTS);
  if (overriding.length) {
    console.log(
      `\n  A project's own copy wins over these inside that project. Remove any you do not mean to keep:`,
    );
    for (const f of overriding) console.log(`    ${f}`);
  }

  console.log(
    `\n  Not installed here: Claire, Stu and Loki, whose data fence a prompt cannot carry — see their PORTING.md.`,
  );
  if (problems) process.exit(1);
}
