import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { imagesWaitingPost, plan, localStacks, refreshRootCopies, tellRefused } from "./updater.mjs";

test("Recursica's software every hour on a stack with upgrade.auto; images once a day per stack", () => {
  const stacks = [{ name: "cluster", upgradeAuto: true }, { name: "acme", upgradeAuto: false }];
  const now = 1_800_000_000_000;
  assert.deepEqual(plan(stacks, {}, now), [{ name: "cluster", upgrade: true, images: true }, { name: "acme", upgrade: false, images: true }]);
  const state = { images: { cluster: now - 3600_000, acme: now - 25 * 3600_000 } };
  assert.deepEqual(plan(stacks, state, now), [{ name: "cluster", upgrade: true, images: false }, { name: "acme", upgrade: false, images: true }]);
});

test("only the stacks this computer controls; a helper's copy of a stack is left alone", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
  const cc = path.join(home, "circlechat");
  fs.mkdirSync(path.join(cc, "kit-out"), { recursive: true });
  fs.writeFileSync(path.join(cc, "kit-out/tenant.env"), "UPGRADE_AUTO=on\n");
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ nodes: [{ name: "machine-1", control: true }, { name: "machine-2" }] }));
  assert.equal(localStacks(home, "machine-2").length, 0);
  assert.deepEqual(localStacks(home, "machine-1").map((s) => s.name), ["cluster"], "the cluster's own stack, with no stack_name");
  assert.equal(localStacks(home, "machine-1")[0].ccDir, cc, "an old layout keeps ~/circlechat");
  // After circlechat/migrate-off-1x.sh, the stack's folder is ~/recursica-stack, and ~/circlechat links to it.
  const moved = path.join(home, "recursica-stack");
  fs.renameSync(cc, moved);
  fs.symlinkSync(moved, cc);
  assert.deepEqual(localStacks(home, "machine-1").map((s) => s.ccDir), [moved]);
});

test("a new kit reaches the root-owned copies: the secrets helper on any computer, the disk helper on Linux and WSL", () => {
  const files = {
    "/etc/agent-stacks.conf": "OWNER=owner\nOWNER_HOME=/home/owner\nKIT=/home/owner/kit\nNODE_BIN=/usr/bin/node\n",
    "/etc/sudoers.d/agent-stacks": "gh-runner ALL=(root) NOPASSWD: /usr/local/bin/agent-stacks-apply\n",
    "/home/owner/kit/circlechat/deploy/apply-secrets.sh": "new apply",
    "/usr/local/bin/agent-stacks-apply": "old apply",
    "/kit/circlechat/tenant/disk-helper.sh": "new disk",
    "/usr/local/bin/agent-stacks-disk": "old disk",
  };
  const fsx = { exists: (f) => f in files, read: (f) => { if (!(f in files)) throw new Error("no file"); return files[f]; } };
  const calls = [];
  const run = (cmd, args) => { calls.push([cmd, ...args].join(" ")); return 0; };
  assert.deepEqual(refreshRootCopies({ kit: "/kit", mac: false, run, fsx }), ["agent-stacks-apply", "agent-stacks-disk"]);
  assert.deepEqual(calls, [
    "bash /home/owner/kit/circlechat/deploy/install-secrets-helper.sh gh-runner",
    "install -m 755 -o root /kit/circlechat/tenant/disk-helper.sh /usr/local/bin/agent-stacks-disk",
  ]);
  // A Mac has no disk helper; the runner's account comes from the config once the config names it.
  calls.length = 0;
  files["/etc/agent-stacks.conf"] += "RUNNER=other-runner\n";
  assert.deepEqual(refreshRootCopies({ kit: "/kit", mac: true, run, fsx }), ["agent-stacks-apply"]);
  assert.deepEqual(calls, ["bash /home/owner/kit/circlechat/deploy/install-secrets-helper.sh other-runner"]);
  // Copies that match the kit, and a computer without the helpers, need nothing.
  calls.length = 0;
  files["/usr/local/bin/agent-stacks-apply"] = "new apply";
  files["/usr/local/bin/agent-stacks-disk"] = "new disk";
  assert.deepEqual(refreshRootCopies({ kit: "/kit", mac: false, run, fsx }), []);
  assert.deepEqual(refreshRootCopies({ kit: "/kit", mac: false, run, fsx: { exists: () => false, read: () => { throw new Error("no file"); } } }), []);
  assert.deepEqual(calls, []);
});

test("image pins that wait for a quiet RecursicaChat are announced once per set of pins", () => {
  const state = {};
  const post = imagesWaitingPost("acme", ["node:22-alpine"], "2 agent message(s) queued or in a turn", state);
  assert.match(post, /node:22-alpine wait to install.*no agent turn running or queued and no service run open\. Now: 2 agent message/);
  assert.doesNotMatch(post, /online/, "a person online doesn't hold an update");
  assert.equal(imagesWaitingPost("acme", ["node:22-alpine"], "the same", state), "");
  assert.match(imagesWaitingPost("acme", ["node:22-alpine", "node:22"], "busy", state), /node:22-alpine, node:22/);
  assert.equal(imagesWaitingPost("acme", [], "busy", state), "");
});

test("image pins that still wait are announced again 24 hours later", () => {
  const t = Date.parse("2026-11-23T10:00:00Z");
  const state = { imagesWaiting: { acme: "node:22-alpine" } };
  assert.equal(imagesWaitingPost("acme", ["node:22-alpine"], "busy", state, t), "", "a pin announced by an older job: the 24 hours start now");
  assert.equal(imagesWaitingPost("acme", ["node:22-alpine"], "busy", state, t + 23 * 3600_000), "");
  assert.match(imagesWaitingPost("acme", ["node:22-alpine"], "busy", state, t + 24 * 3600_000), /node:22-alpine wait to install/);
});

const REFUSED = "Refusing the kit checkout /home/owner/recursica-knowledge: the group or other accounts can change /home/owner/recursica-knowledge/.git/index. Run: chmod -R go-w /home/owner/recursica-knowledge Use a checkout outside the agents' workspace that only owner can change, such as /home/owner/recursica-knowledge.";

test("a refused kit checkout posts the reason and the fix once, then again only for a new reason or after 24 hours", async () => {
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok: true }; };
  const state = {};
  let t = Date.parse("2026-11-23T10:00:00Z");
  assert.equal(await tellRefused({ computer: "machine-2", problem: REFUSED, state, post, now: t }), true);
  assert.equal(posts[0], ":no_entry: Kit on machine-2: the update job refuses the kit checkout, so the kit stays where it is and no update runs on machine-2. the group or other accounts can change /home/owner/recursica-knowledge/.git/index. Run: chmod -R go-w /home/owner/recursica-knowledge Use a checkout outside the agents' workspace that only owner can change, such as /home/owner/recursica-knowledge.");
  for (const h of [1, 12, 23]) assert.equal(await tellRefused({ computer: "machine-2", problem: REFUSED, state, post, now: t + h * 3600_000 }), false, `${h} hours later`);
  assert.equal(posts.length, 1);
  // A new reason posts at once.
  const other = REFUSED.replace(".git/index", "circlechat/rc-sync.sh");
  assert.equal(await tellRefused({ computer: "machine-2", problem: other, state, post, now: t + 23.5 * 3600_000 }), true);
  assert.match(posts[1], /can change \/home\/owner\/recursica-knowledge\/circlechat\/rc-sync\.sh\. Run: chmod -R go-w /);
  // The same reason 24 hours after the last post posts again.
  t += 23.5 * 3600_000;
  assert.equal(await tellRefused({ computer: "machine-2", problem: other, state, post, now: t + 24 * 3600_000 }), true);
  assert.equal(posts.length, 3);
  // A checkout that passes clears the record, so the next refusal posts at once.
  assert.equal(await tellRefused({ computer: "machine-2", problem: null, state, post, now: t + 25 * 3600_000 }), false);
  assert.equal(state.refused, undefined);
  assert.equal(await tellRefused({ computer: "machine-2", problem: other, state, post, now: t + 25.5 * 3600_000 }), true);
  assert.equal(posts.length, 4);
});

test("a refusal whose post fails is posted again at the next run", async () => {
  const state = {};
  let ok = false;
  const posts = [];
  const post = async (text) => { posts.push(text); return { ok }; };
  const t = Date.parse("2026-11-23T10:00:00Z");
  assert.equal(await tellRefused({ computer: "machine-2", problem: REFUSED, state, post, now: t }), false);
  assert.equal(state.refused, undefined);
  ok = true;
  assert.equal(await tellRefused({ computer: "machine-2", problem: REFUSED, state, post, now: t + 3600_000 }), true);
  assert.equal(posts.length, 2);
});
