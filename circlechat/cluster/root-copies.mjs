// The root-owned copies of kit files. Each copy is a command that runs as root, and the account that
// runs the command can't change the copy (ROOT_COPIES). The firewall's copies in /var/lib/agent-cluster
// are not here: a person applies the firewall rules (follow-main.mjs). RecursicaChat's scripts are not
// here either: recursicachat/install.sh fills them with values from site.json.
//
// Each hour, at the end of the update job (updater.mjs), each installed copy gets the source file's
// text at the kit checkout's commit:
//   1. Root reads the source file at the commit with git show <commit>:<path>, as the owner. Root
//      never reads the checkout's files, because the owner can edit them.
//   2. The owner can also edit the objects in git's own folder. So root checks the commit, each
//      folder (git's tree) and the file against the id each one has in the commit (fileAt).
//   3. A copy with the same bytes needs nothing, and GitHub isn't asked.
//   4. Before root replaces a copy, GitHub must show the commit as verified and on main. GitHub is
//      asked once for each commit.
//   5. The new copy replaces the old copy in one rename, with the old copy's owner, group and mode.
//   6. The cluster's channel gets one line for each copy the job replaced.
// A commit GitHub doesn't verify replaces no copy, and the channel hears once (notice.mjs).
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { notice } from "./notice.mjs";

// Each root-owned copy, with the script that installs the copy the first time:
//   agent-stacks-apply  deploy/install-secrets-helper.sh, on Linux and macOS
//   agent-stacks-disk   tenant/setup-pc.sh, on Linux and WSL
// The job replaces only a copy that a person installed. A computer without the copy gets none.
export const ROOT_COPIES = [
  { name: "agent-stacks-apply", dest: "/usr/local/bin/agent-stacks-apply", src: "circlechat/deploy/apply-secrets.sh" },
  { name: "agent-stacks-disk", dest: "/usr/local/bin/agent-stacks-disk", src: "circlechat/tenant/disk-helper.sh" },
];

// A full commit id: 40 characters for SHA-1, 64 for SHA-256.
const FULL_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const short = (id) => String(id).slice(0, 7);
const list = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// A git object's id: the hash of "<type> <size>\0" followed by the object's bytes.
export function objectId(type, bytes, algo = "sha1") {
  return createHash(algo).update(`${type} ${bytes.length}\0`).update(bytes).digest("hex");
}

// The entries of one git tree object: { mode, name, id } for each file and folder in the folder.
//   size: the bytes in one id, 20 for SHA-1 and 32 for SHA-256
export function treeEntries(bytes, size = 20) {
  const out = [];
  for (let i = 0; i < bytes.length;) {
    const space = bytes.indexOf(0x20, i), nul = space < 0 ? -1 : bytes.indexOf(0, space);
    if (nul < 0 || nul + 1 + size > bytes.length) throw new Error("a git tree has a broken entry");
    out.push({ mode: bytes.toString("latin1", i, space), name: bytes.toString("utf8", space + 1, nul), id: bytes.toString("hex", nul + 1, nul + 1 + size) });
    i = nul + 1 + size;
  }
  return out;
}

// The bytes of one file at a commit, or null when the commit has no plain file at the path. Throws
// when an object on the way has bytes that don't match the object's id.
//   cat(type, id): the bytes of git cat-file <type> <id>, or null
//   show(commit, file): the bytes of git show <commit>:<file>, or null
export function fileAt({ commit, file, cat, show }) {
  if (!FULL_ID.test(commit)) throw new Error(`"${commit}" is not a full commit id`);
  const algo = commit.length === 64 ? "sha256" : "sha1";
  const checked = (type, id) => {
    const bytes = cat(type, id);
    if (!bytes || objectId(type, bytes, algo) !== id) throw new Error(`git's ${type} ${short(id)} doesn't match the ${type}'s id`);
    return bytes;
  };
  const tree = checked("commit", commit).toString("latin1").match(/^tree ([0-9a-f]+)\n/)?.[1];
  if (!tree) throw new Error(`commit ${short(commit)} names no tree`);
  let entry = { mode: "40000", id: tree };
  for (const part of file.split("/")) {
    if (entry.mode !== "40000") return null;
    entry = treeEntries(checked("tree", entry.id), commit.length / 2).find((e) => e.name === part);
    if (!entry) return null;
  }
  // A link or a folder at the path is no file to copy.
  if (entry.mode !== "100644" && entry.mode !== "100755") return null;
  const bytes = show(commit, file);
  if (!bytes || objectId("blob", bytes, algo) !== entry.id) throw new Error(`git show ${short(commit)}:${file} doesn't match the file's id in the commit`);
  return bytes;
}

// Whether GitHub shows the commit as verified, and main on GitHub holds the commit.
//   get(url): the parsed JSON of one GitHub API page
//   returns { ok: true }, { ok: false, reason }, or { error } when GitHub can't be asked
export async function verifiedOnMain({ repo, commit, get }) {
  if (!repo) return { ok: false, reason: "the kit checkout's origin is not on GitHub, so GitHub can't verify the commit" };
  try {
    const c = await get(`https://api.github.com/repos/${repo}/commits/${commit}`);
    if (c?.sha !== commit) return { ok: false, reason: "GitHub has no such commit" };
    if (c.commit?.verification?.verified !== true) return { ok: false, reason: `GitHub shows the commit as not verified (${c.commit?.verification?.reason ?? "no reason given"})` };
    // GitHub compares main against the commit. "identical" or "ahead" means main holds the commit.
    const m = await get(`https://api.github.com/repos/${repo}/compare/${commit}...main`);
    if (m?.status !== "identical" && m?.status !== "ahead") return { ok: false, reason: `main on GitHub doesn't hold the commit (GitHub says "${m?.status ?? "unknown"}")` };
  } catch (e) { return { error: `GitHub can't be asked: ${e.message}` }; }
  return { ok: true };
}

// The real file effects. replace() writes a new file beside the copy, then renames the new file
// over the copy, so the copy is never half written and root never writes through a link.
export const realFiles = {
  lstat: (f) => { try { return fs.lstatSync(f); } catch { return null; } },
  read: (f) => fs.readFileSync(f),
  replace: (dest, bytes, st) => {
    const tmp = path.join(path.dirname(dest), `.${path.basename(dest)}.new-${randomBytes(6).toString("hex")}`);
    try {
      const fd = fs.openSync(tmp, "wx", 0o600);
      try {
        fs.writeSync(fd, bytes);
        // chown before chmod: chown clears the setuid and setgid bits.
        fs.fchownSync(fd, st.uid, st.gid);
        fs.fchmodSync(fd, st.mode & 0o7777);
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, dest);
    } catch (e) { fs.rmSync(tmp, { force: true }); throw e; }
  },
};

// One hourly run of the refresh. Every outside effect comes through the arguments, for the tests:
//   commit: the kit checkout's commit, from git rev-parse HEAD
//   cat, show: as in fileAt; verify(commit): verifiedOnMain's answer for the commit
//   files: { lstat, read, replace } as in realFiles; post(text): one post in the cluster's channel
//   state: the update job's state object, changed in place (state.rootCopies)
//   returns the names of the copies the job replaced
export async function refreshRootCopies({ computer, commit, copies = ROOT_COPIES, cat, show, verify, files = realFiles, post, state, now = Date.now }) {
  const rc = (state.rootCopies ??= {});
  const due = [];
  for (const c of copies) {
    const st = files.lstat(c.dest);
    if (!st) continue;
    if (!st.isFile()) { console.error(`${c.name}: ${c.dest} is not a plain file, so the job leaves the copy alone`); continue; }
    let bytes;
    try { bytes = fileAt({ commit, file: c.src, cat, show }); } catch (e) { console.error(`${c.name}: ${e.message}`); continue; }
    if (!bytes) { console.error(`${c.name}: the kit at ${short(commit)} has no file ${c.src}`); continue; }
    if (Buffer.compare(bytes, files.read(c.dest)) !== 0) due.push({ ...c, bytes, st });
  }
  if (!due.length) return [];
  if (rc.verified !== commit) {
    const v = await verify(commit);
    if (v.error) { console.error(`root copies: ${v.error}. The next hour asks again.`); return []; }
    if (!v.ok) {
      const names = due.map((c) => c.name);
      await notice(rc, "told", `unverified:${commit}`, `:rotating_light: Kit on ${computer}: ${list(names)} ${names.length === 1 ? "keeps" : "keep"} the old version. The kit checkout is at ${short(commit)}, and ${v.reason}. A person checks the checkout.`, post, now());
      return [];
    }
    rc.verified = commit;
  }
  const done = [];
  for (const c of due) {
    try { files.replace(c.dest, c.bytes, c.st); } catch (e) { console.error(`${c.name}: replacing ${c.dest} failed: ${e.message}`); continue; }
    done.push(c.name);
    await post(`:arrows_counterclockwise: Kit on ${computer}: ${c.dest} now runs ${c.src} from ${short(commit)}.`).catch(() => {});
  }
  return done;
}

// The kit folder that /etc/agent-stacks.conf names, or "" with no config. The secrets helper runs
// the kit in that folder (install-secrets-helper.sh).
export function helperKit(text) {
  const m = String(text ?? "").match(/^KIT=(.*)$/m);
  return m ? m[1].replace(/^'(.*)'$/, "$1").replace(/\\(.)/g, "$1") : "";
}
