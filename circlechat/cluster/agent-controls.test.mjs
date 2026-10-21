import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AgentControls, controlBlocks } from "./agent-controls.mjs";

function setup() {
  const queries = [], posts = [], dockerCalls = [];
  let pending = [["ap1", "betty", "share_files", "files.write"]];
  const c = new AgentControls({
    computer: "studio", stateFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ctl-")), "s.json"),
    stacks: async () => [{ name: "border", channel: "CB", hermesHomes: "/home/x/circlechat/hermes-homes" }],
    sql: async (st, q) => { queries.push(q); if (q.includes("from approvals")) return pending; if (q.startsWith("select handle")) return [["barb", "Barb"], ["betty", "Betty"]]; return []; },
    docker: async (st, args) => { dockerCalls.push(args); if (args[0] === "ps") return "c1\nc2\n"; if (args[0] === "inspect") return args[3] === "c1" ? "/home/x/circlechat/hermes-homes/.hermes-betty /workspace " : "/other "; return ""; },
    post: async (channel, text, blocks) => posts.push({ channel, text, blocks }),
  });
  return { c, queries, posts, dockerCalls, setPending: (p) => (pending = p) };
}

test("a waiting approval is posted once, and the controls are posted when the agents change", async () => {
  const { c, posts } = setup();
  await c.tick(); await c.tick();
  assert.equal(posts.filter((p) => /waits for approval: `share_files`/.test(p.text)).length, 1);
  assert.equal(posts.filter((p) => p.blocks).length, 1);
});

test("stop pauses one agent and ends that agent's turn in progress only", async () => {
  const { c, queries, dockerCalls } = setup();
  const r = await c.stop("border|betty", "person_a");
  assert.equal(r.ok, true);
  assert.match(queries.at(-1) ?? queries.find((q) => q.startsWith("update")), /status = 'paused'.*handle = 'betty'/);
  assert.deepEqual(dockerCalls.filter((a) => a[0] === "kill"), [["kill", "c1"]]);
});

test("resume clears only a manual pause, and refuses an unsafe name", async () => {
  const { c, queries } = setup();
  await c.resume("border|*", "person_b");
  assert.match(queries.at(-1), /pause_reason = 'manual'$/);
  assert.equal((await c.stop("border|x'; drop table agents;--", "person_a")).ok, false);
});

test("the controls have a stop button per agent, and stop-all and resume-all", () => {
  const b = controlBlocks("border", "studio", [{ handle: "betty", name: "Betty" }]);
  const ids = b.flatMap((x) => x.elements ?? []).map((e) => e.action_id);
  assert.deepEqual(ids, ["agents-stop:betty", "agents-stop:*", "agents-resume:*"]);
});
