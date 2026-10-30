// The Slack message for an agent reply CircleChat could not use (notify/drops.mjs): the agent, a
// link to the conversation and the reason, never the reply's text, and no conversation named when
// notify details are off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { droppedNote } from "./drops.mjs";

const channel = { handle: "betty", agentId: "a_1", conversationId: "c_9", kind: "channel", name: "test", reason: "actions_block_visible" };
const CC = "https://chat.example.com/";

test("with details on, the message names the agent, links to the channel by name, and gives the reason", () => {
  assert.equal(droppedNote(channel, { details: true, ccUrl: CC }),
    ":warning: @betty's reply in <https://chat.example.com/c/c_9|#test> could not be posted: actions_block_visible. The reply's text is not sent here.");
});

test("a DM links to the agent's page, because a DM's page belongs to the person who opens it", () => {
  const text = droppedNote({ ...channel, kind: "dm", name: null, reason: "no_reply_after_retry" }, { details: true, ccUrl: CC });
  assert.match(text, /<https:\/\/chat\.example\.com\/agents\/a_1\|a DM> could not be posted: no_reply_after_retry\./);
});

test("with details off, as on a client stack, no conversation is named", () => {
  const text = droppedNote(channel, { details: false, ccUrl: CC });
  assert.match(text, /<https:\/\/chat\.example\.com\/c\/c_9\|a conversation>/);
  assert.doesNotMatch(text, /#test|test>/);
  assert.match(text, /@betty's reply .* actions_block_visible\./, "the agent and the reason still show");
});

test("without CircleChat's address, the message has no link", () => {
  assert.equal(droppedNote(channel, { details: true }),
    ":warning: @betty's reply in #test could not be posted: actions_block_visible. The reply's text is not sent here.");
});

test("a channel name or a reason never carries Slack markup, such as a mention of everyone", () => {
  const text = droppedNote({ ...channel, name: "<!channel> ops", reason: "x <@U123> & y" }, { details: true, ccUrl: CC });
  assert.doesNotMatch(text, /<!channel>|<@U123>|&/);
  assert.match(text, /\|#!channel ops>/);
});

test("a missing reason or handle still gives a message", () => {
  assert.match(droppedNote({ conversationId: "c_9", kind: "channel" }, { details: true, ccUrl: CC }), /^:warning: An agent's reply in .* could not be posted: unknown\./);
});
