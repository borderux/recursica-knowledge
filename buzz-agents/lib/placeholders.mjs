/**
 * Shared placeholder handling for the export and restore scripts.
 *
 * Prompts in this repository are stored with `{{TOKEN}}` markers wherever a value
 * is specific to one installation — a cloud project, a repository, a checkout path.
 * The real values live in `local-values.json`, which is gitignored.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const buzzAgentsDir = path.join(__dirname, "..");
export const placeholdersPath = path.join(buzzAgentsDir, "placeholders.json");
export const localValuesPath = path.join(buzzAgentsDir, "local-values.json");
export const localRedactionsPath = path.join(
  buzzAgentsDir,
  "local-redactions.json",
);

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
 * The declared redactions in placeholders.json are regexes precisely so a rule never
 * has to spell out the text it removes. That works for anything with a shape — a home
 * directory, an identifier prefix. It does not work for research participant names:
 * there is no pattern that matches "the people in this client's interviews" and nothing
 * else, and the names are not knowable until the transcripts are ingested. The two that
 * are literals in placeholders.json today are the proof — each was added after someone
 * noticed a specific name, which means the guard is always one incident behind, and each
 * one committed a real person's name to a public repository in order to keep it out.
 *
 * So literal redactions live here instead: a gitignored file, populated from the live
 * dataset by refresh-local-redactions.mjs. The rule travels with the operator who can
 * already see the data, and never with the repository.
 *
 * Entries are `{ find, replace, label }`. `label` is what gets reported when one of
 * these matches — callers must print the label and never `find`, or a leak warning in
 * CI output becomes the leak.
 */
export function loadLocalRedactions(file = localRedactionsPath) {
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries = Array.isArray(raw) ? raw : (raw.redactions ?? []);
  return entries
    .filter((r) => r && typeof r.find === "string" && r.find.length >= 3)
    .map((r, i) => ({
      // Word boundaries only where they mean something. A literal ending in "." — an
      // initial, a file extension — has no word boundary after it, and \b there would
      // never match.
      pattern:
        (/^\w/.test(r.find) ? "\\b" : "") +
        escapeLiteral(r.find) +
        (/\w$/.test(r.find) ? "\\b" : ""),
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

/** Redaction patterns that matched nothing — a rule that has silently stopped working. */
export function findStaleRedactions(text, redactions) {
  return redactions
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
