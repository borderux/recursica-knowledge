// Uptime checks between computers. Each computer's agent reports the health of the stacks on that
// computer; every other computer asks for the report each minute. A computer that stops answering
// for 3 minutes, or a stack that stops answering, gets one alert in each affected stack's Slack
// channel, and one more alert when the stack is back. The alert goes through the cluster's Slack
// app, so no stack's own secrets ever reach another computer.
import fs from "node:fs";
import path from "node:path";

const DOWN_AFTER_MS = 3 * 60_000;

// The stacks on this computer, from each stack's site.json: Border UX's stack, and each client
// stack whose encrypted disk image is open.
export async function localStacks(home, check = (port) => fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000) }).then((r) => r.status < 500).catch(() => false)) {
  const sites = [];
  const border = path.join(home, "circlechat/site.json");
  if (fs.existsSync(border)) sites.push(["border", border]);
  const tenants = path.join(home, "tenants");
  if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) {
    const f = path.join(tenants, t, "circlechat/site.json");
    sites.push([t, fs.existsSync(f) ? f : null]);
  }
  const out = [];
  for (const [name, file] of sites) {
    if (!file) { out.push({ name, state: "locked" }); continue; }
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    const port = s.site?.port ?? 8080;
    out.push({ name, channel: s.site?.slack_channel_id, state: (await check(port)) ? "up" : "down" });
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
    for (const [name, url] of Object.entries(this.peers)) {
      if (name === this.self) continue;
      const p = state[name] ?? { lastOk: this.now(), stacks: [], alerted: {} };
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
      } else if (this.now() - p.lastOk >= DOWN_AFTER_MS && !p.alerted.computer) {
        await this.say([this.clusterChannel, ...p.stacks.map((s) => s.channel)], `:red_circle: ${name} has not answered for 3 minutes. The stacks on ${name} are unreachable.`);
        p.alerted.computer = true;
      }
      state[name] = p;
    }
    this.write(state);
  }

  async say(channels, text) {
    for (const c of [...new Set(channels.filter(Boolean))]) await this.post(c, text);
  }
}
