import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Egress, parseLine, ALLOW_ONCE_MS } from "./egress.mjs";

function setup() {
  let t = 1_800_000_000_000;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "egress-"));
  fs.mkdirSync(path.join(dir, "kit-out/egress"), { recursive: true });
  const logFile = path.join(dir, "access.log");
  fs.writeFileSync(logFile, "");
  const posts = [], execs = [];
  const st = { name: "acme", ccDir: dir, logFile, channel: "CACME", container: "cc-egress-acme" };
  const e = new Egress({ stacks: async () => [st], post: async (c, kind, text, ref) => posts.push({ c, kind, text, ref }),
    stateFile: path.join(dir, "state.json"), exec: async (s, args) => execs.push(args), now: () => t, whoIs: async () => "betty" });
  return { e, posts, execs, logFile, dir, advance: (ms) => (t += ms) };
}

test("reads the filter's log lines", () => {
  assert.deepEqual(parseLine("1792532511 172.20.0.5 CONNECT Example.com:443 403 TCP_DENIED"),
    { ts: 1792532511000, client: "172.20.0.5", method: "CONNECT", host: "example.com", status: 403, denied: true });
  assert.equal(parseLine("1792532511 127.0.0.1 CONNECT api.github.com:443 200 TCP_TUNNEL").denied, false);
  assert.equal(parseLine("1 1.2.3.4 GET http://neverssl.com/ 403 TCP_DENIED").host, "neverssl.com");
});

test("a refused site asks the stack's channel once, naming the agent", async () => {
  const { e, posts, logFile } = setup();
  fs.appendFileSync(logFile, "1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n");
  await e.tick();
  fs.appendFileSync(logFile, "1 172.20.0.5 CONNECT pastebin.com:443 403 TCP_DENIED\n");
  await e.tick();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].c, "CACME");
  assert.equal(posts[0].ref, "acme|pastebin.com");
  assert.match(posts[0].text, /betty's connection to \*pastebin.com\*/);
});

test("allow once opens the site for 15 minutes, then closes it", async () => {
  const { e, execs, dir, advance } = setup();
  const r = await e.allowOnce("acme|docs.example.com", "person_a");
  assert.equal(r.ok, true);
  const once = path.join(dir, "kit-out/egress/allow-once.txt");
  assert.equal(fs.readFileSync(once, "utf8"), "docs.example.com\n");
  assert.deepEqual(execs[0].slice(0, 2), ["exec", "cc-egress-acme"]);
  advance(ALLOW_ONCE_MS + 1);
  await e.tick();
  assert.equal(fs.readFileSync(once, "utf8"), "nothing.invalid\n");
  assert.equal(execs.length, 2);
});

test("refuses a consent for a stack or a host it does not know", async () => {
  const { e } = setup();
  assert.equal((await e.allowOnce("other|x.com", "person_a")).ok, false);
  assert.equal((await e.allowOnce("acme|bad host;rm", "person_a")).ok, false);
});
