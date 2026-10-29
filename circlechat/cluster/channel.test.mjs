import { test } from "node:test";
import assert from "node:assert/strict";
import { makeChannel } from "./channel.mjs";
import { buttonBlocks, localToUtc, nextAt, tzName } from "./actions.mjs";

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

test("a date and time in the cluster's time zone become the right moment, on both sides of the clock change", () => {
  const us = "America/Chicago";
  assert.equal(new Date(localToUtc("2026-10-21", "04:00", us)).toISOString(), "2026-10-21T09:00:00.000Z");
  assert.equal(new Date(localToUtc("2026-11-02", "04:00", us)).toISOString(), "2026-11-02T10:00:00.000Z");
  assert.equal(new Date(localToUtc("2026-10-21", "04:00", "Europe/Berlin")).toISOString(), "2026-10-21T02:00:00.000Z");
  assert.equal(new Date(localToUtc("2026-10-21", "04:00", "Asia/Kolkata")).toISOString(), "2026-10-20T22:30:00.000Z");
  assert.equal(localToUtc("2026-03-08", "02:30", us), 0, "a time the clock skips");
  assert.equal(new Date(nextAt(4, 0, "Asia/Kolkata", Date.UTC(2026, 9, 20, 12))).toISOString(), "2026-10-20T22:30:00.000Z");
  const label = buttonBlocks("reboot", "x", "machine-1", "u1", "Europe/Berlin")[1].elements[0].text.text;
  assert.equal(label, `4 a.m. ${tzName("Europe/Berlin")}`);
});
