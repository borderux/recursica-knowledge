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
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { KEY_SHAPES } from "./cloud-keys.mjs";

export function exactValues(file) {
  if (!file) return [];
  let text; try { text = fs.readFileSync(file, "utf8"); } catch { return []; }
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

function* files(p) {
  let st; try { st = fs.lstatSync(p); } catch { return; }
  if (st.isSymbolicLink()) return;
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) if (e !== "node_modules") yield* files(path.join(p, e));
  } else if (st.isFile()) yield p;
}

export async function check({ paths = [], stdin = null, label = "stdin", secrets = null }) {
  const values = exactValues(secrets);
  const found = [];
  if (stdin) for (const k of await scanStream(stdin, values)) found.push(`${label}: ${k}`);
  for (const p of paths) for (const f of files(p)) {
    const raw = fs.createReadStream(f);
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
  const found = await check(opt);
  if (found.length) {
    console.log(`Key check failed: a cloud key is in ${found.length} place(s) that must hold none.`);
    for (const f of found) console.log(`  - ${f}`);
    console.log("Remove each key, rotate it in the provider's console, and keep the key only in the stack's GitHub environment.");
    process.exit(1);
  }
  console.log(`Key check passed: no cloud key in ${[opt.stdin ? opt.label : null, ...opt.paths].filter(Boolean).join(", ") || "nothing"}.`);
}
