// The approval of each kit release in Slack (release-gate.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { announce, approvals, approve, isClusterControl, releaseCheck, waiting } from "./release-gate.mjs";

const DAY = 24 * 3600_000;
const NOW = 1_800_000_000_000;
const tag = (v) => `@recursica/knowledge@${v}`;
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gate-"));

test("the newest release with the kit's first number waits until an approver approves the release", () => {
  const tags = [tag("0.12.0"), tag("0.13.0"), tag("0.13.1"), tag("1.0.0"), "v9.9.9"];
  assert.equal(waiting("0.12.0", tags), tag("0.13.1"));
  assert.equal(waiting("0.12.0", tags, { [tag("0.13.1")]: { by: "person_a" } }), null);
  assert.equal(waiting("0.13.1", tags), null, "a new major version keeps the ask in Slack, with no Install post");
});

test("an approval is recorded once, and every press is logged with the approver, the time and the computer", () => {
  const stateDir = dir();
  assert.equal(approve({ stateDir, tag: "not-a-tag", by: "person_a", computer: "machine-1" }).ok, false);
  const r = approve({ stateDir, tag: tag("0.13.0"), by: "person_a", computer: "machine-1", now: NOW });
  assert.equal(r.ok, true);
  assert.match(r.message, /0\.13\.0 approved by person_a; machine-1 installs the release at the next hourly check/);
  approve({ stateDir, tag: tag("0.13.0"), by: "person_b", computer: "machine-1", now: NOW + 60_000 });
  assert.deepEqual(approvals(stateDir), { [tag("0.13.0")]: { by: "person_a", at: new Date(NOW).toISOString() } });
  const log = fs.readFileSync(path.join(stateDir, "release-approvals.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(log, [
    { tag: tag("0.13.0"), by: "person_a", at: new Date(NOW).toISOString(), computer: "machine-1" },
    { tag: tag("0.13.0"), by: "person_b", at: new Date(NOW + 60_000).toISOString(), computer: "machine-1" },
  ]);
  assert.equal(fs.statSync(path.join(stateDir, "release-approvals.log")).mode & 0o777, 0o600);
});

test("a waiting release posts once, then a reminder once a day; a failed post is tried again next hour", async () => {
  const stateDir = dir();
  const posts = [];
  let ok = true;
  const post = async (text, ref) => { posts.push([text, ref]); return { ok }; };
  await announce({ stateDir, tag: tag("0.13.0"), notes: " Release notes: https://example.com/r", post, now: NOW });
  await announce({ stateDir, tag: tag("0.13.0"), post, now: NOW + 3600_000 });
  assert.equal(posts.length, 1);
  assert.match(posts[0][0], /Kit release 0\.13\.0 is ready\. Release notes: https:\/\/example\.com\/r Every computer holds the release until an approver presses "Install"/);
  assert.equal(posts[0][1], tag("0.13.0"));
  await announce({ stateDir, tag: tag("0.13.0"), post, now: NOW + DAY });
  assert.equal(posts.length, 2);
  assert.match(posts[1][0], /Reminder: kit release 0\.13\.0 still waits for approval/);
  // A newer release posts at once; a post that fails is not recorded.
  ok = false;
  await announce({ stateDir, tag: tag("0.13.1"), post, now: NOW + DAY + 60_000 });
  ok = true;
  await announce({ stateDir, tag: tag("0.13.1"), post, now: NOW + DAY + 3600_000 });
  assert.equal(posts.length, 4);
  assert.match(posts[3][0], /Kit release 0\.13\.1 is ready/);
  // Once approved, nothing waits, and nothing posts.
  await announce({ stateDir, tag: null, post, now: NOW + 3 * DAY });
  assert.equal(posts.length, 4);
});

test("the hourly check fetches the kit's tags and posts the release with its notes", async () => {
  const stateDir = dir();
  const calls = [];
  const out = { tag: [tag("0.12.0"), tag("0.13.0")].join("\n"), remote: "https://github.com/acme/kit.git" };
  const git = (...a) => { calls.push(a.join(" ")); return out[a[0]] ?? ""; };
  const posts = [];
  const post = async (text, ref) => { posts.push([text, ref]); return { ok: true }; };
  await releaseCheck({ stateDir, git, current: "0.12.0", post, now: NOW });
  assert.deepEqual(calls, ["fetch --tags --quiet", "tag --list @recursica/knowledge@*", "remote get-url origin"]);
  assert.match(posts[0][0], /0\.13\.0 is ready\. Release notes: https:\/\/github\.com\/acme\/kit\/releases\/tag\/%40recursica%2Fknowledge%400\.13\.0/);
  approve({ stateDir, tag: tag("0.13.0"), by: "person_a", computer: "machine-1", now: NOW });
  await releaseCheck({ stateDir, git, current: "0.12.0", post, now: NOW + 2 * DAY });
  assert.equal(posts.length, 1, "an approved release gets no reminder");
});

test("only the cluster's control computer posts", () => {
  const home = dir();
  fs.mkdirSync(path.join(home, "circlechat"));
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify({ nodes: [{ name: "machine-1", control: true }, { name: "machine-2" }] }));
  assert.equal(isClusterControl(home, "machine-1"), true);
  assert.equal(isClusterControl(home, "machine-2"), false);
  assert.equal(isClusterControl(dir(), "machine-1"), false, "a computer with no cluster site.json");
});
