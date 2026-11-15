// The notifier's events and mention DMs (notify/events.mjs): the quiet default, site.json's choice,
// and each mention as a DM to each mentioned person on notify.people, never in the stack's channel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENTS, QUIET_DEFAULT, activityEvent, approvalText, eventsLine, notesFor, parseEvents, parsePeople, peopleLine, validateNotify } from "./events.mjs";

const who = new Map([
  ["m-a", { kind: "user", handle: "person_a", email: "Person.A@acme.com" }],
  ["m-b", { kind: "user", handle: "person_b", email: "person.b@acme.com" }],
  ["m-bot", { kind: "agent", handle: "betty", email: null }],
]);
const people = parsePeople("person.a@acme.com=U0AAAA001");
const task = (events, row, details = true) => notesFor({ source: "task", events: parseEvents(events), details, row, by: "@betty (agent)", place: "*Task*", who, people, ccUrl: "https://cc.acme.com" });

test("the quiet default: a mention, an approval, a task in review and a lost agent reply", () => {
  assert.deepEqual(QUIET_DEFAULT, ["comment_mention", "approval_pending", "task_review", "reply_dropped", "post_rejected"]);
  assert.equal(eventsLine({}), QUIET_DEFAULT.join(","));
  assert.equal(eventsLine({ events: "all" }), EVENTS.join(","));
  assert.equal(eventsLine({ events: [] }), "");
  assert.deepEqual([...parseEvents(undefined)], QUIET_DEFAULT, "a setup that predates the setting gets the quiet default");
  assert.deepEqual([...parseEvents("")], [], "an empty list posts nothing");
  assert.ok(!parseEvents(undefined).has("chat_mention"));
  assert.ok(EVENTS.every((e) => typeof e === "string") && new Set(EVENTS).size === 16);
});

test("each task change maps to one event, and a change the notifier never posts maps to none", () => {
  assert.equal(activityEvent("created"), "task_created");
  assert.equal(activityEvent("assigned"), "task_assigned");
  assert.equal(activityEvent("unassigned"), "task_unassigned");
  assert.equal(activityEvent("status_changed", { to: "review" }), "task_review");
  assert.equal(activityEvent("status_changed", { to: "done" }), "task_done");
  assert.equal(activityEvent("status_changed", { to: "blocked" }), "task_blocked");
  assert.equal(activityEvent("status_changed", { to: "backlog" }), "task_status_other");
  assert.equal(activityEvent("progress_changed", { to: 100 }), "task_progress_100");
  assert.equal(activityEvent("progress_changed", { to: 60 }), null);
  assert.equal(activityEvent("archived"), "task_archived");
  assert.equal(activityEvent("renamed"), null);
});

test("a mention goes as a DM to each mentioned person on notify.people, and never to the channel", () => {
  const row = { member_id: "m-bot", body_md: "Pick a\nlayout, please", mentions: ["m-a", "m-b", "m-bot"] };
  const n = task(QUIET_DEFAULT.join(","), row);
  assert.equal(n.channel, null, "the comment stays out of the channel");
  assert.deepEqual(n.dms.map((d) => d.slackUser), ["U0AAAA001"], "the email matches in any case");
  assert.equal(n.dms[0].text, "❓ @betty (agent) mentioned you on *Task*: Pick a layout, please");
  assert.deepEqual(n.skipped, ["person_b"], "a person not on the list gets nothing, and the log names only the handle");
  assert.equal(n.event, "comment_mention");
  // With the comment event on, the channel gets the comment with no mention tag, and the DM still goes.
  const both = task("comment,comment_mention", row);
  assert.equal(both.channel, "💬 @betty (agent) on *Task*: Pick a layout, please");
  assert.equal(both.dms.length, 1);
  // The comment_mention event off: no DM.
  assert.deepEqual(task("comment", row).dms, []);
  // The author gets no DM about the author's own mention, and an agent never gets one.
  assert.deepEqual(task("comment_mention", { ...row, member_id: "m-a", mentions: ["m-a", "m-bot"] }).dms, []);
});

test("with details off, a mention DM names no task, author or text", () => {
  const n = task("comment_mention", { member_id: "m-bot", body_md: "the secret plan", mentions: ["m-a"] }, false);
  assert.equal(n.dms[0].text, ":bell: You were mentioned on a task in CircleChat (<https://cc.acme.com|open CircleChat>).");
  assert.doesNotMatch(n.dms[0].text, /secret|betty|Task/);
});

test("a chat mention is off by default, and a message in a DM never reaches Slack", () => {
  const row = { member_id: "m-bot", body_md: "Ready for review", mentions: ["m-a"], kind: "channel" };
  const chat = (events, r) => notesFor({ source: "chat", events: parseEvents(events), details: true, row: r, by: "@betty (agent)", place: "#design", who, people });
  assert.deepEqual(chat(undefined, row).dms, []);
  const n = chat("chat_mention", row);
  assert.equal(n.channel, null);
  assert.equal(n.dms[0].text, "❓ @betty (agent) mentioned you in #design: Ready for review");
  assert.deepEqual(chat("chat_mention", { ...row, kind: "dm" }).dms, []);
});

test("an approval note names the agent and the action, and with details off neither", () => {
  assert.equal(approvalText({ details: true, handle: "porter", action: "Push <main>", ccUrl: "https://cc.acme.com/" }), "🔐 @porter (agent) waits for approval: Push main. <https://cc.acme.com/approvals|Open the approvals>.");
  assert.equal(approvalText({ details: false, handle: "porter", action: "Push main" }), "🔐 An agent waits for approval in CircleChat.");
});

test("the config check names each wrong event and each wrong person", () => {
  assert.deepEqual(validateNotify({}), []);
  assert.deepEqual(validateNotify({ events: "all", people: [{ email: "person.a@acme.com", slack_user: "U0AAAA001" }] }), []);
  const errs = validateNotify({ events: ["comment_mention", "everything"], people: [
    { email: "person.a@acme.com", slack_user: "U0AAAA001" },
    { email: "PERSON.A@acme.com", slack_user: "U0AAAA002" },
    { email: "a;rm -rf@acme.com", slack_user: "bob", team: "x" },
  ] });
  assert.ok(errs.some((e) => /"everything" is not an event/.test(e)));
  assert.ok(errs.some((e) => /notify.people\[1\].email: PERSON.A@acme.com is on the list twice/.test(e)));
  assert.ok(errs.some((e) => /notify.people\[2\].email must be the person's CircleChat email address/.test(e)), "a character the shell reads is refused");
  assert.ok(errs.some((e) => /notify.people\[2\].slack_user must be a Slack user ID/.test(e)));
  assert.ok(errs.some((e) => /notify.people\[2\]: team is not a setting/.test(e)));
  assert.ok(validateNotify({ events: "some" }).some((e) => /notify.events must be "all" or a list/.test(e)));
  assert.equal(peopleLine({ people: [{ email: "Person.A@acme.com", slack_user: "U0AAAA001" }] }), "person.a@acme.com=U0AAAA001");
});
