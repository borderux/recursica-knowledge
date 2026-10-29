// A stack's own messages (kit/slack.mjs): each one shows the stack's name as the sender.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { senderFields, stackSlack } from "./slack.mjs";

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
