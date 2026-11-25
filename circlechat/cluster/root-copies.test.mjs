import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileAt, helperKit, objectId, realFiles, refreshRootCopies, treeEntries, verifiedOnMain } from "./root-copies.mjs";

const SRC = "circlechat/deploy/apply-secrets.sh";
// The kit's repo in root's /etc/agent-cluster.conf, for the tests.
const KIT_REPO = "acme/kit";
const KIT_ORIGIN = `https://github.com/${KIT_REPO}.git`;

// A kit checkout in a temporary folder, with real git, and an installed copy beside the checkout.
function kit() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "root-copies-"));
  const repo = path.join(dir, "kit"), bin = path.join(dir, "bin");
  fs.mkdirSync(path.join(repo, path.dirname(SRC)), { recursive: true });
  fs.mkdirSync(bin);
  const git = (...a) => {
    const r = spawnSync("git", ["-C", repo, "-c", "user.name=Test", "-c", "user.email=test@acme.com", "-c", "commit.gpgsign=false", "--no-replace-objects", ...a]);
    return r.status === 0 ? r.stdout : null;
  };
  git("init", "--quiet", "-b", "main");
  const commit = (text) => {
    fs.writeFileSync(path.join(repo, SRC), text, { mode: 0o755 });
    git("add", "-A");
    git("commit", "--quiet", "-m", "change");
    return String(git("rev-parse", "HEAD")).trim();
  };
  const dest = path.join(bin, "agent-stacks-apply");
  const posts = [], asked = [], repos = [];
  const run = (c, { verify = async () => ({ ok: true }), state = {}, remote = KIT_ORIGIN, kitRepo = { repo: KIT_REPO }, show = (rev, f) => git("show", "--no-textconv", `${rev}:${f}`) } = {}) => refreshRootCopies({
    computer: "machine-1", commit: c, state, remote, kitRepo,
    copies: [{ name: "agent-stacks-apply", dest, src: SRC }],
    cat: (type, id) => git("cat-file", type, id), show,
    verify: async (x, repo) => { asked.push(x); repos.push(repo); return verify(x); },
    post: async (text) => { posts.push(text); return { ok: true }; },
  });
  return { repo, dest, commit, run, posts, asked, repos, git };
}

test("a changed source replaces the copy, with the copy's path, owner and mode, and one line in the channel", async () => {
  const k = kit();
  k.commit("old helper\n");
  fs.writeFileSync(k.dest, "old helper\n");
  fs.chmodSync(k.dest, 0o751);
  const before = fs.statSync(k.dest);
  const c = k.commit("new helper\n");
  const state = {};
  assert.deepEqual(await k.run(c, { state }), ["agent-stacks-apply"]);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "new helper\n");
  const after = fs.statSync(k.dest);
  assert.equal(after.mode & 0o7777, 0o751, "the copy keeps the copy's mode");
  assert.equal(after.uid, before.uid);
  assert.equal(after.gid, before.gid);
  assert.deepEqual(fs.readdirSync(path.dirname(k.dest)), ["agent-stacks-apply"], "no new file is left beside the copy");
  assert.deepEqual(k.posts, [`:arrows_counterclockwise: Kit on machine-1: ${k.dest} now runs ${SRC} from ${c.slice(0, 7)}.`]);
  assert.deepEqual(k.asked, [c]);
  assert.equal(state.rootCopies.verified, `${KIT_REPO}@${c}`, "GitHub is asked once for each commit in each repo");
  assert.deepEqual(k.repos, [KIT_REPO], "GitHub is asked about the kit's repo from root's file");
});

test("an edited file in the checkout never reaches the copy", async () => {
  const k = kit();
  const c = k.commit("verified helper\n");
  fs.writeFileSync(k.dest, "verified helper\n");
  // The owner edits the checkout's file. The copy matches the commit, so nothing changes.
  fs.writeFileSync(path.join(k.repo, SRC), "owner's edit\n");
  assert.deepEqual(await k.run(c), []);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "verified helper\n");
  // With an old copy, the copy gets the commit's file, never the edit.
  fs.writeFileSync(k.dest, "old helper\n");
  assert.deepEqual(await k.run(c), ["agent-stacks-apply"]);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "verified helper\n");
});

test("an unchanged source copies nothing, posts nothing and asks GitHub nothing", async () => {
  const k = kit();
  const c = k.commit("helper\n");
  fs.writeFileSync(k.dest, "helper\n");
  const mtime = fs.statSync(k.dest).mtimeMs;
  assert.deepEqual(await k.run(c), []);
  assert.equal(fs.statSync(k.dest).mtimeMs, mtime);
  assert.deepEqual(k.posts, []);
  assert.deepEqual(k.asked, []);
  // A computer without the copy gets none.
  fs.rmSync(k.dest);
  assert.deepEqual(await k.run(k.commit("newer helper\n")), []);
  assert.equal(fs.existsSync(k.dest), false);
});

test("a commit GitHub doesn't verify replaces no copy, and the channel hears once", async () => {
  const k = kit();
  fs.writeFileSync(k.dest, "old helper\n");
  const c = k.commit("unverified helper\n");
  const state = {};
  const verify = async () => ({ ok: false, reason: "GitHub shows the commit as not verified (unsigned)" });
  assert.deepEqual(await k.run(c, { verify, state }), []);
  assert.deepEqual(await k.run(c, { verify, state }), []);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "old helper\n");
  assert.equal(k.posts.length, 1);
  assert.match(k.posts[0], /agent-stacks-apply keeps the old version\. The kit checkout is at [0-9a-f]{7}, and GitHub shows the commit as not verified/);
  // GitHub can't be asked: nothing changes, nothing posts, and the next hour asks again.
  assert.deepEqual(await k.run(c, { verify: async () => ({ error: "GitHub can't be asked: HTTP 503" }) }), []);
  assert.equal(k.posts.length, 1);
});

test("bytes from git that don't match the commit's ids never reach the copy", async () => {
  const k = kit();
  fs.writeFileSync(k.dest, "old helper\n");
  const c = k.commit("new helper\n");
  // git show gives other bytes, as from an object the owner changed in git's own folder.
  assert.deepEqual(await k.run(c, { show: () => Buffer.from("owner's object\n") }), []);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "old helper\n");
  // A changed tree stops the walk from the commit to the file.
  const cat = (type, id) => (type === "tree" ? Buffer.from("100644 x\0" + "a".repeat(20)) : k.git("cat-file", type, id));
  assert.throws(() => fileAt({ commit: c, file: SRC, cat, show: () => null }), /tree [0-9a-f]{7} doesn't match/);
  // A short or made-up commit id is refused.
  assert.throws(() => fileAt({ commit: "HEAD", file: SRC, cat, show: () => null }), /not a full commit id/);
  // A missing file, or a folder at the path, is no file to copy.
  const real = { commit: c, cat: (type, id) => k.git("cat-file", type, id), show: (rev, f) => k.git("show", `${rev}:${f}`) };
  assert.equal(fileAt({ ...real, file: "circlechat/deploy/missing.sh" }), null);
  assert.equal(fileAt({ ...real, file: "circlechat/deploy" }), null);
  assert.equal(String(fileAt({ ...real, file: SRC })), "new helper\n");
});

test("an origin changed to another repo replaces no copy, asks GitHub nothing, and posts one alert", async () => {
  const k = kit();
  fs.writeFileSync(k.dest, "old helper\n");
  const c = k.commit("new helper\n");
  const state = {};
  // GitHub would verify the commit in the other repo.
  for (let i = 0; i < 2; i++) assert.deepEqual(await k.run(c, { state, remote: "https://github.com/acme/recursica-knowledge.git" }), []);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "old helper\n");
  assert.deepEqual(k.asked, []);
  assert.equal(k.posts.length, 1, "the same origin alerts once");
  assert.match(k.posts[0], new RegExp(`^:rotating_light: Kit on machine-1: the kit checkout's origin names the GitHub repo acme/recursica-knowledge, not ${KIT_REPO}, the kit's repo in /etc/agent-cluster\\.conf\\.`));
  // The follow step's alert for the same origin counts: the channel hears once in all.
  const shared = { kitOrigin: { key: `origin:${KIT_REPO}:acme/recursica-knowledge`, at: Date.now() } };
  assert.deepEqual(await k.run(c, { state: shared, remote: "https://github.com/acme/recursica-knowledge.git" }), []);
  assert.equal(k.posts.length, 1);
  // The origin set back to the kit's repo: the copy gets the commit's file, and the record clears.
  assert.deepEqual(await k.run(c, { state }), ["agent-stacks-apply"]);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "new helper\n");
  assert.equal(state.kitOrigin, undefined);
  assert.deepEqual(k.asked, [c]);
});

test("a fork's computer replaces the copy from the fork's repo, and a file root can't trust replaces nothing", async () => {
  const k = kit();
  fs.writeFileSync(k.dest, "old helper\n");
  const c = k.commit("fork's helper\n");
  const fork = { remote: "git@github.com:acme/kit-fork.git", kitRepo: { repo: "acme/kit-fork" } };
  assert.deepEqual(await k.run(c, { ...fork, kitRepo: { problem: "/etc/agent-cluster.conf is missing. Run install-cluster.sh" } }), []);
  assert.deepEqual(await k.run(c, { ...fork, kitRepo: { repo: "" } }), []);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "old helper\n");
  assert.deepEqual(k.asked, []);
  assert.match(k.posts[0], /\/etc\/agent-cluster\.conf is missing\. Run install-cluster\.sh\. The update job moves the checkout to no new commit and replaces no root-owned helper\./);
  assert.match(k.posts[1], /the kit's repo is off GitHub/);
  assert.deepEqual(await k.run(c, fork), ["agent-stacks-apply"]);
  assert.equal(fs.readFileSync(k.dest, "utf8"), "fork's helper\n");
  assert.deepEqual(k.repos, ["acme/kit-fork"]);
});

test("an origin at another repo posts nothing while every copy matches the commit", async () => {
  const k = kit();
  const c = k.commit("helper\n");
  fs.writeFileSync(k.dest, "helper\n");
  assert.deepEqual(await k.run(c, { remote: "https://git.acme.com/acme/kit.git" }), []);
  assert.deepEqual(k.posts, [], "a fork's computer with current helpers hears nothing");
  assert.deepEqual(k.asked, []);
});

test("a git object's id and a tree's entries", () => {
  assert.equal(objectId("blob", Buffer.from("")), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  const id = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";
  const tree = Buffer.concat([Buffer.from("100755 run.sh\0"), Buffer.from(id, "hex"), Buffer.from("40000 lib\0"), Buffer.from(id, "hex")]);
  assert.deepEqual(treeEntries(tree), [{ mode: "100755", name: "run.sh", id }, { mode: "40000", name: "lib", id }]);
  assert.throws(() => treeEntries(tree.subarray(0, tree.length - 1)), /broken entry/);
});

test("GitHub must show the commit as verified and on main", async () => {
  const sha = "a".repeat(40);
  const answers = (commit, compare) => async (url) => (url.includes("/compare/") ? compare : commit);
  const verified = { sha, commit: { verification: { verified: true } } };
  assert.deepEqual(await verifiedOnMain({ repo: "acme/kit", commit: sha, get: answers(verified, { status: "ahead" }) }), { ok: true });
  assert.deepEqual(await verifiedOnMain({ repo: "acme/kit", commit: sha, get: answers(verified, { status: "identical" }) }), { ok: true });
  assert.match((await verifiedOnMain({ repo: "acme/kit", commit: sha, get: answers(verified, { status: "diverged" }) })).reason, /main on GitHub doesn't hold the commit/);
  assert.match((await verifiedOnMain({ repo: "acme/kit", commit: sha, get: answers({ sha, commit: { verification: { verified: false, reason: "unsigned" } } }, { status: "ahead" }) })).reason, /not verified \(unsigned\)/);
  assert.match((await verifiedOnMain({ repo: "acme/kit", commit: sha, get: async () => { throw new Error("HTTP 503"); } })).error, /HTTP 503/);
  const urls = [];
  await verifiedOnMain({ repo: "acme/kit", commit: sha, get: async (u) => { urls.push(u); return u.includes("/compare/") ? { status: "ahead" } : verified; } });
  assert.deepEqual(urls, [`https://api.github.com/repos/acme/kit/commits/${sha}`, `https://api.github.com/repos/acme/kit/compare/${sha}...main`]);
});

test("the copy is replaced in one rename, never through a link", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "root-copies-"));
  const dest = path.join(dir, "agent-stacks-disk"), target = path.join(dir, "target");
  fs.writeFileSync(target, "root's file\n");
  fs.symlinkSync(target, dest);
  const posts = [];
  const blob = Buffer.from("helper\n");
  // A link at the copy's path stays as the link is.
  const files = { ...realFiles, read: () => Buffer.from("other\n") };
  const done = await refreshRootCopies({
    computer: "machine-1", commit: "b".repeat(40), state: {}, files, remote: KIT_ORIGIN, kitRepo: { repo: KIT_REPO },
    copies: [{ name: "agent-stacks-disk", dest, src: "circlechat/tenant/disk-helper.sh" }],
    cat: () => { throw new Error("git is never asked"); }, show: () => blob, verify: async () => ({ ok: true }),
    post: async (t) => { posts.push(t); return { ok: true }; },
  });
  assert.deepEqual(done, []);
  assert.equal(fs.readFileSync(target, "utf8"), "root's file\n");
  assert.equal(fs.lstatSync(dest).isSymbolicLink(), true);
  assert.deepEqual(posts, []);
});

test("the secrets helper's kit folder comes from /etc/agent-stacks.conf", () => {
  assert.equal(helperKit("OWNER=owner\nKIT=/home/owner/recursica-knowledge\nNODE_BIN=/usr/bin/node\n"), "/home/owner/recursica-knowledge");
  assert.equal(helperKit("KIT='/home/owner/my kit'\n"), "/home/owner/my kit");
  assert.equal(helperKit("KIT=/home/owner/my\\ kit\n"), "/home/owner/my kit");
  assert.equal(helperKit(""), "");
});
