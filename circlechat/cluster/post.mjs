// Post one message to the cluster's Slack channel, with or without buttons.
//
//   node post.mjs info "<text>"
//   node post.mjs reboot "<text>" <computer> <ref>
//   node post.mjs lockdown "<text>" <computer> <ref>
//
// Needs SLACK_BOT_TOKEN and SLACK_CHANNEL_ID. Prints the message's timestamp.
import { buttonBlocks } from "./actions.mjs";
import { slackApi } from "./bot.mjs";

const [kind, text, computer, ref] = process.argv.slice(2);
if (!kind || !text) { console.error("usage: post.mjs info|reboot|lockdown <text> [computer] [ref]"); process.exit(1); }
const api = slackApi(process.env.SLACK_BOT_TOKEN);
const body = { channel: process.env.SLACK_CHANNEL_ID, text,
  ...(kind === "info" ? {} : { blocks: buttonBlocks(kind, text, computer, ref) }) };
const r = await api("chat.postMessage", body);
if (!r.ok) process.exit(1);
console.log(r.ts);
