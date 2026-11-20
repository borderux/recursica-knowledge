// Decide which incoming connections no rule allows. A connection is incoming when a listener holds
// the computer's side of it: the same port, on the same address or on every address (a wildcard).
// The port alone is not enough: an outgoing connection's temporary port can equal the port a
// listener holds on another address, such as Tailscale's listener on the tailnet address.
// Allowed sources: the computer itself, Tailscale (remote access with RustDesk runs over
// Tailscale), Docker's internal networks, and each source an approver allowed.
import net from "node:net";

const RANGES = [
  ["127.0.0.0", 8, 4], ["::1", 128, 6],                      // the computer itself
  ["100.64.0.0", 10, 4], ["fd7a:115c:a1e0::", 48, 6],        // Tailscale
  ["172.16.0.0", 12, 4],                                     // Docker's internal networks
];
const TAILSCALE = /^(tailscaled|tailscale|IPNExtension)(\.exe)?$/i;

function toBig(ip) {
  if (net.isIPv4(ip)) return ip.split(".").reduce((a, o) => (a << 8n) + BigInt(+o), 0n);
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [], t = tail ? tail.split(":") : [];
  const parts = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  return parts.reduce((a, p) => (a << 16n) + BigInt(parseInt(p || "0", 16)), 0n);
}

export function inRange(ip, base, bits, v) {
  const clean = String(ip).replace(/^::ffff:/, "").replace(/%.*$/, "");
  if ((v === 4 && !net.isIPv4(clean)) || (v === 6 && !net.isIPv6(clean))) return false;
  const size = v === 4 ? 32 : 128;
  const shift = BigInt(size - bits);
  return (toBig(clean) >> shift) === (toBig(base) >> shift);
}

export function allowedSource(ip, allowed = []) {
  const clean = String(ip).replace(/^::ffff:/, "").replace(/%.*$/, "");
  if (allowed.includes(clean)) return true;
  return RANGES.some(([base, bits, v]) => inRange(clean, base, bits, v));
}

// An address as lsof, ss and Windows print it, bare: no brackets, no zone, no IPv4-mapped prefix.
const bare = (ip) => String(ip ?? "").replace(/^\[|\]$/g, "").replace(/%.*$/, "").replace(/^::ffff:/i, "").toLowerCase();
const WILDCARD = new Set(["", "*", "0.0.0.0", "::"]);

// Whether a listener holds the computer's side of a connection: the same port, on the same address
// or on every address. A connection whose own address is unknown matches on the port alone.
export function heldBy(listener, c) {
  if (Number(listener.port) !== Number(c.localPort)) return false;
  const at = bare(listener.host);
  return WILDCARD.has(at) || !c.local || at === bare(c.local);
}

// connections: [{ local, localPort, remote, remotePort, process }]; listening: [{ host, port }].
export function suspicious(connections, listening, allowed = []) {
  return connections.filter((c) => listening.some((l) => heldBy(l, c))
    && !allowedSource(c.remote, allowed)
    && !TAILSCALE.test(c.process ?? ""));
}
