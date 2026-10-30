// The cluster's Slack app, connected in Socket Mode: the app opens a connection out to Slack, so no
// port opens to the internet. The app turns button clicks into actions on one computer, through
// that computer's cluster agent. Only the approvers can press a button. The buttons that weaken
// security ask for a 6-digit authenticator code first.
//
// Settings, from the environment:
//   SLACK_APP_TOKEN    app-level token (xapp-...), with the connections:write scope
//   SLACK_BOT_TOKEN    bot token (xoxb-...), with chat:write
//   SLACK_CHANNEL_ID   the ID of the cluster's channel for alerts
//   APPROVERS          Slack user IDs and names: "U012=person_a,U034=person_b"
//   TOTP_SECRET_<NAME> each approver's authenticator secret
//   CLUSTER_TOKEN      the token each cluster agent requires
//   AGENTS             computer names and agent URLs: "machine-1=http://127.0.0.1:7500,machine-2=http://machine-2:7500"
//   STATE_DIR          where the wrong-code count is kept
import fs from "node:fs";
import path from "node:path";
import { senderFields } from "../kit/slack.mjs";
import { ACTIONS, clusterTz, formatTime, localDate, localToUtc, nextAt } from "./actions.mjs";
import { verify, Lockout } from "./totp.mjs";

export function parsePairs(s) {
  return Object.fromEntries(String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.indexOf("="); return [x.slice(0, i).trim(), x.slice(i + 1).trim()];
  }));
}

export function makeBot({ env = process.env, api, relay, now = () => Date.now() }) {
  const tz = clusterTz(env);
  // The bot runs on the control computer, and each message shows that computer as the sender.
  const sender = senderFields(env.COMPUTER, env.SLACK_ICON);
  const approvers = parsePairs(env.APPROVERS);
  const stateDir = env.STATE_DIR ?? "/var/lib/agent-cluster";
  fs.mkdirSync(stateDir, { recursive: true });
  const lockout = new Lockout(path.join(stateDir, "two-factor-lockout.json"));
  const channel = env.SLACK_CHANNEL_ID;
  const secretOf = (user) => env[`TOTP_SECRET_${String(approvers[user] ?? "").toUpperCase().replace(/-/g, "_")}`];

  async function reply(meta, text) {
    await api("chat.postMessage", { channel: meta.channel ?? channel, thread_ts: meta.ts, text, ...sender });
  }

  // Slack needs each click acknowledged within 3 seconds, and a relay to another computer can take
  // longer. So the action starts here, and the acknowledgment goes back without waiting for it.
  function start(...args) { run(...args).catch((e) => console.error(`action failed: ${e.message}`)); }

  // An action for the whole cluster, such as "Install" for a kit release, goes to every computer in
  // AGENTS. Each computer's reply names the computer, so a computer that missed the approval shows.
  async function run(meta, user, actionId, value, extra = {}) {
    const all = Object.keys(parsePairs(env.AGENTS));
    const computers = ACTIONS[actionId]?.cluster && all.length ? all : [value.c];
    for (const c of computers) {
      const result = await relay(c, { action: actionId, ref: value.r, extra, by: approvers[user] ?? user });
      await reply(meta, `${result.ok ? ":white_check_mark:" : ":x:"} <@${user}> pressed "${ACTIONS[actionId]?.label ?? actionId}" for ${c}: ${result.message}`);
    }
  }

  function codeModal(actionId, meta) {
    return { type: "modal", callback_id: "two-factor", private_metadata: JSON.stringify(meta),
      title: { type: "plain_text", text: "Authenticator code" }, submit: { type: "plain_text", text: "Confirm" },
      blocks: [{ type: "input", block_id: "code", label: { type: "plain_text", text: `Code for "${ACTIONS[actionId].label}"` },
        element: { type: "plain_text_input", action_id: "code", min_length: 6, max_length: 6 } }] };
  }

  function timeModal(meta) {
    return { type: "modal", callback_id: "pick-time", private_metadata: JSON.stringify(meta),
      title: { type: "plain_text", text: "Reboot time" }, submit: { type: "plain_text", text: "Schedule" },
      // A date picker and a time picker, in the cluster's time zone, which work in Slack's desktop, web and
      // mobile apps.
      blocks: [
        { type: "input", block_id: "day", label: { type: "plain_text", text: "Install the updates and reboot on" },
          element: { type: "datepicker", action_id: "day", initial_date: localDate(nextAt(4, 0, tz, now()), tz) } },
        { type: "input", block_id: "time", label: { type: "plain_text", text: `At (${tz})` },
          element: { type: "timepicker", action_id: "time", initial_time: "04:00", timezone: tz } },
      ] };
  }

  // Returns the payload to send back with the acknowledgment, if any.
  async function handle(envelope) {
    const p = envelope.payload ?? {};
    if (envelope.type !== "interactive") return undefined;
    const user = p.user?.id;
    if (p.type === "block_actions") {
      const raw = p.actions?.[0];
      // One action can have several buttons in a message, such as "agents-stop:betty".
      const a = raw && { ...raw, action_id: String(raw.action_id).split(":")[0] };
      if (!a || !ACTIONS[a.action_id]) return undefined;
      const value = JSON.parse(a.value);
      const meta = { id: a.action_id, value, channel: p.channel?.id, ts: p.message?.ts };
      if (!approvers[user]) {
        await api("chat.postEphemeral", { channel: meta.channel, user, text: "Only the approvers can press these buttons." });
        return undefined;
      }
      if (ACTIONS[a.action_id].twoFactor) {
        if (lockout.locked(user, now())) {
          await api("chat.postEphemeral", { channel: meta.channel, user, text: "Too many wrong codes. The two-factor buttons are locked for an hour." });
          return undefined;
        }
        await api("views.open", { trigger_id: p.trigger_id, view: codeModal(a.action_id, meta) });
        return undefined;
      }
      if (ACTIONS[a.action_id].modal === "pick-time") {
        await api("views.open", { trigger_id: p.trigger_id, view: timeModal(meta) });
        return undefined;
      }
      start(meta, user, a.action_id, value);
      return undefined;
    }
    if (p.type === "view_submission") {
      const meta = JSON.parse(p.view?.private_metadata ?? "{}");
      if (!approvers[user]) return { response_action: "errors", errors: { code: "Only the approvers can do this." } };
      if (p.view.callback_id === "two-factor") {
        if (lockout.locked(user, now())) return { response_action: "errors", errors: { code: "Locked for an hour after three wrong codes." } };
        const code = p.view.state?.values?.code?.code?.value;
        const secret = secretOf(user);
        if (!secret || !verify(secret, code, now())) {
          const nowLocked = lockout.fail(user, now());
          if (nowLocked) await api("chat.postMessage", { channel, text: `:rotating_light: Three wrong authenticator codes from <@${user}>. The two-factor buttons are locked for an hour.`, ...sender });
          return { response_action: "errors", errors: { code: nowLocked ? "Locked for an hour after three wrong codes." : "Wrong code." } };
        }
        lockout.succeed(user);
        start(meta, user, meta.id, meta.value);
        return { response_action: "clear" };
      }
      if (p.view.callback_id === "pick-time") {
        const day = p.view.state?.values?.day?.day?.selected_date, time = p.view.state?.values?.time?.time?.selected_time;
        const at = day && time ? localToUtc(day, time, tz) : 0;
        if (!at || at <= now()) return { response_action: "errors", errors: { time: "Pick a time in the future." } };
        start(meta, user, "reboot-at", meta.value, { at, label: formatTime(new Date(at), tz) });
        return { response_action: "clear" };
      }
    }
    return undefined;
  }
  return { handle };
}

export function slackApi(token) {
  return async (method, body) => {
    const r = await fetch(`https://slack.com/api/${method}`, { method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok) console.error(`slack ${method}: ${j.error}`);
    return j;
  };
}

export function agentRelay(env = process.env) {
  const agents = parsePairs(env.AGENTS);
  return async (computer, body) => {
    const url = agents[computer];
    if (!url) return { ok: false, message: `no agent address for ${computer}` };
    try {
      const r = await fetch(`${url}/action`, { method: "POST", signal: AbortSignal.timeout(20_000),
        headers: { authorization: `Bearer ${env.CLUSTER_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(body) });
      return await r.json();
    } catch (e) { return { ok: false, message: `${computer} did not answer (${e.message})` }; }
  };
}

// Socket Mode: open a connection URL with the app token, acknowledge each envelope, reconnect when
// Slack asks or the connection drops.
async function connect(env) {
  const api = slackApi(env.SLACK_BOT_TOKEN);
  const bot = makeBot({ env, api, relay: agentRelay(env) });
  let wait = 1000;
  for (;;) {
    try {
      const r = await (await fetch("https://slack.com/api/apps.connections.open", { method: "POST",
        headers: { authorization: `Bearer ${env.SLACK_APP_TOKEN}` } })).json();
      if (!r.ok) throw new Error(r.error);
      await new Promise((resolve) => {
        const ws = new WebSocket(r.url);
        ws.onmessage = async (m) => {
          const e = JSON.parse(m.data);
          if (e.type === "disconnect") { ws.close(); return; }
          if (!e.envelope_id) return;
          const payload = await bot.handle(e).catch((err) => { console.error(err); return undefined; });
          ws.send(JSON.stringify(payload ? { envelope_id: e.envelope_id, payload } : { envelope_id: e.envelope_id }));
        };
        ws.onopen = () => { wait = 1000; console.log("connected to Slack"); };
        ws.onclose = () => resolve();
        ws.onerror = () => {};
      });
    } catch (e) { console.error(`socket mode: ${e.message}`); }
    await new Promise((r) => setTimeout(r, wait));
    wait = Math.min(wait * 2, 60_000);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) connect(process.env);
