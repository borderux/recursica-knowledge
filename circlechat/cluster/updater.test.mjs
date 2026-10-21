import { test } from "node:test";
import assert from "node:assert/strict";
import { plan } from "./updater.mjs";

test("Border UX's software every hour on a stack with upgrade.auto; images once a day per stack", () => {
  const stacks = [{ name: "border", upgradeAuto: true }, { name: "acme", upgradeAuto: false }];
  const now = 1_800_000_000_000;
  assert.deepEqual(plan(stacks, {}, now), [{ name: "border", upgrade: true, images: true }, { name: "acme", upgrade: false, images: true }]);
  const state = { images: { border: now - 3600_000, acme: now - 25 * 3600_000 } };
  assert.deepEqual(plan(stacks, state, now), [{ name: "border", upgrade: true, images: false }, { name: "acme", upgrade: false, images: true }]);
});
