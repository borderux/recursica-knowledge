import { test } from "node:test";
import assert from "node:assert/strict";
import { suspicious, allowedSource, inRange, heldBy } from "./classify.mjs";
import { spawnSync } from "node:child_process";
import { parseLsof, parseLsofListen, parseSs, parseSsListen } from "./platform.mjs";

test("ranges match by prefix, for IPv4 and IPv6", () => {
  assert.equal(inRange("100.101.5.6", "100.64.0.0", 10, 4), true);
  assert.equal(inRange("100.128.0.1", "100.64.0.0", 10, 4), false);
  assert.equal(inRange("fd7a:115c:a1e0:ab12::1", "fd7a:115c:a1e0::", 48, 6), true);
  assert.equal(allowedSource("::ffff:127.0.0.1"), true);
  assert.equal(allowedSource("192.168.1.50"), false);
});

const listening = [22, 8080, 7400, 2222].map((port) => ({ host: "*", port }));
test("flags an incoming connection from the office network", () => {
  const s = suspicious([{ local: "192.168.1.5", remote: "192.168.1.77", remotePort: 51515, localPort: 22, process: "sshd" }], listening);
  assert.equal(s.length, 1);
});

test("allows Tailscale, the computer itself, Docker and allowed sources", () => {
  const conns = [
    { remote: "100.88.1.2", remotePort: 40000, localPort: 8080, process: "caddy" },
    { remote: "127.0.0.1", remotePort: 40001, localPort: 7400, process: "node" },
    { remote: "172.18.0.5", remotePort: 40002, localPort: 7400, process: "node" },
    { remote: "192.168.1.20", remotePort: 40003, localPort: 8080, process: "caddy" },
  ];
  assert.deepEqual(suspicious(conns, listening, ["192.168.1.20"]), []);
});

test("flags remote access from outside Tailscale, such as RustDesk on the office network", () => {
  assert.equal(suspicious([{ local: "192.168.1.5", remote: "192.168.1.30", remotePort: 50000, localPort: 21118, process: "rustdesk" }], [{ host: "*", port: 21118 }]).length, 1);
});

test("ignores outgoing connections, whose local port is not a listening port", () => {
  assert.deepEqual(suspicious([{ local: "192.168.1.5", remote: "203.0.113.10", remotePort: 443, localPort: 55123, process: "node" }], listening), []);
});

// From a real lockdown: an outgoing HTTPS connection to a model provider's API got the temporary port
// 51783, the same port Tailscale's daemon listened on, on the tailnet's IPv6 address. Matching the
// port alone counted the connection as incoming. The addresses here are invented; the shape is lsof's.
const LSOF_LISTEN = `COMMAND     PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
tailscale   875 root   30u  IPv6 0x0123456789abcdef      0t0  TCP [fd7a:115c:a1e0::1234:abcd]:51783 (LISTEN)
sshd        412 root    4u  IPv4 0x0123456789abcde0      0t0  TCP *:22 (LISTEN)
node       1601 root   21u  IPv4 0x0123456789abcde1      0t0  TCP 127.0.0.1:7400 (LISTEN)
caddy       990 root    9u  IPv4 0x0123456789abcde2      0t0  TCP 192.168.1.5:8443 (LISTEN)`;
const LSOF_ESTABLISHED = `COMMAND     PID  USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
2.1.329    7944 owner   41u  IPv4 0x0123456789abcde3      0t0  TCP 192.168.1.5:51783->203.0.113.10:443 (ESTABLISHED)
node       2210 owner   12u  IPv4 0x0123456789abcde4      0t0  TCP 192.168.1.5:7400->203.0.113.11:443 (ESTABLISHED)
sshd       5120  root    5u  IPv4 0x0123456789abcde5      0t0  TCP 192.168.1.5:22->192.168.1.77:50000 (ESTABLISHED)
caddy      5121  root    7u  IPv4 0x0123456789abcde6      0t0  TCP 192.168.1.5:8443->192.168.1.78:50001 (ESTABLISHED)`;

test("a listener holds a connection only on its own address or on every address", () => {
  const listening = parseLsofListen(LSOF_LISTEN);
  assert.deepEqual(listening, [
    { host: "fd7a:115c:a1e0::1234:abcd", port: 51783 },
    { host: "*", port: 22 },
    { host: "127.0.0.1", port: 7400 },
    { host: "192.168.1.5", port: 8443 },
  ]);
  const conns = parseLsof(LSOF_ESTABLISHED);
  assert.deepEqual(conns[0], { local: "192.168.1.5", localPort: 51783, remote: "203.0.113.10", remotePort: 443, process: "2.1.329" });
  // the outgoing connection on Tailscale's port, and one on a loopback listener's port: never incoming;
  // ssh on every address, and caddy on its own address: incoming
  assert.deepEqual(suspicious(conns, listening).map((c) => `${c.process} ${c.localPort}`), ["sshd 22", "caddy 8443"]);
  assert.equal(heldBy({ host: "fd7a:115c:a1e0::1234:abcd", port: 51783 }, { local: "fd7a:115c:a1e0::1234:abcd", localPort: 51783 }), true, "the same address");
  assert.equal(heldBy({ host: "::ffff:192.168.1.5", port: 8443 }, { local: "192.168.1.5", localPort: 8443 }), true, "an IPv4-mapped address");
  assert.equal(heldBy({ host: "fe80::1%en0", port: 80 }, { local: "[fe80::1]", localPort: 80 }), true, "a zone and brackets");
  assert.equal(heldBy({ host: "0.0.0.0", port: 22 }, { local: "10.0.0.2", localPort: 22 }), true, "0.0.0.0 is every address");
  assert.equal(heldBy({ host: "::", port: 22 }, { local: "10.0.0.2", localPort: 22 }), true, ":: is every address");
  assert.equal(heldBy({ host: "10.0.0.1", port: 22 }, { localPort: 22 }), true, "an unknown local address matches on the port");
  assert.equal(heldBy({ host: "*", port: 23 }, { local: "10.0.0.2", localPort: 22 }), false, "another port");
});

test("Linux: ss's listeners, with the state column first, and its connections, with each local address", () => {
  // ss -Htln prints the state first; ss -Htnp state established does not.
  assert.deepEqual(parseSsListen("LISTEN 0      4096   127.0.0.53%lo:53        0.0.0.0:*\nLISTEN 0      128          0.0.0.0:22        0.0.0.0:*\nLISTEN 0      4096   [fd7a:115c:a1e0::1234:abcd]:51783    [::]:*\nLISTEN 0      511                *:8080            *:*"), [
    { host: "127.0.0.53", port: 53 },
    { host: "0.0.0.0", port: 22 },
    { host: "fd7a:115c:a1e0::1234:abcd", port: 51783 },
    { host: "*", port: 8080 },
  ]);
  const conns = parseSs('0      0      192.168.1.6:51783   203.0.113.10:443   users:(("node",pid=10,fd=3))\n0      0      192.168.1.6:22   192.168.1.77:50000   users:(("sshd",pid=11,fd=3))');
  assert.deepEqual(conns[0], { local: "192.168.1.6", localPort: 51783, remote: "203.0.113.10", remotePort: 443, process: "node" });
  const listening = parseSsListen("LISTEN 0 4096 [fd7a:115c:a1e0::1234:abcd]:51783 [::]:*\nLISTEN 0 128 0.0.0.0:22 0.0.0.0:*");
  assert.deepEqual(suspicious(conns, listening).map((c) => c.process), ["sshd"]);
});

// The real ss, where there is one (CI's Linux runner): its listeners parse with an address and a port.
const ss = process.platform === "linux" ? spawnSync("ss", ["-Htln"], { encoding: "utf8" }) : null;
test("Linux: the real ss -Htln output parses, each listener with its address", { skip: !ss?.stdout?.trim() && "no ss here, or no listener" }, () => {
  const lines = ss.stdout.trim().split("\n").length;
  const parsed = parseSsListen(ss.stdout);
  assert.equal(parsed.length, lines, `every line: ${ss.stdout}`);
  assert.ok(parsed.every((l) => l.port > 0 && l.host !== ""), JSON.stringify(parsed));
});
