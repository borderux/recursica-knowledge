import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  bindingKey,
  bindingFor,
  readBindings,
  definitionsRunning,
  definitionsEverRunning,
  buildHistoryIndex,
} from "./agent-bindings.mjs";
import { filesAtCommits, fileAtCommit } from "./version-stamp.mjs";

const SLUG = "b06255a8-5385-4b22-9cef-ab1187db64d9";

test("a binding key is derived from the slug, not the name", () => {
  assert.equal(bindingKey(SLUG), "AGENT_DEFINITION_B06255A8");
  // The same install under any name gives the same key. That is the property.
  assert.equal(bindingKey(SLUG.toUpperCase()), bindingKey(SLUG));
});

test("a binding survives a rename because it never saw the name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bind-"));
  const cfg = path.join(dir, "global-agent-config.json");
  fs.writeFileSync(
    cfg,
    JSON.stringify({
      env_vars: {
        [bindingKey(SLUG)]: "claire",
        AGENT_PROMPT_VERSION_CLAIRE: "abc@def",
        UNRELATED: "left alone",
      },
    }),
  );

  const bindings = readBindings(cfg);
  assert.equal(bindings.size, 1, "only AGENT_DEFINITION_* keys are bindings");
  assert.equal(bindingFor(bindings, SLUG), "claire");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("an unbound slug resolves to nothing rather than to a guess", () => {
  assert.equal(bindingFor(new Map(), SLUG), null);
  assert.equal(bindingFor(new Map([["B06255A8", "claire"]]), null), null);
});

test("a definition is identified by the prompt an install runs", () => {
  const defs = new Map([
    ["claire", "CLAIRE PROMPT\n"],
    ["stu", "STU PROMPT\n"],
  ]);
  assert.deepEqual(definitionsRunning("STU PROMPT\n", defs), ["stu"]);
  assert.deepEqual(definitionsRunning("SOMETHING ELSE\n", defs), []);
});

test("two definitions sharing a prompt bind nothing", () => {
  // A fork that has not diverged yet. The caller checks for exactly one match, so
  // returning both is what stops a coin-flip becoming a sticky binding.
  const defs = new Map([
    ["claire", "SAME\n"],
    ["claire-fork", "SAME\n"],
  ]);
  assert.equal(definitionsRunning("SAME\n", defs).length, 2);
});

test("history places an install that is renamed and behind", () => {
  // The case that matters: an agent nobody checks drifts *and* gets renamed, so it
  // matches neither its name nor the current prompt.
  const revisions = {
    claire: ["c3:claire", "c2:claire", "c1:claire"],
    stu: ["s1:stu"],
  };
  const blobs = new Map([
    ["c3:claire", "CLAIRE v3\n"],
    ["c2:claire", "CLAIRE v2\n"],
    ["c1:claire", "CLAIRE v1\n"],
    ["s1:stu", "STU v1\n"],
  ]);
  const index = buildHistoryIndex(
    ["claire", "stu"],
    (dir) => revisions[dir],
    (refs) => new Map(refs.map((r) => [r, blobs.get(r)])),
  );

  assert.deepEqual(definitionsEverRunning("CLAIRE v1\n", index), ["claire"]);
  assert.deepEqual(definitionsEverRunning("CLAIRE v3\n", index), ["claire"]);
  assert.deepEqual(definitionsEverRunning("NEVER SEEN\n", index), []);
});

test("a definition appears once however many of its revisions match", () => {
  const index = buildHistoryIndex(
    ["claire"],
    () => ["a:claire", "b:claire"],
    (refs) => new Map(refs.map((r) => [r, "UNCHANGED\n"])),
  );
  assert.deepEqual(definitionsEverRunning("UNCHANGED\n", index), ["claire"]);
});

test("a revision git could not read is skipped, not counted as empty", () => {
  // A prompt that did not exist yet at an old commit. Treating the miss as "" would make
  // every empty-prompt comparison match it.
  const index = buildHistoryIndex(
    ["claire"],
    () => ["missing:claire"],
    () => new Map(),
  );
  assert.equal(index.size, 0);
});

test("the batched blob reader agrees with the one-at-a-time one", () => {
  // The batch protocol frames each blob with a byte length, so a prompt containing a
  // multi-byte character is exactly where a naive string-offset parser goes wrong. Every
  // prompt in this repository contains an em dash.
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: path.dirname(new URL(import.meta.url).pathname),
  }).trim();

  const paths = fs
    .readdirSync(path.join(repoRoot, "buzz-agents", "agents"), {
      withFileTypes: true,
    })
    .filter((d) => d.isDirectory())
    .map((d) => `buzz-agents/agents/${d.name}/SYSTEM_PROMPT.md`)
    .filter((p) => fs.existsSync(path.join(repoRoot, p)));

  assert.ok(paths.length > 1, "expected several prompts to compare");

  const refs = paths.map((p) => `HEAD:${p}`);
  const batched = filesAtCommits(repoRoot, refs);

  assert.equal(batched.size, refs.length);
  for (const p of paths) {
    assert.equal(
      batched.get(`HEAD:${p}`),
      fileAtCommit(repoRoot, "HEAD", p),
      `${p} read differently in batch`,
    );
  }

  // A multi-byte character present means the length framing was actually exercised.
  assert.ok(
    [...batched.values()].some((t) => /[^\x00-\x7F]/.test(t)),
    "no non-ASCII in any prompt, so this test proved nothing",
  );
});

test("a missing ref in the middle does not desynchronise the ones after it", () => {
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    cwd: path.dirname(new URL(import.meta.url).pathname),
  }).trim();

  const real = "HEAD:package.json";
  const got = filesAtCommits(repoRoot, [
    "HEAD:no/such/file/at/all.md",
    real,
  ]);
  assert.equal(got.get(real), fileAtCommit(repoRoot, "HEAD", "package.json"));
});
