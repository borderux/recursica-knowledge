// Post one message to a stack's own Slack channel, through the cluster's Slack app. Scripts use
// this instead of a webhook. The token and the channel come from the stack's .env:
// SLACK_BOT_TOKEN (the Slack app's bot token) and SLACK_CHANNEL (site.slack_channel_id).
//
//   node kit/slack.mjs "<text>"        (with CC_DIR set, or run from the stack's folder)
import fs from "node:fs";
import path from "node:path";

export function stackSlack(ccDir) {
  let env = "";
  try { env = fs.readFileSync(path.join(ccDir, ".env"), "utf8"); } catch {}
  const get = (k) => (env.match(new RegExp(`^${k}=(.+)$`, "m")) ?? [])[1]?.trim() ?? "";
  const token = get("SLACK_BOT_TOKEN"), channel = get("SLACK_CHANNEL");
  return async (text) => {
    if (!token || !channel) return false;
    const r = await fetch("https://slack.com/api/chat.postMessage", { method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel, text }) }).catch(() => null);
    return Boolean(r && (await r.json()).ok);
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await stackSlack(process.env.CC_DIR ?? process.cwd())(process.argv[2] ?? "");
  process.exit(ok ? 0 : 1);
}
