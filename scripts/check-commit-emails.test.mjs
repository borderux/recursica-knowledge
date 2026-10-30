// The commit email check: which addresses pass, and that a failure never prints the address.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allowed, problems } from "./check-commit-emails.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-commit-emails.mjs");
const NOREPLY = "1234+someone@users.noreply.github.com";
const PERSONAL = "someone@example.com";

test("a GitHub no-reply address, GitHub's bots, GitHub's web committer and Anthropic's no-reply address pass", () => {
  for (const e of [NOREPLY, "someone@users.noreply.github.com", "41898282+github-actions[bot]@users.noreply.github.com", "49699333+dependabot[bot]@users.noreply.github.com", "noreply@github.com", "noreply@anthropic.com", "NoReply@Anthropic.com"]) {
    assert.ok(allowed(e), e);
  }
  for (const e of [PERSONAL, "noreply@example.com", "someone@users.noreply.github.com.example.com"]) {
    assert.ok(!allowed(e), e);
  }
});

test("each place in a commit is named by its kind and line, and the address never appears", () => {
  const found = problems({
    sha: "0123456789abcdef",
    author: PERSONAL,
    committer: PERSONAL,
    message: `Subject\n\nBody\n\nCo-authored-by: Someone <${PERSONAL}>\nco-authored-by: Model <noreply@anthropic.com>\nsigned-off-by: Someone <${PERSONAL}>`,
  });
  assert.deepEqual(found, ["0123456: author", "0123456: committer", "0123456: message line 5, Co-authored-by", "0123456: message line 7, Signed-off-by"]);
  assert.ok(found.every((p) => !p.includes(PERSONAL)));
  // Only the two trailers count. A trailer with no address, and an address in other text, do not.
  assert.deepEqual(problems({ sha: "0123456", author: NOREPLY, committer: NOREPLY, message: `Subject\n\nWrite to ${PERSONAL}.\n\nReported-by: Someone <${PERSONAL}>\nSigned-off-by: Someone` }), []);
});

// A repository whose commits carry the given addresses. Identity comes from GIT_AUTHOR_* and
// GIT_COMMITTER_*, so no git config is read or written.
function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "commit-emails-"));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (args, extra = {}) => execFileSync("git", args, { cwd: dir, env: { ...env, ...extra }, encoding: "utf8" }).trim();
  git(["init", "-q", "-b", "main"]);
  let n = 0;
  const commit = (author, committer, message) => {
    fs.writeFileSync(path.join(dir, "file.txt"), `${++n}\n`);
    git(["add", "file.txt"]);
    git(["commit", "-q", "-m", message], { GIT_AUTHOR_NAME: "Someone", GIT_AUTHOR_EMAIL: author, GIT_COMMITTER_NAME: "Someone", GIT_COMMITTER_EMAIL: committer });
    return git(["rev-parse", "HEAD"]);
  };
  const run = (base, head) => spawnSync(process.execPath, [SCRIPT, base, head], { cwd: dir, encoding: "utf8" });
  return { commit, run };
}

test("the script checks only the pull request's commits, and exits 2 naming each bad one", () => {
  const r = repo();
  // Already on the base branch: published before the check, and not the pull request's to fix.
  const base = r.commit(PERSONAL, PERSONAL, "Old work");
  const good = r.commit(NOREPLY, "noreply@github.com", `Good\n\nCo-authored-by: Model <noreply@anthropic.com>\nSigned-off-by: Someone <${NOREPLY}>`);
  const clean = r.run(base, good);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.match(clean.stdout, /✓ 1 commit\(s\)/);
  const bad = r.commit(NOREPLY, NOREPLY, `Bad\n\nSigned-off-by: Someone <${PERSONAL}>`);
  const failed = r.run(base, bad);
  assert.equal(failed.status, 2);
  assert.match(failed.stdout, new RegExp(`${bad.slice(0, 7)}: message line 3, Signed-off-by`));
  assert.doesNotMatch(failed.stdout, new RegExp(good.slice(0, 7)));
  assert.doesNotMatch(failed.stdout + failed.stderr, /example\.com/, "the log never shows the address");
});

test("the script exits 1 on a range git cannot read", () => {
  const r = repo();
  const head = r.commit(NOREPLY, NOREPLY, "One");
  assert.equal(r.run("0000000000000000000000000000000000000000", head).status, 1);
  assert.equal(spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" }).status, 1);
});
