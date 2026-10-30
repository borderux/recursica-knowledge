// The Slack message for an agent reply that CircleChat could not use (notify.mjs, dropped()).
//
// CircleChat records each such reply in the run's result_json as `dropped`: the conversation it
// was meant for and a short reason code, never the reply's text. This message names the agent,
// links to the conversation and gives the reason. The reply's text never reaches Slack.
//
// With notify details off (a client stack, unless site.json allows details), the message names no
// conversation: Slack is an outside company. A channel's name stays out, and the link reads "a
// conversation".
//
//   droppedNote({ handle, agentId, conversationId, kind, name, reason }, { details, ccUrl }) -> text

// Slack reads <, > and & as markup.
const plain = (s) => String(s ?? "").replace(/[<>&]/g, "").replace(/\s+/g, " ").trim();

// A short reason code, as CircleChat records it, such as actions_block_visible.
const reasonOf = (r) => plain(r).replace(/[^a-z0-9_:, -]/gi, "").slice(0, 80) || "unknown";

export function droppedNote(row, { details = true, ccUrl = "" } = {}) {
  const base = String(ccUrl || "").replace(/\/$/, "");
  const handle = plain(row.handle).replace(/[^a-z0-9_.-]/gi, "");
  const whose = handle ? `@${handle}'s` : "An agent's";
  // A DM's page in CircleChat is keyed by the person who opens it, so a DM links to the agent's
  // page. A channel links to the channel.
  const isDm = row.kind === "dm";
  const path = isDm ? (row.agentId ? `/agents/${encodeURIComponent(row.agentId)}` : "") : row.conversationId ? `/c/${encodeURIComponent(row.conversationId)}` : "";
  const label = !details ? "a conversation" : isDm ? "a DM" : row.name ? `#${plain(row.name)}` : "a conversation";
  const where = base && path ? `<${base}${path}|${label}>` : label;
  return `:warning: ${whose} reply in ${where} could not be posted: ${reasonOf(row.reason)}. The reply's text is not sent here.`;
}
