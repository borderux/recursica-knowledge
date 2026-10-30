#!/usr/bin/env node
// The key check: fails when a cloud model key or a private key is in a place that must hold none,
// such as CircleChat's database, an agent's Hermes home or a backup. The check finds a key two ways:
// the exact values in the gateway's secrets file and in the GitHub Apps' key files, when the check
// can read them, and the shapes of the keys: the providers' keys (cloud-keys.mjs), and a private
// key in PEM form, such as a GitHub App's. The check prints where a key is and which kind, never the
// key.
//
//   node key-check.mjs [--secrets <file>] [--private-keys <folder>] [--stdin <label>] [<file or folder>...]
//
// --stdin reads one stream, such as a database dump, and names the stream <label> in the report.
// A .gz file is read unpacked. Exit 0: no key found. Exit 1: a key was found.
//
// Root runs the check over the agents' homes and the shared workspace, which agents can change.
// The check never follows a symlink: each symlink is skipped, and the report names the symlink,
// never the file the symlink names. The gateway's secrets file is read the same way.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { KEY_SHAPES } from "./cloud-keys.mjs";

const { O_RDONLY, O_NOFOLLOW } = fs.constants;
// A file descriptor for <file>, never through a symlink: null, and the path in <skipped>, for one.
function openNoFollow(file, skipped) {
  try { return fs.openSync(file, O_RDONLY | O_NOFOLLOW); } catch (e) {
    if (e.code === "ELOOP" || e.code === "EMLINK") skipped.push(file);
    return null;
  }
}

// A private key in PEM form. A GitHub App's private key is one (github/apps.mjs).
//
// The BEGIN line alone is not a key: code and documentation name the marker too, such as npm's
// help text for its `key` setting, whose example reads
// "-----BEGIN PRIVATE KEY-----\nXXXX\nXXXX\n-----END PRIVATE KEY-----". Node's compile cache holds
// that text whenever npm has run, so the marker alone failed the check on a cache in an agent's
// home. A private key has a body: base64 right after the BEGIN line, at least PRIVATE_KEY_BODY
// characters. The smallest real body, an Ed25519 key's, is 64. Between the lines of the body may
// be real line breaks, or the line breaks written as \n, as in an .env file or JSON, with one
// backslash or more, as in a database dump. An older encrypted key starts its body with
// Proc-Type: and DEK-Info: header lines. A body with no END marker, such as a key cut off in a
// log, still counts.
export const PRIVATE_KEY = /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED |DSA )?PRIVATE KEY-----/g;
export const PRIVATE_KEY_BODY = 40;
// A line break inside a body: a real one, or one written as \n or \r with one backslash or more, with
// spaces or tabs around it, as in an indented YAML value. A space alone is not one: prose after a
// marker is words separated by spaces, never a body.
const BREAK = String.raw`(?:[ \t]*(?:\r|\n|\\+[nr])[ \t]*)`;
const PEM_HEADERS = new RegExp(String.raw`^${BREAK}*(?:(?:Proc-Type|DEK-Info):[^\n\\]*${BREAK}+)*`);
const PEM_BODY = new RegExp(String.raw`^(?:[A-Za-z0-9+/=]|${BREAK})*`);

// True when <text> holds a private key in PEM form: a BEGIN line followed by a key body.
export function hasPrivateKey(text) {
  PRIVATE_KEY.lastIndex = 0;
  for (let m; (m = PRIVATE_KEY.exec(text)); ) {
    let rest = text.slice(m.index + m[0].length, m.index + m[0].length + 10_000);
    rest = rest.slice(rest.match(PEM_HEADERS)[0].length);
    const body = rest.match(PEM_BODY)[0].replace(new RegExp(BREAK, "g"), "");
    if (body.length >= PRIVATE_KEY_BODY) return true;
  }
  return false;
}
const SHAPES = [...KEY_SHAPES, ["a private key", { test: hasPrivateKey, lastIndex: 0 }]];

// The first line of each private key's body in a folder of .pem files: a key without its PEM
// header still matches.
export function privateKeyValues(dir, skipped = []) {
  if (!dir) return [];
  let names = []; try { names = fs.readdirSync(dir).filter((n) => n.endsWith(".pem")); } catch { return []; }
  const out = [];
  for (const n of names) {
    const fd = openNoFollow(path.join(dir, n), skipped);
    if (fd === null) continue;
    try { const line = fs.readFileSync(fd, "utf8").split("\n").find((l) => l && !l.startsWith("-----")); if (line && line.length >= 40) out.push(line.trim()); } catch {} finally { fs.closeSync(fd); }
  }
  return out;
}

export function exactValues(file, skipped = []) {
  if (!file) return [];
  const fd = openNoFollow(file, skipped);
  if (fd === null) return [];
  let text; try { text = fs.readFileSync(fd, "utf8"); } catch { return []; } finally { fs.closeSync(fd); }
  const out = [];
  for (const line of text.split("\n")) {
    const v = line.slice(line.indexOf("=") + 1).trim();
    if (line.includes("=") && !line.startsWith("#") && v.length >= 16) out.push(...v.split(":").filter((p) => p.length >= 16));
  }
  return out;
}

// Scan one stream. Keeps the last 512 characters of each chunk, so a key cut in two still matches.
export async function scanStream(stream, values) {
  const kinds = new Set();
  let tail = "";
  for await (const chunk of stream) {
    const text = tail + chunk.toString("latin1");
    for (const [kind, re] of SHAPES) { re.lastIndex = 0; if (re.test(text)) kinds.add(kind); }
    // Each value is a string from the gateway's secrets file, or { value, kind }.
    for (const v of values) if (text.includes(v.value ?? v)) kinds.add(v.kind ?? "a key from the gateway's secrets file");
    tail = text.slice(-512);
  }
  return [...kinds];
}

// Each real file in <p>. A symlink, to a file or a folder, goes in <skipped> and is never followed.
function* files(p, skipped) {
  let st; try { st = fs.lstatSync(p); } catch { return; }
  if (st.isSymbolicLink()) { skipped.push(p); return; }
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) if (e !== "node_modules") yield* files(path.join(p, e), skipped);
  } else if (st.isFile()) yield p;
}

//   skipped: gets the path of each symlink the check did not follow
export async function check({ paths = [], stdin = null, label = "stdin", secrets = null, privateKeys = null, skipped = [] }) {
  const values = [...exactValues(secrets, skipped), ...privateKeyValues(privateKeys, skipped).map((value) => ({ value, kind: "a GitHub App's private key" }))];
  const found = [];
  if (stdin) for (const k of await scanStream(stdin, values)) found.push(`${label}: ${k}`);
  for (const p of paths) for (const f of files(p, skipped)) {
    // A file swapped for a symlink after the walk: skipped too.
    const fd = openNoFollow(f, skipped);
    if (fd === null) continue;
    const raw = fs.createReadStream(null, { fd });
    const s = f.endsWith(".gz") || f.endsWith(".tgz") ? raw.pipe(zlib.createGunzip()).on("error", () => {}) : raw;
    try { for (const k of await scanStream(s, values)) found.push(`${f}: ${k}`); } catch { /* an unreadable or broken file holds no readable key */ }
  }
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = { paths: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--secrets") opt.secrets = args[++i];
    else if (args[i] === "--private-keys") opt.privateKeys = args[++i];
    else if (args[i] === "--stdin") { opt.stdin = process.stdin; opt.label = args[++i] ?? "stdin"; }
    else opt.paths.push(args[i]);
  }
  const skipped = [];
  const found = await check({ ...opt, skipped });
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} symlink(s), never followed or read:`);
    for (const f of skipped) console.log(`  - ${f}`);
  }
  if (found.length) {
    console.log(`Key check failed: a cloud key or a private key is in ${found.length} place(s) that must hold none.`);
    for (const f of found) console.log(`  - ${f}`);
    console.log("Remove each key, rotate it in the provider's console or the GitHub App's settings, and keep the key only in the stack's GitHub environment.");
    process.exit(1);
  }
  console.log(`Key check passed: no cloud key and no private key in ${[opt.stdin ? opt.label : null, ...opt.paths].filter(Boolean).join(", ") || "nothing"}.`);
}
