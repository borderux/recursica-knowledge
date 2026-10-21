import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { plan, localStacks } from "./updater.mjs";

test("Border UX's software every hour on a stack with upgrade.auto; images once a day per stack", () => {
  const stacks = [{ name: "border", upgradeAuto: true }, { name: "acme", upgradeAuto: false }];
  const now = 1_800_000_000_000;
  assert.deepEqual(plan(stacks, {}, now), [{ name: "border", upgrade: true, images: true }, { name: "acme", upgrade: false, images: true }]);
  const state = { images: { border: now - 3600_000, acme: now - 25 * 3600_000 } };
  assert.deepEqual(plan(stacks, state, now), [{ name: "border", upgrade: true, images: false }, { name: "acme", upgrade: false, images: true }]);
});

test("only the stacks this computer controls; a helper's copy of a stack is left alone", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "upd-"));
  const cc = path.join(home, "circlechat");
  fs.mkdirSync(path.join(cc, "kit-out"), { recursive: true });
  fs.writeFileSync(path.join(cc, "kit-out/tenant.env"), "UPGRADE_AUTO=on\n");
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ nodes: [{ name: "studio", control: true }, { name: "beast" }] }));
  assert.equal(localStacks(home, "beast").length, 0);
  assert.deepEqual(localStacks(home, "studio").map((s) => s.name), ["border"]);
});
