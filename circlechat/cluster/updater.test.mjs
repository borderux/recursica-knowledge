import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { plan, localStacks, refreshRootCopies } from "./updater.mjs";

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
