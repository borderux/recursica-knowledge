import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeBot } from "./bot.mjs";
import { totp, newSecret } from "./totp.mjs";
import { buttonBlocks } from "./actions.mjs";

const NOW = 1_800_000_000_000;
function setup() {
  const secret = newSecret();
  const env = { APPROVERS: "U1=aaron,U2=matt", TOTP_SECRET_AARON: secret, TOTP_SECRET_MATT: newSecret(),
    SLACK_CHANNEL_ID: "C1", STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "bot-")) };
  const calls = [], relays = [];
  const bot = makeBot({ env, now: () => NOW,
    api: async (m, b) => { calls.push([m, b]); return { ok: true }; },
    relay: async (c, body) => { relays.push([c, body]); return { ok: true, message: "done" }; } });
  return { bot, calls, relays, secret };
}
const value = JSON.stringify({ c: "studio", r: "lock-1" });
const click = (user, id) => ({ type: "interactive", payload: { type: "block_actions", user: { id: user }, trigger_id: "T",
  channel: { id: "C1" }, message: { ts: "1.1" }, actions: [{ action_id: id, value }] } });
const submit = (user, view) => ({ type: "interactive", payload: { type: "view_submission", user: { id: user }, view } });
const codeView = (code) => ({ callback_id: "two-factor", private_metadata: JSON.stringify({ id: "release-lockdown", value: { c: "studio", r: "lock-1" }, channel: "C1", ts: "1.1" }),
  state: { values: { code: { code: { value: code } } } } });

test("a button with no two-factor runs at once for an approver", async () => {
  const { bot, relays } = setup();
  await bot.handle(click("U1", "cut-off-now"));
  assert.deepEqual(relays[0], ["studio", { action: "cut-off-now", ref: "lock-1", extra: {}, by: "aaron" }]);
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
  const matt = setup();
  const r = await bot.handle(submit("U2", codeView(totp(matt.secret, NOW))));
  assert.equal(r.response_action, "errors");
  assert.equal(relays.length, 0);
});

test("buttons carry the computer and the reference", () => {
  const blocks = buttonBlocks("reboot", "Updates need a reboot", "beast", "upd-1");
  const ids = blocks[1].elements.map((e) => e.action_id);
  assert.deepEqual(ids, ["reboot-4am", "reboot-tonight", "reboot-pick", "reboot-skip"]);
  assert.deepEqual(JSON.parse(blocks[1].elements[0].value), { c: "beast", r: "upd-1" });
});

test("a button with a suffix, such as Stop for one agent, reaches its action", async () => {
  const { bot, relays } = setup();
  await bot.handle({ type: "interactive", payload: { type: "block_actions", user: { id: "U1" }, trigger_id: "T", channel: { id: "C1" }, message: { ts: "1.1" },
    actions: [{ action_id: "agents-stop:betty", value: JSON.stringify({ c: "studio", r: "border|betty" }) }] } });
  assert.equal(relays[0][1].action, "agents-stop");
  assert.equal(relays[0][1].ref, "border|betty");
});

test("a click is acknowledged without waiting for the target computer", async () => {
  const env = { APPROVERS: "U1=aaron", TOTP_SECRET_AARON: "JBSWY3DPEHPK3PXP", SLACK_CHANNEL_ID: "C1", STATE_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "bot-")) };
  let release;
  const slow = new Promise((r) => (release = r));
  const bot = makeBot({ env, now: () => NOW, api: async () => ({ ok: true }), relay: async () => { await slow; return { ok: true, message: "done" }; } });
  const started = Date.now();
  await bot.handle(click("U1", "cut-off-now"));
  assert.ok(Date.now() - started < 1000);
  release();
});
