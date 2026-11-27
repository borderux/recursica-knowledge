#!/usr/bin/env node
// The knowledge MCP server's keys: one per caller in site.json's knowledge block (kit/knowledge.mjs).
// circlechat/knowledge-mcp.sh runs it as root, the way circlechat/rc-service.sh makes a service's
// gateway key. Run it again by hand the same way:
//
//   node kit/knowledge.mjs callers <site.json> | sudo node kit/knowledge-keys.mjs --group <server account>
//   ... | sudo node kit/knowledge-keys.mjs --group <server account> --rotate <caller>
//
// stdin: the callers, as kit/knowledge.mjs callers prints them (read from site.json as the owner).
// For each caller:
//   - The server keeps only the key's SHA-256, in /var/lib/recursica-knowledge/keys.json, which
//     belongs to root and the server account's group, mode 440. The server reads the file again
//     when it changes, so a new key works with no restart.
//   - The key goes into each of the caller's files: the file belongs to the file's account, mode
//     400, in a folder that belongs to root with no write for the group or others. The key is
//     written to a new file in that folder, which then takes the old file's place in one step, so
//     root never writes through a link and the caller reads the old key or the new one, never half.
//   - The recursicachat caller's key goes to /var/lib/recursica-knowledge/recursicachat.key, root's
//     own, mode 400. The agent sync gives the key to the RecursicaChat server (kit/rc-knowledge.mjs).
//   - A key stays while every one of the caller's files holds it. A new key is made when a file is
//     missing, empty or holds another key, when the caller has no key yet, or with --rotate. The
//     old key stops working once keys.json holds the new key's hash.
//   - A caller no longer in site.json loses its key. Its files stay, holding a key that no longer works.
// No key is ever printed, logged or put in an argument. A failure for one caller says why and goes
// on to the next; the script then exits 1.
//
// KNOWLEDGE_STATE_DIR and KNOWLEDGE_ROOT_OWNER are for the tests.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { KNOWLEDGE_STATE, RC_CALLER } from "./knowledge.mjs";

export const KEY_PREFIX = "ckm_";
const KEY = /^ckm_[0-9a-f]{48}$/;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const newKey = () => `${KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;

/** The callers from stdin's lines: { name: [{ account, file }] }, with no files for recursicachat. */
export function parseCallers(text) {
  const out = {};
  for (const line of String(text).split("\n")) {
    if (!line.trim()) continue;
    const [name, account, file] = line.split("\t");
    out[name] ??= [];
    if (account !== "-") out[name].push({ account, file });
  }
  return out;
}

/** The recorded hashes: { name: { sha256, issued } }. A missing or broken file records nothing. */
export function loadRecords(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    return j && typeof j.callers === "object" ? j.callers : {};
  } catch { return {}; }
}

/** Whether a file holds the key whose hash is recorded. Never through a link, and prints nothing of the key. */
export function holdsKey(file, hash) {
  if (!hash) return false;
  let fd;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch { return false; }
  try {
    const got = sha256(fs.readFileSync(fd, "utf8").trim());
    return got.length === hash.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(hash));
  } catch { return false; } finally { fs.closeSync(fd); }
}

/** Why root must not write in a key file's folder, or null: the folder must be root's, with no write for others. */
export function folderProblem(dir, rootUid = 0, fsx = fs) {
  let st;
  try { st = fsx.lstatSync(dir); } catch { return `the folder ${dir} is missing`; }
  if (!st.isDirectory()) return `${dir} is not a folder`;
  if (st.uid !== rootUid || (st.mode & 0o022) !== 0) return `${dir} must belong to root, with no write for the group or others`;
  return null;
}

/** Writes text to a new file in file's folder, owned by uid:gid with the mode, then renames it over file. */
export function replaceFile(file, text, { uid, gid = -1, mode = 0o400 }) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.new-${crypto.randomBytes(6).toString("hex")}`);
  const fd = fs.openSync(tmp, "wx", 0o600);
  try {
    fs.writeSync(fd, text);
    fs.fchownSync(fd, uid, gid);
    fs.fchmodSync(fd, mode);
  } catch (e) {
    fs.closeSync(fd);
    fs.rmSync(tmp, { force: true });
    throw e;
  }
  fs.closeSync(fd);
  try { fs.renameSync(tmp, file); } catch (e) { fs.rmSync(tmp, { force: true }); throw e; }
}

const idOf = (flag, name) => {
  const r = spawnSync("id", [flag, name], { encoding: "utf8" });
  const n = Number(String(r.stdout).trim());
  return r.status === 0 && Number.isInteger(n) ? n : null;
};

/**
 * Makes what is missing. Returns { lines, failed }.
 *   callers: parseCallers' answer; group: the server account (its group reads keys.json)
 *   rotate: a caller's name, or ""; dir: the state folder; ids: (account) → uid, gid of the group
 */
export function makeKeys({ callers, group, rotate = "", dir = KNOWLEDGE_STATE, rootUid = 0, uidOf = (a) => idOf("-u", a), gidOf = (g) => idOf("-g", g), keyOf = newKey, now = () => new Date() }) {
  const lines = [];
  let failed = false;
  const say = (t) => lines.push(t);
  const keysFile = path.join(dir, "keys.json");
  const problem = folderProblem(dir, rootUid);
  if (problem) return { lines: [`keys: ${problem}. Run setup-host.sh.`], failed: true };
  const gid = gidOf(group);
  if (gid === null) return { lines: [`keys: there is no account ${group}, the knowledge server's. Run setup-host.sh.`], failed: true };
  const records = loadRecords(keysFile);
  const next = {};
  if (rotate && !callers[rotate]) { say(`${rotate}: no such caller in site.json's knowledge block`); failed = true; }
  for (const [name, files] of Object.entries(callers)) {
    const rec = records[name];
    const targets = name === RC_CALLER && !files.length ? [{ account: "root", file: path.join(dir, "recursicachat.key") }] : files;
    // Every file's folder and account first, so a caller is never half moved to a new key.
    const bad = [];
    for (const t of targets) {
      const p = folderProblem(path.dirname(t.file), rootUid);
      if (p) bad.push(p);
      else if (t.account !== "root" && uidOf(t.account) === null) bad.push(`there is no account ${t.account}`);
    }
    if (bad.length) {
      say(`${name}: ${[...new Set(bad)].join("; ")}. The caller keeps ${rec ? "its key" : "no key"} until this is fixed.`);
      failed = true;
      if (rec) next[name] = rec;
      continue;
    }
    const stale = targets.filter((t) => !holdsKey(t.file, rec?.sha256));
    let need = rotate === name ? "a new key, as asked" : !rec ? "no key yet" : stale.length ? `${stale.map((t) => t.file).join(", ")} holds no key the server knows` : "";
    if (!need) { next[name] = rec; say(`${name}: the key is current`); continue; }
    const key = keyOf();
    if (!KEY.test(key)) throw new Error("a new key has the wrong shape");
    try {
      for (const t of targets) replaceFile(t.file, `${key}\n`, { uid: t.account === "root" ? rootUid : uidOf(t.account), mode: 0o400 });
    } catch (e) {
      say(`${name}: could not write the new key (${e.code ?? e.message}). The caller keeps ${rec ? "its old key" : "no key"}.`);
      failed = true;
      if (rec) next[name] = rec;
      continue;
    }
    next[name] = { sha256: sha256(key), issued: now().toISOString() };
    say(`${name}: a new key in ${targets.map((t) => t.file).join(", ")} (${need}); the old one stops working now`);
  }
  for (const name of Object.keys(records)) if (!(name in callers)) say(`${name}: no longer in site.json, so its key no longer works`);
  replaceFile(keysFile, `${JSON.stringify({ callers: next }, null, 2)}\n`, { uid: rootUid, gid, mode: 0o440 });
  return { lines, failed };
}

export async function main(argv = process.argv.slice(2), { stdin = process.stdin, out = console.log } = {}) {
  let group = "", rotate = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--group") group = argv[++i] ?? "";
    else if (argv[i] === "--rotate") rotate = argv[++i] ?? "";
    else { out("usage: knowledge-keys.mjs --group <server account> [--rotate <caller>] < callers"); return 2; }
  }
  if (!group) { out("usage: knowledge-keys.mjs --group <server account> [--rotate <caller>] < callers"); return 2; }
  if (process.getuid?.() !== 0 && !process.env.KNOWLEDGE_STATE_DIR) { out("Run it as root: the key files belong to root's folders."); return 2; }
  let text = "";
  for await (const c of stdin) text += c;
  const r = makeKeys({ callers: parseCallers(text), group, rotate, dir: process.env.KNOWLEDGE_STATE_DIR ?? KNOWLEDGE_STATE, rootUid: Number(process.env.KNOWLEDGE_ROOT_OWNER ?? 0) });
  for (const l of r.lines) out(`${new Date().toISOString().slice(0, 19)}Z ${l}`);
  return r.failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
