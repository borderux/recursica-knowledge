import { test } from "node:test";
import assert from "node:assert/strict";
import { busyReason, disruptive, serverQuiet, viewers } from "./quiet.mjs";

const LSOF = [
  "COMMAND     PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME",
  "tailscale  1603 root   41u  IPv4 0x01      0t0  TCP 127.0.0.1:52001->127.0.0.1:3100 (ESTABLISHED)",
  "node       2200 _rc    30u  IPv4 0x02      0t0  TCP 127.0.0.1:3100->127.0.0.1:52001 (ESTABLISHED)",
  "node       4100 _rh    22u  IPv4 0x03      0t0  TCP 127.0.0.1:52010->127.0.0.1:3100 (ESTABLISHED)",
  "tailscale  1603 root   45u  IPv4 0x04      0t0  TCP 127.0.0.1:52002->127.0.0.1:31000 (ESTABLISHED)",
].join("\n");

test("a person online is a connection from tailscaled to the server's port; a program's own connection is not", () => {
  assert.equal(viewers(LSOF, "3100"), 1);
  assert.equal(viewers("", "3100"), 0);
});

test("the server is busy with agent work queued, with a person online, or with a database that can't be read", () => {
  assert.equal(busyReason({ work: 0, people: 0 }), "");
  assert.match(busyReason({ work: 2, people: 0 }), /2 agent message/);
  assert.match(busyReason({ work: 0, people: 1 }), /1 web app connection/);
  assert.match(busyReason({ work: null, people: 0 }), /can't be read/);
});

test("only Tailscale, Ollama, Colima and Lima interrupt work among Homebrew's updates", () => {
  for (const n of ["tailscale", "ollama", "colima", "lima"]) assert.ok(disruptive(n), n);
  for (const n of ["gh", "node@22", "uv", "docker"]) assert.ok(!disruptive(n), n);
});

test("serverQuiet reads the server's database and sockets; a computer with no server is always quiet", async () => {
  const site = { recursicachat: { data: "/srv/acme-data" } };
  let file = "";
  const q = await serverQuiet(site, { work: async (f) => { file = f; return 0; }, sockets: async () => "" });
  assert.deepEqual(q, { quiet: true, why: "" });
  assert.equal(file, "/srv/acme-data/circlechat.db");
  assert.equal((await serverQuiet(site, { work: async () => 1, sockets: async () => "" })).quiet, false);
  assert.equal((await serverQuiet(site, { work: async () => 0, sockets: async () => LSOF })).quiet, false);
  assert.deepEqual(await serverQuiet({}, { work: async () => { throw new Error("never read"); } }), { quiet: true, why: "" });
});
