// A stack's own messages (kit/slack.mjs): each one shows the stack's name as the sender.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { senderFields, stackPost, stackSlack } from "./slack.mjs";
import { spawnSync } from "node:child_process";

function stack(site) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stack-slack-"));
  fs.writeFileSync(path.join(dir, ".env"), "SLACK_BOT_TOKEN=xoxb-1\nSLACK_CHANNEL=CSTACK\n");
  fs.writeFileSync(path.join(dir, "site.json"), JSON.stringify(site));
  return dir;
}

test("a stack's message shows the stack's name: site.tenant, site.stack_name, or cluster", async () => {
  const bodies = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { bodies.push(JSON.parse(opts.body)); return { json: async () => ({ ok: true }) }; };
  try {
    for (const site of [{ site: { tenant: "acme" } }, { site: { stack_name: "ops" } }, { site: {} }]) assert.equal(await stackSlack(stack(site))("hello"), true);
  } finally { globalThis.fetch = realFetch; }
  assert.deepEqual(bodies.map((b) => b.username), ["acme", "ops", "cluster"]);
  assert.ok(bodies.every((b) => b.channel === "CSTACK" && b.text === "hello" && !("icon_emoji" in b)));
});

test("the sender fields leave out an unset name or icon", () => {
  assert.deepEqual(senderFields("machine-1", ":desktop_computer:"), { username: "machine-1", icon_emoji: ":desktop_computer:" });
  assert.deepEqual(senderFields("machine-1"), { username: "machine-1" });
  assert.deepEqual(senderFields("", ""), {});
});

test("a stack's post says how it went: the message's ts, or Slack's error, or why it never reached Slack", async () => {
  const realFetch = globalThis.fetch;
  const replies = [{ ok: true, ts: "1700000000.000100" }, { ok: false, error: "not_in_channel" }];
  globalThis.fetch = async () => {
    const r = replies.shift();
    if (!r) throw new Error("getaddrinfo ENOTFOUND slack.com");
    return { status: 200, json: async () => r };
  };
  try {
    const post = stackPost(stack({ site: {} }));
    assert.deepEqual(await post("hello"), { ok: true, ts: "1700000000.000100" });
    assert.deepEqual(await post("hello"), { ok: false, error: "not_in_channel" });
    assert.deepEqual(await post("hello"), { ok: false, error: "no answer from Slack: getaddrinfo ENOTFOUND slack.com" });
  } finally { globalThis.fetch = realFetch; }
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "stack-slack-"));
  const none = await stackPost(empty)("hello");
  assert.equal(none.ok, false);
  assert.match(none.error, /SLACK_BOT_TOKEN or SLACK_CHANNEL is not set in .*\.env$/);
  assert.equal(await stackSlack(empty)("hello"), false);
});

test("slack.mjs from a job logs the failure and exits 1, so the job's log says why", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "stack-slack-"));
  const r = spawnSync(process.execPath, [new URL("./slack.mjs", import.meta.url).pathname, "hello"], { env: { ...process.env, CC_DIR: empty }, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^slack: the post failed: SLACK_BOT_TOKEN or SLACK_CHANNEL is not set/m);
});
