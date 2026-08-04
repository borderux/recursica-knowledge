/**
 * Version stamps: which commit of a prompt an agent is actually running.
 *
 * The stamp is an environment variable held by Buzz, keyed per agent, whose value is
 * the commit that last changed that agent's `SYSTEM_PROMPT.md`. That makes the everyday
 * question — "has the branch moved past what I installed?" — one string comparison
 * between two hex shas, with no prompt text read and no diffing involved.
 *
 * ## Where the stamp lives, and why it is not on the agent record
 *
 * Buzz has env vars in two places. `AgentDefinition` carries a per-agent `env_vars` map,
 * but it is part of the persona definition published to the relay: it is absent from the
 * local `managed-agents.json` (verified — 0 of 14 entries carry the field) and no `buzz`
 * subcommand writes it. `buzz agents draft-update` offers six flags and none of them is
 * `--env`, so a script cannot reach per-agent env vars at all.
 *
 * What is reachable is `agents/global-agent-config.json`, whose `env_vars` map Buzz
 * injects into every managed agent it launches. It is one namespace shared by all agents,
 * so the agent name goes in the key rather than being implied by which record holds it.
 *
 * ## Constraints taken from the Buzz binary, not guessed
 *
 * `set_global_agent_config` validates what it accepts, and these are its rules:
 *
 *   - keys must match `[A-Za-z_][A-Za-z0-9_]*`
 *   - values cannot contain NUL bytes
 *   - `BUZZ_*` keys are reserved and rejected — Buzz injects its own, including
 *     `BUZZ_PRIVATE_KEY` and `BUZZ_AUTH_TAG`
 *   - provider and model must be set through their structured fields, not as env vars
 *
 * Hence the `AGENT_PROMPT_VERSION_` prefix: it satisfies the key rule and stays clear of
 * the reserved namespace, so a stamp written here is one the Desktop would also accept.
 *
 * ## Writing the file directly is deliberate
 *
 * The Desktop's own `set_global_agent_config` restarts every affected agent when the
 * config changes. A stamp is a record of what is installed, not an input to behaviour,
 * so restarting four agents to write one is a bad trade. Writes here are atomic
 * (temp file, then rename) and touch only `env_vars` keys carrying our prefix; every
 * other key in the file is read and written back untouched.
 *
 * If the Desktop ever overwrites the file and drops the stamps, the failure is safe:
 * a missing stamp reads as "unknown", which sends the caller down the slow path that
 * re-derives the truth from the prompt and writes the stamp again.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

/** Keys Buzz injects itself. Ours must not collide with the namespace. */
export const RESERVED_PREFIX = "BUZZ_";

export const STAMP_PREFIX = "AGENT_PROMPT_VERSION_";

/**
 * A stamp is `<commit sha>@<fingerprint of the prompt that was installed>`.
 *
 * The sha alone answers the question this design exists for — "has the branch moved past
 * what I installed?" — as one comparison of two hex strings. What it cannot answer is
 * "has the agent changed since?". A stamp records a past act, and an edit made in Buzz
 * Desktop afterwards leaves it untouched and still truthful about the wrong moment. Read
 * on its own, a current sha would report an edited agent as up to date, hiding the one
 * version of the prompt that exists nowhere else.
 *
 * So the stamp carries a witness. The obvious choice is the agent's `updated_at`, and it
 * is the wrong one: it only works if the Desktop reliably bumps that field on every save,
 * and if it ever does not, the check fails by reporting "unchanged" — silently, in the
 * exact case it was added to catch. A fingerprint of the installed prompt has no such
 * dependency. It cannot fail closed-mouthed: if the prompt differs at all, the
 * fingerprint differs.
 *
 * This is not the prompt comparison the stamp replaced, and the difference matters. That
 * one compared a *live* prompt against a *stored* one — across the token and redaction
 * boundary — which is what made it report a deliberately redacted agent as drifted
 * forever. A fingerprint compares the live prompt against itself at an earlier moment.
 * Same space, no tokenizing, no redacting, no history walk, and nothing to get the
 * direction of wrong.
 *
 * `@` is the separator: neither a sha nor a hex digest can contain one. A value with no
 * `@` is read as a bare sha with no witness and treated as unknown rather than as
 * unchanged, so a stamp written by an older version of this script is re-derived instead
 * of being trusted.
 */
export function formatStamp(sha, fingerprint) {
  return `${sha}@${fingerprint ?? ""}`;
}

export function parseStamp(value) {
  if (!value) return { sha: null, witness: null };
  const at = value.indexOf("@");
  if (at === -1) return { sha: value, witness: null };
  return {
    sha: value.slice(0, at),
    witness: value.slice(at + 1) || null,
  };
}

/**
 * Short digest of a prompt, for use as a stamp witness.
 *
 * Truncated to 12 hex characters: this detects an edit made by the agent's owner in a
 * form, not an adversary constructing a collision, and a stamp is meant to stay readable
 * in a settings pane. The caller must fingerprint a normalised prompt — same trailing
 * newline rule on both sides — or an invisible difference reads as an edit.
 */
export function promptFingerprint(text) {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

/** Buzz's own rule for env var keys, copied from the Desktop's validation. */
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function globalConfigPath() {
  const appSupport = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "xyz.block.buzz.app",
    "agents",
    "global-agent-config.json",
  );
  if (fs.existsSync(appSupport)) return appSupport;
  return path.join(
    os.homedir(),
    ".config",
    "xyz.block.buzz.app",
    "agents",
    "global-agent-config.json",
  );
}

/**
 * The env var name holding one agent's stamp.
 *
 * Derived from the directory name under `agents/`, which is what the export derives
 * from the persona's `name`. Not from `display_name` — that is the field a human
 * renames, and a renamed agent must not silently lose its stamp and read as unknown.
 */
export function stampKey(dirName) {
  const suffix = dirName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const key = STAMP_PREFIX + suffix;
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`derived env var key is not valid for Buzz: ${key}`);
  }
  return key;
}

/** Every env var currently set, or `{}` if the config does not exist yet. */
export function readEnvVars(configPath = globalConfigPath()) {
  if (!fs.existsSync(configPath)) return {};
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return raw.env_vars ?? {};
}

/**
 * Set or clear stamp keys, leaving the rest of the config exactly as found.
 *
 * A value of null removes the key. Returns the keys that actually changed, so a caller
 * can report a write happening rather than claiming one that was a no-op.
 *
 * Refuses any key outside our prefix. This file also holds the provider, the model and
 * the preferred runtime for every agent on the machine; a stamp writer has no business
 * being able to touch those, so the guard is here rather than in the caller.
 */
export function writeStamps(updates, configPath = globalConfigPath()) {
  for (const key of Object.keys(updates)) {
    if (!key.startsWith(STAMP_PREFIX)) {
      throw new Error(
        `refusing to write env var outside ${STAMP_PREFIX}*: ${key}`,
      );
    }
    if (key.startsWith(RESERVED_PREFIX)) {
      throw new Error(`${key} is in Buzz's reserved namespace`);
    }
    const value = updates[key];
    if (value !== null && (typeof value !== "string" || value.includes("\0"))) {
      throw new Error(`invalid value for ${key}: must be a NUL-free string`);
    }
  }

  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8"))
    : {};
  const envVars = { ...(config.env_vars ?? {}) };

  const changed = [];
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      if (key in envVars) {
        delete envVars[key];
        changed.push(key);
      }
      continue;
    }
    if (envVars[key] === value) continue;
    envVars[key] = value;
    changed.push(key);
  }

  if (!changed.length) return [];

  const next = { ...config, env_vars: envVars };
  // Written to a temp file in the same directory and renamed, so a crash mid-write
  // cannot leave the Desktop with a truncated config it fails to parse on launch.
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const tmp = `${configPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(tmp, configPath);
  return changed;
}

/**
 * The commit that last changed a file, as a full sha.
 *
 * `--` separates the path so a file sharing a name with a ref cannot be misread as one.
 * Returns null when git cannot answer — no repository, or a file never committed. That
 * is distinct from a sha and callers must keep it distinct: "this prompt has no version"
 * is not the same claim as "this prompt is at a version you do not have".
 */
export function promptCommit(repoRoot, relPath) {
  try {
    const out = execFileSync(
      "git",
      ["-C", repoRoot, "log", "-1", "--format=%H", "--", relPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return out || null;
  } catch {
    return null;
  }
}

/** One-line description of a commit, for a report. Null if it cannot be read. */
export function describeCommit(repoRoot, sha) {
  try {
    return execFileSync(
      "git",
      ["-C", repoRoot, "log", "-1", "--format=%s", sha],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return null;
  }
}

/** A file's contents at a commit, or null if the commit or path is unknown here. */
export function fileAtCommit(repoRoot, sha, relPath) {
  try {
    return execFileSync("git", ["-C", repoRoot, "show", `${sha}:${relPath}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

/**
 * How many commits touching this file separate a stamp from the current one.
 *
 * Counted along the file's own history rather than the branch's, so "3 behind" means
 * three changes to this prompt and not three commits to the repository.
 * Returns null if the stamp is not an ancestor — a stamp from a branch that was never
 * merged, where a count would be a fiction.
 */
export function promptCommitsBetween(repoRoot, fromSha, toSha, relPath) {
  try {
    const out = execFileSync(
      "git",
      [
        "-C",
        repoRoot,
        "rev-list",
        "--count",
        `${fromSha}..${toSha}`,
        "--",
        relPath,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return out ? Number(out) : null;
  } catch {
    return null;
  }
}
