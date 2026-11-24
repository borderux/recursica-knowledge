// The address each cluster agent watches another computer at. The file imports nothing, so
// cluster/install-cluster.sh loads the file alone. kit/render.mjs passes the names on.
//
// The cluster agents watch each other at each computer's Tailscale address (cluster/monitor.mjs).
// A node's address in site.json can be host.docker.internal, which only the control computer's
// containers resolve, so a node's tailnet_address comes first. Null for a computer no other
// computer can reach.
export const AGENT_PORT = 7500;
export const peerAddress = (n) => n.tailnet_address || (n.address && n.address !== "host.docker.internal" ? n.address : null);

/** Each computer's cluster agent, as { name: url }: this computer at 127.0.0.1, each other computer at its Tailscale address. */
export function agentPeers(site = {}, self = "") {
  const out = {};
  for (const n of site.nodes ?? []) {
    const host = n.name === self ? "127.0.0.1" : peerAddress(n);
    if (host) out[n.name] = `http://${host.includes(":") && !host.startsWith("[") ? `[${host}]` : host}:${AGENT_PORT}`;
  }
  return out;
}
