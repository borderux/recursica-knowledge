#!/usr/bin/env node
/**
 * Export Buzz agent personas from Buzz Desktop's local state into this repo.
 *
 * Reads Buzz Desktop's `managed-agents.json` and writes one folder per agent under
 * `buzz-agents/agents/<name>/`, containing:
 *
 *   agent.json        portable settings only
 *   SYSTEM_PROMPT.md  the prompt as real markdown, so it diffs and branches
 *   avatar.png        the agent's picture, pulled off the relay
 *
 * The prompt is deliberately NOT stored inside agent.json. A prompt embedded as a
 * JSON string is a single line of escaped `\n`s — unreviewable in a PR and useless
 * to `git blame`. Versioning the prompt properly is the whole point of this
 * directory, so it gets its own file.
 *
 * SECRETS: fields are copied by ALLOWLIST (`PORTABLE_FIELDS`), never by denylist.
 * `managed-agents.json` contains `auth_tag`, a live relay credential. If Buzz adds
 * a new secret field in a future release, an allowlist ignores it by default; a
 * denylist would publish it. Do not convert this to a denylist.
 *
 * IDENTIFIERS: values specific to this installation — the cloud project, the repos —
 * are replaced with `{{TOKEN}}` markers before anything is written. The real values
 * come from the gitignored `local-values.json` and are supplied again at install
 * time by `restore-agents.mjs`. Nothing is written if a configured value survives
 * into the output.
 *
 * Usage:
 *   node buzz-agents/scripts/export-agents.mjs [--input <path>] [--check]
 *
 *   --check  exit 1 if the export would change anything (for CI drift detection)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  loadPlaceholders,
  loadValues,
  localValuesPath,
  tokenize,
  applyRedactions,
  findLeaks,
  findStaleRedactions,
  deriveValues,
} from "../lib/placeholders.mjs";
import { canonicalAgentName } from "../lib/agent-names.mjs";
import {
  AVATAR_FILE,
  describeAvatar,
  fetchAvatar,
  renderAvatar,
} from "../lib/avatars.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentsDir = path.join(__dirname, "..", "agents");
const repoRoot = path.join(__dirname, "..", "..");

function getAllTextFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".resolved" || entry.name === "node_modules") continue;
      files.push(...getAllTextFiles(fullPath));
    } else if (entry.isFile()) {
      if (
        entry.name.endsWith(".png") ||
        entry.name.endsWith(".jpg") ||
        entry.name.endsWith(".jpeg") ||
        entry.name === "toolbox" ||
        entry.name === "local-values.json" ||
        entry.name === "local-values.example.json" ||
        entry.name === "placeholders.json"
      )
        continue;
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Settings that describe WHAT the agent is. These recreate the agent anywhere.
 * Everything absent from this list is either machine-local (pubkey, relay_url,
 * persona_id, runtime_pid, backend_agent_id, provider_binary_path, timestamps,
 * last_* status, is_active, avatar_url) or secret (auth_tag).
 *
 * avatar_url is excluded on purpose — it names the community it was uploaded to and
 * means nothing in a different one. The image behind it is stored instead, as
 * `avatar.png`; see ../lib/avatars.mjs.
 */
const PORTABLE_FIELDS = [
  "name",
  "display_name",
  "is_builtin",
  "runtime",
  "provider",
  "model",
  "respond_to",
  "respond_to_allowlist",
  "parallelism",
  "turn_timeout_seconds",
  "idle_timeout_seconds",
  "max_turn_duration_seconds",
  "start_on_app_launch",
  "auto_restart_on_config_change",
  "agent_args",
  "agent_command_override",
  "acp_command",
  "mcp_command",
  "backend",
];

function defaultInputPath() {
  const appSupport = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "xyz.block.buzz.app",
    "agents",
    "managed-agents.json",
  );
  if (fs.existsSync(appSupport)) return appSupport;
  // Linux / non-macOS Buzz Desktop
  return path.join(
    os.homedir(),
    ".config",
    "xyz.block.buzz.app",
    "agents",
    "managed-agents.json",
  );
}

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const inputIdx = args.indexOf("--input");
const inputPath = inputIdx !== -1 ? args[inputIdx + 1] : defaultInputPath();

let entries = [];
if (fs.existsSync(inputPath)) {
  const parsed = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (Array.isArray(parsed)) entries = parsed;
} else if (!checkOnly) {
  console.error(`No managed-agents.json at ${inputPath}`);
  console.error(
    "Pass --input <path> if Buzz Desktop stores its state elsewhere.",
  );
  process.exit(1);
}

const { tokens, redactions } = loadPlaceholders();
const localValues = loadValues(localValuesPath);

if (!checkOnly && Object.keys(tokens).length > 0 && localValues === null) {
  console.error(`No local-values.json at ${localValuesPath}`);
  console.error(
    "placeholders.json declares tokens, so their values are needed to replace them.",
  );
  console.error(
    "Copy buzz-agents/local-values.example.json to local-values.json and fill it in.",
  );
  process.exit(1);
}

// Derived values must be tokenized on the way out, not just resolved on the way in.
// Janice's live prompt holds an absolute path under the operator's home directory; if
// TRANSCRIPT_DIR is not among the values, tokenize() leaves it alone and findLeaks() has
// no value to look for either — so the export would commit someone's real home path into
// a public repository, with both guards reporting clean.
const values = deriveValues(localValues ?? {});
const unset = Object.keys(tokens).filter((t) => !values[t]);
if (unset.length) {
  console.warn(
    `  ! local-values.json has no value for: ${unset.join(", ")} — those tokens cannot be applied.`,
  );
}

/**
 * The file holds two kinds of entry:
 *   persona  — the definition; has `slug`, and `persona_id` is null
 *   instance — a persona bound to this community; has `pubkey` and `persona_id`
 * Only personas are portable, so those are what we export.
 */
const allPersonas = entries.filter((e) => e.slug && !e.persona_id);
const instances = entries.filter((e) => e.persona_id);

/**
 * Built-in agents ship with Buzz itself. They are not ours to version: every
 * community already has them, storing them here would imply we maintain them, and
 * a Buzz upgrade would show up as an unexplained diff. Filtering on `is_builtin`
 * rather than a name list means a new agent of ours is picked up automatically.
 */
const personas = allPersonas.filter((p) => !p.is_builtin);
const builtins = allPersonas.filter((p) => p.is_builtin).map((p) => p.name);

if (allPersonas.length === 0) {
  console.error(
    "Found no persona entries (an entry with `slug` set and `persona_id` null).",
  );
  process.exit(1);
}

if (builtins.length) {
  console.log(`  Skipping Buzz built-ins: ${builtins.join(", ")}`);
}

if (personas.length === 0) {
  console.error("Found no non-built-in agents to export.");
  process.exit(1);
}

const changed = [];
const rawPrompts = [];

for (const persona of personas) {
  // Canonical, so `Claire (Alex)` exports to agents/claire/ and updates the definition
  // she came from. Without stripping the owner suffix this wrote agents/claire-alex/
  // beside it — a duplicate of the same agent, one per operator who ever exported.
  const dirName = canonicalAgentName(persona.name || persona.display_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outDir = path.join(agentsDir, dirName);

  const config = {};
  for (const field of PORTABLE_FIELDS) {
    if (persona[field] !== undefined) config[field] = persona[field];
  }
  // The owner suffix is local to one install. Storing `Claire (Alex)` would put one
  // operator's name in the definition every other operator restores from.
  for (const field of ["name", "display_name"]) {
    if (config[field] !== undefined) config[field] = canonicalAgentName(config[field]);
  }
  config.system_prompt_file = "SYSTEM_PROMPT.md";

  /**
   * Avatars are fetched only when the relay's copy has actually changed. The hash in
   * the media URL is the hash of the bytes, so the recorded `avatar_source_sha256`
   * answers "is this current?" without a download — and, because the stored file is
   * downscaled, without the re-encode ever being mistaken for drift.
   */
  const avatar = describeAvatar(persona.avatar_url);
  const avatarPath = path.join(outDir, AVATAR_FILE);
  let avatarBytes = null;

  if (avatar) {
    const priorPath = path.join(outDir, "agent.json");
    const prior = fs.existsSync(priorPath)
      ? JSON.parse(fs.readFileSync(priorPath, "utf8"))
      : null;
    const current =
      prior?.avatar_source_sha256 === avatar.hash && fs.existsSync(avatarPath);

    if (current || checkOnly) {
      if (!current) changed.push(path.relative(repoRoot, avatarPath));
      config.avatar_file = AVATAR_FILE;
      config.avatar_source_sha256 = avatar.hash;
    } else {
      try {
        const raw =
          avatar.inline ?? fetchAvatar(persona.avatar_url, avatar.hash);
        const rendered = renderAvatar(raw, avatar.hash);
        avatarBytes = rendered.bytes;
        config.avatar_file = AVATAR_FILE;
        config.avatar_source_sha256 = avatar.hash;
        if (!rendered.resized) {
          console.warn(
            `  ! ${persona.name}: could not run sips — storing the avatar at full size ` +
              `(${(rendered.bytes.length / 1e6).toFixed(1)} MB).`,
          );
        }
      } catch (err) {
        // Recording an avatar_file that is not on disk would be worse than recording
        // none, so the fields are left off and the reason is stated.
        console.warn(
          `  ! ${persona.name}: no avatar written — ${err.message.trim().split("\n")[0]}`,
        );
        console.warn(
          "      Needs the `buzz` CLI on PATH with credentials for the relay holding it.",
        );
      }
    }
  }

  // A persona's prompt is copied onto its instance when the agent is created.
  // If they have since diverged, the running agent is not the recorded one —
  // say so rather than silently exporting the stale side.
  const instance = instances.find((i) => i.persona_id === persona.slug);
  if (instance && instance.system_prompt !== persona.system_prompt) {
    console.warn(
      `  ! ${persona.name}: persona prompt (${persona.system_prompt.length} chars) differs from ` +
        `the running instance (${instance.system_prompt.length} chars). Exporting the persona.`,
    );
  }

  let prompt = persona.system_prompt ?? "";
  if (!prompt.endsWith("\n")) prompt += "\n";

  rawPrompts.push(prompt);
  prompt = applyRedactions(tokenize(prompt, values), redactions);

  const leaks = findLeaks(prompt, values);
  if (leaks.length) {
    console.error(
      `\n${persona.name}: refusing to write — these values survived tokenization: ${leaks.join(", ")}`,
    );
    console.error(
      "Check local-values.json for a value that overlaps another, then re-run.",
    );
    process.exit(1);
  }

  const writes = [
    [path.join(outDir, "agent.json"), JSON.stringify(config, null, 2) + "\n"],
    [path.join(outDir, "SYSTEM_PROMPT.md"), prompt],
  ];

  for (const [file, contents] of writes) {
    const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (existing === contents) continue;
    changed.push(path.relative(repoRoot, file));
    if (!checkOnly) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(file, contents);
    }
  }

  if (avatarBytes) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(avatarPath, avatarBytes);
    changed.push(path.relative(repoRoot, avatarPath));
  }

  const applied = Object.keys(tokens).filter((t) =>
    prompt.includes(`{{${t}}}`),
  );
  console.log(
    `  ${persona.name.padEnd(8)} ${prompt.length} chars` +
      (applied.length ? `  [${applied.join(", ")}]` : "") +
      (config.avatar_file ? "  +avatar" : "") +
      `  → buzz-agents/agents/${dirName}/`,
  );
}

// Scan all files under nest/ and buzz-agents/ using findLeaks and findStaleRedactions
const buzzDir = path.join(__dirname, "..");
const nestDir = path.join(repoRoot, "nest");
const scannedFiles = [
  ...getAllTextFiles(buzzDir),
  ...getAllTextFiles(nestDir),
];
const allScannedTexts = [...rawPrompts];
let leakCount = 0;

for (const file of scannedFiles) {
  try {
    const content = fs.readFileSync(file, "utf8");
    allScannedTexts.push(content);
    if (Object.keys(values).length > 0) {
      const isAgentPrompt = file.includes("/buzz-agents/agents/");
      const checkValues = isAgentPrompt
        ? values
        : Object.fromEntries(
            Object.entries(values).filter(
              ([k]) => k !== "KNOWLEDGE_REPO_NAME",
            ),
          );
      const leaks = findLeaks(content, checkValues);
      if (leaks.length) {
        console.error(
          `\n  ! ${path.relative(repoRoot, file)}: leaked values survived: ${leaks.join(", ")}`,
        );
        leakCount++;
      }
    }
  } catch {
    // Ignore non-utf8 files
  }
}

if (leakCount > 0) {
  console.error(`\nFound ${leakCount} file(s) with leaked values.`);
  process.exit(1);
}

const stale = findStaleRedactions(allScannedTexts.join("\n"), redactions);
if (stale.length) {
  console.warn(
    `\n  ! ${stale.length} redaction pattern(s) matched nothing — review or remove:`,
  );
  for (const s of stale) console.warn(`      ${s}`);
}

if (checkOnly) {
  if (changed.length) {
    console.error(`\nOut of date — ${changed.length} file(s) would change:`);
    for (const f of changed) console.error(`  ${f}`);
    console.error("\nRun: node buzz-agents/scripts/export-agents.mjs");
    process.exit(1);
  }
  console.log("\nUp to date.");
} else {
  console.log(
    changed.length ? `\nWrote ${changed.length} file(s).` : "\nNo changes.",
  );
}
