/**
 * Shared placeholder handling for the export and restore scripts.
 *
 * Prompts in this repository are stored with `{{TOKEN}}` markers wherever a value
 * is specific to one installation — a cloud project, a repository, a checkout path.
 * The real values live in `local-values.json`, which is gitignored.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const buzzAgentsDir = path.join(__dirname, "..");
export const placeholdersPath = path.join(buzzAgentsDir, "placeholders.json");
export const localValuesPath = path.join(buzzAgentsDir, "local-values.json");

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
