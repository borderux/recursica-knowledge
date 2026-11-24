// Uptime checks between computers. Each computer's agent reports the health of the stacks on that
// computer, and the state of the computer's own kit services (services.mjs). Every other computer
// asks for the report each minute, at the computer's Tailscale address (kit/render.mjs agentPeers).
// A computer that stops answering for 3 minutes gets one alert in the cluster's channel and in each
// of the computer's stacks' channels. A stack down for 3 minutes gets one alert in the stack's
// channel, and a kit service down for 3 minutes gets one alert in the cluster's channel. Each gets
// one more alert when the stack or the service answers again. The alert goes through the cluster's
// Slack app, so no stack's own secrets ever reach another computer.
//
// Each stack is checked by the stack's own control computer, on that computer, and every other
// computer learns the stack's state from that computer's report. No computer checks another
// computer's stack across Tailscale, whose rules let the computers reach only each other's agent.
// A report from an agent older than the services report (no "services" list) carries CircleChat
// 1.x's stack check, so the stacks in such a report are skipped, and the cluster's channel hears
// once that the agent needs a restart.
import fs from "node:fs";
import path from "node:path";
import { RC_DEFAULTS, clusterStackName } from "../kit/render.mjs";
import { siteFile, tenantStacks } from "../kit/stack-paths.mjs";
import { cleanServices } from "./services.mjs";

const DOWN_AFTER_MS = 3 * 60_000;

// Whether the stack's own services answer on the control computer: the RecursicaChat 2.0 server and
// the stack's model gateway, each at its local address. An HTTP answer below 500 counts.
const http = (url) => fetch(url, { signal: AbortSignal.timeout(5000) }).then((r) => r.status < 500).catch(() => false);
export async function stackAnswers(site, get = http) {
  const urls = [];
  if (site.recursicachat) urls.push(String(site.recursicachat.url ?? RC_DEFAULTS.url).replace(/\/+$/, "") + "/");
  if (site.site?.gateway_local_port) urls.push(`http://127.0.0.1:${site.site.gateway_local_port}/`);
  for (const u of urls) if (!(await get(u))) return false;
  return true;
}

// The stacks on this computer, from each stack's site.json: the cluster's own stack, named by
// site.stack_name, and each client stack. A client stack whose encrypted disk image is locked is
// locked.
//   computer: this computer's name. With a name, the list holds only the stacks this computer is
//   the control computer of, each with the state of the stack's own services (stackAnswers): the
//   report in /status. Without a name, every stack, each up: the channels this computer may post to.
export async function localStacks(home, { computer, check = stackAnswers } = {}) {
  const sites = [];
  const own = siteFile(home);
  if (fs.existsSync(own)) sites.push([null, own]);
  for (const { tenant, dir } of tenantStacks(home)) {
    const f = path.join(dir, "site.json");
    sites.push([tenant, fs.existsSync(f) ? f : null]);
  }
  const out = [];
  for (const [name, file] of sites) {
    if (!file) { out.push({ name, state: "locked" }); continue; }
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    const entry = { name: name ?? clusterStackName(s), channel: s.site?.slack_channel_id, state: "up" };
    if (computer) {
      // A helper computer keeps a copy of the stack's site.json, and runs none of the stack's services.
      if ((s.nodes ?? []).find((n) => n.control)?.name !== computer) continue;
      entry.state = (await check(s)) ? "up" : "down";
    }
    out.push(entry);
  }
  return out;
}

export class Monitor {
  constructor({ self, peers, token, post, stateFile, fetchStatus, now = () => Date.now(), clusterChannel }) {
    Object.assign(this, { self, peers, token, post, stateFile, now, clusterChannel });
    this.fetchStatus = fetchStatus ?? (async (url) => {
      const r = await fetch(`${url}/status`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
      return r.ok ? r.json() : null;
    });
  }
  read() { try { return JSON.parse(fs.readFileSync(this.stateFile, "utf8")); } catch { return {}; } }
  write(s) { fs.writeFileSync(this.stateFile, JSON.stringify(s), { mode: 0o600 }); }

  async tick() {
    const state = this.read();
    // peers: { name: url }, or a function that reads the list at each check, so a changed site.json counts.
    const peers = typeof this.peers === "function" ? this.peers() : this.peers;
    for (const [name, url] of Object.entries(peers)) {
      if (name === this.self) continue;
      const p = state[name] ?? { lastOk: this.now(), stacks: [], alerted: {} };
      p.downSince ??= {};
      const status = await this.fetchStatus(url).catch(() => null);
      if (status) {
        if (p.alerted.computer) {
          await this.say([this.clusterChannel, ...p.stacks.map((s) => s.channel)], `:white_check_mark: ${name} answers again.`);
          delete p.alerted.computer;
        }
        p.lastOk = this.now();
        if (Array.isArray(status.services)) {
          delete p.alerted.oldKit;
          await this.stacks(name, p, status.stacks ?? []);
          p.stacks = (status.stacks ?? []).filter((s) => s.channel).map((s) => ({ name: s.name, channel: s.channel }));
          await this.services(name, p, cleanServices(status.services));
        } else if (!p.alerted.oldKit) {
          // An agent older than the services report checks CircleChat 1.x's port for each stack.
          await this.say([this.clusterChannel], `:information_source: The cluster agent on ${name} runs an older kit, so ${this.self} skips the stack states in ${name}'s report. Run install-cluster.sh on ${name} to restart the agent.`);
          p.alerted.oldKit = true;
        }
      } else if (this.now() - p.lastOk >= DOWN_AFTER_MS && !p.alerted.computer) {
        await this.say([this.clusterChannel, ...p.stacks.map((s) => s.channel)], `:red_circle: ${name} has not answered for 3 minutes. The stacks on ${name} are unreachable.`);
        p.alerted.computer = true;
      }
      state[name] = p;
    }
    this.write(state);
  }

  // Each stack the peer's report lists: down for 3 minutes posts once in the stack's channel, and up
  // again posts once. A locked client stack gets one reminder in the cluster's channel.
  async stacks(name, p, list) {
    const t = this.now();
    p.stackDownSince ??= {};
    for (const s of list) {
      if (!s || typeof s.name !== "string") continue;
      const key = `stack:${s.name}`;
      if (s.state === "down") {
        p.stackDownSince[s.name] ??= t;
        if (t - p.stackDownSince[s.name] >= DOWN_AFTER_MS && !p.alerted[key]) {
          await this.say([s.channel], `:red_circle: Stack ${s.name} on ${name} has not answered for 3 minutes.`);
          p.alerted[key] = "down";
        }
        continue;
      }
      delete p.stackDownSince[s.name];
      if (s.state === "locked" && !p.alerted[key]) { await this.say([this.clusterChannel], `:lock: Stack ${s.name} on ${name} is locked. Run the Unlock stack workflow to start the stack.`); p.alerted[key] = "locked"; }
      if (s.state === "up" && p.alerted[key]) { await this.say([s.channel], `:white_check_mark: Stack ${s.name} on ${name} is back.`); delete p.alerted[key]; }
    }
  }

  // Each kit service the peer reports: down for 3 minutes posts once, and answering again posts once.
  // A service the report no longer lists, such as one site.json dropped, leaves without a post.
  async services(name, p, list) {
    const t = this.now(), listed = new Set(list.map((s) => s.name));
    for (const { name: svc, state } of list) {
      const key = `service:${svc}`;
      if (state === "down") {
        p.downSince[svc] ??= t;
        if (t - p.downSince[svc] >= DOWN_AFTER_MS && !p.alerted[key]) {
          await this.say([this.clusterChannel], `:red_circle: ${svc} on ${name} has been down or not answering for 3 minutes.`);
          p.alerted[key] = "down";
        }
      } else {
        delete p.downSince[svc];
        if (p.alerted[key]) { await this.say([this.clusterChannel], `:white_check_mark: ${svc} on ${name} answers again.`); delete p.alerted[key]; }
      }
    }
    for (const svc of Object.keys(p.downSince)) if (!listed.has(svc)) delete p.downSince[svc];
    for (const key of Object.keys(p.alerted)) if (key.startsWith("service:") && !listed.has(key.slice(8))) delete p.alerted[key];
  }

  async say(channels, text) {
    for (const c of [...new Set(channels.filter(Boolean))]) await this.post(c, text);
  }
}
