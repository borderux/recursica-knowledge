// Uptime checks between computers. Each computer's agent reports the health of the stacks on that
// computer, and the state of the computer's own kit services (services.mjs). Every other computer
// asks for the report each minute, at the computer's Tailscale address (kit/render.mjs agentPeers).
// A computer that stops answering for 3 minutes, or a stack that stops answering, gets one alert in
// each affected stack's Slack channel, and one more alert when the stack is back. A kit service
// that is down for 3 minutes gets one alert in the cluster's channel, and one more when the
// service answers again. The alert goes through the cluster's Slack app, so no stack's own secrets
// ever reach another computer.
import fs from "node:fs";
import path from "node:path";
import { clusterStackName } from "../kit/render.mjs";
import { siteFile, tenantStacks } from "../kit/stack-paths.mjs";
import { cleanServices } from "./services.mjs";

const DOWN_AFTER_MS = 3 * 60_000;

// The stacks on this computer, from each stack's site.json: the cluster's own stack, named by
// site.stack_name, and each client stack. A client stack whose encrypted disk image is open is up,
// and one whose disk image is locked is locked. The stack's own services, such as the RecursicaChat
// 2.0 server, have checks of their own.
export async function localStacks(home) {
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
    out.push({ name: name ?? clusterStackName(s), channel: s.site?.slack_channel_id, state: "up" });
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
        for (const s of status.stacks ?? []) {
          const key = `stack:${s.name}`;
          if (s.state === "down" && !p.alerted[key]) { await this.say([s.channel], `:red_circle: Stack ${s.name} on ${name} is not answering.`); p.alerted[key] = "down"; }
          if (s.state === "locked" && !p.alerted[key]) { await this.say([this.clusterChannel], `:lock: Stack ${s.name} on ${name} is locked. Run the Unlock stack workflow to start the stack.`); p.alerted[key] = "locked"; }
          if (s.state === "up" && p.alerted[key]) { await this.say([s.channel], `:white_check_mark: Stack ${s.name} on ${name} is back.`); delete p.alerted[key]; }
        }
        p.stacks = (status.stacks ?? []).filter((s) => s.channel).map((s) => ({ name: s.name, channel: s.channel }));
        await this.services(name, p, cleanServices(status.services));
      } else if (this.now() - p.lastOk >= DOWN_AFTER_MS && !p.alerted.computer) {
        await this.say([this.clusterChannel, ...p.stacks.map((s) => s.channel)], `:red_circle: ${name} has not answered for 3 minutes. The stacks on ${name} are unreachable.`);
        p.alerted.computer = true;
      }
      state[name] = p;
    }
    this.write(state);
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
