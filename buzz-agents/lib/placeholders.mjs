/**
 * Shared placeholder handling for the export and restore scripts.
 *
 * Prompts in this repository are stored with `{{TOKEN}}` markers wherever a value
 * is specific to one installation — a cloud project, a repository, a checkout path.
 * The real values live in `local-values.json`, which is gitignored.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const buzzAgentsDir = path.join(__dirname, "..");
export const placeholdersPath = path.join(buzzAgentsDir, "placeholders.json");

/**
 * The local files are gitignored, and a gitignored file does not exist in a linked
 * worktree — which is where every commit in this repository is actually made.
 *
 * So resolving them next to this script means the name rules load in the main checkout
 * and silently do not load anywhere real work happens. The checker still warned, but a
 * warning printed on every commit in every worktree is one nobody reads, and the rules
 * that catch participant names were the ones not running.
 *
 * Fall back to the main worktree, which `--git-common-dir` locates from anywhere inside
 * the clone. Same clone by definition, so this cannot reach another operator's rules.
 * Any failure — no git, not a repository, an old git — returns null and leaves the
 * original path in place, so the warning still names somewhere real.
 */
function mainWorktreeBuzzAgentsDir() {
  try {
    const commonDir = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: buzzAgentsDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return commonDir ? path.join(path.dirname(commonDir), "buzz-agents") : null;
  } catch {
    return null;
  }
}

function resolveLocal(name) {
  const here = path.join(buzzAgentsDir, name);
  if (fs.existsSync(here)) return here;
  const mainDir = mainWorktreeBuzzAgentsDir();
  const there = mainDir && path.join(mainDir, name);
  return there && there !== here && fs.existsSync(there) ? there : here;
}

export const localValuesPath = resolveLocal("local-values.json");
export const localRedactionsPath = resolveLocal("local-redactions.json");

export const TOKEN_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;

export function loadPlaceholders() {
  const raw = JSON.parse(fs.readFileSync(placeholdersPath, "utf8"));
  return { tokens: raw.tokens ?? {}, redactions: raw.redactions ?? [] };
}

export function loadValues(file) {
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  // Ignore $comment-style keys so the example file can carry guidance.
  return Object.fromEntries(
    Object.entries(raw).filter(([k]) => !k.startsWith("$")),
  );
}

/** Where the nest is, by the same precedence bootstrap-nest.mjs uses. */
export function nestPath() {
  return path.resolve(process.env.BUZZ_HOME || path.join(os.homedir(), ".buzz"));
}

/**
 * Add the values that follow from the nest location rather than being looked up.
 *
 * Every consumer of `local-values.json` needs these, not just the installer: Janice's
 * prompt carries {{TRANSCRIPT_DIR}}, and the docs tell operators to leave it blank
 * because bootstrap derives it. When only bootstrap derived it, restore-agents.mjs
 * read the file directly, found the token unset, and refused to open Janice's draft —
 * so following the instructions produced a fail-closed stop at the next step.
 *
 * Callers that know the nest (bootstrap has --nest) pass it in; everyone else gets the
 * default. One rule in one place: two copies of a derivation are two things to disagree.
 */
export function deriveValues(values, nest = nestPath()) {
  const out = { ...values };
  // Claude Code encodes the cwd by replacing every '/' and '.' with '-'.
  if (!out.TRANSCRIPT_DIR) {
    out.TRANSCRIPT_DIR = path.join(os.homedir(), ".claude", "projects", nest.replace(/[/.]/g, "-"));
  }
  // Known, not asked for — the nest is not always ~/.buzz.
  out.BUZZ_HOME = nest;
  // Stu's app is source, not configuration, so bootstrap references it in this checkout
  // rather than copying it into the nest. Derived from this file's own location, so a
  // renamed or relocated clone still resolves — and re-running bootstrap re-bakes it.
  out.STU_APP = path.join(buzzAgentsDir, "agents", "stu", "app");
  return out;
}

/**
 * Replace real values with their tokens.
 *
 * Longest value first. Without that ordering a short value that is a substring of a
 * longer one (a bare repo name inside its `owner/name` form) would match first and
 * corrupt the longer token.
 */
export function tokenize(text, values) {
  const byLength = Object.entries(values).sort(
    (a, b) => String(b[1]).length - String(a[1]).length,
  );
  let out = text;
  for (const [token, value] of byLength) {
    if (!value) continue;
    out = out.split(value).join(`{{${token}}}`);
  }
  return out;
}

/**
 * Redactions are regexes rather than literal strings. A literal would mean writing
 * the text being removed into placeholders.json, which puts it back in the repo.
 */
export function applyRedactions(text, redactions) {
  let out = text;
  for (const r of redactions) {
    out = out.replace(new RegExp(r.pattern, r.flags ?? "g"), r.replace);
  }
  return out;
}

/** Escape a literal string so it can be used inside a regular expression. */
export function escapeLiteral(literal) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Redactions whose subject cannot be written down in this repository.
 *
 * The declared redactions in placeholders.json are regexes precisely so a rule never has
 * to spell out the text it removes. That works for anything with a shape — a home
 * directory, an identifier prefix. It does not work for a name: there is no pattern that
 * matches "this client" or "the people in their interviews" and nothing else.
 *
 * placeholders.json used to carry a handful of those as literals anyway, on the argument
 * that they were already in the history so the working tree cost nothing. That trade is
 * no longer accepted — a client name does not go in this repository in any file, and the
 * literals were removed. NOTHING identifying goes back into a versioned file. If a rule
 * needs to name its subject, its home is here.
 *
 * This file is gitignored and has two halves:
 *
 *   redactions  GENERATED from the live dataset by refresh-local-redactions.mjs, and
 *               overwritten on every run. Participant names and transcript filenames,
 *               which are not knowable until the transcripts are ingested.
 *   manual      HAND-WRITTEN and preserved across regeneration. For a subject the
 *               dataset does not contain: the client slug, an operator's own name, a
 *               retired credential fragment. Nothing derives these, so nothing can
 *               rebuild them.
 *
 * Both halves have the same `{ find, replace, label }` shape and are treated
 * identically. `label` is what gets reported when one matches — callers must print the
 * label and never `find`, or a leak warning in CI output becomes the leak.
 */
export function loadLocalRedactions(file = localRedactionsPath) {
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries = Array.isArray(raw)
    ? raw
    : [...(raw.manual ?? []), ...(raw.redactions ?? [])];
  return entries
    .filter((r) => r && typeof r.find === "string" && r.find.length >= 3)
    .map((r, i) => ({
      /**
       * Boundaries are alphanumeric, NOT \b — because `_` and `-` are exactly where a
       * client slug hides.
       *
       * \b counts `_` as a word character, so a rule matching the bare slug `\bacme\b`
       * does not fire inside `research_acme`. That is not a corner case: the slug reaches
       * text almost entirely in composed form — `research_<slug>` the dataset,
       * `claire-<slug>-service-user` the account, `bq-<slug>.yaml` the MCP config — and a
       * bare mention is the rare one. The rule read as if it covered the slug, and covered
       * only the spelling nobody writes.
       *
       * `(?<![A-Za-z0-9])` … `(?![A-Za-z0-9])` treats `_` and `-` as separators, which
       * catches every composed form while still refusing to rewrite the middle of a
       * longer word. Applied only at an end that is itself alphanumeric: a literal
       * ending in "." — an initial, a file extension — has no boundary to assert after
       * it, and requiring one there would match nothing.
       */
      pattern:
        (/^[A-Za-z0-9]/.test(r.find) ? "(?<![A-Za-z0-9])" : "") +
        escapeLiteral(r.find) +
        (/[A-Za-z0-9]$/.test(r.find) ? "(?![A-Za-z0-9])" : ""),
      replace: r.replace ?? "[redacted]",
      label: r.label ?? `local redaction ${i + 1}`,
    }));
}

/**
 * Which local redactions still match — reported by label, never by subject.
 *
 * Separate from findLeaks because that one reports token names, and these have no
 * token: the whole point is that the value has no business being in this repo under
 * any name.
 */
export function findLiteralLeaks(text, localRedactions) {
  return localRedactions
    .filter((r) => new RegExp(r.pattern, r.flags ?? "g").test(text))
    .map((r) => r.label);
}

/**
 * Redaction patterns that matched nothing — a rule that has silently stopped working.
 *
 * `structural: true` is exempt, and the distinction is the whole point of the flag.
 *
 * A literal redaction targets one known string, so matching nothing means the text moved and the
 * rule is now pointing at nowhere. Worth reporting: it has stopped working and nobody would know.
 *
 * A structural one matches a *shape* — any client dataset, any client service-account name — and
 * exists to catch a name nobody has written yet. Matching nothing is what success looks like, and
 * it is the normal state on a clean repository. Reporting it means the warning fires on every run
 * forever, and a warning that is always there gets read as decoration — which is exactly how the
 * next one, about a rule that genuinely has broken, gets read too.
 *
 * Same reasoning as the `portableOnly` exemption on token warnings. The flag was already declared
 * on both structural patterns in placeholders.json and read by nothing; this is what it is for.
 */
export function findStaleRedactions(text, redactions) {
  return redactions
    .filter((r) => !r.structural)
    .filter((r) => !new RegExp(r.pattern, r.flags ?? "g").test(text))
    .map((r) => r.pattern);
}

/**
 * Fail-closed check: no configured value may survive into a stored prompt.
 * Returns the tokens whose values still appear in the text.
 */
export function findLeaks(text, values) {
  return Object.entries(values)
    .filter(([, value]) => value && text.includes(value))
    .map(([token]) => token);
}

/** Replace tokens with real values. Returns the text plus any tokens left unresolved. */
export function detokenize(text, values) {
  const missing = new Set();
  const out = text.replace(TOKEN_PATTERN, (match, token) => {
    if (values[token] === undefined || values[token] === "") {
      missing.add(token);
      return match;
    }
    return values[token];
  });
  return { text: out, missing: [...missing] };
}
