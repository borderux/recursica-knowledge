#!/usr/bin/env node
// The key check: fails when a cloud model key is in a place that must hold none, such as
// CircleChat's database, an agent's Hermes home or a backup. The check finds a key two ways: the
// exact values in the gateway's secrets file, when the check can read that file, and the shapes of
// the providers' keys (cloud-keys.mjs). The check prints where a key is and which kind, never the key.
//
//   node key-check.mjs [--secrets <file>] [--stdin <label>] [<file or folder>...]
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
    for (const [kind, re] of KEY_SHAPES) { re.lastIndex = 0; if (re.test(text)) kinds.add(kind); }
    for (const v of values) if (text.includes(v)) kinds.add("a key from the gateway's secrets file");
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
export async function check({ paths = [], stdin = null, label = "stdin", secrets = null, skipped = [] }) {
  const values = exactValues(secrets, skipped);
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
    console.log(`Key check failed: a cloud key is in ${found.length} place(s) that must hold none.`);
    for (const f of found) console.log(`  - ${f}`);
    console.log("Remove each key, rotate it in the provider's console, and keep the key only in the stack's GitHub environment.");
    process.exit(1);
  }
  console.log(`Key check passed: no cloud key in ${[opt.stdin ? opt.label : null, ...opt.paths].filter(Boolean).join(", ") || "nothing"}.`);
}
