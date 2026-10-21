import { test } from "node:test";
import assert from "node:assert/strict";
import { makeChannel } from "./channel.mjs";
import { etToUtc } from "./bot.mjs";

test("a post to a channel outside this computer's stacks is refused before reaching Slack", async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { calls.push(JSON.parse(opts.body).channel); return { json: async () => ({ ok: true }) }; };
  try {
    const chat = makeChannel({ SLACK_BOT_TOKEN: "xoxb", SLACK_CHANNEL_ID: "CCLUSTER" }, async () => ["CCLUSTER", "CACME"]);
    assert.equal((await chat.post("CACME", "info", "hello")).ok, true);
    assert.equal((await chat.post("COTHER", "info", "hello")).ok, false);
    assert.deepEqual(calls, ["CACME"]);
  } finally { globalThis.fetch = realFetch; }
});

test("a date and time in Eastern Time become the right moment, on both sides of the clock change", () => {
  assert.equal(new Date(etToUtc("2026-10-21", "04:00")).toISOString(), "2026-10-21T08:00:00.000Z");
  assert.equal(new Date(etToUtc("2026-11-02", "04:00")).toISOString(), "2026-11-02T09:00:00.000Z");
});
