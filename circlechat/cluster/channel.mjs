// The chat tool for the cluster's alerts and buttons. Every alert goes through post():
//
//   post(channel, kind, text, ref)   kind is "info" (no buttons) or a button set from actions.mjs
//
// Slack is the chat tool today (CHAT=slack, the default). Another chat tool, such as Microsoft
// Teams, plugs in as a second implementation of post(), plus a bot like bot.mjs that turns the
// tool's button clicks into the same actions.
import { buttonBlocks } from "./actions.mjs";
import { slackApi } from "./bot.mjs";

export function makeChannel(env = process.env) {
  const chat = env.CHAT ?? "slack";
  if (chat === "slack") {
    const api = slackApi(env.SLACK_BOT_TOKEN);
    return {
      post: (channel, kind, text, ref, blocks) => api("chat.postMessage", { channel: channel ?? env.SLACK_CHANNEL_ID, text,
        ...(blocks ? { blocks } : kind === "info" ? {} : { blocks: buttonBlocks(kind, text, env.COMPUTER, ref) }) }),
    };
  }
  throw new Error(`CHAT=${chat} is not supported yet. Slack is the chat tool today.`);
}
