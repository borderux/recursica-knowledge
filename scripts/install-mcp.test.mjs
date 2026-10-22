import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RETIRED,
  SERVER,
  SERVER_FILE,
  ensure,
  isRetired,
  plan,
  registrations,
  verdict,
} from "./install-mcp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/install-mcp.test.mjs";

const here = { type: "stdio", command: "node", args: [SERVER_FILE] };
const elsewhere = {
  command: "node",
  args: ["/w/old-copy/recursica-knowledge/nest/mcp/knowledge/server.mjs"],
};
const other = { command: "npx", args: ["-y", "some-other-server"] };
const old = { command: "npx", args: ["-y", "@recursica/mcp@0.8.1"] };

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "install-mcp-"));
}
function home(config) {
  const h = tmp();
  fs.writeFileSync(path.join(h, ".claude.json"), JSON.stringify(config));
  return h;
}

test("the server file exists in this checkout", () => {
  assert.ok(fs.existsSync(SERVER_FILE));
});

test("registrations come back in Claude Code's order: local, project, user", () => {
  const regs = registrations({
    claudeJson: {
      mcpServers: { [SERVER]: here },
      projects: { "/app": { mcpServers: { [SERVER]: elsewhere } } },
    },
    mcpJson: { mcpServers: { [SERVER]: here } },
    dir: "/app",
  });
  assert.deepEqual(
    regs.map((r) => r.scope),
    ["local", "project", "user"],
  );
});

test("verdict tells this checkout, another checkout and another server apart", () => {
  assert.equal(verdict(here).state, "current");
  assert.equal(verdict(elsewhere).state, "stale");
  assert.equal(verdict(other).state, "foreign");
});

test("isRetired recognizes the old package and nothing else", () => {
  assert.equal(isRetired(old), true);
  assert.equal(
    isRetired({ command: "npx", args: ["-y", "@recursica/mcp"] }),
    true,
  );
  assert.equal(isRetired(here), false);
  assert.equal(isRetired(other), false);
});

test("a missing server is added at the requested scope, run by node from this checkout", () => {
  const p = plan("user", []);
  assert.equal(p.state, "missing");
  assert.deepEqual(p.steps, [
    ["mcp", "add", "--scope", "user", SERVER, "--", "node", SERVER_FILE],
  ]);
});

test("a server run from another checkout is moved to this one", () => {
  const p = plan("user", [{ scope: "user", entry: elsewhere }]);
  assert.equal(p.state, "stale");
  assert.deepEqual(
    p.steps.map((s) => s[1]),
    ["remove", "add"],
  );
});

test("another server under the same name is never replaced", () => {
  const p = plan("user", [{ scope: "user", entry: other }]);
  assert.equal(p.state, "foreign");
  assert.deepEqual(p.steps, []);
});

test("only a higher-precedence registration is reported as hiding the requested scope", () => {
  assert.match(
    plan("user", [
      { scope: "local", entry: elsewhere },
      { scope: "user", entry: here },
    ]).shadow,
    /local-scope registration takes precedence/,
  );
  assert.equal(plan("local", [{ scope: "user", entry: here }]).shadow, null);
});

test("ensure runs claude only outside --check, and in the project folder", () => {
  const dir = tmp();
  const calls = [];
  const run = (args, cwd) => (calls.push({ args, cwd }), { status: 0 });
  const log = () => {};

  assert.equal(
    ensure({ scope: "local", dir, check: true, home: tmp(), run, log }),
    1,
  );
  assert.equal(calls.length, 0);

  assert.equal(ensure({ scope: "local", dir, home: tmp(), run, log }), 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, dir);
  assert.deepEqual(calls[0].args.slice(0, 4), [
    "mcp",
    "add",
    "--scope",
    "local",
  ]);
});

test("--check judges the registration Claude Code uses, at any scope", () => {
  const lines = [];
  const n = ensure({
    scope: "local",
    dir: tmp(),
    check: true,
    home: home({ mcpServers: { [SERVER]: here } }),
    run: () => assert.fail("a check runs nothing"),
    log: (l) => lines.push(l),
  });
  assert.equal(n, 0);
  assert.match(lines.join("\n"), /current \(every project on this machine\)/);
});

test("an install removes the retired server, and a check fails while it is registered", () => {
  const h = home({
    mcpServers: { [SERVER]: here, [RETIRED.name]: old },
  });
  const log = () => {};
  assert.equal(
    ensure({
      check: true,
      home: h,
      run: () => assert.fail("a check runs nothing"),
      log,
    }),
    1,
  );
  const calls = [];
  assert.equal(
    ensure({ home: h, run: (args) => (calls.push(args), { status: 0 }), log }),
    0,
  );
  assert.deepEqual(calls, [["mcp", "remove", "--scope", "user", RETIRED.name]]);
});

test("a recursica-mcp registration that is not the old package is left alone", () => {
  const h = home({
    mcpServers: { [SERVER]: here, [RETIRED.name]: other },
  });
  const run = () => assert.fail("nothing to run");
  assert.equal(ensure({ home: h, run, log: () => {} }), 0);
});

test("without the claude command, ensure prints the command to run by hand", () => {
  const lines = [];
  const n = ensure({
    home: tmp(),
    run: () => ({ error: { code: "ENOENT" } }),
    log: (l) => lines.push(l),
  });
  assert.equal(n, 1);
  assert.ok(
    lines
      .join("\n")
      .includes(`claude mcp add --scope user ${SERVER} -- node ${SERVER_FILE}`),
  );
});

test("nothing in the repository starts the retired @recursica/mcp package", () => {
  const files = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (f) =>
        f &&
        f !== SELF &&
        f !== "CHANGELOG.md" &&
        !f.startsWith("dist/") &&
        /\.(md|json|mjs|js|sh|ya?ml|tmpl)$/.test(f),
    );
  const starts = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    if (
      /@recursica\/mcp@\d|npx[^\n]*@recursica\/mcp|mcp__recursica-mcp__/.test(
        text,
      )
    )
      starts.push(f);
  }
  assert.deepEqual(starts, []);
});
