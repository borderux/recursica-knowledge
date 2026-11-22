// Post one message to a stack's own Slack channel, through the cluster's Slack app. Scripts use
// this instead of a webhook. The token and the channel come from the stack's .env:
// SLACK_BOT_TOKEN (the Slack app's bot token) and SLACK_CHANNEL (site.slack_channel_id).
//
//   node kit/slack.mjs "<text>"        (with CC_DIR set, or run from the stack's folder)
//
// It logs the result on one line: "slack: posted to the stack's channel (ts …)", or "slack: the post
// failed: <Slack's error>" and exit 1. The jobs that call it send that line to their own log, so a
// failed post is never silent.
import fs from "node:fs";
import path from "node:path";
import { stackName } from "./render.mjs";

// The name and the icon a Slack message shows as its sender: the sending computer's name for the
// cluster's own programs, and the stack's name for a message about a whole stack. The icon is an
// emoji, such as :desktop_computer: (nodes[].slack_icon in site.json). Slack uses both only when
// the Slack app has the chat:write.customize scope. Without that scope, Slack ignores both and
// posts as the app.
export function senderFields(name, icon) {
  return { ...(name ? { username: name } : {}), ...(icon ? { icon_emoji: icon } : {}) };
}

// Posts to the stack's channel. Resolves to { ok, ts } or { ok: false, error }, never throws.
export function stackPost(ccDir) {
  let env = "";
  try { env = fs.readFileSync(path.join(ccDir, ".env"), "utf8"); } catch {}
  const get = (k) => (env.match(new RegExp(`^${k}=(.+)$`, "m")) ?? [])[1]?.trim() ?? "";
  const token = get("SLACK_BOT_TOKEN"), channel = get("SLACK_CHANNEL");
  let name = "";
  try { name = stackName(JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8"))); } catch {}
  return async (text) => {
    if (!token || !channel) return { ok: false, error: `SLACK_BOT_TOKEN or SLACK_CHANNEL is not set in ${path.join(ccDir, ".env")}` };
    try {
      const r = await fetch("https://slack.com/api/chat.postMessage", { method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ channel, text, ...senderFields(name) }), signal: AbortSignal.timeout(20_000) });
      const j = await r.json();
      return j.ok ? { ok: true, ts: j.ts } : { ok: false, error: j.error ?? `HTTP ${r.status}` };
    } catch (e) {
      return { ok: false, error: `no answer from Slack: ${e.message}` };
    }
  };
}

// The same post, as true or false, for the callers that need no detail.
export function stackSlack(ccDir) {
  const post = stackPost(ccDir);
  return async (text) => (await post(text)).ok;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await stackPost(process.env.CC_DIR ?? process.cwd())(process.argv[2] ?? "");
  if (r.ok) console.log(`slack: posted to the stack's channel (ts ${r.ts})`);
  else console.error(`slack: the post failed: ${r.error}`);
  process.exit(r.ok ? 0 : 1);
}
