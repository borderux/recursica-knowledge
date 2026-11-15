// The chat tool for the cluster's alerts and buttons. Every alert goes through post():
//
//   post(channel, kind, text, ref)   kind is "info" (no buttons) or a button set from actions.mjs
//   postPlain(channel, text)         text from outside the cluster agent, such as a port job's
//                                    status line, shown as plain text (plainText())
//
// Slack is the chat tool today (CHAT=slack, the default). Another chat tool, such as Microsoft
// Teams, plugs in as a second implementation of post(), plus a bot like bot.mjs that turns the
// tool's button clicks into the same actions.
import { buttonBlocks, clusterTz } from "./actions.mjs";
import { slackApi } from "./bot.mjs";
import { senderFields } from "../kit/slack.mjs";

// Text that Slack shows as written: no mention, no link, no bold, italics or code. Slack reads <,
// > and & as markup, such as <!channel> or <@U123>, so those three become entities. postPlain()
// also turns off Slack's formatting and name links. The text becomes one line, 500 characters at most.
export function plainText(text) {
  const line = String(text ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  const cut = line.length > 500 ? `${line.slice(0, 499)}…` : line;
  return cut.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// allowed() lists the channels this computer may post to: the cluster channel and each local
// stack's own channel. A post to any other channel is refused, so one client's alert can never
// land in another client's channel.
export function makeChannel(env = process.env, allowed = () => [env.SLACK_CHANNEL_ID]) {
  const chat = env.CHAT ?? "slack";
  if (chat === "slack") {
    const api = slackApi(env.SLACK_BOT_TOKEN);
    const refused = async (to) => {
      if ((await allowed()).includes(to)) return false;
      console.error(`refused a post to channel ${to}: not this computer's channel`);
      return true;
    };
    return {
      postPlain: async (channel, text) => {
        const to = channel ?? env.SLACK_CHANNEL_ID;
        if (await refused(to)) return { ok: false };
        return api("chat.postMessage", { channel: to, text: plainText(text), mrkdwn: false, parse: "none", link_names: false,
          unfurl_links: false, unfurl_media: false, ...senderFields(env.COMPUTER, env.SLACK_ICON) });
      },
      post: async (channel, kind, text, ref, blocks) => {
        const to = channel ?? env.SLACK_CHANNEL_ID;
        if (await refused(to)) return { ok: false };
        // The message shows this computer's name, and the computer's icon, as the sender.
        return api("chat.postMessage", { channel: to, text, ...senderFields(env.COMPUTER, env.SLACK_ICON),
        ...(blocks ? { blocks } : kind === "info" ? {} : { blocks: buttonBlocks(kind, text, env.COMPUTER, ref, clusterTz(env)) }) });
      },
    };
  }
  throw new Error(`CHAT=${chat} is not supported yet. Slack is the chat tool today.`);
}
