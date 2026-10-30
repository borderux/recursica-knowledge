// Files the kit writes into a place an agent can change: the shared workspace, and each agent's
// Hermes home. An agent can put a symlink anywhere in either one, so a plain cp, tee, sed -i or
// chmod -R would write through the symlink to a file outside, such as a file in the owner's home.
// Every write here keeps to the place:
//   - A folder on the way to the file, from the place down, must be a real folder. A symlinked
//     folder is refused, and nothing is written.
//   - Each file is written as a new file in the same folder, then moved into place. The move
//     replaces a symlink at the file's own name, and never writes to the file the symlink names.
//   - A read never follows a symlink, so no file outside reaches the place.
//   - A copy takes only real files and folders from the source, the kit's own checkout.
//
//   node safe-files.mjs copy  <place> <destination folder> <source>...   each source to
//                             <destination folder>/<source's name>; a source folder named "."
//                             puts the folder's contents in the destination folder
//   node safe-files.mjs write <place> <file> [mode]     the file's new text on stdin
//   node safe-files.mjs read  <place> <file>            the file's text, or nothing when missing
//   node safe-files.mjs mkdir <place> <folder> [mode]
//   node safe-files.mjs chmod <place> <folder> <mode>   every real file and folder in the folder
//   node safe-files.mjs own   <place> <home> <uid:gid>  an agent's home to the agent's account
//   node safe-files.mjs own-file <place> <file> <uid:gid> <mode>   one file's owner and mode
//
// A mode is octal, such as 600. A replaced file keeps the old file's mode, owner and group.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const { O_RDONLY, O_NOFOLLOW, O_NONBLOCK } = fs.constants;

export class Refused extends Error {}

// The real folder for <dir>, which must sit in <place>. Creates missing folders with <mode>.
function realDir(place, dir, { create = false, mode = 0o755 } = {}) {
  const base = path.resolve(place), target = path.resolve(dir);
  const rel = path.relative(base, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Refused(`${target} is outside ${base}.`);
  let cur = base;
  for (const part of ["", ...rel.split(path.sep).filter(Boolean)]) {
    cur = part ? path.join(cur, part) : cur;
    let st;
    try { st = fs.lstatSync(cur); } catch (e) {
      if (e.code !== "ENOENT" || !create) throw e;
      fs.mkdirSync(cur, { mode });
      st = fs.lstatSync(cur);
    }
    if (st.isSymbolicLink()) throw new Refused(`${cur} is a symlink. Replace the symlink with a folder.`);
    if (!st.isDirectory()) throw new Refused(`${cur} is not a folder.`);
  }
  return fs.realpathSync(target);
}

// The file's text, or null when the file is missing. A symlink is refused.
export function readFile(place, file) {
  try { realDir(place, path.dirname(file)); } catch (e) { if (e.code === "ENOENT") return null; throw e; }
  let fd;
  try { fd = fs.openSync(file, O_RDONLY | O_NOFOLLOW); } catch (e) {
    if (e.code === "ENOENT") return null;
    if (e.code === "ELOOP" || e.code === "EMLINK") throw new Refused(`${file} is a symlink.`);
    throw e;
  }
  try {
    if (!fs.fstatSync(fd).isFile()) throw new Refused(`${file} is not a file.`);
    return fs.readFileSync(fd, "utf8");
  } finally { fs.closeSync(fd); }
}

// Writes <data> as a new file, then moves it into place.
export function writeFile(place, file, data, { mode, createDirs = false } = {}) {
  const dir = realDir(place, path.dirname(file), { create: createDirs });
  let old = null;
  try { old = fs.lstatSync(file); } catch {}
  if (old?.isDirectory()) throw new Refused(`${file} is a folder.`);
  const tmp = path.join(dir, `.${path.basename(file)}.new-${crypto.randomBytes(6).toString("hex")}`);
  const fileMode = mode ?? (old?.isFile() ? old.mode & 0o7777 : 0o644);
  const fd = fs.openSync(tmp, "wx", 0o600);
  try {
    fs.writeSync(fd, data);
    if (old?.isFile()) { try { fs.fchownSync(fd, old.uid, old.gid); } catch { /* not root: the file stays the writer's */ } }
    fs.fchmodSync(fd, fileMode);
  } finally { fs.closeSync(fd); }
  // A folder swapped for a symlink while the new file was written: refuse, and leave nothing.
  if (realDir(place, path.dirname(file)) !== dir) { fs.rmSync(tmp, { force: true }); throw new Refused(`${path.dirname(file)} changed while the kit wrote ${file}.`); }
  fs.renameSync(tmp, path.join(dir, path.basename(file)));
}

export function makeDir(place, dir, mode = 0o755) {
  realDir(place, dir, { create: true, mode });
  fs.chmodSync(realDir(place, dir), mode);
}

// Copies the real files and folders in <src> to <dest>. A symlink in the source is left out, and so
// are node_modules and .git, which never belong in a copy.
const SKIP = new Set(["node_modules", ".git"]);
export function copy(place, src, dest) {
  const st = fs.lstatSync(src);
  if (st.isSymbolicLink() || SKIP.has(path.basename(src))) return;
  if (st.isFile()) { writeFile(place, dest, fs.readFileSync(src), { mode: st.mode & 0o755 | 0o644, createDirs: true }); return; }
  if (!st.isDirectory()) return;
  realDir(place, dest, { create: true });
  for (const name of fs.readdirSync(src)) copy(place, path.join(src, name), path.join(dest, name));
}

// Sets <mode> on every real file and folder in <dir>. A symlink is left alone.
export function chmodTree(place, dir, mode) {
  const walk = (p) => {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) return;
    fs.chmodSync(p, mode);
    if (st.isDirectory()) for (const name of fs.readdirSync(p)) walk(path.join(p, name));
  };
  walk(realDir(place, dir));
}

// Gives an agent's home and every real file and folder in it to the agent's account, <uid>:<gid>.
// The home gets mode 700, .env and auth.json in the home 600, and every other file and folder
// loses write for the group and others. Hermes refuses a home that another account can write to.
// Each change goes through a descriptor opened without following a symlink, so a symlink, even one
// swapped in during the walk, is left alone. A socket or a FIFO is left alone too.
const PRIVATE_FILES = new Set([".env", "auth.json"]);
export function ownHome(place, home, uid, gid) {
  const top = realDir(place, home);
  const walk = (p, depth) => {
    let fd;
    try { fd = fs.openSync(p, O_RDONLY | O_NOFOLLOW | O_NONBLOCK); } catch (e) {
      if (["ELOOP", "EMLINK", "ENOENT", "ENXIO"].includes(e.code)) return;
      throw e;
    }
    let st;
    try {
      st = fs.fstatSync(fd);
      if (!st.isFile() && !st.isDirectory()) return;
      fs.fchownSync(fd, uid, gid);
      const old = st.mode & 0o7777;
      const mode = depth === 0 ? 0o700 : depth === 1 && st.isFile() && PRIVATE_FILES.has(path.basename(p)) ? 0o600 : old & ~0o022;
      if (mode !== old) fs.fchmodSync(fd, mode);
    } finally { fs.closeSync(fd); }
    if (!st.isDirectory()) return;
    // A folder swapped for a symlink since the open: its contents are never walked.
    const now = fs.lstatSync(p);
    if (now.dev !== st.dev || now.ino !== st.ino) return;
    for (const name of fs.readdirSync(p)) walk(path.join(p, name), depth + 1);
  };
  walk(top, 0);
}

// Gives one real file in <place> to <uid>:<gid> with <mode>, through a descriptor opened without
// following a symlink. A symlink or a folder at the name is refused.
export function ownFile(place, file, uid, gid, mode) {
  realDir(place, path.dirname(file));
  let fd;
  try { fd = fs.openSync(file, O_RDONLY | O_NOFOLLOW | O_NONBLOCK); } catch (e) {
    if (e.code === "ELOOP" || e.code === "EMLINK") throw new Refused(`${file} is a symlink.`);
    throw e;
  }
  try {
    if (!fs.fstatSync(fd).isFile()) throw new Refused(`${file} is not a file.`);
    fs.fchownSync(fd, uid, gid);
    fs.fchmodSync(fd, mode);
  } finally { fs.closeSync(fd); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, place, a, b] = process.argv.slice(2);
  const mode = (m) => (m === undefined ? undefined : parseInt(m, 8));
  try {
    if (cmd === "copy" && b) for (const src of process.argv.slice(5)) copy(place, src, path.join(a, path.basename(src) === "." ? "" : path.basename(src)));
    else if (cmd === "write" && a) writeFile(place, a, fs.readFileSync(0), { mode: mode(b) });
    else if (cmd === "read" && a) process.stdout.write(readFile(place, a) ?? "");
    else if (cmd === "mkdir" && a) makeDir(place, a, mode(b) ?? 0o755);
    else if (cmd === "chmod" && b) chmodTree(place, a, mode(b));
    else if (cmd === "own" && /^\d+:\d+$/.test(b ?? "")) ownHome(place, a, ...b.split(":").map(Number));
    else if (cmd === "own-file" && /^\d+:\d+$/.test(b ?? "") && /^[0-7]{3,4}$/.test(process.argv[6] ?? "")) ownFile(place, a, ...b.split(":").map(Number), mode(process.argv[6]));
    else { console.error("usage: safe-files.mjs copy|write|read|mkdir|chmod|own|own-file <place> ..."); process.exit(2); }
  } catch (e) {
    console.error(e instanceof Refused ? `Refused: ${e.message} Nothing was written there.` : e.message);
    process.exit(1);
  }
}
