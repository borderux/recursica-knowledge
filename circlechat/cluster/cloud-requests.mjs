// Cloud-model requests in Slack. A person who is not an approver asks, in CircleChat, to move a
// task off "Cluster only". CircleChat sends the request to a webhook, and an approver answers the
// request in the stack's Slack channel.
//
//   1. The receiver (this file, "serve") runs in its own container on the stack's Docker network
//      only, so only the stack's own containers reach the webhook's address. The receiver checks
//      the webhook's signature, then posts the request in the stack's channel. The post mentions
//      each approver from site.json's cloud_approvers, and has an Approve and a Deny button.
//   2. The Slack app (bot.mjs) takes the press. Only a person on cloud_approvers can press either
//      button, and Approve needs the person's authenticator code. The app sends the answer to the
//      cluster agent on the stack's control computer.
//   3. The cluster agent (CloudAnswers below) checks the person against the stack's
//      cloud_approvers again. The agent then calls CircleChat's answer API inside the stack's api
//      container, with the service token and the approver's email. The Slack app replies in the
//      request's thread with the result.
//
// The receiver's settings, from the environment:
//   SLACK_BOT_TOKEN, SLACK_CHANNEL  the Slack app's bot token and the stack's channel
//   STACK_NAME                      the stack's name, the sender of each post
//   COMPUTER                        the stack's control computer, whose cluster agent answers
//   CLOUD_APPROVER_SLACK            each approver's email and Slack user ID: "person-a@example.com=U012,person-b@example.com=U034"
//   WEBHOOK_SECRET_FILE             the file with the webhook's signing secret
//   NOTIFY_DETAILS                  "off" leaves the task's title and the asker's name out of Slack
//   CC_URL                          CircleChat's address, for the link to the task
//   PORT                            the receiver's port inside the container (default 8080)
//
// Only node's own modules: setup-host.sh copies this one file into the receiver's container.
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";

export const WEBHOOK_PATH = "/cloud-request";
export const RECEIVER_PORT = 8080;
export const MAX_SKEW_SECONDS = 5 * 60;
const REQUEST_ID = /^cmreq_[A-Za-z0-9_-]{1,40}$/;

// "person-a@example.com=U012,person-b@example.com=U034" as [{ email, slack_user }].
export function parseApprovers(s) {
  return String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.lastIndexOf("=");
    return { email: x.slice(0, i).trim().toLowerCase(), slack_user: x.slice(i + 1).trim() };
  });
}

// CircleChat signs each POST as sha256=HMAC(secret, "<timestamp>.<body>"), the same way as its
// workflow webhooks.
export function verifySignature({ secret, timestamp, signature, body, nowMs = Date.now() }) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > MAX_SKEW_SECONDS) return false;
  const want = Buffer.from(`sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex")}`);
  const given = Buffer.from(String(signature).trim());
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

const LABELS = { cluster_only: "Cluster only", cloud_after_wait: "Cloud after a wait", cloud_now: "Cloud now" };

export function describeSetting(s) {
  if (s?.mode === "cloud_after_wait") return `${LABELS.cloud_after_wait} (start within ${s.maxStartWaitMinutes} min, finish within ${s.maxFinishMinutes} min)`;
  return LABELS[s?.mode] ?? "an unknown setting";
}

// Slack treats &, < and > as markup.
const plain = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The post for one request: the request, a mention of each approver, and the two buttons. Each
// button carries the stack's control computer, the stack and the request, and the approvers' Slack
// user IDs, so the Slack app turns away anyone else before asking for a code.
export function requestMessage(event, { stack, computer, approvers, details = true, ccUrl = "" }) {
  const r = event.request ?? {};
  const task = event.task ?? {};
  const link = task.url || (ccUrl && task.id ? `${ccUrl.replace(/\/+$/, "")}/board?task=${task.id}` : "");
  const what = details && task.title ? `"${plain(task.title)}"` : "a task";
  const who = details && r.requestedBy?.name ? plain(r.requestedBy.name) : "A member";
  const mentions = approvers.map((a) => `<@${a.slack_user}>`).join(" ");
  const text = `:cloud: ${who} asks to move ${what} on stack ${plain(stack)} to *${describeSetting(r.setting)}*.` +
    `${link ? ` <${link}|Open the task>.` : ""} ${mentions} An approver has to answer. "Approve" needs an authenticator code.`;
  const value = JSON.stringify({ c: computer, r: `${stack}|${r.id}`, a: approvers.map((a) => a.slack_user) });
  return {
    text,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text } },
      { type: "actions", elements: [
        { type: "button", action_id: "cloud-approve", text: { type: "plain_text", text: "Approve" }, style: "primary", value },
        { type: "button", action_id: "cloud-deny", text: { type: "plain_text", text: "Deny" }, style: "danger", value },
      ] },
    ],
  };
}

// The webhook's handler. post(message) sends one message to the stack's channel and returns true
// once Slack takes the message. A retry from CircleChat carries the same delivery ID, so each
// request is posted once.
export function makeReceiver({ secret, stack, computer, approvers, details, ccUrl, post, now = () => Date.now() }) {
  const seen = new Map();
  return async function receive({ method, url, headers, body }) {
    if (method !== "POST" || url !== WEBHOOK_PATH) return { status: 404 };
    if (!verifySignature({ secret, timestamp: headers["x-circlechat-timestamp"], signature: headers["x-circlechat-signature"], body, nowMs: now() })) return { status: 401 };
    let event;
    try { event = JSON.parse(body); } catch { return { status: 400 }; }
    if (event?.type !== "cloud_models.request.created") return { status: 204 };
    if (!REQUEST_ID.test(event.request?.id ?? "")) return { status: 400 };
    const delivery = String(headers["x-circlechat-delivery"] ?? event.request.id);
    for (const [k, at] of seen) if (now() - at > 3600_000) seen.delete(k);
    if (seen.has(delivery)) return { status: 202 };
    const ok = await post(requestMessage(event, { stack, computer, approvers, details, ccUrl }));
    if (!ok) return { status: 502 };
    seen.set(delivery, now());
    return { status: 202 };
  };
}

// The receiver's HTTP server. post replaces the post to Slack in the tests.
export function serve(env = process.env, post = slackPost(env)) {
  const secret = fs.readFileSync(env.WEBHOOK_SECRET_FILE ?? "/run/secrets/webhook-secret", "utf8").trim();
  const receive = makeReceiver({ secret, stack: env.STACK_NAME, computer: env.COMPUTER, approvers: parseApprovers(env.CLOUD_APPROVER_SLACK),
    details: env.NOTIFY_DETAILS !== "off", ccUrl: env.CC_URL ?? "", post });
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) {
      body += c;
      if (body.length > 65_536) { res.writeHead(413, { connection: "close" }).end(); req.destroy(); return; }
    }
    const r = await receive({ method: req.method, url: req.url, headers: req.headers, body }).catch((e) => { console.error(e); return { status: 500 }; });
    res.writeHead(r.status).end();
  });
  server.listen(Number(env.PORT ?? RECEIVER_PORT), env.HOST ?? "0.0.0.0");
  return server;
}

function slackPost(env) {
  return async ({ text, blocks }) => {
    try {
      const r = await fetch("https://slack.com/api/chat.postMessage", { method: "POST", signal: AbortSignal.timeout(15_000),
        headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" },
        // Each post shows the stack's name as the sender (kit/slack.mjs, senderFields).
        body: JSON.stringify({ channel: env.SLACK_CHANNEL, text, blocks, ...(env.STACK_NAME ? { username: env.STACK_NAME } : {}) }) });
      const j = await r.json();
      if (!j.ok) console.error(`slack chat.postMessage: ${j.error}`);
      return j.ok === true;
    } catch (e) { console.error(`slack: ${e.message}`); return false; }
  };
}

// ───── the answer, on the stack's control computer ─────

// The script the cluster agent runs inside the stack's api container. The token and the answer
// arrive on stdin, so no command line holds the token. The api listens on port 3000 there.
export const ANSWER_SCRIPT = `
let input = ""; for await (const c of process.stdin) input += c;
const { token, id, body } = JSON.parse(input);
try {
  const r = await fetch("http://127.0.0.1:3000/api/cloud-models/requests/" + encodeURIComponent(id) + "/answer", {
    method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {}
  process.stdout.write(JSON.stringify({ status: r.status, body: j }));
} catch (e) { process.stdout.write(JSON.stringify({ status: 0, body: { error: e.message } })); }
`;

const REFUSALS = {
  request_not_found: "the request was already answered or replaced",
  not_an_approver: "CircleChat's CLOUD_APPROVERS does not list the approver. Rerun setup-host.sh",
  approver_not_in_workspace: "the approver is not a member of the task's CircleChat workspace",
  not_found: "CircleChat's answer API is off. Rerun setup-host.sh",
  invalid_token: "CircleChat refused the service token. Rerun setup-host.sh",
};

// stacks: () => [{ name, ccDir, context }], the open stacks on this computer.
// approversOf(stack) -> [{ email, slack_user }], from the stack's site.json.
// tokenOf(stack) -> the service token, from the stack's root-only file.
// call(stack, script, input) -> stdout of `node` in the stack's api container, with input on stdin.
export class CloudAnswers {
  constructor({ stacks, approversOf, tokenOf, call }) { Object.assign(this, { stacks, approversOf, tokenOf, call }); }

  async answer(ref, decision, slackUser) {
    const [stack, id] = String(ref ?? "").split("|");
    if (!REQUEST_ID.test(id ?? "")) return { ok: false, message: "not a cloud-model request" };
    const st = (await this.stacks()).find((x) => x.name === stack);
    if (!st) return { ok: false, message: `no open stack ${stack} on this computer` };
    const approver = this.approversOf(st).find((a) => a.slack_user === slackUser);
    if (!approver) return { ok: false, message: `only a person on stack ${stack}'s cloud_approvers can answer` };
    let token;
    try { token = this.tokenOf(st); } catch { token = ""; }
    if (!token) return { ok: false, message: `stack ${stack} has no service token. Rerun setup-host.sh` };
    const out = await this.call(st, ANSWER_SCRIPT, JSON.stringify({ token, id, body: { decision, approverEmail: approver.email } }));
    let r;
    try { r = JSON.parse(out); } catch { return { ok: false, message: `stack ${stack}'s CircleChat did not answer` }; }
    if (r.status === 200) {
      return { ok: true, message: decision === "approve"
        ? `approved on stack ${stack}. The task now uses ${describeSetting(r.body?.setting)}`
        : `denied on stack ${stack}. The task stays on ${describeSetting(r.body?.setting)}` };
    }
    const why = REFUSALS[r.body?.error] ?? `CircleChat answered ${r.status || "nothing"}${r.body?.error ? ` (${r.body.error})` : ""}`;
    return { ok: false, message: `stack ${stack}: ${why}` };
  }
}

// The stack's cloud_approvers from its site.json, and its token from the root-only file that
// setup-host.sh writes.
export function stackApprovers(st) {
  const site = JSON.parse(fs.readFileSync(`${st.ccDir}/site.json`, "utf8"));
  return (site.cloud_approvers ?? []).map((a) => ({ email: String(a.email).toLowerCase(), slack_user: a.slack_user }));
}
export const stackToken = (st) => fs.readFileSync(`${st.ccDir}/cloud-approvals/approval-token`, "utf8").trim();

// `docker compose exec -T api node --input-type=module -e <script>`, in the stack's folder and
// Docker context, with the input on stdin.
export function apiCall(st, script, input) {
  return new Promise((resolve) => {
    const p = spawn("docker", ["compose", "exec", "-T", "api", "node", "--input-type=module", "-e", script],
      { cwd: st.ccDir, env: { ...process.env, ...(st.context ? { DOCKER_CONTEXT: st.context } : {}) } });
    let out = "";
    const timer = setTimeout(() => p.kill(), 30_000);
    p.stdout.on("data", (c) => { out += c; });
    p.on("error", () => { clearTimeout(timer); resolve(""); });
    p.on("close", () => { clearTimeout(timer); resolve(out); });
    p.stdin.end(input);
  });
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === "serve") {
  serve();
  console.log(`cloud-model requests for stack ${process.env.STACK_NAME}, port ${process.env.PORT ?? RECEIVER_PORT}`);
}
