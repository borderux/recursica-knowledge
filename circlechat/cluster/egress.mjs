// The outgoing filter's consents. Each minute the cluster agent reads each stack's filter log.
// A refused site gets one request in the stack's Slack channel, with two buttons: "Allow once
// (15 min)", which needs an authenticator code, and "Deny". An allowed site opens for that stack
// alone for 15 minutes, then closes again. Permanent access comes only through the stack's
// site.json (egress.allow), by a pull request.
import fs from "node:fs";
import path from "node:path";

export const ALLOW_ONCE_MS = 15 * 60_000;
const REPEAT_MS = 30 * 60_000;

// "1792532511 172.20.0.5 CONNECT example.com:443 403 TCP_DENIED"
export function parseLine(line) {
  const f = line.trim().split(/\s+/);
  if (f.length < 6) return null;
  const [ts, client, method, url, status, result] = f;
  let host = url;
  if (method === "CONNECT") host = url.replace(/:\d+$/, "");
  else { try { host = new URL(url).hostname; } catch { return null; } }
  return { ts: Number(ts) * 1000, client, method, host: host.toLowerCase(), status: Number(status), denied: /DENIED/.test(result) };
}

export class Egress {
  // stacks: () => [{ name, ccDir, logFile, channel, container }]
  constructor({ stacks, post, stateFile, exec, now = () => Date.now(), whoIs = async () => "" }) {
    Object.assign(this, { stacks, post, stateFile, exec, now, whoIs });
  }
  read() { try { return JSON.parse(fs.readFileSync(this.stateFile, "utf8")); } catch { return { pos: {}, alerted: {}, once: {} }; } }
  write(s) { fs.writeFileSync(this.stateFile, JSON.stringify(s), { mode: 0o600 }); }

  async tick() {
    const s = this.read();
    let changed = new Set();
    // Close each one-time consent whose 15 minutes are over.
    for (const [key, until] of Object.entries(s.once)) if (until <= this.now()) { delete s.once[key]; changed.add(key.split("|")[0]); }
    for (const st of await this.stacks()) {
      if (changed.has(st.name)) await this.apply(st, s);
      if (!fs.existsSync(st.logFile)) continue;
      const size = fs.statSync(st.logFile).size;
      let pos = s.pos[st.name] ?? 0; if (pos > size) pos = 0;
      const fd = fs.openSync(st.logFile, "r"); const buf = Buffer.alloc(size - pos); fs.readSync(fd, buf, 0, buf.length, pos); fs.closeSync(fd);
      s.pos[st.name] = size;
      for (const e of buf.toString("utf8").split("\n").map(parseLine).filter((x) => x?.denied)) {
        const key = `${st.name}|${e.host}`;
        if (s.alerted[key] && this.now() - s.alerted[key] < REPEAT_MS) continue;
        s.alerted[key] = this.now();
        const who = await this.whoIs(st, e.client).catch(() => "");
        if (st.alertOnly) { await this.post(st.channel, "info", `:no_entry: The port jobs' outgoing filter for stack ${st.name} refused a connection to *${e.host}*. The job reports the failure. To allow ${e.host} for port jobs, add the site to egress.allow in the stack's site.json through a pull request.`, key); continue; }
        await this.post(st.channel, "egress", `:no_entry: The outgoing filter of stack ${st.name} refused ${who ? `${who}'s` : "an agent's"} connection to *${e.host}*. The agent is told to wait. "Allow once" opens ${e.host} for this stack for 15 minutes. To allow ${e.host} for good, add the site to egress.allow in the stack's site.json through a pull request.`, key);
      }
    }
    this.write(s);
  }

  // Rewrite the stack's consent list and reload the stack's filter.
  async apply(st, s = this.read()) {
    const hosts = Object.entries(s.once).filter(([k, until]) => k.startsWith(`${st.name}|`) && until > this.now()).map(([k]) => k.split("|")[1]);
    fs.writeFileSync(path.join(st.ccDir, "kit-out/egress/allow-once.txt"), (hosts.length ? hosts : ["nothing.invalid"]).join("\n") + "\n");
    await this.exec(st, ["exec", st.container, "squid", "-k", "reconfigure", "-f", "/etc/egress/squid.conf"]);
  }

  async allowOnce(ref, by) {
    const [stack, host] = String(ref).split("|");
    const st = (await this.stacks()).find((x) => x.name === stack);
    if (!st || !/^[a-z0-9.-]+$/.test(host ?? "")) return { ok: false, message: `no stack ${stack} with a filter on this computer` };
    const s = this.read();
    s.once[`${stack}|${host}`] = this.now() + ALLOW_ONCE_MS;
    this.write(s);
    await this.apply(st, s);
    const until = new Date(this.now() + ALLOW_ONCE_MS).toISOString().slice(11, 16);
    return { ok: true, message: `${host} is open for stack ${stack} until ${until} UTC, allowed by ${by}. Tell the agent on the task that the site is open, so the agent retries.` };
  }

  async deny(ref, by) {
    const [stack, host] = String(ref).split("|");
    return { ok: true, message: `${host} stays closed for stack ${stack}, denied by ${by}. Tell the agent on the task, so the agent stops waiting.` };
  }
}
