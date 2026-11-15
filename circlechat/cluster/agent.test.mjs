import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JOB_STATUS_TOKEN, STATUS_LINES_PER_MINUTE, jobStatusToken, makeAgent, readCanary } from "./agent.mjs";
import { makeChannel } from "./channel.mjs";

function setup(t0 = Date.UTC(2026, 9, 20, 15, 0)) {
  let t = t0;
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const calls = [];
  const guard = { state: { status: "normal" }, tick: async () => calls.push("tick"), cutOff: async () => ({ status: "cut-off" }),
    keepWatching: async () => ({ ok: true, message: "more" }), release: async (allow) => ({ ok: true, message: allow ? "allowed" : "released" }) };
  const platform = { reboot: async () => calls.push("reboot"), shutDown: async () => calls.push("shutdown") };
  const agent = makeAgent({ env: { COMPUTER: "machine-1", KIT: "/nonexistent", CLUSTER_TZ: "America/Chicago" }, platform, guard, post: async () => {}, now: () => t, stateDir });
  return { agent, calls, stateDir, advance: (ms) => (t += ms) };
}

test("4 a.m. schedules the next 4 a.m. in the cluster's time zone", async () => {
  const { agent, stateDir } = setup();
  const r = await agent.act({ action: "reboot-4am", ref: "u1" });
  assert.equal(r.ok, true);
  const at = JSON.parse(fs.readFileSync(path.join(stateDir, "reboot.json"), "utf8")).at;
  assert.equal(new Date(at).toISOString(), "2026-10-21T09:00:00.000Z");
});

test("a due reboot runs once, and skip cancels a scheduled one", async () => {
  const { agent, calls, advance } = setup();
  await agent.act({ action: "reboot-at", ref: "u1", extra: { at: Date.UTC(2026, 9, 20, 16, 0) } });
  await agent.minute(); assert.equal(calls.includes("reboot"), false);
  advance(61 * 60_000); await agent.minute(); await agent.minute();
  assert.equal(calls.filter((c) => c === "reboot").length, 1);
  await agent.act({ action: "reboot-tonight", ref: "u2" });
  await agent.act({ action: "reboot-skip", ref: "u2" });
  advance(24 * 3600_000); await agent.minute();
  assert.equal(calls.filter((c) => c === "reboot").length, 1);
});

test("lockdown buttons reach the guard", async () => {
  const { agent } = setup();
  assert.equal((await agent.act({ action: "release-lockdown" })).message, "released");
  assert.equal((await agent.act({ action: "allow-source" })).message, "allowed");
  assert.equal((await agent.act({ action: "nope" })).ok, false);
});

test("reads only new decoy touches, and skips the decoys' own start-up lines", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canary-"));
  const log = path.join(dir, "opencanary.log"), pos = path.join(dir, "pos");
  fs.writeFileSync(log, JSON.stringify({ logtype: 1001, src_host: "" }) + "\n" + JSON.stringify({ logtype: 4002, src_host: "10.0.0.9", dst_port: 2222 }) + "\n");
  assert.equal(readCanary(log, pos).length, 1);
  assert.equal(readCanary(log, pos).length, 0);
  fs.appendFileSync(log, JSON.stringify({ logtype: 2000, src_host: "10.0.0.10", dst_port: 2121 }) + "\n");
  assert.equal(readCanary(log, pos)[0].src_host, "10.0.0.10");
});

test("each minute runs the network check, and a failed check stops nothing else", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  let ticks = 0;
  const guard = { state: { status: "normal" }, tick: async () => {} };
  const network = { tick: async () => { ticks++; throw new Error("no route"); } };
  const agent = makeAgent({ env: { COMPUTER: "machine-1", KIT: "/nonexistent" }, platform: {}, guard, post: async () => {}, stateDir, network });
  await agent.minute();
  await agent.minute();
  assert.equal(ticks, 2);
});

test("Install for a kit release records the approval on the computer", async () => {
  const { agent, stateDir } = setup();
  const r = await agent.act({ action: "release-install", ref: "@recursica/knowledge@0.13.0", extra: { by: "person_a" } });
  assert.equal(r.ok, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(stateDir, "release-approvals.json"), "utf8"))["@recursica/knowledge@0.13.0"].by, "person_a");
  assert.match(fs.readFileSync(path.join(stateDir, "release-approvals.log"), "utf8"), /"by":"person_a".*"computer":"machine-1"/);
  assert.equal((await agent.act({ action: "release-install", ref: "../etc/passwd" })).ok, false);
});

test("Approve and Deny on a cloud-model request reach the cloud answers, with the Slack user who pressed", async () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const asked = [];
  const cloud = { answer: async (ref, decision, user) => { asked.push([ref, decision, user]); return { ok: true, message: "answered" }; } };
  const agent = makeAgent({ env: { COMPUTER: "machine-1" }, platform: {}, guard: { state: {} }, post: async () => {}, stateDir, cloud });
  await agent.act({ action: "cloud-approve", ref: "acme|cmreq_abc123", extra: { slackUser: "U0PAT0001" } });
  await agent.act({ action: "cloud-deny", ref: "acme|cmreq_abc123", extra: { slackUser: "U0PAT0001" } });
  assert.deepEqual(asked, [["acme|cmreq_abc123", "approve", "U0PAT0001"], ["acme|cmreq_abc123", "deny", "U0PAT0001"]]);
  const without = makeAgent({ env: { COMPUTER: "machine-1" }, platform: {}, guard: { state: {} }, post: async () => {}, stateDir });
  assert.deepEqual(await without.act({ action: "cloud-approve", ref: "x" }), { ok: false, message: "no cloud-model requests on this computer" });
});

// The job runner's status lines: POST /job-status on the agent, posted through the real channel.
async function statusAgent() {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "owner-"));
  const statusToken = jobStatusToken({ stateDir, ownerHome: home });
  const slack = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (!String(url).startsWith("https://slack.com/")) return realFetch(url, opts);
    slack.push({ url, body: JSON.parse(opts.body) });
    return { json: async () => ({ ok: true }) };
  };
  const chat = makeChannel({ SLACK_BOT_TOKEN: "xoxb-cluster", SLACK_CHANNEL_ID: "CCLUSTER", COMPUTER: "machine-1" });
  const guard = { state: { status: "normal" }, tick: async () => {} };
  const agent = makeAgent({ env: { COMPUTER: "machine-1", KIT: "/nonexistent", CLUSTER_TOKEN: "cluster-secret" }, platform: {}, guard, post: async () => {}, stateDir,
    statusToken, postPlain: (text) => chat.postPlain("CCLUSTER", text) });
  const srv = agent.server();
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const call = (p, token, body, method = "POST") => realFetch(`http://127.0.0.1:${srv.address().port}${p}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  return { stateDir, home, statusToken, slack, call, close: () => { srv.close(); globalThis.fetch = realFetch; } };
}

test("a status line with mentions or Slack formatting posts as plain text in the cluster's channel", async () => {
  const a = await statusAgent();
  try {
    const line = "Port job job-1 on machine-2, v1.2.3 <!channel> beam: running for 5 h. Latest progress: *Fixed* `Button` <@U123> <https://evil.example|click> _now_ & ~done~ <!here>\nsecond line";
    const r = await a.call("/job-status", a.statusToken, { text: line });
    assert.equal(r.status, 200);
    assert.equal(a.slack.length, 1);
    const { url, body } = a.slack[0];
    assert.equal(url, "https://slack.com/api/chat.postMessage");
    assert.equal(body.channel, "CCLUSTER");
    assert.equal(body.text, "Port job job-1 on machine-2, v1.2.3 &lt;!channel&gt; beam: running for 5 h. Latest progress: *Fixed* `Button` &lt;@U123&gt; &lt;https://evil.example|click&gt; _now_ &amp; ~done~ &lt;!here&gt; second line");
    assert.doesNotMatch(body.text, /[<>]/, "no Slack markup survives: no mention, no link");
    assert.deepEqual([body.mrkdwn, body.parse, body.link_names, body.unfurl_links, body.unfurl_media], [false, "none", false, false, false], "Slack shows *, _, ~ and ` as written");
    assert.equal(body.blocks, undefined);
  } finally { a.close(); }
});

test("only the status token posts a status line, and the status token opens nothing else", async () => {
  const a = await statusAgent();
  try {
    assert.equal((await a.call("/job-status", "wrong", { text: "x" })).status, 401);
    assert.equal((await a.call("/job-status", "cluster-secret", { text: "x" })).status, 401, "CLUSTER_TOKEN never posts a status line");
    assert.equal((await a.call("/status", a.statusToken, null, "GET")).status, 401, "the status token never reads the agent's status");
    assert.equal((await a.call("/action", a.statusToken, { action: "shut-down" })).status, 401, "the status token never runs an action");
    assert.equal((await a.call("/job-status", a.statusToken, { text: "  " })).status, 400);
    assert.equal(a.slack.length, 0);
  } finally { a.close(); }
});

test("the agent takes 30 status lines a minute at most", async () => {
  const a = await statusAgent();
  try {
    for (let i = 0; i < STATUS_LINES_PER_MINUTE; i++) assert.equal((await a.call("/job-status", a.statusToken, { text: `line ${i}` })).status, 200);
    assert.equal((await a.call("/job-status", a.statusToken, { text: "one more" })).status, 429);
    assert.equal(a.slack.length, STATUS_LINES_PER_MINUTE);
  } finally { a.close(); }
});

test("the status token is root's, with one copy for the owner, and the copy never follows a symlink", () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-"));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "owner-"));
  const outside = path.join(home, "..", `outside-${path.basename(home)}`);
  fs.writeFileSync(outside, "keep\n");
  fs.symlinkSync(outside, path.join(home, JOB_STATUS_TOKEN));
  const token = jobStatusToken({ stateDir, ownerHome: home });
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(fs.readFileSync(outside, "utf8"), "keep\n", "the symlink's target is untouched");
  const copy = path.join(home, JOB_STATUS_TOKEN);
  assert.equal(fs.lstatSync(copy).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(copy, "utf8").trim(), token);
  for (const f of [copy, path.join(stateDir, "job-status.token")]) assert.equal(fs.statSync(f).mode & 0o777, 0o600, f);
  assert.equal(jobStatusToken({ stateDir, ownerHome: home }), token, "the token stays the same");
  assert.doesNotMatch(fs.readFileSync(copy, "utf8"), /xox|SLACK|cluster/i);
});
