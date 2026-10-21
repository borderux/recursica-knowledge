// The chat tool for the cluster's alerts and buttons. Every alert goes through post():
//
//   post(channel, kind, text, ref)   kind is "info" (no buttons) or a button set from actions.mjs
//
// Slack is the chat tool today (CHAT=slack, the default). Another chat tool, such as Microsoft
// Teams, plugs in as a second implementation of post(), plus a bot like bot.mjs that turns the
// tool's button clicks into the same actions.
import { buttonBlocks } from "./actions.mjs";
import { slackApi } from "./bot.mjs";

// allowed() lists the channels this computer may post to: the cluster channel and each local
// stack's own channel. A post to any other channel is refused, so one client's alert can never
// land in another client's channel.
export function makeChannel(env = process.env, allowed = () => [env.SLACK_CHANNEL_ID]) {
  const chat = env.CHAT ?? "slack";
  if (chat === "slack") {
    const api = slackApi(env.SLACK_BOT_TOKEN);
    return {
      post: async (channel, kind, text, ref, blocks) => {
        const to = channel ?? env.SLACK_CHANNEL_ID;
        if (!(await allowed()).includes(to)) { console.error(`refused a post to channel ${to}: not this computer's channel`); return { ok: false }; }
        return api("chat.postMessage", { channel: to, text,
        ...(blocks ? { blocks } : kind === "info" ? {} : { blocks: buttonBlocks(kind, text, env.COMPUTER, ref) }) });
      },
    };
  }
  throw new Error(`CHAT=${chat} is not supported yet. Slack is the chat tool today.`);
}
