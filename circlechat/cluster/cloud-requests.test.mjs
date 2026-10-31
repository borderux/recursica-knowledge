import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ANSWER_SCRIPT, CloudAnswers, WEBHOOK_PATH, makeReceiver, parseApprovers, requestMessage, verifySignature } from "./cloud-requests.mjs";

const NOW = 1_800_000_000_000;
const SECRET = "webhook-secret";
const APPROVERS = parseApprovers("pat@example.com=U0PAT0001, Sam@Example.com=U0SAM0001");
const sign = (body, ts = String(NOW / 1000), secret = SECRET) =>
  `sha256=${crypto.createHmac("sha256", secret).update(`${ts}.`).update(body).digest("hex")}`;
const event = (over = {}) => ({
  type: "cloud_models.request.created",
  request: { id: "cmreq_abc123", setting: { mode: "cloud_after_wait", maxStartWaitMinutes: 15, maxFinishMinutes: 120 },
    requestedBy: { memberId: "m_1", name: "Lee <Asker>", email: "lee@example.com" }, requestedAt: "2026-10-31T17:00:00.000Z" },
  task: { id: "task_1", workspaceId: "ws_1", title: "Write the launch notes", url: "https://chat.example.com/board?task=task_1" },
  ...over,
});
function receiver(post = async () => true) {
  const posts = [];
  const receive = makeReceiver({ secret: SECRET, stack: "acme", computer: "machine-2", approvers: APPROVERS, details: true,
    post: async (m) => { posts.push(m); return post(m); }, now: () => NOW });
  const send = (body, headers = {}) => receive({ method: "POST", url: WEBHOOK_PATH, body,
    headers: { "x-circlechat-timestamp": String(NOW / 1000), "x-circlechat-signature": sign(body), "x-circlechat-delivery": "dlv_1", ...headers } });
  return { receive, send, posts };
}

test("reads each approver's email and Slack user ID", () => {
  assert.deepEqual(APPROVERS, [{ email: "pat@example.com", slack_user: "U0PAT0001" }, { email: "sam@example.com", slack_user: "U0SAM0001" }]);
  assert.deepEqual(parseApprovers(""), []);
});

test("the signature check takes only CircleChat's signature, from the last five minutes", () => {
  const body = JSON.stringify(event());
  const ok = (over) => verifySignature({ secret: SECRET, timestamp: String(NOW / 1000), signature: sign(body), body, nowMs: NOW, ...over });
  assert.equal(ok({}), true);
  assert.equal(ok({ signature: sign(body, undefined, "another-secret") }), false);
  assert.equal(ok({ body: body.replace("cloud_after_wait", "cloud_now") }), false);
  assert.equal(ok({ nowMs: NOW + 6 * 60_000 }), false);
  assert.equal(ok({ signature: undefined }), false);
  assert.equal(ok({ secret: "" }), false);
});

test("the post names the request, mentions each approver, and carries the request on both buttons", () => {
  const m = requestMessage(event(), { stack: "acme", computer: "machine-2", approvers: APPROVERS, details: true });
  assert.match(m.text, /^:cloud: Lee &lt;Asker&gt; asks to move "Write the launch notes" on stack acme to \*Cloud after a wait \(start within 15 min, finish within 120 min\)\*\./);
  assert.match(m.text, /<https:\/\/chat\.example\.com\/board\?task=task_1\|Open the task>/);
  assert.match(m.text, /<@U0PAT0001> <@U0SAM0001>/);
  assert.doesNotMatch(m.text, /@example\.com/, "no email reaches Slack");
  const buttons = m.blocks[1].elements;
  assert.deepEqual(buttons.map((b) => [b.action_id, b.text.text]), [["cloud-approve", "Approve"], ["cloud-deny", "Deny"]]);
  for (const b of buttons) assert.deepEqual(JSON.parse(b.value), { c: "machine-2", r: "acme|cmreq_abc123", a: ["U0PAT0001", "U0SAM0001"] });
});

test("with the stack's details off, the post leaves out the task's title and the asker's name", () => {
  const m = requestMessage(event(), { stack: "acme", computer: "machine-2", approvers: APPROVERS, details: false });
  assert.match(m.text, /^:cloud: A member asks to move a task on stack acme to \*Cloud after a wait/);
  assert.doesNotMatch(m.text, /launch notes|Lee/);
});

test("the receiver posts a signed request once, and turns away everything else", async () => {
  const { receive, send, posts } = receiver();
  const body = JSON.stringify(event());
  assert.equal((await send(body)).status, 202);
  assert.equal((await send(body)).status, 202, "CircleChat's retry with the same delivery ID");
  assert.equal(posts.length, 1);
  assert.equal((await send(body, { "x-circlechat-signature": sign(body, undefined, "wrong") })).status, 401);
  assert.equal((await send(body, { "x-circlechat-timestamp": String(NOW / 1000 - 600) })).status, 401);
  assert.equal((await receive({ method: "GET", url: WEBHOOK_PATH, headers: {}, body: "" })).status, 404);
  assert.equal((await receive({ method: "POST", url: "/other", headers: {}, body })).status, 404);
  const other = JSON.stringify(event({ type: "something.else" }));
  assert.equal((await send(other, { "x-circlechat-signature": sign(other), "x-circlechat-delivery": "dlv_2" })).status, 204);
  const badId = JSON.stringify(event({ request: { ...event().request, id: "../../etc" } }));
  assert.equal((await send(badId, { "x-circlechat-signature": sign(badId), "x-circlechat-delivery": "dlv_3" })).status, 400);
  assert.equal(posts.length, 1);
});

test("a post that Slack refuses answers 502, so CircleChat tries again", async () => {
  let up = false;
  const { send, posts } = receiver(async () => up);
  const body = JSON.stringify(event());
  assert.equal((await send(body)).status, 502);
  up = true;
  assert.equal((await send(body)).status, 202);
  assert.equal(posts.length, 2);
});

function answers({ status = 200, body = { taskId: "task_1", decision: "approve", setting: { mode: "cloud_now" } }, token = "t".repeat(64) } = {}) {
  const calls = [];
  const a = new CloudAnswers({
    stacks: async () => [{ name: "acme", ccDir: "/stacks/acme" }],
    approversOf: () => APPROVERS,
    tokenOf: () => token,
    call: async (st, script, input) => { calls.push({ st, script, input: JSON.parse(input) }); return JSON.stringify({ status, body }); },
  });
  return { a, calls };
}

test("the answer goes to CircleChat's answer API as the approver, with the token on stdin", async () => {
  const { a, calls } = answers();
  const r = await a.answer("acme|cmreq_abc123", "approve", "U0SAM0001");
  assert.deepEqual(r, { ok: true, message: "approved on stack acme. The task now uses Cloud now" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].script, ANSWER_SCRIPT);
  assert.doesNotMatch(calls[0].script, /tttt/, "the token is not in the script");
  assert.deepEqual(calls[0].input, { token: "t".repeat(64), id: "cmreq_abc123", body: { decision: "approve", approverEmail: "sam@example.com" } });
});

test("a denial says what the task stays on", async () => {
  const { a } = answers({ body: { taskId: "task_1", decision: "deny", setting: { mode: "cluster_only" } } });
  assert.deepEqual(await a.answer("acme|cmreq_abc123", "deny", "U0PAT0001"), { ok: true, message: "denied on stack acme. The task stays on Cluster only" });
});

test("the stack's control computer checks the approver again, and refuses a bad request", async () => {
  const { a, calls } = answers();
  assert.match((await a.answer("acme|cmreq_abc123", "approve", "U0OTHER01")).message, /only a person on stack acme's cloud_approvers can answer/);
  assert.match((await a.answer("acme|cmreq_abc123", "deny", undefined)).message, /cloud_approvers/);
  assert.match((await a.answer("other|cmreq_abc123", "approve", "U0PAT0001")).message, /no open stack other/);
  assert.match((await a.answer("acme|; rm -rf /", "approve", "U0PAT0001")).message, /not a cloud-model request/);
  assert.equal(calls.length, 0);
  const { a: noToken } = answers({ token: "" });
  assert.match((await noToken.answer("acme|cmreq_abc123", "approve", "U0PAT0001")).message, /no service token/);
});

test("CircleChat's refusals come back in plain words", async () => {
  const cases = [
    [404, "request_not_found", /already answered or replaced/],
    [403, "approver_not_in_workspace", /not a member of the task's CircleChat workspace/],
    [403, "not_an_approver", /CLOUD_APPROVERS does not list the approver/],
    [500, "boom", /CircleChat answered 500 \(boom\)/],
  ];
  for (const [status, error, want] of cases) {
    const { a } = answers({ status, body: { error } });
    const r = await a.answer("acme|cmreq_abc123", "approve", "U0PAT0001");
    assert.equal(r.ok, false);
    assert.match(r.message, want);
  }
});

test("the receiver's server answers each request, and refuses a body over 64 KB", async () => {
  const fs = await import("node:fs"), os = await import("node:os"), path = await import("node:path");
  const { Readable } = await import("node:stream");
  const { serve } = await import("./cloud-requests.mjs");
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rx-")), "secret");
  fs.writeFileSync(file, `${SECRET}\n`);
  const posts = [];
  const server = serve({ WEBHOOK_SECRET_FILE: file, PORT: "0", HOST: "127.0.0.1", STACK_NAME: "acme", COMPUTER: "machine-2",
    CLOUD_APPROVER_SLACK: "pat@example.com=U0PAT0001" }, async (m) => { posts.push(m); return true; });
  // The server's own request handler, with stand-ins for the request and the response.
  const handle = server.listeners("request")[0];
  const send = (method, url, body, headers = {}) => new Promise((resolve) => {
    const req = Object.assign(Readable.from(body ? [Buffer.from(body)] : []), { method, url, headers });
    const res = { writeHead(code) { this.code = code; return this; }, end() { resolve(this.code); } };
    handle(req, res);
  });
  try {
    const body = JSON.stringify(event());
    const ts = String(Math.floor(Date.now() / 1000));
    assert.equal(await send("POST", WEBHOOK_PATH, body, { "x-circlechat-timestamp": ts, "x-circlechat-signature": sign(body, ts), "x-circlechat-delivery": "dlv_9" }), 202);
    assert.equal(posts.length, 1);
    assert.equal(await send("POST", WEBHOOK_PATH, body, { "x-circlechat-timestamp": ts, "x-circlechat-signature": "sha256=00" }), 401);
    assert.equal(await send("POST", "/other", body), 404);
    assert.equal(await send("POST", WEBHOOK_PATH, "a".repeat(70_000)), 413);
    assert.equal(posts.length, 1);
  } finally { server.close(); }
});
