import { test } from "node:test";
import assert from "node:assert/strict";
import { suspicious, allowedSource, inRange } from "./classify.mjs";

test("ranges match by prefix, for IPv4 and IPv6", () => {
  assert.equal(inRange("100.101.5.6", "100.64.0.0", 10, 4), true);
  assert.equal(inRange("100.128.0.1", "100.64.0.0", 10, 4), false);
  assert.equal(inRange("fd7a:115c:a1e0:ab12::1", "fd7a:115c:a1e0::", 48, 6), true);
  assert.equal(allowedSource("::ffff:127.0.0.1"), true);
  assert.equal(allowedSource("192.168.1.50"), false);
});

const listening = [22, 8080, 7400, 2222];
test("flags an incoming connection from the office network", () => {
  const s = suspicious([{ remote: "192.168.1.77", remotePort: 51515, localPort: 22, process: "sshd" }], listening);
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
  assert.equal(suspicious([{ remote: "192.168.1.30", remotePort: 50000, localPort: 21118, process: "rustdesk" }], [21118]).length, 1);
});

test("ignores outgoing connections, whose local port is not a listening port", () => {
  assert.deepEqual(suspicious([{ remote: "151.101.1.1", remotePort: 443, localPort: 55123, process: "node" }], listening), []);
});
