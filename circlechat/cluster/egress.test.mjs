import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Egress, parseLine } from "./egress.mjs";

function setup() {
  let t = 1_800_000_000_000;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "egress-"));
  const logFile = path.join(dir, "access.log");
  fs.writeFileSync(logFile, "");
  const posts = [];
  const st = { name: "acme-jobs", logFile, channel: "CACME" };
  const e = new Egress({ stacks: async () => [st], post: async (c, kind, text, ref) => posts.push({ c, kind, text, ref }),
    stateFile: path.join(dir, "state.json"), now: () => t });
  return { e, posts, logFile, advance: (ms) => (t += ms) };
}

test("reads the filter's log lines", () => {
  assert.deepEqual(parseLine("1792532511 172.20.0.5 CONNECT Example.com:443 403 TCP_DENIED"),
    { ts: 1792532511000, client: "172.20.0.5", method: "CONNECT", host: "example.com", status: 403, denied: true });
  assert.equal(parseLine("1792532511 127.0.0.1 CONNECT api.github.com:443 200 TCP_TUNNEL").denied, false);
  assert.equal(parseLine("1 198.51.100.7 GET http://neverssl.com/ 403 TCP_DENIED").host, "neverssl.com");
});

test("a refused site gets one alert in the stack's channel, with no buttons", async () => {
  const { e, posts, logFile } = setup();
  fs.appendFileSync(logFile, "1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n");
  await e.tick();
  fs.appendFileSync(logFile, "1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n");
  await e.tick();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].c, "CACME");
  assert.equal(posts[0].kind, "info");
  assert.equal(posts[0].ref, "acme-jobs|pastebin.com");
  assert.match(posts[0].text, /port jobs' outgoing filter for stack acme-jobs refused a connection to \*pastebin.com\*/);
});

test("the same refused site alerts again after 30 minutes", async () => {
  const { e, posts, logFile, advance } = setup();
  fs.appendFileSync(logFile, "1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n");
  await e.tick();
  advance(30 * 60_000 + 1);
  fs.appendFileSync(logFile, "1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n");
  await e.tick();
  assert.equal(posts.length, 2);
});
