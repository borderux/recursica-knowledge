import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeBot } from "./bot.mjs";
import { totp, newSecret } from "./totp.mjs";
import { buttonBlocks } from "./actions.mjs";

const NOW = 1_800_000_000_000;
function setup(extra = {}) {
  const secret = newSecret();
  const env = { APPROVERS: "U1=person_a,U2=person_b", TOTP_SECRET_PERSON_A: secret, TOTP_SECRET_PERSON_B: newSecret(),
    SLACK_CHANNEL_ID: "C1", STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "bot-")), ...extra };
  const calls = [], relays = [];
  const bot = makeBot({ env, now: () => NOW,
    api: async (m, b) => { calls.push([m, b]); return { ok: true }; },
    relay: async (c, body) => { relays.push([c, body]); return { ok: true, message: "done" }; } });
  return { bot, calls, relays, secret };
}
const value = JSON.stringify({ c: "machine-1", r: "lock-1" });
const click = (user, id) => ({ type: "interactive", payload: { type: "block_actions", user: { id: user }, trigger_id: "T",
  channel: { id: "C1" }, message: { ts: "1.1" }, actions: [{ action_id: id, value }] } });
const submit = (user, view) => ({ type: "interactive", payload: { type: "view_submission", user: { id: user }, view } });
const codeView = (code) => ({ callback_id: "two-factor", private_metadata: JSON.stringify({ id: "release-lockdown", value: { c: "machine-1", r: "lock-1" }, channel: "C1", ts: "1.1" }),
  state: { values: { code: { code: { value: code } } } } });

test("a button with no two-factor runs at once for an approver", async () => {
  const { bot, relays } = setup();
  await bot.handle(click("U1", "cut-off-now"));
  assert.deepEqual(relays[0], ["machine-1", { action: "cut-off-now", ref: "lock-1", extra: {}, by: "person_a" }]);
});

test("anyone who is not an approver is turned away", async () => {
  const { bot, calls, relays } = setup();
  await bot.handle(click("U9", "shut-down"));
  assert.equal(relays.length, 0);
  assert.equal(calls[0][0], "chat.postEphemeral");
});

test("release lockdown asks for a code, and runs only with the right code", async () => {
  const { bot, calls, relays, secret } = setup();
  await bot.handle(click("U1", "release-lockdown"));
  assert.equal(calls[0][0], "views.open");
  assert.equal(relays.length, 0);
  const bad = await bot.handle(submit("U1", codeView("000000")));
  assert.equal(bad.response_action, "errors");
  assert.equal(relays.length, 0);
  const good = await bot.handle(submit("U1", codeView(totp(secret, NOW))));
  assert.equal(good.response_action, "clear");
  assert.equal(relays[0][1].action, "release-lockdown");
});

test("three wrong codes lock the two-factor buttons and post an alert", async () => {
  const { bot, calls, relays, secret } = setup();
  for (let i = 0; i < 3; i++) await bot.handle(submit("U1", codeView("000000")));
  assert.ok(calls.some(([m, b]) => m === "chat.postMessage" && /Three wrong authenticator codes/.test(b.text)));
  const r = await bot.handle(submit("U1", codeView(totp(secret, NOW))));
  assert.equal(r.response_action, "errors");
  assert.equal(relays.length, 0);
});

test("a code from another approver's authenticator is refused", async () => {
  const { bot, relays } = setup();
  const person_b = setup();
  const r = await bot.handle(submit("U2", codeView(totp(person_b.secret, NOW))));
  assert.equal(r.response_action, "errors");
  assert.equal(relays.length, 0);
});

test("buttons carry the computer and the reference", () => {
  const blocks = buttonBlocks("reboot", "Updates need a reboot", "machine-2", "upd-1");
  const ids = blocks[1].elements.map((e) => e.action_id);
  assert.deepEqual(ids, ["reboot-4am", "reboot-tonight", "reboot-pick", "reboot-skip"]);
  assert.deepEqual(JSON.parse(blocks[1].elements[0].value), { c: "machine-2", r: "upd-1" });
});

test("a button with a suffix, such as Stop for one agent, reaches its action", async () => {
  const { bot, relays } = setup();
  await bot.handle({ type: "interactive", payload: { type: "block_actions", user: { id: "U1" }, trigger_id: "T", channel: { id: "C1" }, message: { ts: "1.1" },
    actions: [{ action_id: "agents-stop:betty", value: JSON.stringify({ c: "machine-1", r: "cluster|betty" }) }] } });
  assert.equal(relays[0][1].action, "agents-stop");
  assert.equal(relays[0][1].ref, "cluster|betty");
});

test("a click is acknowledged without waiting for the target computer", async () => {
  const env = { APPROVERS: "U1=person_a", TOTP_SECRET_PERSON_A: "JBSWY3DPEHPK3PXP", SLACK_CHANNEL_ID: "C1", STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "bot-")) };
  let release;
  const slow = new Promise((r) => (release = r));
  const bot = makeBot({ env, now: () => NOW, api: async () => ({ ok: true }), relay: async () => { await slow; return { ok: true, message: "done" }; } });
  const started = Date.now();
  await bot.handle(click("U1", "cut-off-now"));
  assert.ok(Date.now() - started < 1000);
  release();
});

test("the bot's messages show the control computer's name and icon as the sender", async () => {
  const { bot, calls } = setup({ COMPUTER: "machine-1", SLACK_ICON: ":desktop_computer:" });
  for (let i = 0; i < 3; i++) await bot.handle(submit("U1", codeView("000000")));
  const posts = calls.filter(([m]) => m === "chat.postMessage");
  assert.ok(posts.length > 0);
  for (const [, b] of posts) { assert.equal(b.username, "machine-1"); assert.equal(b.icon_emoji, ":desktop_computer:"); }
});

const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
const installView = (code) => ({ callback_id: "two-factor", private_metadata: JSON.stringify({ id: "release-install", value: { c: "machine-1", r: "@recursica/knowledge@0.13.0" }, channel: "C1", ts: "1.1" }),
  state: { values: { code: { code: { value: code } } } } });

test("Install for a kit release asks for a code, then sends the approval to every computer", async () => {
  const { bot, calls, relays, secret } = setup({ AGENTS: "machine-1=http://127.0.0.1:7500,machine-2=http://machine-2:7500" });
  await bot.handle({ type: "interactive", payload: { type: "block_actions", user: { id: "U1" }, trigger_id: "T", channel: { id: "C1" }, message: { ts: "1.1" },
    actions: [{ action_id: "release-install", value: JSON.stringify({ c: "machine-1", r: "@recursica/knowledge@0.13.0" }) }] } });
  assert.equal(calls[0][0], "views.open");
  assert.equal(relays.length, 0, "no approval without a code");
  assert.equal((await bot.handle(submit("U1", installView("000000")))).response_action, "errors");
  assert.equal((await bot.handle(submit("U1", installView(totp(secret, NOW))))).response_action, "clear");
  await flush();
  assert.deepEqual(relays.map(([c, b]) => [c, b.action, b.ref, b.by]), [
    ["machine-1", "release-install", "@recursica/knowledge@0.13.0", "person_a"],
    ["machine-2", "release-install", "@recursica/knowledge@0.13.0", "person_a"],
  ]);
  const replies = calls.filter(([m, b]) => m === "chat.postMessage" && b.thread_ts === "1.1").map(([, b]) => b.text);
  assert.equal(replies.length, 2, "one reply for each computer");
  assert.match(replies[1], /pressed "Install" for machine-2: done/);
});

test("Upgrade now for a new major version needs a code", async () => {
  const { bot, calls, relays } = setup();
  await bot.handle(click("U1", "upgrade-now"));
  assert.equal(calls[0][0], "views.open");
  assert.equal(relays.length, 0);
});

test("the Install button carries the release tag", () => {
  const blocks = buttonBlocks("release", "Kit release 0.13.0 is ready.", "machine-1", "@recursica/knowledge@0.13.0");
  assert.deepEqual(blocks[1].elements.map((e) => e.text.text), ["Install"]);
  assert.deepEqual(JSON.parse(blocks[1].elements[0].value), { c: "machine-1", r: "@recursica/knowledge@0.13.0" });
});

// A cloud-model request (cloud-requests.mjs): the buttons carry the stack's cloud approvers. U1 is
// one of the cluster's approvers too; U0SAM0001 is a cloud approver only, with the authenticator
// secret under the Slack user ID.
const cloudValue = { c: "machine-2", r: "acme|cmreq_abc123", a: ["U1", "U0SAM0001"] };
const cloudClick = (user, id) => ({ type: "interactive", payload: { type: "block_actions", user: { id: user }, trigger_id: "T",
  channel: { id: "C1" }, message: { ts: "2.2" }, actions: [{ action_id: id, value: JSON.stringify(cloudValue) }] } });
const cloudCode = (code) => ({ callback_id: "two-factor", private_metadata: JSON.stringify({ id: "cloud-approve", value: cloudValue, channel: "C1", ts: "2.2" }),
  state: { values: { code: { code: { value: code } } } } });

test("Deny on a cloud-model request needs no code, and goes to the stack's control computer", async () => {
  const { bot, calls, relays } = setup();
  await bot.handle(cloudClick("U1", "cloud-deny"));
  await flush();
  assert.deepEqual(relays, [["machine-2", { action: "cloud-deny", ref: "acme|cmreq_abc123", extra: { slackUser: "U1" }, by: "person_a" }]]);
  const reply = calls.find(([m, b]) => m === "chat.postMessage" && b.thread_ts === "2.2");
  assert.match(reply[1].text, /^:white_check_mark: <@U1> pressed "Deny" for machine-2: done$/);
});

test("Approve on a cloud-model request asks for the approver's code, and answers only with the right code", async () => {
  const sam = newSecret();
  const { bot, calls, relays } = setup({ TOTP_SECRET_U0SAM0001: sam });
  await bot.handle(cloudClick("U0SAM0001", "cloud-approve"));
  assert.equal(calls[0][0], "views.open");
  assert.equal(relays.length, 0);
  assert.equal((await bot.handle(submit("U0SAM0001", cloudCode("000000")))).response_action, "errors");
  assert.equal((await bot.handle(submit("U0SAM0001", cloudCode(totp(sam, NOW))))).response_action, "clear");
  await flush();
  assert.deepEqual(relays, [["machine-2", { action: "cloud-approve", ref: "acme|cmreq_abc123", extra: { slackUser: "U0SAM0001" }, by: "U0SAM0001" }]]);
});

test("only the stack's cloud approvers can press either button, even one of the cluster's approvers", async () => {
  const { bot, calls, relays } = setup();
  for (const id of ["cloud-approve", "cloud-deny"]) await bot.handle(cloudClick("U2", id));
  await flush();
  assert.equal(relays.length, 0);
  assert.deepEqual(calls.map(([m, b]) => [m, b.text]), [
    ["chat.postEphemeral", "Only the stack's cloud approvers can press these buttons."],
    ["chat.postEphemeral", "Only the stack's cloud approvers can press these buttons."],
  ]);
  const r = await bot.handle(submit("U2", cloudCode("123456")));
  assert.equal(r.response_action, "errors");
  assert.equal(relays.length, 0);
});

test("a cloud approver is no approver for the cluster's other buttons", async () => {
  const { bot, relays } = setup({ TOTP_SECRET_U0SAM0001: newSecret() });
  await bot.handle(click("U0SAM0001", "cut-off-now"));
  assert.equal(relays.length, 0);
});
