// CircleChat socket-mode agent. Outbound WebSocket, so it runs fine behind NAT or a VPN.
//
//   CC_BOT_TOKEN=cc_…  WSS=wss://<host>/agent-socket  CC_URL=https://<host>
//   KNOWLEDGE_DIR=/path/to/recursica-knowledge  APP_ROOT=/path/to/app  TYPESAFE_API_KEY=…
//   node agent.mjs
//
// Mention it with screen paths: "@kev src/routes/Users.jsx"
import path from "node:path";
import WebSocket from "ws";
import { config } from "./src/config.mjs";
import { toMarkdown } from "./src/report.mjs";
import { triage } from "./src/triage.mjs";

const TOKEN = process.env.CC_BOT_TOKEN;
const WSS = process.env.WSS;
const CC_URL = (process.env.CC_URL ?? "").replace(/\/$/, "");
for (const [k, v] of Object.entries({ CC_BOT_TOKEN: TOKEN, WSS, CC_URL })) {
  if (!v) { console.error(`missing ${k}`); process.exit(1); }
}

const PATH_RE = /[\w./~-]+\.(?:jsx|tsx|js|ts)\b/g;
const FILLER = new Set(["review", "check", "please", "run", "on", "the", "this", "screen", "screens", "and", "again", "first", "pass", "barb", "can", "you", "a", "of"]);

function parse(body) {
  const paths = [...new Set(body.match(PATH_RE) ?? [])];
  const rest = body.replace(PATH_RE, " ").replace(/@\S+/g, " ").toLowerCase().match(/[a-z']+/g) ?? [];
  const extra = rest.filter((w) => !FILLER.has(w));
  // Like Barb: direction from the caller narrows a review. Ignore it, and say so.
  return { paths, ignoredHint: extra.length > 6 };
}

async function post(conversationId, bodyMd, replyTo) {
  const res = await fetch(`${CC_URL}/api/agent-api/post_message`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ conversationId, bodyMd: bodyMd.slice(0, 19_000), replyTo }),
  });
  if (!res.ok) console.error(`post_message ${res.status}: ${await res.text()}`);
}

async function review(conv, msg) {
  const { paths, ignoredHint } = parse(msg.bodyMd ?? "");
  if (!paths.length) {
    await post(conv.conversationId, "Give me the screen file paths to check, e.g. `src/routes/Users.jsx`.", msg.id);
    return;
  }
  const files = paths.map((p) => path.resolve(config.appRoot, p.replace(/^~\//, `${process.env.HOME}/`)));
  try {
    const r = await triage(files, { root: config.appRoot });
    await post(conv.conversationId, toMarkdown(r, { ignoredHint }), msg.id);
  } catch (err) {
    // Never end silently: a failed run posts, so nobody reads silence as a clean screen.
    await post(conv.conversationId, `First pass failed, so nothing was checked: ${err.message}`, msg.id);
  }
}

function connect() {
  const ws = new WebSocket(WSS, { headers: { authorization: `Bearer ${TOKEN}` } });
  ws.on("open", () => console.log("kev connected"));
  ws.on("message", (raw) => {
    let frame;
    try { frame = JSON.parse(String(raw)); } catch { return; }
    if (frame.type !== "heartbeat" && frame.type !== "event") return;
    const p = frame.packet;
    const reply = { correlation_id: frame.correlation_id, type: "reply" };
    const conv = (p.inbox ?? [])[0];
    const msg = conv?.messages?.at(-1);
    if (!["mention", "dm", "test"].includes(p.trigger) || !msg) {
      ws.send(JSON.stringify({ ...reply, status: "HEARTBEAT_OK" }));
      return;
    }
    // Ack now, report when done. A review takes longer than a reply window.
    ws.send(JSON.stringify({
      ...reply,
      actions: [{ type: "react", message_id: msg.id, emoji: "👀" }],
      trace: [`first pass queued for ${p.trigger}`],
    }));
    review(conv, msg).catch((e) => console.error(e));
  });
  ws.on("close", () => { console.log("disconnected, retrying in 2s"); setTimeout(connect, 2000); });
  ws.on("error", () => ws.close());
}

connect();
