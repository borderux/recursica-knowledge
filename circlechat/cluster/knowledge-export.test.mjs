// cluster/knowledge-export.mjs with stand-ins for git, GitHub, npm and the service, in a folder of
// its own. Nothing here reaches git, the network, launchd or systemd.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EXPORT_FILE, currentCommit, exportStep, stale, treeProblem } from "./knowledge-export.mjs";

const sha = (c) => c.repeat(40);
const ORIGIN = "https://github.com/acme/kit.git";

/** A computer with an exports folder; main(c) moves origin/main to commit c. */
function computer(given = {}) {
  const opts = { verified: true, npmFails: false, quiet: true, installed: true, ...given };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-export-"));
  let main = sha("a");
  let clock = Date.parse("2026-11-27T10:00:00Z");
  const posts = [], restarts = [], logs = [];
  const state = {};
  const step = (extra = {}) => exportStep({
    computer: "machine-1", kitRepo: { repo: "acme/kit" }, state, exportsDir: dir, now: () => (clock += 1000),
    git: (...a) => {
      const cmd = a.join(" ");
      if (cmd === "remote get-url origin") return { status: 0, stdout: ORIGIN };
      if (cmd === "fetch --quiet origin main") return { status: 0, stdout: "" };
      if (cmd === "rev-parse refs/remotes/origin/main") return { status: 0, stdout: main };
      if (cmd.startsWith("log -1 --format=%cI")) return { status: 0, stdout: "2026-11-27T09:00:00Z" };
      return { status: 1, stdout: "", stderr: `no stand-in for git ${cmd}` };
    },
    verify: async (c) => (opts.verified ? { ok: true } : { ok: false, reason: `GitHub shows ${c.slice(0, 7)} as not verified` }),
    quiet: async () => ({ quiet: opts.quiet, why: opts.quiet ? "" : "1 agent turn running" }),
    post: async (t) => { posts.push(t); return { ok: true }; },
    claim: (d) => fs.mkdirSync(d),
    unpack: async (c, d) => {
      fs.mkdirSync(path.join(d, "skills/meta/x"), { recursive: true });
      fs.writeFileSync(path.join(d, "skills/meta/x/SKILL.md"), `skill at ${c}\n`);
      fs.mkdirSync(path.join(d, "tools/kev"), { recursive: true });
      fs.writeFileSync(path.join(d, "tools/kev/package-lock.json"), "{}");
      fs.mkdirSync(path.join(d, "tools/knowledge-mcp"), { recursive: true });
      fs.writeFileSync(path.join(d, "tools/knowledge-mcp/server.mjs"), extra.code ?? "server v1");
      return { status: 0, output: "" };
    },
    npm: async (d) => {
      if (opts.npmFails) return { status: 1, output: "npm ERR! the registry did not answer" };
      fs.mkdirSync(path.join(d, "node_modules"));
      return { status: 0, output: "" };
    },
    sealTree: () => {},
    restart: async () => { restarts.push(main); return { ok: true }; },
    installed: async () => opts.installed,
    log: (t) => logs.push(t),
  });
  return { dir, state, posts, restarts, logs, step, opts, main: (c) => { main = c; }, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test("the first export is served, with its commit beside the tree, and the server starts on it", async () => {
  const c = computer();
  try {
    assert.equal(await c.step(), "exported");
    assert.equal(currentCommit(c.dir), sha("a"));
    assert.equal(fs.readlinkSync(path.join(c.dir, "current")), sha("a"), "a relative link, renamed into place");
    const meta = JSON.parse(fs.readFileSync(path.join(c.dir, sha("a"), EXPORT_FILE), "utf8"));
    assert.deepEqual([meta.commit, meta.committedAt], [sha("a"), "2026-11-27T09:00:00Z"]);
    assert.ok(fs.existsSync(path.join(c.dir, sha("a"), "tools/kev/node_modules")), "Kev's packages are in the export");
    assert.deepEqual(c.restarts, [sha("a")], "the installed server starts on its first export");
    assert.equal(await c.step(), "none", "nothing new on main");
    assert.deepEqual(c.posts, []);
  } finally { c.done(); }
});

test("a new commit switches current; the server restarts only for new code, and only when RecursicaChat is quiet", async () => {
  const c = computer({ quiet: false });
  try {
    await c.step();
    c.main(sha("b"));
    assert.equal(await c.step(), "exported");
    assert.equal(currentCommit(c.dir), sha("b"));
    assert.deepEqual(c.restarts, [], "the same server code: nothing restarts, and the first restart waits too");
    c.main(sha("c"));
    await c.step({ code: "server v2" });
    assert.equal(currentCommit(c.dir), sha("c"));
    assert.deepEqual(c.restarts, [], "new code waits while RecursicaChat is busy");
    assert.equal(c.state.knowledge.restart, sha("c"));
    assert.match(c.logs.join("\n"), /waits until RecursicaChat is quiet \(1 agent turn running\)/);
  } finally { c.done(); }
});

test("the last few exports stay, and older ones and leftovers go", async () => {
  const c = computer();
  try {
    for (const x of ["a", "b", "c", "d", "e"]) { c.main(sha(x)); await c.step(); }
    fs.mkdirSync(path.join(c.dir, `.new-${sha("9")}`));
    c.main(sha("f"));
    await c.step();
    const left = fs.readdirSync(c.dir).sort();
    assert.deepEqual(left, ["current", sha("d"), sha("e"), sha("f")]);
  } finally { c.done(); }
});

test("an unverified commit is not served, and the channel hears once", async () => {
  const c = computer({ verified: false });
  try {
    assert.equal(await c.step(), "stopped");
    assert.equal(await c.step(), "stopped");
    assert.equal(c.posts.length, 1);
    assert.match(c.posts[0], /Knowledge on machine-1 stays at no export: commit aaaaaaa on main isn't served\. GitHub shows aaaaaaa as not verified/);
    assert.equal(currentCommit(c.dir), "");
  } finally { c.done(); }
});

test("a failed export leaves current where it was, and removes its half-made folder", async () => {
  const c = computer();
  try {
    await c.step();
    c.opts.npmFails = true;
    c.main(sha("b"));
    assert.equal(await c.step(), "failed");
    assert.equal(currentCommit(c.dir), sha("a"));
    assert.deepEqual(fs.readdirSync(c.dir).sort(), ["current", sha("a")]);
    assert.match(c.posts[0], /stays at aaaaaaa: the export of bbbbbbb failed\. npm ci in tools\/kev failed: npm ERR! the registry did not answer/);
  } finally { c.done(); }
});

test("an origin other than the kit's repo exports nothing", async () => {
  const c = computer();
  try {
    assert.equal(await exportStep({ computer: "machine-1", kitRepo: { problem: "no conf" }, state: {}, exportsDir: c.dir, git: () => ({ status: 0, stdout: ORIGIN }), log: () => {} }), "stopped");
    assert.equal(currentCommit(c.dir), "");
  } finally { c.done(); }
});

test("a link that leads out of the export is refused", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-tree-"));
  try {
    fs.mkdirSync(path.join(dir, "a"));
    fs.symlinkSync("../a", path.join(dir, "a", "inside"));
    assert.equal(treeProblem(dir), null);
    fs.symlinkSync("/etc", path.join(dir, "a", "out"));
    assert.match(treeProblem(dir), /a\/out links out of the export/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("stale keeps the current export and the newest ones", () => {
  const e = (c, t) => ({ name: sha(c), exportedAt: t });
  assert.deepEqual(stale([e("a", 1), e("b", 2), e("c", 3), e("d", 4), { name: "current", exportedAt: 0 }, { name: ".new-x", exportedAt: 0 }], sha("a")).sort(), [".new-x", sha("b")]);
});
