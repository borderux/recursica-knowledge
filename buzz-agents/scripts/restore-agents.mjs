#!/usr/bin/env node
/**
 * Rebuild the agents in this directory inside a Buzz community.
 *
 * Prints the `buzz` commands needed to recreate each agent. Nothing is created
 * silently: `buzz agents draft-create` and `draft-update` open a prefilled form in
 * the owner's Buzz Desktop, and the owner has to review and save. That review step
 * is the point — an agent definition arriving from a git branch should be looked at
 * before it starts answering people.
 *
 * Stored prompts carry `{{TOKEN}}` markers in place of anything specific to one
 * installation. Those are filled from a values file before the prompt is sent, and
 * a prompt with an unresolved token is never sent — an agent whose instructions
 * still say `{{BQ_PROJECT}}` would go looking for a project by that literal name.
 *
 * Usage:
 *   node buzz-agents/scripts/restore-agents.mjs --channel <uuid> [--agent <name>] [--values <file>] [--run]
 *
 *   --channel            target channel UUID in the new community (required)
 *   --agent <name>       restore just one agent (repeatable)
 *   --values <file>      token values for the target community
 *                        (default: buzz-agents/local-values.json)
 *   --run                execute the commands instead of printing them
 *
 * Requires the `buzz` CLI on PATH with BUZZ_RELAY_URL, BUZZ_PRIVATE_KEY and
 * BUZZ_AUTH_TAG set for the target community. BUZZ_AUTH_TAG is what authorises
 * opening owner-review drafts; without it both draft commands fail.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  loadPlaceholders,
  loadValues,
  localValuesPath,
  detokenize,
} from "../lib/placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentsDir = path.join(__dirname, "..", "agents");

const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(name);
}
function opt(name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}
function optAll(name) {
  const out = [];
  argv.forEach((a, i) => {
    if (a === name && argv[i + 1]) out.push(argv[i + 1]);
  });
  return out;
}

const channel = opt("--channel");
const only = optAll("--agent").map((s) => s.toLowerCase());
const run = flag("--run");
const valuesFile = opt("--values") ?? localValuesPath;

if (!channel) {
  console.error("Missing --channel <uuid>. Find it with: buzz channels list");
  process.exit(1);
}

const { tokens } = loadPlaceholders();
const values = loadValues(valuesFile) ?? {};

// Resolved prompts are written here so the printed commands are runnable as shown.
// Gitignored — they hold the very identifiers the stored prompts leave out.
const resolvedDir = path.join(__dirname, "..", ".resolved");

let dirs = fs
  .readdirSync(agentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (only.length) dirs = dirs.filter((d) => only.includes(d));

const commands = [];
const unresolved = [];

for (const dir of dirs) {
  const base = path.join(agentsDir, dir);
  const config = JSON.parse(
    fs.readFileSync(path.join(base, "agent.json"), "utf8"),
  );
  const promptPath = path.join(base, config.system_prompt_file);

  const displayName = config.display_name;

  const stored = fs.readFileSync(promptPath, "utf8");
  const { text: resolved, missing } = detokenize(stored, values);
  if (missing.length) {
    unresolved.push({ agent: displayName, tokens: missing });
    continue;
  }

  fs.mkdirSync(resolvedDir, { recursive: true });
  const resolvedPath = path.join(resolvedDir, `${dir}.md`);
  fs.writeFileSync(resolvedPath, resolved);

  // draft-create accepts only channel, display name and prompt.
  commands.push({
    label: `create ${displayName}`,
    argv: [
      "agents",
      "draft-create",
      "--channel",
      channel,
      "--display-name",
      displayName,
      "--system-prompt",
      "-",
    ],
    stdin: resolvedPath,
  });

  // Everything draft-update can also carry. Runtime and respond_to are the two
  // that change behaviour, so they are worth a second owner-reviewed pass.
  const updateArgs = [
    "agents",
    "draft-update",
    "--channel",
    channel,
    "--agent-name",
    displayName,
  ];
  if (config.runtime) updateArgs.push("--runtime", config.runtime);
  if (config.provider) updateArgs.push("--provider", config.provider);
  if (config.model) updateArgs.push("--model", config.model);
  if (config.respond_to) updateArgs.push("--respond-to", config.respond_to);
  if (updateArgs.length > 5) {
    commands.push({
      label: `settings ${displayName}`,
      argv: updateArgs,
      stdin: null,
      after: true,
    });
  }

  // Fields with no CLI surface at all. Silently dropping them would make a
  // restored agent look identical while behaving differently, so name them.
  const manual = [];
  if (config.parallelism != null && config.parallelism !== 1)
    manual.push(`parallelism = ${config.parallelism}`);
  if (config.turn_timeout_seconds != null)
    manual.push(`turn timeout = ${config.turn_timeout_seconds}s`);
  if (config.idle_timeout_seconds != null)
    manual.push(`idle timeout = ${config.idle_timeout_seconds}s`);
  if (config.max_turn_duration_seconds != null)
    manual.push(`max turn duration = ${config.max_turn_duration_seconds}s`);
  if (config.agent_args?.length)
    manual.push(`agent args = ${JSON.stringify(config.agent_args)}`);
  if (config.agent_command_override)
    manual.push(`command override = ${config.agent_command_override}`);
  if (config.respond_to_allowlist?.length)
    manual.push(`allowlist = ${config.respond_to_allowlist.join(", ")}`);
  if (manual.length) commands.push({ label: `MANUAL ${displayName}`, manual });
}

// Sending a prompt that still contains `{{BQ_PROJECT}}` would install an agent that
// treats the token as a literal name. Stop instead, and say exactly what is missing.
if (unresolved.length) {
  const needed = [...new Set(unresolved.flatMap((u) => u.tokens))];
  console.error("Cannot restore — these prompts still have unfilled values:\n");
  for (const u of unresolved) {
    console.error(`  ${u.agent}: ${u.tokens.join(", ")}`);
  }
  const rel = path.relative(process.cwd(), valuesFile);
  console.error(
    `\nSupply them in ${rel.startsWith("..") ? valuesFile : rel}:\n`,
  );
  for (const token of needed) {
    const meta = tokens[token];
    console.error(`  "${token}": ""`);
    if (meta?.description) console.error(`      ${meta.description}`);
    if (meta?.howToFind)
      console.error(`      Where to find it: ${meta.howToFind}`);
    if (meta?.example) console.error(`      Example: ${meta.example}`);
  }
  console.error(
    "\nSee buzz-agents/placeholders.json for the full list, and README.md for why they are not stored.",
  );
  process.exit(1);
}

if (!commands.length) {
  console.log("# Nothing to restore.");
  process.exit(0);
}

for (const cmd of commands) {
  if (cmd.manual) {
    console.log(
      `\n# ${cmd.label}: set these in Buzz Desktop — no CLI flag exists for them`,
    );
    for (const m of cmd.manual) console.log(`#   ${m}`);
    continue;
  }

  if (!run) {
    const shown = cmd.argv
      .map((a) =>
        /[^\w@%+=:,./-]/.test(a) ? `'${a.replace(/'/g, `'\\''`)}'` : a,
      )
      .join(" ");
    console.log(`\n# ${cmd.label}`);
    console.log(
      cmd.stdin
        ? `buzz ${shown} < ${path.relative(process.cwd(), cmd.stdin)}`
        : `buzz ${shown}`,
    );
    continue;
  }

  console.log(`\n→ ${cmd.label}`);
  try {
    const out = execFileSync("buzz", cmd.argv, {
      input: cmd.stdin ? fs.readFileSync(cmd.stdin) : undefined,
      encoding: "utf8",
    });
    console.log(out.trim());
  } catch (err) {
    console.error(`  failed: ${err.stderr?.toString().trim() || err.message}`);
    console.error(
      "  Stopping — fix this before continuing so the rest is not half-applied.",
    );
    process.exit(1);
  }
}

if (!run) {
  console.log("\n# Review the above, then re-run with --run to execute.");
  console.log(
    "# Each command opens a form in Buzz Desktop that the owner must save.",
  );
}
