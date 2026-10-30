import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, setupRunner } from "./upgrade.mjs";

const tags = ["@recursica/knowledge@0.11.0", "@recursica/knowledge@0.11.1", "@recursica/knowledge@0.12.0", "@recursica/knowledge@1.0.0"];

test("a release with the same first number installs only once approved, to the newest approved release", () => {
  assert.deepEqual(decide("0.11.0", tags), { action: "hold", tag: "@recursica/knowledge@0.12.0" });
  assert.deepEqual(decide("0.11.0", tags, {}, ["@recursica/knowledge@0.12.0"]), { action: "upgrade", tag: "@recursica/knowledge@0.12.0" });
  assert.deepEqual(decide("0.11.0", tags, {}, ["@recursica/knowledge@0.11.1"]), { action: "upgrade", tag: "@recursica/knowledge@0.11.1" });
});

test("a new major version asks once, and a skipped one stays skipped", () => {
  assert.deepEqual(decide("0.12.0", tags), { action: "ask", tag: "@recursica/knowledge@1.0.0" });
  assert.deepEqual(decide("0.12.0", tags, { asked: { "@recursica/knowledge@1.0.0": 1 } }), { action: "none" });
  assert.deepEqual(decide("0.12.0", tags, { skipped: { "@recursica/knowledge@1.0.0": 1 } }), { action: "none" });
});

test("nothing newer means nothing to do, and other tags are ignored", () => {
  assert.deepEqual(decide("1.0.0", [...tags, "v9.9.9", "@other/pkg@9.0.0"]), { action: "none" });
});

test("a release that failed once is skipped; a newer one is tried", () => {
  const state = { failed: { "@recursica/knowledge@0.12.0": 1 } };
  assert.deepEqual(decide("0.11.0", ["@recursica/knowledge@0.11.0", "@recursica/knowledge@0.12.0"], state), { action: "none" });
  assert.deepEqual(decide("0.11.0", ["@recursica/knowledge@0.12.0", "@recursica/knowledge@0.12.1"], state, ["@recursica/knowledge@0.12.1"]), { action: "upgrade", tag: "@recursica/knowledge@0.12.1" });
});

test("with root's steps, the setup gets the password on stdin, needs no sudo, and leaves the skill sync to root", () => {
  const calls = [];
  const run = (cmd, args, opts) => { calls.push({ line: [cmd, ...args].join(" "), opts }); return { status: 0 }; };
  let recorded = 0;
  assert.equal(setupRunner({ kit: "/kit", rootSteps: true, password: "pw48", record: () => recorded++, run })(), true);
  assert.equal(recorded, 1, "the run is recorded before the setup starts");
  assert.deepEqual(calls.map((c) => c.line), ["bash /kit/circlechat/setup-host.sh --upgrade"]);
  assert.equal(calls[0].opts.env.KIT_ROOT_STEPS, "1");
  assert.equal(calls[0].opts.input, "pw48\n");
  calls.length = 0;
  // Without root's steps, such as a run by hand, the setup and the skill sync run as before.
  assert.equal(setupRunner({ kit: "/kit", rootSteps: false, run })(), true);
  assert.deepEqual(calls.map((c) => c.line), ["bash /kit/circlechat/setup-host.sh --upgrade", "bash /kit/circlechat/sync-skills.sh"]);
  assert.equal(calls[0].opts.env.KIT_ROOT_STEPS, undefined);
  // A failed setup fails the release, which the upgrade then rolls back.
  assert.equal(setupRunner({ kit: "/kit", rootSteps: true, password: "x", run: () => ({ status: 1 }) })(), false);
});
