#!/usr/bin/env node
/**
 * Rebuild buzz-agents/local-redactions.json from what is actually in a client dataset.
 *
 * The problem this solves: research participant names cannot be enumerated in advance.
 * They arrive with the transcripts, they are real people, and `participants` stores them
 * as given — there is no pseudonymisation layer (see RESEARCH_CHANNEL_DATASET_SCHEMA.md,
 * the `participants` table). A hand-maintained denylist of names is therefore always one
 * incident behind, and writing the names into a versioned file to protect them is
 * self-defeating.
 *
 * So the list is derived instead. This reads the two places a real name reaches text a
 * person might paste into a report, an issue, or a commit message:
 *
 *   participants.participant_name   the interviewee
 *   conversations.document_name     the transcript filename, which is usually their name
 *
 * and writes them to the gitignored local-redactions.json, where export-agents.mjs picks
 * them up as redactions and as leak checks. Re-run it after ingesting new transcripts.
 *
 * Deliberately self-contained: it mints its own access token rather than shelling out to
 * mcp/bin/bq-exec.mjs, which is not versioned in this repository — a dependency on it
 * would make this script work only on machines that already have a full nest.
 *
 * Usage:
 *   node buzz-agents/scripts/refresh-local-redactions.mjs \
 *     --key ~/.buzz/.secrets/claire-<slug>-service-user.json \
 *     --dataset research_<slug> [--dataset research_<other>] \
 *     [--project <id>] [--out <path>] [--dry-run]
 *
 *   --project   defaults to project_id from the key file.
 *   --dry-run   report counts and write nothing.
 *
 * Exit: 0 written (or nothing to do), 1 usage, 2 query failed.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSign } from "node:crypto";
import { localRedactionsPath } from "../lib/placeholders.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};
const flagAll = (name) =>
  argv.reduce(
    (acc, a, i) => (a === `--${name}` ? [...acc, argv[i + 1]] : acc),
    [],
  );
const has = (name) => argv.includes(`--${name}`);

const expand = (p) =>
  p?.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;

const keyPath = expand(flag("key"));
const datasets = flagAll("dataset").filter(Boolean);
const outPath = expand(flag("out")) ?? localRedactionsPath;
const dryRun = has("dry-run");

function die(msg, code = 1) {
  console.error(`refresh-local-redactions: ${msg}`);
  process.exit(code);
}

if (!keyPath) die("--key is required (a service-account JSON key)");
if (!datasets.length) die("--dataset is required (repeatable)");
if (!fs.existsSync(keyPath)) die(`no key at ${keyPath}`);

const creds = JSON.parse(fs.readFileSync(keyPath, "utf8"));
if (creds.type !== "service_account") {
  die(`key at ${keyPath} is type "${creds.type}", expected "service_account"`);
}
const project = flag("project") ?? creds.project_id;
if (!project) die("no --project and the key carries no project_id");

// ---------------------------------------------------------------- auth

const b64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer
    .sign(creds.private_key, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = await res.text();
  if (!res.ok) die(`token exchange failed (${res.status}): ${body}`, 2);
  return JSON.parse(body).access_token;
}

// ---------------------------------------------------------------- query

async function query(token, sql) {
  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(project)}/queries`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        timeoutMs: 60000,
      }),
    },
  );
  const body = await res.text();
  if (!res.ok) die(`query failed (${res.status}): ${body.slice(0, 400)}`, 2);
  const parsed = JSON.parse(body);
  return (parsed.rows ?? []).map((r) => r.f.map((c) => c.v));
}

// One statement per dataset rather than a UNION across all of them: a dataset the key
// cannot reach should skip that client, not fail the whole refresh.
const sqlFor = (dataset) => `
  SELECT DISTINCT kind, value FROM (
    SELECT 'participant' AS kind, participant_name AS value
    FROM \`${project}.${dataset}.participants\`
    WHERE participant_name IS NOT NULL AND participant_name != ''
    UNION ALL
    SELECT 'document' AS kind, document_name AS value
    FROM \`${project}.${dataset}.conversations\`
    WHERE document_name IS NOT NULL AND document_name != ''
  )
  ORDER BY kind, value`;

const token = await accessToken();
const found = { participant: new Set(), document: new Set() };

for (const dataset of datasets) {
  const rows = await query(token, sqlFor(dataset));
  for (const [kind, value] of rows) found[kind]?.add(value.trim());
  console.log(`  ${dataset}: ${rows.length} name(s)`);
}

// ---------------------------------------------------------------- build

// Too short to redact safely: a two-character literal inside a word boundary still
// collides with far too much ordinary text, and a redaction that mangles unrelated
// prose gets switched off by whoever it annoys. Reported rather than dropped quietly.
const TOO_SHORT = [];
const longEnough = (v, min, kind) => {
  if (v.length >= min) return true;
  // The length, never the value: this list gets printed.
  TOO_SHORT.push(`${kind} of ${v.length} char(s)`);
  return false;
};

const keep = (kind) =>
  [...found[kind]].sort().filter((v) => longEnough(v, 3, kind));

const participants = keep("participant");
const documents = keep("document");

/**
 * Whole values are not enough, and the first dataset this ran against showed both ways
 * they fall short.
 *
 * `document_name` is stored in full — "<Cohort> Interview Transcript - <Name>.docx" —
 * but nobody writes that in a report. They write "<Name>.docx", and a whole-string
 * redaction sails straight past it. Every filename in that dataset put the person after
 * the last " - ", so the name-bearing tail is recoverable structurally.
 *
 * And `participants` under-covers: one person there appeared only in a filename and
 * never in the participants table, so deriving from participant_name alone would have
 * missed them entirely. The filename tail is what caught them.
 *
 * Splitting participant names into single words is NOT done by default, and the reason
 * is worth keeping. It was tried, and it turned an ordinary English word that happened
 * to be somebody's surname into a redaction — which then rewrote that word inside an
 * unrelated code comment. A redaction that corrupts prose is a redaction someone
 * switches off. --split-names is there for a client whose reports use surnames alone,
 * and it warns, because the caller is accepting that trade.
 */
const nameBearing = (filename) => {
  const tail = filename.includes(" - ")
    ? filename.split(" - ").pop().trim()
    : filename;
  const stem = tail.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  return [tail, stem];
};

const seen = new Set([...participants, ...documents]);
const derived = [];
const addDerived = (value, min, kind) => {
  const v = value.trim();
  if (seen.has(v) || !/[A-Za-z]/.test(v) || !longEnough(v, min, kind)) return;
  seen.add(v);
  derived.push(v);
};

for (const doc of documents)
  for (const part of nameBearing(doc)) addDerived(part, 3, "filename part");

if (has("split-names")) {
  console.warn(
    "  ! --split-names: single words from participant names become redactions. A name that is\n" +
      "    also an ordinary word will rewrite that word in unrelated text. Check the export output.",
  );
  for (const person of participants)
    for (const word of person.split(/\s+/)) addDerived(word, 4, "name part");
}

const redactions = [
  ...participants.map((find, i) => ({
    find,
    replace: `Participant ${i + 1}`,
    label: `participant name ${i + 1}`,
  })),
  ...documents.map((find, i) => ({
    find,
    replace: `[transcript ${i + 1}]`,
    label: `transcript filename ${i + 1}`,
  })),
  ...derived.map((find, i) => ({
    find,
    replace: "[redacted name]",
    label: `derived name part ${i + 1}`,
  })),
];

const out = {
  $comment: [
    "GENERATED — do not edit by hand, and do not commit. Rebuild with:",
    "  node buzz-agents/scripts/refresh-local-redactions.mjs --key <key> --dataset <dataset>",
    "",
    "Real participant names and transcript filenames, from the live dataset. These are",
    "literal redactions, which is why they live in a gitignored file rather than in",
    "placeholders.json — see loadLocalRedactions() in lib/placeholders.mjs.",
    "Re-run after ingesting new transcripts; the guard only covers what it has seen.",
  ],
  datasets,
  redactions,
};

console.log(
  `\n  ${participants.length} participant name(s), ${documents.length} transcript filename(s), ` +
    `${derived.length} derived name part(s)`,
);
if (TOO_SHORT.length) {
  console.warn(
    `  ! ${TOO_SHORT.length} value(s) too short to redact safely and NOT covered: ${TOO_SHORT.join(", ")}`,
  );
}

if (dryRun) {
  console.log("\n  --dry-run: nothing written.");
} else {
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(`\n  wrote ${path.relative(process.cwd(), outPath)}`);
}
