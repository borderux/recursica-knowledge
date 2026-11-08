// The cluster's RustDesk Server Pro: its settings in site.json (nodes[].rustdesk), the Docker
// Compose file setup-rustdesk.sh starts, and the checks the setup runs on the computer.
//
// RustDesk's ports, which every RustDesk client expects:
//   21114/tcp  the web console and its API: tailscale serve gives the console HTTPS
//   21115/tcp  the NAT type test
//   21116/tcp+udp  ID registration (UDP) and the connection requests (TCP)
//   21117/tcp  the relay
//   21118/tcp, 21119/tcp  RustDesk's web client, which hbbs and hbbr open
// hbbs and hbbr run in the host's network, because a Pro license needs host networking. Each port
// then listens on every address of the computer. Three firewalls refuse TCP 21114 to 21119 and UDP
// 21116 from every source except Tailscale and loopback: nftables, Windows Firewall and the Hyper-V
// firewall.
//
//   node rustdesk.mjs compose <services/<node>.json>       the Compose file, as JSON
//   node rustdesk.mjs serve-check <https port> <local port> < tailscale serve status --json
//   node rustdesk.mjs listen-check < ss -Hlntu
//   node rustdesk.mjs guard-check nft < nft list chain inet agentguard input
//   node rustdesk.mjs guard-check windows|hyperv < "<protocol>|<ports>|<action>|<enabled>|<direction>" lines
// Each check prints one line per problem and nothing when all is well.
import fs from "node:fs";

export const PORTS = { console: 21114, nat: 21115, id: 21116, relay: 21117 };
// Every TCP port the firewalls guard: the server's ports and the web client's ports.
export const GUARDED_TCP = [21114, 21115, 21116, 21117, 21118, 21119];
export const SERVER_PORTS = [PORTS.nat, PORTS.id, PORTS.relay];
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
    // A Mac runs Docker in Colima's VM. The VM's network holds no Tailscale address of the Mac, so
    // the host's network, which RustDesk's license needs, is the VM's network.
    if (n.os !== "linux") errs.push(`${at}: the server runs on Linux, or on Windows in WSL (os "linux"), in the host's network that RustDesk's license needs. On a Mac, Docker runs in Colima's VM, and the VM's network holds no Tailscale address of the Mac`);
    if (!isTailscaleV4(n.address)) errs.push(`${at}: the computer's address must be its Tailscale IPv4 address, such as 100.64.0.5, because hbbs gives each client the relay at that address`);
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

// The Compose file. hbbs is the ID server and the console; hbbr is the relay. Both keep their key,
// database and license in one volume, mounted at /root.
//   - Both run in the host's network. RustDesk's license needs host networking. On Docker's own
//     network each new container is a new machine, and the license server answers "License already
//     in use by another machine". The firewalls guard the ports (guardProblems).
//   - hbbs makes the key on the server's first start. hbbr reads the key only when hbbr starts, and without
//     the key runs as a public relay that any client may use. So hbbr starts after hbbs, and waits
//     until /root/id_ed25519.pub exists, at every start, Compose's or Docker's.
//   - hbbs names the relay, with -r, so hbbs gives each client the relay's address.
export const RELAY_KEY_WAIT = "until [ -s /root/id_ed25519.pub ]; do sleep 1; done; exec hbbr";
export function composeFile(spec) {
  const ip = spec.address;
  const common = { image: spec.image, restart: "unless-stopped", network_mode: "host", volumes: [`${VOLUME}:/root`], security_opt: ["no-new-privileges:true"] };
  return {
    name: "rustdesk",
    services: {
      hbbs: { ...common, container_name: "rustdesk-hbbs", command: ["hbbs", "-r", `${ip}:${PORTS.relay}`] },
      hbbr: { ...common, container_name: "rustdesk-hbbr", depends_on: ["hbbs"], command: ["sh", "-c", RELAY_KEY_WAIT] },
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

// Each RustDesk port must listen. In the host's network, hbbs and hbbr listen on every address,
// so a port counts on any address. ss -Hlntu prints: netid state recv-q send-q local:port peer:port.
export function listenProblems(ssText) {
  const want = [`tcp:${PORTS.console}`, ...SERVER_PORTS.map((p) => `tcp:${p}`), `udp:${PORTS.id}`];
  const seen = new Set();
  for (const line of String(ssText).split("\n")) {
    const f = line.trim().split(/\s+/);
    if (f.length < 5) continue;
    const proto = f[0].startsWith("udp") ? "udp" : f[0].startsWith("tcp") ? "tcp" : null;
    const m = /:(\d+)$/.exec(f[4]);
    if (proto && m) seen.add(`${proto}:${m[1]}`);
  }
  return want.filter((k) => !seen.has(k)).map((k) => {
    const [proto, port] = k.split(":");
    return `nothing listens on ${proto} port ${port}. Read the server's log: docker logs ${port === String(PORTS.relay) ? "rustdesk-hbbr" : "rustdesk-hbbs"}`;
  });
}

// The firewall rules that refuse TCP 21114 to 21119 and UDP 21116 from every source except Tailscale
// and loopback. In the host's network, the firewalls are the only guard on each port. Each guard prints
// one line per problem, and nothing when every rule is in place.
//   nft: the input chain of the agentguard table, as nft list chain prints the chain.
//   windows, hyperv: one line per AgentGuard RustDesk server rule, as setup-rustdesk.sh prints the
//   rule: <protocol>|<local ports>|<action>|<enabled>|<direction>.
export const NFT_RULES = [
  `tcp dport 21114-21119 ip saddr != { 100.64.0.0/10, 127.0.0.0/8 } drop comment "rustdesk"`,
  `udp dport ${PORTS.id} ip saddr != { 100.64.0.0/10, 127.0.0.0/8 } drop comment "rustdesk"`,
  `tcp dport 21114-21119 ip6 saddr != { fd7a:115c:a1e0::/48, ::1 } drop comment "rustdesk"`,
  `udp dport ${PORTS.id} ip6 saddr != { fd7a:115c:a1e0::/48, ::1 } drop comment "rustdesk"`,
];
const GUARD_FIX = {
  nft: "Run circlechat/cluster/install-cluster.sh first",
  windows: "Run circlechat/cluster/windows/install-windows-guard.ps1 -RustDeskServer in an Administrator PowerShell",
  hyperv: "Run circlechat/cluster/windows/install-windows-guard.ps1 -RustDeskServer in an Administrator PowerShell",
};
const GUARD_NAME = { nft: "The nftables rules", windows: "Windows Firewall", hyperv: "The Hyper-V firewall" };
const portsIn = (list) => String(list).split(",").map((x) => x.trim()).filter(Boolean).flatMap((r) => {
  const m = /^(\d+)(?:-(\d+))?$/.exec(r);
  if (!m) return [];
  const lo = +m[1], hi = +(m[2] ?? m[1]);
  return hi - lo > 100 ? [] : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
});
const PROTO = { "6": "tcp", "17": "udp" };
export function guardProblems(which, text) {
  const name = GUARD_NAME[which];
  if (!name) throw new Error(`unknown guard ${which}`);
  const missing = [];
  if (which === "nft") {
    const lines = new Set(String(text).split("\n").map((l) => l.trim().replace(/\s+/g, " ")));
    for (const rule of NFT_RULES) if (!lines.has(rule)) missing.push(rule);
  } else {
    const covered = { tcp: new Set(), udp: new Set() };
    for (const line of String(text).split("\n")) {
      const [proto, ports, action, enabled, direction] = line.trim().split("|").map((x) => (x ?? "").trim());
      const p = PROTO[proto] ?? proto?.toLowerCase();
      if (!covered[p] || action?.toLowerCase() !== "block" || enabled?.toLowerCase() !== "true" || direction?.toLowerCase() !== "inbound") continue;
      for (const n of portsIn(ports)) covered[p].add(n);
    }
    const tcp = GUARDED_TCP.filter((n) => !covered.tcp.has(n));
    if (tcp.length) missing.push(`an enabled inbound block rule for TCP ${tcp.join(", ")}`);
    if (!covered.udp.has(PORTS.id)) missing.push(`an enabled inbound block rule for UDP ${PORTS.id}`);
  }
  return missing.map((m) => `${name} lack${which === "nft" ? "" : "s"} the RustDesk rule: ${m}. ${GUARD_FIX[which]}, then run this script again.`);
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
    for (const p of listenProblems(stdin())) console.log(p);
  } else if (cmd === "guard-check" && GUARD_NAME[a]) {
    for (const p of guardProblems(a, stdin())) console.log(p);
  } else {
    console.error("usage: rustdesk.mjs compose <spec> | serve-check <https port> <local port> | listen-check | guard-check nft|windows|hyperv");
    process.exit(2);
  }
}
