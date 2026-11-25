import { test } from "node:test";
import assert from "node:assert/strict";
import { KIT_REPO, githubRepo, isKitRepo, originAlert, originOk } from "./kit-repo.mjs";

test("the kit's repo is one fixed name", () => {
  assert.equal(KIT_REPO, "borderux/recursica-knowledge");
});

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

test("only an origin at the kit's repo passes, in any letter case", () => {
  assert.equal(isKitRepo(`https://github.com/${KIT_REPO}.git`), true);
  assert.equal(isKitRepo(`git@github.com:${KIT_REPO}.git`), true);
  assert.equal(isKitRepo("https://github.com/BorderUX/Recursica-Knowledge"), true);
  assert.equal(isKitRepo("https://github.com/acme/recursica-knowledge.git"), false);
  assert.equal(isKitRepo(`https://github.com/${KIT_REPO}-copy.git`), false);
  assert.equal(isKitRepo(`https://acme.com/github.com/${KIT_REPO}.git`), false);
  assert.equal(isKitRepo(""), false);
});

test("an origin at another repo posts one alert, shared by every step, and the kit's repo clears the record", async () => {
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok: true }; };
  const state = {};
  const t = Date.parse("2026-11-25T10:00:00Z");
  const other = "https://github.com/acme/kit.git";
  // The follow step and the root copies step both check the origin in one hour.
  assert.equal(await originOk({ computer: "machine-1", remote: other, state, post, now: t }), false);
  assert.equal(await originOk({ computer: "machine-1", remote: other, state, post, now: t + 1000 }), false);
  assert.equal(posts.length, 1);
  assert.equal(posts[0], originAlert("machine-1", other));
  assert.match(posts[0], /names the GitHub repo acme\/kit, not borderux\/recursica-knowledge/);
  // 24 hours later the same origin alerts again.
  await originOk({ computer: "machine-1", remote: other, state, post, now: t + 24 * 3600_000 });
  assert.equal(posts.length, 2);
  // A repo off GitHub names no repo, and the alert never shows a token from the address.
  await originOk({ computer: "machine-1", remote: "https://x-access-token:abc123@git.acme.com/acme/kit.git", state, post, now: t + 24 * 3600_000 });
  assert.match(posts[2], /names a repo off GitHub, not borderux\/recursica-knowledge/);
  assert.ok(!posts[2].includes("abc123"));
  // The kit's repo passes and clears the record.
  assert.equal(await originOk({ computer: "machine-1", remote: `https://github.com/${KIT_REPO}.git\n`, state, post, now: t + 25 * 3600_000 }), true);
  assert.equal(state.kitOrigin, undefined);
  assert.equal(posts.length, 3);
});

test("a failed post records nothing, so the next run posts again", async () => {
  const state = {};
  let ok = false;
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok }; };
  await originOk({ computer: "machine-1", remote: "https://github.com/acme/kit.git", state, post });
  ok = true;
  await originOk({ computer: "machine-1", remote: "https://github.com/acme/kit.git", state, post });
  assert.equal(posts.length, 2);
  assert.equal(state.kitOrigin.key, "origin:acme/kit");
});
