// Decide which incoming connections no rule allows. A connection is incoming when the computer's
// side of the connection is a listening port. Allowed sources: the computer itself, Tailscale,
// Docker's internal networks, Splashtop's programs, and each source an approver allowed.
import net from "node:net";

const RANGES = [
  ["127.0.0.0", 8, 4], ["::1", 128, 6],                      // the computer itself
  ["100.64.0.0", 10, 4], ["fd7a:115c:a1e0::", 48, 6],        // Tailscale
  ["172.16.0.0", 12, 4],                                     // Docker's internal networks
];
const SPLASHTOP = /^(SRService|SRFeature|SRManager|SRAppPB|Strwinclt|SRServer|Splashtop.*|splashtop.*)(\.exe)?$/i;
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

// connections: [{ remote, remotePort, localPort, process }]; listening: [port numbers].
export function suspicious(connections, listening, allowed = []) {
  const ports = new Set(listening.map(Number));
  return connections.filter((c) => ports.has(Number(c.localPort))
    && !allowedSource(c.remote, allowed)
    && !SPLASHTOP.test(c.process ?? "")
    && !TAILSCALE.test(c.process ?? ""));
}
