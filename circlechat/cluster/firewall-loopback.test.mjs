// The kit's nftables rules, run against packets: WSL's loopback0, every kit service that listens on
// 127.0.0.1, and RustDesk's ports. In WSL with mirrored networking, the computer's own loopback
// traffic, and Windows' loopback traffic such as tailscale serve, arrives on loopback0, not on lo.
// A small evaluator reads the rule forms the kit uses, and stops on any other form, so a new rule
// the evaluator can't read fails the test instead of passing unread.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { tokenPort } from "../kit/render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const example = JSON.parse(fs.readFileSync(path.join(here, "../site.example.json"), "utf8"));
const directRule = (name) => new RegExp(`^  ${name}='(.*)'$`, "m").exec(fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8"))[1];

// The base rules, filled both ways install-cluster.sh fills the placeholders.
function baseRules(directOff = false) {
  const text = fs.readFileSync(path.join(here, "firewall/nft-base.nft"), "utf8").replaceAll("@CANARY_PORTS@", "2222, 2121, 8088");
  return text.replace(/^@RUSTDESK_DIRECT@$/m, directOff ? directRule("NFT_DIRECT").replaceAll("\\n", "\n") : "");
}
const lockdownRules = () => fs.readFileSync(path.join(here, "firewall/nft-lockdown.nft"), "utf8");

// One chain's rules, without comments and the chain's type line, and the chain's policy.
function chain(text, name) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `chain ${name} {`);
  assert.ok(start >= 0, `no chain ${name}`);
  const out = [];
  let policy = null;
  for (const raw of lines.slice(start + 1)) {
    const l = raw.trim();
    if (l === "}") break;
    if (!l || l.startsWith("#")) continue;
    const p = l.match(/^type filter hook \w+ priority -?\d+; policy (accept|drop);$/);
    if (p) { policy = p[1]; continue; }
    out.push(l);
  }
  return { rules: out.map(parseRule), policy };
}

function tokens(line) {
  const out = [];
  const re = /"[^"]*"|\{[^}]*\}|\S+/g;
  for (const m of line.matchAll(re)) out.push(m[0]);
  return out;
}
const values = (t) => (t.startsWith("{") ? t.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean) : [t]);

function parseRule(line) {
  const t = tokens(line);
  const conds = [];
  let verdict = null;
  for (let i = 0; i < t.length; i++) {
    const w = t[i];
    if (["iif", "iifname", "oif", "oifname"].includes(w)) { conds.push({ kind: w.startsWith("i") ? "iif" : "oif", value: t[++i].replaceAll('"', "") }); continue; }
    if ((w === "ip" || w === "ip6") && ["saddr", "daddr"].includes(t[i + 1])) {
      const field = t[++i];
      const neg = t[i + 1] === "!=" ? (i++, true) : false;
      conds.push({ kind: "addr", family: w === "ip" ? 4 : 6, field, neg, value: values(t[++i]) });
      continue;
    }
    if ((w === "tcp" || w === "udp") && t[i + 1] === "dport") {
      i++;
      const neg = t[i + 1] === "!=" ? (i++, true) : false;
      conds.push({ kind: "port", proto: w, neg, value: values(t[++i]) });
      continue;
    }
    if (w === "ct" && t[i + 1] === "state") { i++; conds.push({ kind: "state", value: t[++i].split(",") }); continue; }
    if (w === "meta" && t[i + 1] === "l4proto") { i++; conds.push({ kind: "l4proto", value: values(t[++i]).map((v) => v.replace("ipv6-icmp", "icmpv6")) }); continue; }
    if (w === "accept" || w === "drop") { verdict = w; continue; }
    if (w === "comment") { i++; continue; }
    throw new Error(`the evaluator can't read "${w}" in: ${line}`);
  }
  if (!verdict) throw new Error(`no verdict in: ${line}`);
  return { line, conds, verdict };
}

// A named set (@blocked4 and the like) starts empty, so nothing is in one.
function inAddresses(addr, family, list) {
  const b = new net.BlockList();
  const type = family === 4 ? "ipv4" : "ipv6";
  for (const v of list) {
    if (v.startsWith("@")) continue;
    if (v.includes("/")) { const [a, n] = v.split("/"); b.addSubnet(a, Number(n), type); }
    else if (v.includes("-")) { const [a, z] = v.split("-"); b.addRange(a, z, type); }
    else b.addAddress(v, type);
  }
  return b.check(addr, type);
}
const inPorts = (port, list) => list.some((v) => (v.includes("-") ? port >= +v.split("-")[0] && port <= +v.split("-")[1] : port === +v));

function matches(c, p) {
  switch (c.kind) {
    case "iif": return p.iif === c.value;
    case "oif": return p.oif === c.value;
    case "addr": {
      if (p.family !== c.family) return false;
      const hit = inAddresses(c.field === "saddr" ? p.saddr : p.daddr, p.family, c.value);
      return c.neg ? !hit : hit;
    }
    case "port": {
      if (p.proto !== c.proto) return false;
      const hit = inPorts(p.dport, c.value);
      return c.neg ? !hit : hit;
    }
    case "state": return c.value.includes(p.state);
    case "l4proto": return c.value.includes(p.proto);
  }
  return false;
}

function verdict({ rules, policy }, packet) {
  const p = { family: packet.saddr?.includes(":") || packet.daddr?.includes(":") ? 6 : 4, proto: "tcp", state: "new", ...packet };
  for (const r of rules) if (r.conds.every((c) => matches(c, p))) return r.verdict;
  return policy;
}

// Each kit service that listens on 127.0.0.1, with the service's port in the example site.json.
const agentPort = Number(/^AGENT_PORT=(\d+)$/m.exec(fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8"))[1]);
const LOCAL_SERVICES = [
  ["RustDesk's console", 21114],
  ["jobd, the job runner", example.nodes.find((n) => n.jobs).jobs.port],
  ["the cluster agent", agentPort],
  ["CircleChat behind tailscale serve", example.site.port ?? 8080],
  ["the app preview behind tailscale serve", example.site.preview_port ?? 5173],
  ["the model gateway's local port", example.site.gateway_port ?? 4000],
  ["the GitHub token service", tokenPort({ github_apps: {}, site: {} })],
  ["Ollama", 11434],
];

for (const directOff of [false, true]) {
  const input = chain(baseRules(directOff), "input");
  const label = directOff ? " (direct access off)" : "";

  test(`every kit service on 127.0.0.1 answers from WSL's loopback0, and from lo${label}`, () => {
    for (const [name, port] of LOCAL_SERVICES) {
      assert.equal(verdict(input, { iif: "loopback0", saddr: "127.0.0.1", dport: port }), "accept", `${name}, port ${port}, from 127.0.0.1 on loopback0`);
      assert.equal(verdict(input, { iif: "loopback0", saddr: "::1", dport: port }), "accept", `${name}, port ${port}, from ::1 on loopback0`);
      assert.equal(verdict(input, { iif: "lo", saddr: "127.0.0.1", dport: port }), "accept", `${name}, port ${port}, on lo`);
    }
  });

  test(`loopback0 passes only a loopback source, and 127.0.0.1 counts only on lo and loopback0${label}`, () => {
    for (const [name, port] of LOCAL_SERVICES) {
      for (const saddr of ["192.168.1.20", "10.0.0.5", "fe80::1"]) {
        assert.equal(verdict(input, { iif: "loopback0", saddr, dport: port }), "drop", `${name} from ${saddr} on loopback0`);
      }
      assert.equal(verdict(input, { iif: "eth0", saddr: "127.0.0.1", dport: port }), "drop", `${name} from 127.0.0.1 claimed on eth0`);
      assert.equal(verdict(input, { iif: "eth0", saddr: "::1", dport: port }), "drop", `${name} from ::1 claimed on eth0`);
    }
  });

  // hbbs and hbbr run in the host's network, so each port listens on every address, and the input
  // chain is the guard: Tailscale and loopback pass, every other source is refused.
  test(`RustDesk's ports, TCP 21114 to 21119 and UDP 21116, take only Tailscale and loopback${label}`, () => {
    for (const [dport, proto] of [[21114, "tcp"], [21115, "tcp"], [21116, "tcp"], [21116, "udp"], [21117, "tcp"], [21118, "tcp"], [21119, "tcp"]]) {
      // With direct access off, the direct-access rule refuses the web client's ports, 21118 and
      // 21119, from Tailscale too.
      const fromTailscale = directOff && dport >= 21118 ? "drop" : "accept";
      assert.equal(verdict(input, { iif: "eth0", saddr: "100.64.0.9", dport, proto }), fromTailscale, `${proto} ${dport} from Tailscale`);
      assert.equal(verdict(input, { iif: "eth0", saddr: "fd7a:115c:a1e0::9", dport, proto }), fromTailscale, `${proto} ${dport} from Tailscale over IPv6`);
      for (const saddr of ["192.168.1.20", "172.17.0.2", "8.8.8.8", "2001:db8::5"]) {
        assert.equal(verdict(input, { iif: "eth0", saddr, dport, proto }), "drop", `${proto} ${dport} from ${saddr}`);
      }
      assert.equal(verdict(input, { iif: "lo", saddr: "127.0.0.1", dport, proto }), "accept", `${proto} ${dport} from loopback`);
    }
    for (const saddr of ["192.168.1.20", "172.17.0.2", "8.8.8.8"]) {
      assert.equal(verdict(input, { iif: "eth0", saddr, dport: 21114 }), "drop", `the console from ${saddr}`);
      assert.equal(verdict(input, { iif: "loopback0", saddr, dport: 21114 }), "drop", `the console from ${saddr} on loopback0`);
    }
  });
}

test("the loopback0 rules come right after iif lo accept, before every drop", () => {
  const lines = chain(baseRules(), "input").rules.map((r) => r.line);
  assert.deepEqual(lines.slice(0, 3), ["iif lo accept", 'iifname "loopback0" ip saddr 127.0.0.0/8 accept', 'iifname "loopback0" ip6 saddr ::1 accept']);
});

test("in a lockdown, the computer's own loopback traffic still leaves on loopback0, and nothing else does", () => {
  const output = chain(lockdownRules(), "output");
  for (const [name, port] of LOCAL_SERVICES) {
    assert.equal(verdict(output, { oif: "loopback0", daddr: "127.0.0.1", dport: port }), "accept", `${name} to 127.0.0.1 on loopback0`);
    assert.equal(verdict(output, { oif: "loopback0", daddr: "::1", dport: port }), "accept", `${name} to ::1 on loopback0`);
    assert.equal(verdict(output, { oif: "lo", daddr: "127.0.0.1", dport: port }), "accept");
  }
  assert.equal(verdict(output, { oif: "loopback0", daddr: "192.168.1.20", dport: 80 }), "drop");
  assert.equal(verdict(output, { oif: "eth0", daddr: "192.168.1.20", dport: 22 }), "drop");
  assert.equal(verdict(output, { oif: "eth0", daddr: "203.0.113.5", dport: 443 }), "accept", "HTTPS still leaves in a lockdown");
});

test("the evaluator reads the rules as nftables does: the old rules dropped 127.0.0.1 on loopback0", () => {
  // The rules before this fix: iif lo accept alone. A request to the console from loopback0 fell to
  // the chain's policy, drop.
  const old = chain(baseRules().replace(/^\s*iifname "loopback0".*\n/gm, ""), "input");
  assert.equal(verdict(old, { iif: "loopback0", saddr: "127.0.0.1", dport: 21114 }), "drop");
  assert.equal(verdict(old, { iif: "lo", saddr: "127.0.0.1", dport: 21114 }), "accept");
  assert.throws(() => parseRule("tcp flags syn accept"), /can't read "tcp"/);
});
