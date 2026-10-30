import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RETIRED,
  arg,
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
  args: ["/w/old-copy/recursica-knowledge/tools/knowledge-mcp/server.mjs"],
};
// The server's path before it moved out of nest/, Buzz's folder.
const oldPath = {
  command: "node",
  args: [path.join(ROOT, "nest", "mcp", "knowledge", "server.mjs")],
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
  // A registration from before the server moved out of nest/ is replaced, not left as foreign.
  assert.equal(verdict(oldPath).state, "stale");
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

test("a retired server registered for one folder is removed from that folder, from a plain install", () => {
  const project = tmp();
  const h = home({
    mcpServers: { [SERVER]: here },
    projects: { [project]: { mcpServers: { [RETIRED.name]: old } } },
  });
  assert.equal(
    ensure({
      check: true,
      home: h,
      run: () => assert.fail("a check runs nothing"),
      log: () => {},
    }),
    1,
  );
  const calls = [];
  const run = (args, cwd) => (calls.push({ args, cwd }), { status: 0 });
  assert.equal(ensure({ home: h, run, log: () => {} }), 0);
  assert.deepEqual(calls, [
    { args: ["mcp", "remove", "--scope", "local", RETIRED.name], cwd: project },
  ]);
});

test("a retired server registered for a folder that is gone is reported, not counted", () => {
  const h = home({
    mcpServers: { [SERVER]: here },
    projects: { "/no/such/folder": { mcpServers: { [RETIRED.name]: old } } },
  });
  const lines = [];
  const run = () => assert.fail("nothing to run");
  assert.equal(ensure({ home: h, run, log: (l) => lines.push(l) }), 0);
  assert.match(lines.join("\n"), /no longer exists/);
});

test("a retired server in a project's committed .mcp.json is reported, never edited", () => {
  const dir = tmp();
  fs.writeFileSync(
    path.join(dir, ".mcp.json"),
    JSON.stringify({ mcpServers: { [RETIRED.name]: old } }),
  );
  const h = home({ projects: { [dir]: { mcpServers: { [SERVER]: here } } } });
  const lines = [];
  const run = () => assert.fail("a committed file is not edited");
  assert.equal(
    ensure({ scope: "local", dir, home: h, run, log: (l) => lines.push(l) }),
    1,
  );
  assert.match(lines.join("\n"), /commit the change/);
});

test("a folder's own stale registration is reported by a plain install", () => {
  const h = home({
    mcpServers: { [SERVER]: here },
    projects: { "/w/app": { mcpServers: { [SERVER]: elsewhere } } },
  });
  const lines = [];
  const run = () => assert.fail("nothing to run");
  assert.equal(ensure({ home: h, run, log: (l) => lines.push(l) }), 0);
  assert.match(
    lines.join("\n"),
    /\/w\/app has its own registration.*--project \/w\/app/,
  );
});

test("a check with --project points back at --project", () => {
  const dir = tmp();
  const lines = [];
  ensure({
    scope: "local",
    dir,
    check: true,
    home: tmp(),
    log: (l) => lines.push(l),
  });
  assert.match(
    lines.join("\n"),
    new RegExp(
      `mcp:install -- --project ${dir.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`,
    ),
  );
});

test("a path written with backslashes still counts as this checkout's server", () => {
  const win = { command: "node", args: [SERVER_FILE.replace(/\//g, "\\")] };
  assert.equal(verdict(win, SERVER_FILE.replace(/\//g, "\\")).state, "current");
});

test("--project takes a value either way, and an empty one is caught", () => {
  assert.equal(arg(["--project", "../app"], "--project"), "../app");
  assert.equal(arg(["--project=../app"], "--project"), "../app");
  assert.equal(arg(["--project"], "--project"), "");
  assert.equal(arg(["--project", "--check"], "--project"), "");
  assert.equal(arg(["--check"], "--project"), undefined);
});

test("--project through a symlink matches the registration under the real path", () => {
  const real = fs.realpathSync(tmp());
  const link = path.join(tmp(), "link");
  fs.symlinkSync(real, link);
  const h = home({ projects: { [real]: { mcpServers: { [SERVER]: here } } } });
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "scripts", "install-mcp.mjs"),
      "--check",
      "--project",
      link,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, HOME: h, USERPROFILE: h, INIT_CWD: ROOT },
    },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /current/);
});

test("without the claude command, the failing command itself is printed", () => {
  const lines = [];
  ensure({
    home: home({ mcpServers: { [SERVER]: elsewhere } }),
    run: () => ({ error: { code: "ENOENT" } }),
    log: (l) => lines.push(l),
  });
  assert.match(
    lines.join("\n"),
    /claude mcp remove --scope user recursica-knowledge/,
  );
});
