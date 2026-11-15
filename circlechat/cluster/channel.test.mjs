import { test } from "node:test";
import assert from "node:assert/strict";
import { makeChannel, plainText } from "./channel.mjs";
import { buttonBlocks, localToUtc, nextAt, tzName } from "./actions.mjs";

test("each message shows the sending computer's name and, when set, the computer's icon", async () => {
  const bodies = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { bodies.push(JSON.parse(opts.body)); return { json: async () => ({ ok: true }) }; };
  try {
    const base = { SLACK_BOT_TOKEN: "xoxb", SLACK_CHANNEL_ID: "C1", COMPUTER: "machine-2" };
    await makeChannel({ ...base, SLACK_ICON: ":desktop_computer:" }).post("C1", "info", "hello");
    await makeChannel(base).post("C1", "reboot", "Updates need a reboot", "u1");
    assert.equal(bodies[0].username, "machine-2");
    assert.equal(bodies[0].icon_emoji, ":desktop_computer:");
    assert.equal(bodies[1].username, "machine-2");
    assert.equal("icon_emoji" in bodies[1], false, "no icon without slack_icon");
    assert.ok(bodies[1].blocks, "a message with buttons too");
  } finally { globalThis.fetch = realFetch; }
});

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

test("plain text keeps the words, escapes Slack's markup, and makes one line of 500 characters at most", () => {
  assert.equal(plainText("a <!channel> & <@U1>\tb\n\nc"), "a &lt;!channel&gt; &amp; &lt;@U1&gt; b c");
  assert.equal(plainText("x".repeat(600)).length, 500);
  assert.equal(plainText(undefined), "");
});

test("a plain post goes only to this computer's channels", async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => { calls.push(JSON.parse(opts.body)); return { json: async () => ({ ok: true }) }; };
  try {
    const chat = makeChannel({ SLACK_BOT_TOKEN: "xoxb", SLACK_CHANNEL_ID: "CCLUSTER" });
    assert.equal((await chat.postPlain("COTHER", "hello")).ok, false);
    assert.equal((await chat.postPlain(undefined, "*hi*")).ok, true);
    assert.deepEqual([calls.length, calls[0].channel, calls[0].text, calls[0].mrkdwn], [1, "CCLUSTER", "*hi*", false]);
  } finally { globalThis.fetch = realFetch; }
});
