// Post one message to a stack's own Slack channel, through the cluster's Slack app. Scripts use
// this instead of a webhook. The token and the channel come from the stack's .env:
// SLACK_BOT_TOKEN (the Slack app's bot token) and SLACK_CHANNEL (site.slack_channel_id).
//
//   node kit/slack.mjs "<text>"        (with CC_DIR set, or run from the stack's folder)
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

export function stackSlack(ccDir) {
  let env = "";
  try { env = fs.readFileSync(path.join(ccDir, ".env"), "utf8"); } catch {}
  const get = (k) => (env.match(new RegExp(`^${k}=(.+)$`, "m")) ?? [])[1]?.trim() ?? "";
  const token = get("SLACK_BOT_TOKEN"), channel = get("SLACK_CHANNEL");
  let name = "";
  try { name = stackName(JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8"))); } catch {}
  return async (text) => {
    if (!token || !channel) return false;
    const r = await fetch("https://slack.com/api/chat.postMessage", { method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel, text, ...senderFields(name) }) }).catch(() => null);
    return Boolean(r && (await r.json()).ok);
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = await stackSlack(process.env.CC_DIR ?? process.cwd())(process.argv[2] ?? "");
  process.exit(ok ? 0 : 1);
}
