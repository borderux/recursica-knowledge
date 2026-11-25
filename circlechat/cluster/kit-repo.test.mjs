import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_KIT_REPO, githubRepo, isRepo, kitRepo, originAlert, originOk, siteKitRepo } from "./kit-repo.mjs";

test("the GitHub repo comes from an address on GitHub's own host, and any other address has none", () => {
  assert.equal(githubRepo("https://github.com/acme/kit.git"), "acme/kit");
  assert.equal(githubRepo("git@github.com:acme/kit.git\n"), "acme/kit");
  assert.equal(githubRepo("https://github.com/acme/kit"), "acme/kit");
  assert.equal(githubRepo("https://github.com/acme/kit/"), "acme/kit");
  assert.equal(githubRepo("ssh://git@github.com/acme/kit.git"), "acme/kit");
  assert.equal(githubRepo("https://git@github.com/acme/kit.git"), "acme/kit", "an address may name a user");
  assert.equal(githubRepo("https://git.acme.com/acme/kit.git"), "");
  assert.equal(githubRepo("https://acme.com/github.com/acme/kit.git"), "", "GitHub's name later in the address is no GitHub address");
  assert.equal(githubRepo("https://github.com.acme.com/acme/kit.git"), "");
  assert.equal(githubRepo("/srv/git/kit.git"), "");
  assert.equal(githubRepo(""), "");
});

test("install-cluster.sh's setting comes from site.json's repos.knowledge, or the kit's own repo", () => {
  assert.equal(DEFAULT_KIT_REPO, "borderux/recursica-knowledge");
  assert.equal(siteKitRepo({}), DEFAULT_KIT_REPO);
  assert.equal(siteKitRepo({ repos: { knowledge: "" } }), DEFAULT_KIT_REPO);
  assert.equal(siteKitRepo({ repos: { knowledge: "https://github.com/acme/kit-fork" } }), "acme/kit-fork", "a fork on GitHub");
  assert.equal(siteKitRepo({ repos: { knowledge: "https://git.acme.com/acme/kit.git" } }), "", "a fork off GitHub");
});

// A stand-in for root's file: { lstat, read }.
const conf = (text, { uid = 0, mode = 0o100644, file = true } = {}) => ({ lstat: () => ({ isFile: () => file, uid, mode }), read: () => text });

test("the update job reads the kit's repo only from a file that only root can change", () => {
  assert.deepEqual(kitRepo({ fsx: conf("COMPUTER=machine-1\nKIT_REPO=acme/kit-fork\n") }), { repo: "acme/kit-fork" });
  assert.deepEqual(kitRepo({ fsx: conf("KIT_REPO=\n") }), { repo: "" }, "a fork off GitHub");
  assert.deepEqual(kitRepo({ fsx: conf("COMPUTER=machine-1\n") }), { repo: DEFAULT_KIT_REPO, old: true }, "a file from before the setting");
  assert.match(kitRepo({ fsx: conf("KIT_REPO=acme/kit\n", { uid: 1000 }) }).problem, /not a plain file that only root can change/, "the owner's file");
  assert.match(kitRepo({ fsx: conf("KIT_REPO=acme/kit\n", { mode: 0o100664 }) }).problem, /only root can change/, "a file the group can change");
  assert.match(kitRepo({ fsx: conf("KIT_REPO=acme/kit\n", { mode: 0o100646 }) }).problem, /only root can change/, "a file other accounts can change");
  assert.match(kitRepo({ fsx: conf("KIT_REPO=acme/kit\n", { file: false }) }).problem, /not a plain file/, "a link");
  assert.match(kitRepo({ fsx: conf("KIT_REPO=https://github.com/acme/kit\n") }).problem, /not a GitHub repo's name/);
  assert.match(kitRepo({ fsx: { lstat: () => { throw new Error("ENOENT"); }, read: () => "" } }).problem, /is missing\. Run install-cluster\.sh/);
  // A real file the test's account owns is not root's file.
  if (process.getuid?.() !== 0) {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kit-repo-")), "agent-cluster.conf");
    fs.writeFileSync(f, "KIT_REPO=acme/kit\n", { mode: 0o644 });
    assert.match(kitRepo({ conf: f }).problem, /only root can change/);
  }
});

test("only an origin at the kit's repo passes, in any letter case", () => {
  assert.equal(isRepo("https://github.com/acme/kit.git", "acme/kit"), true);
  assert.equal(isRepo("git@github.com:acme/kit.git", "acme/kit"), true);
  assert.equal(isRepo("https://github.com/ACME/Kit", "acme/kit"), true);
  assert.equal(isRepo("https://github.com/acme/kit-fork.git", "acme/kit"), false);
  assert.equal(isRepo("https://acme.com/github.com/acme/kit.git", "acme/kit"), false);
  assert.equal(isRepo("https://git.acme.com/acme/kit.git", ""), false, "a repo off GitHub never passes");
  assert.equal(isRepo("", ""), false);
});

test("an origin at another repo posts one alert, shared by every step, and the kit's repo clears the record", async () => {
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok: true }; };
  const state = {};
  const kit = { repo: "acme/kit" };
  const t = Date.parse("2026-11-25T10:00:00Z");
  const other = "https://github.com/acme/other.git";
  // The follow step and the root copies step both check the origin in one hour.
  assert.equal(await originOk({ computer: "machine-1", remote: other, kit, state, post, now: t }), false);
  assert.equal(await originOk({ computer: "machine-1", remote: other, kit, state, post, now: t + 1000 }), false);
  assert.equal(posts.length, 1);
  assert.equal(posts[0], originAlert("machine-1", other, kit));
  assert.match(posts[0], /names the GitHub repo acme\/other, not acme\/kit, the kit's repo in \/etc\/agent-cluster\.conf\. .*set repos\.knowledge in site\.json and run install-cluster\.sh\. .*`git remote set-url origin https:\/\/github\.com\/acme\/kit\.git`/);
  // 24 hours later the same origin alerts again.
  await originOk({ computer: "machine-1", remote: other, kit, state, post, now: t + 24 * 3600_000 });
  assert.equal(posts.length, 2);
  // An origin off GitHub names no repo, and the alert never shows a token from the address.
  await originOk({ computer: "machine-1", remote: "https://x-access-token:abc123@git.acme.com/acme/kit.git", kit, state, post, now: t + 24 * 3600_000 });
  assert.match(posts[2], /names a repo off GitHub, not acme\/kit/);
  assert.ok(!posts[2].includes("abc123"));
  // The kit's repo passes and clears the record.
  assert.equal(await originOk({ computer: "machine-1", remote: "https://github.com/acme/kit.git\n", kit, state, post, now: t + 25 * 3600_000 }), true);
  assert.equal(state.kitOrigin, undefined);
  assert.equal(posts.length, 3);
});

test("a file root can't trust, or a repo off GitHub, stops every origin, with one alert", async () => {
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok: true }; };
  const state = {};
  const problem = { problem: "/etc/agent-cluster.conf is missing. Run install-cluster.sh" };
  assert.equal(await originOk({ computer: "machine-1", remote: "https://github.com/acme/kit.git", kit: problem, state, post }), false);
  assert.equal(await originOk({ computer: "machine-1", remote: "https://github.com/acme/kit.git", kit: problem, state, post }), false);
  assert.equal(posts.length, 1);
  assert.match(posts[0], /^:rotating_light: Kit on machine-1: \/etc\/agent-cluster\.conf is missing\. Run install-cluster\.sh\. The update job moves/);
  assert.equal(await originOk({ computer: "machine-1", remote: "https://git.acme.com/acme/kit.git", kit: { repo: "" }, state, post }), false);
  assert.match(posts[1], /the kit's repo is off GitHub \(repos\.knowledge in site\.json\), so GitHub can verify no kit commit/);
});

test("a failed post records nothing, so the next run posts again", async () => {
  const state = {};
  let ok = false;
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok }; };
  const kit = { repo: "acme/kit" };
  await originOk({ computer: "machine-1", remote: "https://github.com/acme/other.git", kit, state, post });
  ok = true;
  await originOk({ computer: "machine-1", remote: "https://github.com/acme/other.git", kit, state, post });
  assert.equal(posts.length, 2);
  assert.equal(state.kitOrigin.key, "origin:acme/kit:acme/other");
});
