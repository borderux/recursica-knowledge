import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkVerified, decide, followMain, githubRepo, lastLines, resultPost, touchedSetups } from "./follow-main.mjs";

test("each setup runs again only for a change to a file the setup reads, and a helper runs no setup-host.sh", () => {
  assert.deepEqual(touchedSetups(["README.md", "skills/button/SKILL.md"], { control: true }), []);
  assert.deepEqual(touchedSetups(["circlechat/kit/lib.sh"], { control: true }), ["setup-host.sh", "setup-node.sh", "install-cluster.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/kit/lib.sh"], { control: false }), ["setup-node.sh", "install-cluster.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/cluster/firewall/nft-base.nft"], { control: true }), ["install-cluster.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/gateway/key-check.mjs"], { control: true }), ["setup-host.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/gateway/key-check.mjs"], { control: false }), []);
  assert.deepEqual(touchedSetups(["circlechat/rustdesk/setup-rustdesk.sh"], { control: false }), ["setup-node.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/kit/lib.shx"], { control: false }), [], "a file name must match the whole name");
  assert.deepEqual(touchedSetups(["README.md"], { control: false, carried: ["install-cluster.sh"] }), ["install-cluster.sh"], "a setup an earlier update left runs again");
});

test("the GitHub repo comes from the origin's address, and a remote off GitHub has none", () => {
  assert.equal(githubRepo("https://github.com/acme/kit.git"), "acme/kit");
  assert.equal(githubRepo("git@github.com:acme/kit.git\n"), "acme/kit");
  assert.equal(githubRepo("https://github.com/acme/kit"), "acme/kit");
  assert.equal(githubRepo("https://git.acme.com/acme/kit.git"), "");
});

const commit = (sha, verified = true, reason = verified ? "valid" : "unsigned") => ({ sha, commit: { verification: { verified, reason } } });

test("every new commit must be verified by GitHub, and GitHub must list exactly the fetched commits", async () => {
  const page = (commits, extra = {}) => async () => ({ status: "ahead", total_commits: commits.length, commits, ...extra });
  assert.deepEqual(await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c", "b"], get: page([commit("b"), commit("c")]) }), { ok: true });
  const bad = await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c", "b"], get: page([commit("b", false), commit("c")]) });
  assert.equal(bad.ok, false);
  assert.equal(bad.sha, "b");
  assert.match(bad.reason, /not verified \(unsigned\)/);
  const other = await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c", "b", "x"], get: page([commit("b"), commit("c")]) });
  assert.equal(other.sha, "x");
  assert.match(other.reason, /differs from the commits git fetched/);
  assert.match((await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c"], get: page([commit("c")], { status: "diverged" }) })).reason, /diverged/);
  assert.match((await checkVerified({ repo: "", from: "a", to: "c", shas: ["c"], get: page([]) })).reason, /not on GitHub/);
  assert.deepEqual(await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c"], get: async () => { throw new Error("HTTP 403"); } }), { error: "GitHub's compare view failed: HTTP 403" });
  // A long update spans several pages of 100 commits.
  const many = Array.from({ length: 150 }, (_, i) => commit(`s${i}`));
  const urls = [];
  const paged = async (url) => { urls.push(url); const p = Number(new URL(url).searchParams.get("page")); return { status: "ahead", total_commits: 150, commits: many.slice((p - 1) * 100, p * 100) }; };
  assert.deepEqual(await checkVerified({ repo: "acme/kit", from: "a", to: "s149", shas: many.map((c) => c.sha), get: paged }), { ok: true });
  assert.equal(urls.length, 2);
  assert.match(urls[0], /^https:\/\/api\.github\.com\/repos\/acme\/kit\/compare\/a\.\.\.s149\?per_page=100&page=1$/);
});

test("Slack gets the last lines of a setup's output, with token-like text hidden", () => {
  const out = `${Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n")}\nkey sk-${"a".repeat(40)}\ntoken ${"Z".repeat(40)}\n`;
  const t = lastLines(out, 3);
  assert.equal(t.split("\n").length, 3);
  assert.match(t, /^line 19\nkey sk-<hidden>\ntoken <hidden>$/);
  assert.doesNotMatch(t, /aaaa|ZZZZ/);
});

test("the post names the computer, the old and new commit, and the result", () => {
  const base = { computer: "machine-2", from: "1111111aaaa", to: "2222222bbbb", count: 3 };
  assert.equal(resultPost({ ...base, ran: ["setup-node.sh", "install-cluster.sh"] }),
    ":white_check_mark: Kit on machine-2: 1111111 → 2222222, 3 new commits on main. Ran setup-node.sh and install-cluster.sh again.");
  assert.equal(resultPost({ ...base, count: 1 }), ":white_check_mark: Kit on machine-2: 1111111 → 2222222, 1 new commit on main. No setup needed to run again.");
  assert.match(resultPost({ ...base, manual: [{ setup: "setup-node.sh", command: "./circlechat/setup-node.sh machine-2" }] }),
    /^:warning: .* setup-node\.sh needs a person, because the owner has no password-free sudo\. Run \.\/circlechat\/setup-node\.sh machine-2 by hand\.$/);
  const failed = resultPost({ ...base, ran: ["setup-node.sh"], failed: { setup: "install-cluster.sh", output: "ok\nnft: syntax error\n" } });
  assert.match(failed, /^:x: Kit on machine-2: 1111111 → 2222222, 3 new commits on main\. install-cluster\.sh failed after setup-node\.sh passed\. The checkout stays at 2222222/);
  assert.match(failed, /```\nok\nnft: syntax error\n```$/);
});

test("the checkout moves only by a fast-forward on main", () => {
  const ok = { head: "a", target: "b", ancestor: true, branch: "main", mainAncestor: true };
  assert.deepEqual(decide(ok), { action: "update" });
  assert.deepEqual(decide({ ...ok, target: "a" }), { action: "none" });
  assert.deepEqual(decide({ ...ok, branch: "" }), { action: "update" }, "a detached checkout, such as a release tag, moves to main");
  assert.match(decide({ ...ok, ancestor: false }).reason, /not on main's history/);
  assert.match(decide({ ...ok, branch: "fix" }).reason, /on the branch fix, not main/);
  assert.match(decide({ ...ok, branch: "", mainAncestor: false }).reason, /main branch has commits that origin\/main lacks/);
});

// A real origin and kit checkout in a temporary folder, and a stand-in for GitHub's compare view.
function repos() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "follow-"));
  const sh = (cwd, ...a) => {
    const r = spawnSync("git", ["-c", "user.name=Person A", "-c", "user.email=person-a@acme.com", "-c", "init.defaultBranch=main", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    return r.stdout.trim();
  };
  const work = path.join(dir, "work");
  fs.mkdirSync(work);
  sh(work, "init", "-q");
  fs.writeFileSync(path.join(work, "README.md"), "kit\n");
  sh(work, "add", "-A");
  sh(work, "commit", "-qm", "start");
  sh(dir, "clone", "-q", "--bare", work, "origin.git");
  sh(work, "remote", "add", "origin", path.join(dir, "origin.git"));
  sh(dir, "clone", "-q", path.join(dir, "origin.git"), "kit");
  const kit = path.join(dir, "kit");
  const push = (file, text = "changed\n") => {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.writeFileSync(path.join(work, file), text);
    sh(work, "add", "-A");
    sh(work, "commit", "-qm", `change ${file}`);
    sh(work, "push", "-q", "origin", "main");
    return sh(work, "rev-parse", "HEAD");
  };
  const git = (...a) => spawnSync("git", ["-C", kit, ...a], { encoding: "utf8" });
  const head = () => git("rev-parse", "HEAD").stdout.trim();
  const unverified = new Set();
  // GitHub's compare view, from the work repo's history.
  const get = async (url) => {
    const [from, to] = url.match(/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)/).slice(1);
    const shas = sh(work, "rev-list", "--reverse", `${from}..${to}`).split("\n").filter(Boolean);
    return { status: "ahead", total_commits: shas.length, commits: shas.map((s) => commit(s, !unverified.has(s))) };
  };
  return { dir, kit, push, git, head, get, unverified, sh };
}

function world(r, over = {}) {
  const posts = [], setups = [];
  const deps = {
    computer: "machine-2", control: false, state: {}, git: r.git, get: r.get,
    quiet: async () => ({ quiet: true, why: "" }),
    post: async (text) => { posts.push(text); return { ok: true }; },
    sudoFree: async () => true,
    setup: async (name) => { setups.push(name); return { status: 0, output: "" }; },
    hostUpgrade: async () => { setups.push("setup-host.sh --upgrade"); return { ok: true, output: "", problems: [] }; },
    ...over,
  };
  // The origin's address is a folder, not GitHub, so the tests name a GitHub repo instead.
  const git = (...a) => (a[0] === "remote" && a[1] === "get-url" ? { status: 0, stdout: "https://github.com/acme/kit.git\n" } : r.git(...a));
  return { posts, setups, deps: { ...deps, git: over.git ?? git } };
}

test("a verified commit fast-forwards the kit, runs the setups the change touches, and posts one line", async () => {
  const r = repos();
  const w = world(r);
  const old = r.head();
  assert.equal(await followMain(w.deps), "none", "nothing new on main");
  assert.equal(w.posts.length, 0);
  const sha = r.push("circlechat/setup-node.sh");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.deepEqual(w.setups, ["setup-node.sh"]);
  assert.deepEqual(w.posts, [`:white_check_mark: Kit on machine-2: ${old.slice(0, 7)} → ${sha.slice(0, 7)}, 1 new commit on main. Ran setup-node.sh again.`]);
  assert.equal(r.git("symbolic-ref", "--short", "HEAD").stdout.trim(), "main");
});

test("a commit GitHub doesn't verify stops the update, with one alert", async () => {
  const r = repos();
  const w = world(r);
  const old = r.head();
  const bad = r.push("circlechat/setup-node.sh");
  r.push("README.md", "later\n");
  r.unverified.add(bad);
  assert.equal(await followMain(w.deps), "stopped");
  assert.equal(r.head(), old, "the kit stays where it was");
  assert.equal(w.setups.length, 0);
  assert.equal(w.posts.length, 1);
  assert.match(w.posts[0], new RegExp(`^:rotating_light: Kit on machine-2 stays at ${old.slice(0, 7)}: commit ${bad.slice(0, 7)} on main stops the update\\. GitHub shows the commit as not verified`));
  assert.equal(await followMain(w.deps), "stopped");
  assert.equal(w.posts.length, 1, "the same commit is announced once");
});

test("an update waits until RecursicaChat is quiet, and says so once", async () => {
  const r = repos();
  let quiet = false;
  const w = world(r, { quiet: async () => ({ quiet, why: "1 agent message(s) queued or in a turn" }) });
  const old = r.head();
  const sha = r.push("circlechat/cluster/install-cluster.sh");
  assert.equal(await followMain(w.deps), "waiting");
  assert.equal(await followMain(w.deps), "waiting");
  assert.equal(r.head(), old);
  assert.equal(w.posts.length, 1);
  assert.match(w.posts[0], /^:hourglass: Kit on machine-2: the update from .* waits until RecursicaChat is quiet.*Now: 1 agent message\(s\) queued or in a turn\.$/);
  quiet = true;
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.deepEqual(w.setups, ["install-cluster.sh"]);
});

test("a failed setup posts the last lines, keeps the new commit, and runs again with the next commit on main", async () => {
  const r = repos();
  let fail = true;
  const w = world(r, { setup: async (name) => { w.setups.push(name); return fail && name === "install-cluster.sh" ? { status: 1, output: "loading rules\nnft: syntax error in line 4\n" } : { status: 0, output: "" }; } });
  const sha = r.push("circlechat/kit/lib.sh");
  assert.equal(await followMain(w.deps), "failed");
  assert.equal(r.head(), sha, "the checkout stays at the new commit");
  assert.deepEqual(w.setups, ["setup-node.sh", "install-cluster.sh"]);
  assert.match(w.posts[0], /install-cluster\.sh failed after setup-node\.sh passed\. The checkout stays at/);
  assert.match(w.posts[0], /```\nloading rules\nnft: syntax error in line 4\n```$/);
  assert.equal(await followMain(w.deps), "none", "nothing runs again until main moves");
  fail = false;
  w.setups.length = 0;
  const fix = r.push("docs/notes.md");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), fix);
  assert.deepEqual(w.setups, ["install-cluster.sh"], "the failed setup runs again, though the newer change touches no setup");
  assert.deepEqual(w.deps.state.follow, {});
});

test("without password-free sudo, a setup runs only through root's own steps, and the post names each command to run by hand", async () => {
  const r = repos();
  const w = world(r, { control: true, sudoFree: async () => false });
  r.push("circlechat/setup-host.sh", "install_unit \"backup\" \"$BENV\" \"$CC_DIR\" root\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.deepEqual(w.setups, ["setup-host.sh --upgrade"]);
  assert.match(w.posts[0], /^:warning: .* Ran setup-host\.sh --upgrade again\. setup-host\.sh needs a person, because the owner has no password-free sudo\. Run \.\/circlechat\/setup-host\.sh by hand\.$/);
  w.setups.length = 0;
  r.push("circlechat/kit/lib.sh", "echo lib\n");
  await followMain(w.deps);
  assert.deepEqual(w.setups, ["setup-host.sh --upgrade"], "a change with no service or job needs only setup-host.sh --upgrade");
  assert.match(w.posts[1], /setup-node\.sh and install-cluster\.sh need a person.*Run \.\/circlechat\/setup-node\.sh machine-2, then \.\/circlechat\/cluster\/install-cluster\.sh machine-2 by hand\.$/);
  assert.doesNotMatch(w.posts[1], /Run \.\/circlechat\/setup-host\.sh/);
});

test("a detached checkout, such as a release tag, moves to main; a checkout on another branch stays", async () => {
  const r = repos();
  const w = world(r);
  r.git("checkout", "-q", "--detach");
  const sha = r.push("README.md", "next\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.equal(r.git("symbolic-ref", "--short", "HEAD").stdout.trim(), "main");
  r.git("checkout", "-q", "-b", "fix");
  const before = r.head();
  r.push("README.md", "again\n");
  assert.equal(await followMain(w.deps), "stopped");
  assert.equal(r.head(), before);
  assert.match(w.posts.at(-1), /on the branch fix, not main/);
});
