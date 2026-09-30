import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AGENTS, render, status, projectCopies } from "./install-agents.mjs";

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "install-agents-"));
}

test("render fills every token and stamps the front matter", () => {
  const src =
    "---\nname: x\n---\nRead {{KNOWLEDGE_REPO_NAME}} at {{WORKSPACE_ROOT}}.\n";
  const out = render(
    src,
    { KNOWLEDGE_REPO_NAME: "kb", WORKSPACE_ROOT: "/w" },
    "/a/x.md",
  );
  assert.deepEqual(out.missing, []);
  assert.match(out.text, /^---\n# installed-from: \/a\/x\.md [0-9a-f]{16} /);
  assert.match(out.text, /Read kb at \/w\./);
  assert.doesNotMatch(out.text, /\{\{/);
});

test("render refuses rather than installing a raw token", () => {
  const out = render(
    "{{WORKSPACE_ROOT}}",
    { KNOWLEDGE_REPO_NAME: "kb" },
    "/a/x.md",
  );
  assert.deepEqual(out.missing, ["WORKSPACE_ROOT"]);
  assert.equal(out.text, undefined);
});

test("status tells a current link, a stale copy, a foreign file and a missing one apart", () => {
  const dir = tmp();
  const plain = path.join(dir, "plain.md");
  const tokened = path.join(dir, "tokened.md");
  fs.writeFileSync(plain, "no tokens");
  fs.writeFileSync(tokened, "---\nname: t\n---\n{{WORKSPACE_ROOT}}\n");
  const out = path.join(dir, "out");
  fs.mkdirSync(out);

  assert.equal(status(plain, path.join(out, "plain.md")).state, "missing");

  fs.symlinkSync(plain, path.join(out, "plain.md"));
  assert.equal(status(plain, path.join(out, "plain.md")).state, "current");

  const dest = path.join(out, "tokened.md");
  fs.writeFileSync(
    dest,
    render(fs.readFileSync(tokened, "utf8"), { WORKSPACE_ROOT: "/w" }, tokened)
      .text,
  );
  assert.equal(status(tokened, dest).state, "current");

  fs.writeFileSync(tokened, "---\nname: t\n---\n{{WORKSPACE_ROOT}} changed\n");
  assert.equal(status(tokened, dest).state, "stale");

  fs.writeFileSync(dest, "hand-written agent");
  assert.equal(status(tokened, dest).state, "foreign");
});

test("a project's own copy under the workspace is found", () => {
  const ws = tmp();
  fs.mkdirSync(path.join(ws, "proj", ".claude", "agents"), { recursive: true });
  fs.writeFileSync(
    path.join(ws, "proj", ".claude", "agents", "betty.md"),
    "old",
  );
  assert.deepEqual(projectCopies(ws, ["betty", "barb"]), [
    path.join(ws, "proj", ".claude", "agents", "betty.md"),
  ]);
});

test("only agents that touch no client data are installed", () => {
  for (const name of ["claire", "stu", "loki"])
    assert.ok(!AGENTS.includes(name), name);
  for (const name of AGENTS) {
    const artifact = path.join(
      import.meta.dirname,
      "..",
      "portable",
      "claude-code",
      "agents",
      `${name}.md`,
    );
    assert.ok(fs.existsSync(artifact), `${name} has no built artifact`);
  }
});
