// The kit services on this computer, for the cluster agent's /status and the restart check.
//
// Each computer's agent reports the state of the computer's own kit services, and the other
// computers' agents watch the report (monitor.mjs). The services come from the computer's node in
// site.json:
//   - kev-engine: the node's kev port answers.
//   - jobd: the node's jobs port answers.
//   - rustdesk-hbbs and rustdesk-hbbr: the RustDesk server's containers run, and each one's port
//     answers on 127.0.0.1.
//   - ollama: the node's Ollama server answers, once a route in site.json names one of the
//     server's models. A trial server that no route names isn't watched.
// /status holds each service's name and state, "up" or "down", and nothing else: never a key, a
// setting's value or a log line.
//
// A service or container that restarts more than 3 times in an hour gets one post (RestartWatch).
import fs from "node:fs";
import net from "node:net";
import { ollamaListen } from "../kit/ollama.mjs";
import { peerAddress } from "../kit/peers.mjs";

export const STATES = ["up", "down"];
const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
const RUSTDESK = [["rustdesk-hbbs", 21116], ["rustdesk-hbbr", 21117]];

/** The services the node runs, as { name, ports, hosts, container?, unit? }. Nothing for a computer missing from site.json. */
export function serviceChecks(site = {}, computer = "", { mac = false } = {}) {
  const n = (site.nodes ?? []).find((x) => x.name === computer);
  if (!n) return [];
  // A service listens on 127.0.0.1, on the computer's Tailscale address, or on both.
  const own = peerAddress(n);
  const hosts = ["127.0.0.1", ...(own && /^[\d.]+$|:/.test(own) ? [own] : [])];
  const out = [];
  if (n.kev?.port) out.push({ name: "kev-engine", ports: [n.kev.port], hosts, unit: "kev-engine" });
  if (n.jobs?.port) out.push({ name: "jobd", ports: [n.jobs.port], hosts, unit: "jobd" });
  if (n.rustdesk) for (const [name, port] of RUSTDESK) out.push({ name, ports: [port], hosts: ["127.0.0.1"], container: name });
  const routed = new Set(Object.values(site.routes ?? {}).flat());
  for (const sv of n.servers ?? []) {
    if (sv.kind !== "ollama" || !(sv.models ?? []).some((m) => routed.has(`${n.name}/${sv.id}/${m.id}`))) continue;
    // The kit's Ollama: recursica-ollama on a Linux helper, the ollama LaunchDaemon on a Mac.
    const unit = n.os === "linux" && !n.control ? "recursica-ollama" : "ollama";
    out.push({ name: "ollama", ports: [sv.port], hosts: n.os === "linux" && !n.control ? [ollamaListen(n, sv)] : ["127.0.0.1"], unit });
  }
  // Every other service the node lists, such as a second engine: its unit restarts count too.
  for (const s of n.services ?? []) if (!out.some((x) => x.unit === s.name)) out.push({ name: s.name, ports: [], hosts: [], unit: s.name });
  if (mac) for (const c of out) if (c.unit) c.unit = `io.recursica.${c.unit}`;
  return out.filter((c) => NAME.test(c.name));
}

/** Whether a TCP connection to host:port opens within the time limit. */
export function answers(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const done = (ok) => { s.destroy(); resolve(ok); };
    s.setTimeout(timeoutMs, () => done(false));
    s.once("connect", () => done(true));
    s.once("error", () => done(false));
  });
}

/**
 * Each watched service's { name, state }. A service is up when the service's container runs, if
 * the service has one, and a port answers on one of the service's addresses.
 *   deps.answers(host, port), deps.running(container): for the tests
 */
export async function serviceStates(checks, { answers: open = answers, running } = {}) {
  const watched = checks.filter((c) => c.ports.length);
  return Promise.all(watched.map(async (c) => {
    if (c.container && running && !(await running(c.container))) return { name: c.name, state: "down" };
    for (const host of c.hosts) for (const port of c.ports) if (await open(host, port)) return { name: c.name, state: "up" };
    return { name: c.name, state: "down" };
  }));
}

/** A peer's service list, kept to known names and states, so a peer's report can't put other text in a post. */
export function cleanServices(list) {
  return (Array.isArray(list) ? list : []).filter((s) => s && NAME.test(String(s.name)) && STATES.includes(s.state)).map((s) => ({ name: String(s.name), state: s.state }));
}

/**
 * Each check's restart count, as { name: count }, or no entry when the count can't be read.
 *   systemd: NRestarts, the restarts systemd made after a failure
 *   launchd: runs, the job's starts
 *   Docker: RestartCount, the restarts by the container's restart policy
 *   run(cmd, args): the command's output, or "" on a failure
 */
export async function restartCounts(checks, { run, mac = false }) {
  const out = {};
  for (const c of checks) {
    let text = "";
    if (c.container) text = await run("docker", ["inspect", "-f", "{{.RestartCount}}", c.container]);
    else if (c.unit && mac) text = (/^\s*runs = (\d+)/m.exec(await run("launchctl", ["print", `system/${c.unit}`])) ?? [])[1] ?? "";
    else if (c.unit) text = await run("systemctl", ["show", "-p", "NRestarts", "--value", `${c.unit}.service`]);
    const n = Number(String(text).trim());
    if (String(text).trim() !== "" && Number.isInteger(n) && n >= 0) out[c.name] = n;
  }
  return out;
}

export const RESTART_LIMIT = 3;
const HOUR = 3600_000;

/**
 * More than 3 restarts of one service in an hour gets one post. The count of the last hour drops
 * back to 3 or fewer before a new episode can post again. A count that goes down, such as after a
 * reload, starts a new baseline.
 *   read(): { name: count } of each service now; post(text): the cluster's channel
 */
export class RestartWatch {
  constructor({ computer, read, post, stateFile, now = () => Date.now() }) {
    Object.assign(this, { computer, read, post, stateFile, now });
  }
  load() { try { return JSON.parse(fs.readFileSync(this.stateFile, "utf8")); } catch { return {}; } }
  save(s) { fs.writeFileSync(this.stateFile, JSON.stringify(s), { mode: 0o600 }); }

  async tick() {
    const state = this.load(), t = this.now(), counts = await this.read();
    for (const [name, count] of Object.entries(counts)) {
      const s = state[name] ?? { last: count, restarts: [], alerted: false };
      const added = count >= s.last ? count - s.last : 0;
      for (let i = 0; i < added; i++) s.restarts.push(t);
      s.last = count;
      s.restarts = s.restarts.filter((at) => t - at < HOUR);
      if (s.restarts.length > RESTART_LIMIT && !s.alerted) {
        const r = await this.post(`:repeat: ${name} on ${this.computer} restarted ${s.restarts.length} times in the last hour. The service starts and stops again, so the service may be failing. Read the service's log on ${this.computer}.`);
        if (r?.ok !== false) s.alerted = true;
      } else if (s.restarts.length <= RESTART_LIMIT) s.alerted = false;
      state[name] = s;
    }
    this.save(state);
  }
}
