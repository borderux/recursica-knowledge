// The notifier's events and mention DMs (notify/events.mjs): the quiet default, site.json's choice,
// and each mention as a DM to each mentioned person on notify.people, never in the stack's channel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_TTL_MS, EVENTS, QUIET_DEFAULT, activityEvent, approvalText, codeText, containerStopText, eventsLine, hashCode, newCode, newSalt, notesFor, notifyWarnings, parseEvents, parsePeople, peopleLine, validateNotify } from "./events.mjs";

const who = new Map([
  ["m-a", { kind: "user", handle: "person_a", email: "Person.A@acme.com" }],
  ["m-b", { kind: "user", handle: "person_b", email: "person.b@acme.com" }],
  ["m-bot", { kind: "agent", handle: "betty", email: null }],
]);
const people = parsePeople("person.a@acme.com=U0AAAA001");
const task = (events, row, details = true) => notesFor({ source: "task", events: parseEvents(events), details, row, by: "@betty (agent)", place: "*Task*", who, people, ccUrl: "https://cc.acme.com" });

test("the quiet default: a mention, an approval, a task in review, a lost agent reply and a stopped turn container", () => {
  assert.deepEqual(QUIET_DEFAULT, ["comment_mention", "approval_pending", "task_review", "reply_dropped", "post_rejected", "container_stopped"]);
  assert.equal(eventsLine({}), QUIET_DEFAULT.join(","));
  assert.equal(eventsLine({ events: "all" }), EVENTS.join(","));
  assert.equal(eventsLine({ events: [] }), "");
  assert.deepEqual([...parseEvents(undefined)], QUIET_DEFAULT, "a setup that predates the setting gets the quiet default");
  assert.deepEqual([...parseEvents("")], [], "an empty list posts nothing");
  assert.ok(!parseEvents(undefined).has("chat_mention"));
  assert.ok(EVENTS.every((e) => typeof e === "string") && new Set(EVENTS).size === 17);
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

test("a Slack ID the person verified in CircleChat wins, and notify.people is the fallback", () => {
  const withIds = new Map([
    ["m-a", { kind: "user", handle: "person_a", email: "person.a@acme.com", slackUser: "U0VERIFY1" }],
    ["m-b", { kind: "user", handle: "person_b", email: "person.b@acme.com", slackUser: null }],
    ["m-c", { kind: "user", handle: "person_c", email: "person.c@acme.com", slackUser: null }],
    ["m-bot", { kind: "agent", handle: "betty" }],
  ]);
  const list = parsePeople("person.a@acme.com=U0LISTED1,person.b@acme.com=U0LISTED2");
  const n = notesFor({ source: "task", events: parseEvents("comment_mention"), details: true, row: { member_id: "m-bot", body_md: "Look", mentions: ["m-a", "m-b", "m-c"] }, by: "@betty (agent)", place: "*Task*", who: withIds, people: list });
  assert.deepEqual(n.dms.map((d) => [d.handle, d.slackUser]), [["person_a", "U0VERIFY1"], ["person_b", "U0LISTED2"]]);
  assert.deepEqual(n.skipped, ["person_c"], "a person with no verified ID and no list entry gets nothing");
});

test("the notifier's code hashes the same way as CircleChat's check", () => {
  // The same value CircleChat's hashCode (api/src/lib/slack-link-rules.ts) gives for this salt and code.
  assert.equal(hashCode("a1b2c3d4", "042917"), "496e194fc096b6b07cc214967744ead5d389c25a265958b482c4854391f1a7ca");
  for (let i = 0; i < 200; i++) assert.match(newCode(), /^\d{6}$/);
  assert.match(newSalt(), /^[0-9a-f]{32}$/);
  assert.notEqual(newSalt(), newSalt());
  assert.equal(CODE_TTL_MS, 600_000);
});

test("the code DM names the CircleChat account and address, and says to ignore a code nobody asked for", () => {
  const text = codeText({ code: "042917", handle: "person_a", ccUrl: "https://cc.acme.com/" });
  assert.equal(text, "Your CircleChat code is *042917*. The code links this Slack account to @person_a on https://cc.acme.com, and works for 10 minutes. If you didn't ask for a code, ignore this message.");
});

test("notify.people gets a warning, never an error", () => {
  const people = [{ email: "person.a@acme.com", slack_user: "U0AAAA001" }];
  assert.deepEqual(validateNotify({ people }), []);
  assert.match(notifyWarnings({ people }).join(), /notify.people is a fallback .* A verified ID wins/);
  assert.deepEqual(notifyWarnings({}), []);
  assert.deepEqual(notifyWarnings({ people: [] }), []);
});

// CircleChat's bridge stops a turn container still running past its deadline plus the stop grace,
// and records it in turn_container_stops; the notifier posts each one to the stack's channel.
test("a stopped turn container: the agent, the container and how far past its deadline, nothing else", () => {
  assert.equal(
    containerStopText({ handle: "designer", container: "cc-turn-designer-be0d6713", overdueMs: 20 * 60_000 }),
    "🛑 @designer's turn container `cc-turn-designer-be0d6713` was still running 20 min past its deadline, so CircleChat stopped it.",
  );
  assert.match(containerStopText({ handle: null, container: "cc-turn-x-12345678", overdueMs: 0 }), /^🛑 An agent's turn container `cc-turn-x-12345678` was still running 1 min past/);
  // Slack markup and backticks in a name never reach Slack.
  const t = containerStopText({ handle: "<!channel>", container: "cc-turn-a`<b>-12345678", overdueMs: 90_000 });
  assert.doesNotMatch(t, /[<>]|`[^`]*`[^`]*`[^`]*`/);
  assert.match(t, /2 min past/);
});
