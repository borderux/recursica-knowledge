import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Monitor, localStacks } from "./monitor.mjs";

function setup() {
  let t = 1_800_000_000_000, answer = { stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }, { name: "acme", channel: "CACME", state: "up" }] };
  const posts = [];
  const m = new Monitor({ self: "machine-2", peers: { "machine-2": "x", "machine-1": "http://machine-1:7500" }, clusterChannel: "CCLUSTER",
    stateFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mon-")), "m.json"),
    post: async (c, text) => posts.push([c, text]), fetchStatus: async () => answer, now: () => t });
  return { m, posts, advance: (ms) => (t += ms), set: (a) => (answer = a) };
}

test("a computer silent for 3 minutes alerts the cluster channel and each of its stacks' channels, once", async () => {
  const { m, posts, advance, set } = setup();
  await m.tick();
  set(null);
  advance(60_000); await m.tick(); assert.equal(posts.length, 0);
  advance(3 * 60_000); await m.tick(); await m.tick();
  assert.deepEqual(posts.map((p) => p[0]).sort(), ["CACME", "CCLUSTER", "CSTACK"]);
  set({ stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }, { name: "acme", channel: "CACME", state: "up" }] });
  advance(60_000); await m.tick();
  assert.equal(posts.filter((p) => /answers again/.test(p[1])).length, 3);
});

test("a stack that stops answering alerts only that stack's channel", async () => {
  const { m, posts, set } = setup();
  set({ stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }, { name: "acme", channel: "CACME", state: "down" }] });
  await m.tick(); await m.tick();
  assert.deepEqual(posts, [["CACME", ":red_circle: Stack acme on machine-1 is not answering."]]);
});

test("a locked client stack gets one reminder to unlock in the cluster channel", async () => {
  const { m, posts, set } = setup();
  set({ stacks: [{ name: "acme", state: "locked" }] });
  await m.tick(); await m.tick();
  assert.equal(posts.length, 1);
  assert.match(posts[0][1], /Run the Unlock stack workflow/);
  assert.equal(posts[0][0], "CCLUSTER");
});

test("local stacks: the cluster's own, named by site.stack_name, open client stacks, and locked ones", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "home-"));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify({ site: { port: 8080, slack_channel_id: "CB" } }));
  fs.mkdirSync(path.join(home, "tenants/acme"), { recursive: true });
  let s = await localStacks(home, async () => true);
  assert.deepEqual(s, [{ name: "cluster", channel: "CB", state: "up" }, { name: "acme", state: "locked" }], "\"cluster\" with no stack_name");
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify({ site: { port: 8080, slack_channel_id: "CB", stack_name: "ops" } }));
  s = await localStacks(home, async () => true);
  assert.equal(s[0].name, "ops");
});
