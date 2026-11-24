import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Monitor, localStacks, stackAnswers } from "./monitor.mjs";

function setup() {
  let t = 1_800_000_000_000, answer = { stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }, { name: "acme", channel: "CACME", state: "up" }], services: [] };
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
  set({ stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }, { name: "acme", channel: "CACME", state: "up" }], services: [] });
  advance(60_000); await m.tick();
  assert.equal(posts.filter((p) => /answers again/.test(p[1])).length, 3);
});

test("a stack down for 3 minutes alerts only that stack's channel, once, and again when the stack is back", async () => {
  const { m, posts, advance, set } = setup();
  set({ stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }, { name: "acme", channel: "CACME", state: "down" }], services: [] });
  await m.tick();
  advance(2 * 60_000); await m.tick();
  assert.deepEqual(posts, [], "down for 2 minutes: no post");
  advance(60_000); await m.tick(); await m.tick();
  assert.deepEqual(posts, [["CACME", ":red_circle: Stack acme on machine-1 has not answered for 3 minutes."]]);
  set({ stacks: [{ name: "acme", channel: "CACME", state: "up" }], services: [] });
  advance(60_000); await m.tick();
  assert.deepEqual(posts.at(-1), ["CACME", ":white_check_mark: Stack acme on machine-1 is back."]);
});

test("a locked client stack gets one reminder to unlock in the cluster channel", async () => {
  const { m, posts, set } = setup();
  set({ stacks: [{ name: "acme", state: "locked" }], services: [] });
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
  let s = await localStacks(home);
  assert.deepEqual(s, [{ name: "cluster", channel: "CB", state: "up" }, { name: "acme", state: "locked" }], "\"cluster\" with no stack_name");
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify({ site: { port: 8080, slack_channel_id: "CB", stack_name: "ops" } }));
  s = await localStacks(home);
  assert.equal(s[0].name, "ops");
});

test("local stacks: the new stack folders win over CircleChat 1.x's old ones, and site.circlechat changes nothing", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "home-"));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify({ site: { slack_channel_id: "COLD", circlechat: "retired" } }));
  fs.mkdirSync(path.join(home, "tenants/acme/circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "tenants/acme/circlechat/site.json"), JSON.stringify({ site: { slack_channel_id: "CACME" } }));
  assert.deepEqual(await localStacks(home), [{ name: "cluster", channel: "COLD", state: "up" }, { name: "acme", channel: "CACME", state: "up" }]);
  fs.mkdirSync(path.join(home, "recursica-stack"), { recursive: true });
  fs.writeFileSync(path.join(home, "recursica-stack/site.json"), JSON.stringify({ site: { slack_channel_id: "CNEW" } }));
  fs.mkdirSync(path.join(home, "tenants/acme/stack"), { recursive: true });
  assert.deepEqual(await localStacks(home), [{ name: "cluster", channel: "CNEW", state: "up" }, { name: "acme", state: "locked" }]);
});

const up = (services) => ({ stacks: [{ name: "cluster", channel: "CSTACK", state: "up" }], services });

test("a peer's kit service down for 3 minutes posts once in the cluster channel, and once when the service answers again", async () => {
  const { m, posts, advance, set } = setup();
  set(up([{ name: "kev-engine", state: "up" }, { name: "rustdesk-hbbs", state: "up" }]));
  await m.tick();
  set(up([{ name: "kev-engine", state: "down" }, { name: "rustdesk-hbbs", state: "up" }]));
  await m.tick();
  advance(2 * 60_000); await m.tick();
  assert.equal(posts.length, 0, "down for 2 minutes: no post");
  advance(60_000); await m.tick();
  advance(60_000); await m.tick();
  assert.deepEqual(posts, [["CCLUSTER", ":red_circle: kev-engine on machine-1 has been down or not answering for 3 minutes."]]);
  set(up([{ name: "kev-engine", state: "up" }, { name: "rustdesk-hbbs", state: "up" }]));
  advance(60_000); await m.tick();
  assert.deepEqual(posts.at(-1), ["CCLUSTER", ":white_check_mark: kev-engine on machine-1 answers again."]);
  assert.equal(posts.length, 2);
});

test("a service down for less than 3 minutes posts nothing, and a service the report drops leaves without a post", async () => {
  const { m, posts, advance, set } = setup();
  set(up([{ name: "jobd", state: "down" }]));
  await m.tick();
  advance(2 * 60_000); set(up([{ name: "jobd", state: "up" }])); await m.tick();
  advance(2 * 60_000); set(up([{ name: "jobd", state: "down" }])); await m.tick();
  advance(2 * 60_000); await m.tick();
  assert.equal(posts.length, 0, "each outage was shorter than 3 minutes");
  advance(2 * 60_000); await m.tick();
  assert.equal(posts.length, 1);
  set(up([]));
  advance(60_000); await m.tick();
  assert.equal(posts.length, 1, "the service left the report: no post");
});

test("a peer's report can't put other text in a post", async () => {
  const { m, posts, advance, set } = setup();
  set(up([{ name: "<!channel> pay now", state: "down" }, { name: "jobd", state: "broken" }]));
  await m.tick(); advance(5 * 60_000); await m.tick();
  assert.deepEqual(posts, []);
});

test("the peer list is read at each check, so a new address counts at once", async () => {
  const urls = [];
  let peers = { "machine-2": "http://127.0.0.1:7500", "machine-1": "http://host.docker.internal:7500" };
  const m = new Monitor({ self: "machine-2", peers: () => peers, clusterChannel: "C", stateFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mon-")), "m.json"),
    post: async () => {}, fetchStatus: async (url) => { urls.push(url); return { stacks: [] }; }, now: () => 0 });
  await m.tick();
  peers = { ...peers, "machine-1": "http://100.64.0.1:7500" };
  await m.tick();
  assert.deepEqual(urls, ["http://host.docker.internal:7500", "http://100.64.0.1:7500"], "this computer is never asked");
});

test("a report from an agent older than the services report has its stacks skipped, with one note in the cluster channel", async () => {
  const { m, posts, advance, set } = setup();
  // An agent from before CircleChat 1.x left the kit checks the stack at 1.x's port, and reports the stack as down.
  set({ stacks: [{ name: "border", channel: "CSTACK", state: "down" }] });
  await m.tick();
  advance(5 * 60_000); await m.tick();
  assert.deepEqual(posts, [["CCLUSTER", ":information_source: The cluster agent on machine-1 runs an older kit, so machine-2 skips the stack states in machine-1's report. Run install-cluster.sh on machine-1 to restart the agent."]]);
  // After the agent restarts on the current kit, the agent's own check counts.
  set({ stacks: [{ name: "border", channel: "CSTACK", state: "up" }], services: [] });
  advance(60_000); await m.tick();
  assert.equal(posts.length, 1, "an up stack after the restart posts nothing");
});

test("the control computer reports the stack it controls, checked on that computer, and a helper reports none", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "home-"));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  const site = { site: { stack_name: "border", slack_channel_id: "CB", gateway_local_port: 4005 }, recursicachat: {},
    nodes: [{ name: "studio", control: true }, { name: "pc" }] };
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify(site));
  let ok = true;
  const checked = [];
  const check = async (s) => { checked.push(s.site.stack_name); return ok; };
  assert.deepEqual(await localStacks(home, { computer: "pc", check }), [], "a helper keeps a copy of site.json, and runs none of the stack's services");
  assert.deepEqual(checked, []);
  assert.deepEqual(await localStacks(home, { computer: "studio", check }), [{ name: "border", channel: "CB", state: "up" }]);
  ok = false;
  assert.deepEqual(await localStacks(home, { computer: "studio", check }), [{ name: "border", channel: "CB", state: "down" }]);
  assert.deepEqual(await localStacks(home), [{ name: "border", channel: "CB", state: "up" }], "without a computer: every stack, for the channels the agent may post to");
});

test("a stack answers when the RecursicaChat 2.0 server and the stack's gateway answer, each at its local address", async () => {
  const asked = [];
  const site = { recursicachat: {}, site: { gateway_local_port: 4005, port: 8080 } };
  assert.equal(await stackAnswers(site, async (u) => { asked.push(u); return true; }), true);
  assert.deepEqual(asked, ["http://127.0.0.1:3100/", "http://127.0.0.1:4005/"], "never CircleChat 1.x's port, and never another computer");
  assert.equal(await stackAnswers(site, async (u) => !u.includes("4005")), false, "a gateway that doesn't answer: the stack is down");
  assert.equal(await stackAnswers({ recursicachat: { url: "http://127.0.0.1:3200" } }, async (u) => u === "http://127.0.0.1:3200/"), true);
  assert.equal(await stackAnswers({ site: {} }, async () => false), true, "a stack with no RecursicaChat server and no gateway has nothing to check");
});
