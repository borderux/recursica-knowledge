// The port jobs' outgoing filters. Each minute the cluster agent reads each filter's log. A refused
// site gets one alert in the stack's Slack channel, at most every 30 minutes. A job cannot wait for
// a consent, so the alert has no buttons. Permanent access comes only through the stack's
// site.json (egress.allow), by a pull request.
import fs from "node:fs";

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
  // stacks: () => [{ name, logFile, channel }]
  constructor({ stacks, post, stateFile, now = () => Date.now() }) {
    Object.assign(this, { stacks, post, stateFile, now });
  }
  read() { try { return { pos: {}, alerted: {}, ...JSON.parse(fs.readFileSync(this.stateFile, "utf8")) }; } catch { return { pos: {}, alerted: {} }; } }
  write(s) { fs.writeFileSync(this.stateFile, JSON.stringify({ pos: s.pos, alerted: s.alerted }), { mode: 0o600 }); }

  async tick() {
    const s = this.read();
    for (const st of await this.stacks()) {
      if (!fs.existsSync(st.logFile)) continue;
      const size = fs.statSync(st.logFile).size;
      let pos = s.pos[st.name] ?? 0; if (pos > size) pos = 0;
      const fd = fs.openSync(st.logFile, "r"); const buf = Buffer.alloc(size - pos); fs.readSync(fd, buf, 0, buf.length, pos); fs.closeSync(fd);
      s.pos[st.name] = size;
      for (const e of buf.toString("utf8").split("\n").map(parseLine).filter((x) => x?.denied)) {
        const key = `${st.name}|${e.host}`;
        if (s.alerted[key] && this.now() - s.alerted[key] < REPEAT_MS) continue;
        s.alerted[key] = this.now();
        await this.post(st.channel, "info", `:no_entry: The port jobs' outgoing filter for stack ${st.name} refused a connection to *${e.host}*. The job reports the failure. To allow ${e.host} for port jobs, add the site to egress.allow in the stack's site.json through a pull request.`, key);
      }
    }
    this.write(s);
  }
}
