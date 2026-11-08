// The cluster's RustDesk Server Pro: its settings in site.json (nodes[].rustdesk), the Docker
// Compose file setup-rustdesk.sh starts, and the checks the setup runs on the computer.
//
// RustDesk's ports, which every RustDesk client expects:
//   21114/tcp  the web console and its API: 127.0.0.1 only, and tailscale serve gives it HTTPS
//   21115/tcp  the NAT type test
//   21116/tcp+udp  ID registration (UDP) and the connection requests (TCP)
//   21117/tcp  the relay
// 21118 and 21119 serve RustDesk's web client, which the kit never publishes.
//
//   node rustdesk.mjs compose <services/<node>.json>       the Compose file, as JSON
//   node rustdesk.mjs serve-check <https port> <local port> < tailscale serve status --json
//   node rustdesk.mjs listen-check <tailscale address> < ss -Hlntu
// Each check prints one line per problem and nothing when all is well.
import fs from "node:fs";

export const PORTS = { console: 21114, nat: 21115, id: 21116, relay: 21117 };
export const SERVER_PORTS = [PORTS.nat, PORTS.id, PORTS.relay];
export const WEB_CLIENT_PORTS = [21118, 21119];
export const VOLUME = "rustdesk_data";
export const HTTPS_PORT = 443;
const IMAGE = /^([a-z0-9.-]+\/)*rustdesk-server-pro@sha256:[0-9a-f]{64}$/;
const TS_HOST = /^[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const isTailscaleV4 = (a) => {
  const m = /^100\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(a ?? "");
  return Boolean(m) && +m[1] >= 64 && +m[1] <= 127 && +m[2] <= 255 && +m[3] <= 255;
};

// The problems with the rustdesk blocks in site.json.
export function rustdeskErrors(site) {
  const errs = [];
  // remote_access.direct_ip false: every computer's firewall refuses RustDesk's direct-address
  // ports (install-cluster.sh). Leave it out until each computer uses the cluster's server.
  const ra = site.remote_access;
  if (ra !== undefined && (typeof ra !== "object" || ra === null || Array.isArray(ra))) errs.push("remote_access must be an object");
  else if (ra?.direct_ip !== undefined && typeof ra.direct_ip !== "boolean") errs.push("remote_access.direct_ip must be true or false");
  const nodes = (site.nodes ?? []).filter((n) => n.rustdesk !== undefined);
  if (!nodes.length) return errs;
  if (nodes.length > 1) errs.push(`rustdesk: only one computer runs the RustDesk server, and ${nodes.map((n) => n.name).join(", ")} each have a rustdesk block`);
  if (site.site?.tenant) errs.push("rustdesk: the RustDesk server belongs to the cluster's own stack, never to a client or demo stack");
  if (!site.backup?.remote) errs.push("rustdesk: the RustDesk server's key and database go in the nightly backup, so site.json needs backup.remote");
  for (const n of nodes) {
    const at = `node ${n.name}: rustdesk`;
    const r = n.rustdesk;
    if (!r || typeof r !== "object" || Array.isArray(r)) { errs.push(`${at} must be an object`); continue; }
    // A Mac runs Docker in Colima's VM, which does not hold the Mac's Tailscale address, and
    // tailscale serve carries no UDP: port 21116/udp would have to open on every address.
    if (n.os !== "linux") errs.push(`${at}: the server runs on Linux, or on Windows in WSL (os "linux"), where Docker publishes each port on the Tailscale address. On a Mac, Colima cannot publish UDP port 21116 on the Tailscale address alone`);
    if (!isTailscaleV4(n.address)) errs.push(`${at}: the computer's address must be its Tailscale IPv4 address, such as 100.64.0.5, because each RustDesk port opens on that address alone`);
    if (!IMAGE.test(r.image ?? "")) errs.push(`${at}.image must be the rustdesk-server-pro image pinned by digest, such as docker.io/rustdesk/rustdesk-server-pro@sha256:<64 hex digits>`);
    if (!TS_HOST.test(r.console_host ?? "")) errs.push(`${at}.console_host must be the computer's Tailscale name, such as machine-2.example.ts.net, for the console's HTTPS address`);
    if (r.backup_time !== undefined && !TIME.test(r.backup_time)) errs.push(`${at}.backup_time must be a time of day, such as 03:30`);
    const used = [n.kev?.port, n.jobs?.port, ...(n.servers ?? []).map((s) => s.port)].filter(Boolean);
    for (const p of used) if (p >= PORTS.console && p <= 21119) errs.push(`${at}: port ${p} on this computer is one of RustDesk's ports, 21114 to 21119`);
  }
  return errs;
}

// What setup-rustdesk.sh needs, in the node's services/<node>.json.
export function rustdeskSpec(site, n) {
  if (!n.rustdesk) return null;
  return { image: n.rustdesk.image, address: n.address, console_host: n.rustdesk.console_host,
    https_port: HTTPS_PORT, backup_time: n.rustdesk.backup_time ?? "03:30" };
}

// The Compose file. Each server port opens on the Tailscale address only, and the console on
// 127.0.0.1 only. hbbs is the ID server and the console; hbbr is the relay. Both keep their key,
// database and license in one volume, mounted at /root.
//   - hbbs makes the key on the server's first start. hbbr reads the key only when hbbr starts, and without
//     the key runs as a public relay that any client may use. So hbbr starts after hbbs, and waits
//     until /root/id_ed25519.pub exists, at every start, Compose's or Docker's.
//   - hbbs names the relay, with -r, so hbbs gives each client the relay's address.
export const RELAY_KEY_WAIT = "until [ -s /root/id_ed25519.pub ]; do sleep 1; done; exec hbbr";
export function composeFile(spec) {
  const ip = spec.address;
  const common = { image: spec.image, restart: "unless-stopped", volumes: [`${VOLUME}:/root`], security_opt: ["no-new-privileges:true"] };
  return {
    name: "rustdesk",
    services: {
      hbbs: { ...common, container_name: "rustdesk-hbbs", command: ["hbbs", "-r", `${ip}:${PORTS.relay}`],
        ports: [`127.0.0.1:${PORTS.console}:${PORTS.console}/tcp`, `${ip}:${PORTS.nat}:${PORTS.nat}/tcp`, `${ip}:${PORTS.id}:${PORTS.id}/tcp`, `${ip}:${PORTS.id}:${PORTS.id}/udp`] },
      hbbr: { ...common, container_name: "rustdesk-hbbr", depends_on: ["hbbs"], command: ["sh", "-c", RELAY_KEY_WAIT],
        ports: [`${ip}:${PORTS.relay}:${PORTS.relay}/tcp`] },
    },
    volumes: { [VOLUME]: { name: VOLUME } },
  };
}

// The console's tailscale serve rule: HTTPS port <https> passes to http://127.0.0.1:<local>, and
// Funnel never serves it.
export function serveProblems(status, https, local) {
  const s = status ?? {};
  const keys = Object.keys(s.Web ?? {}).filter((k) => k.endsWith(`:${https}`));
  const proxy = keys.map((k) => s.Web[k]?.Handlers?.["/"]?.Proxy).find(Boolean);
  if (proxy !== `http://127.0.0.1:${local}`) return [`HTTPS port ${https} does not pass to http://127.0.0.1:${local}`];
  if (keys.some((k) => s.AllowFunnel?.[k])) return [`Funnel serves HTTPS port ${https} to the internet. Turn Funnel off: tailscale funnel --https=${https} off`];
  return [];
}

// Each RustDesk port must listen on its one address, and nothing may listen on RustDesk's ports
// anywhere else. ss -Hlntu prints: netid state recv-q send-q local:port peer:port [process].
export function listenProblems(ssText, address) {
  const want = new Map([
    [`tcp:${PORTS.console}`, "127.0.0.1"],
    ...SERVER_PORTS.map((p) => [`tcp:${p}`, address]),
    [`udp:${PORTS.id}`, address],
  ]);
  const all = [PORTS.console, ...SERVER_PORTS, ...WEB_CLIENT_PORTS];
  const seen = new Set(), problems = [];
  for (const line of String(ssText).split("\n")) {
    const f = line.trim().split(/\s+/);
    if (f.length < 5) continue;
    const proto = f[0].startsWith("udp") ? "udp" : f[0].startsWith("tcp") ? "tcp" : null;
    const m = /^(.*):(\d+)$/.exec(f[4]);
    if (!proto || !m || !all.includes(+m[2])) continue;
    const host = m[1].replace(/^\[|\]$/g, "").replace(/%.*$/, "");
    const key = `${proto}:${m[2]}`;
    if (want.get(key) === host) seen.add(key);
    else problems.push(`${proto} port ${m[2]} listens on ${host}, which is not ${want.get(key) ?? "allowed: the web client's ports stay closed"}`);
  }
  for (const [key, host] of want) if (!seen.has(key)) {
    const [proto, port] = key.split(":");
    problems.push(`nothing listens on ${host}, ${proto} port ${port}. WSL in mirrored mode passes a port to WSL only when a program in WSL listens on the port, so Docker's userland-proxy must stay on (no "userland-proxy": false in /etc/docker/daemon.json)`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, a, b] = process.argv.slice(2);
  const stdin = () => { try { return fs.readFileSync(0, "utf8"); } catch { return ""; } };
  if (cmd === "compose") {
    const spec = JSON.parse(fs.readFileSync(a, "utf8")).rustdesk;
    if (!spec) { console.error(`${a} has no rustdesk block`); process.exit(1); }
    process.stdout.write(JSON.stringify(composeFile(spec), null, 2) + "\n");
  } else if (cmd === "serve-check") {
    let status = {};
    try { status = JSON.parse(stdin() || "{}"); } catch {}
    for (const p of serveProblems(status, a, b)) console.log(p);
  } else if (cmd === "listen-check") {
    for (const p of listenProblems(stdin(), a)) console.log(p);
  } else {
    console.error("usage: rustdesk.mjs compose <spec> | serve-check <https port> <local port> | listen-check <address>");
    process.exit(2);
  }
}
