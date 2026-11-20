// rc-deploy.sh, run as a plain account in a folder laid out like /opt/recursicachat, with stand-ins:
// a local git repository for the server's branch, npm and npx that build nothing real, launchctl that
// "starts" the server by writing its start lines into the log, and curl that answers /healthz.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const LINES = "Tools: a connected app's tool with no rule is blocked (CIRCLECHAT_TOOL_DEFAULT=block).\nSign-in with Google: on for everyone at example.com. Passwords: off.\n";
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd, encoding: "utf8" }).trim();

function script(dir, name, body) {
  fs.writeFileSync(path.join(dir, name), `#!/usr/bin/env bash\n${body}\n`);
  fs.chmodSync(path.join(dir, name), 0o755);
}

/** A server folder running OLD, a repository whose branch is at NEW, and the stand-ins. */
function setup({ sameCommit = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-deploy-"));
  // the server's repository: two commits on its branch
  const repo = path.join(dir, "repo");
  fs.mkdirSync(path.join(repo, "web"), { recursive: true });
  git(repo, "init", "-q", "-b", "example-main");
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  fs.writeFileSync(path.join(repo, "web", "README"), "web\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "one");
  const old = git(repo, "rev-parse", "HEAD");
  fs.writeFileSync(path.join(repo, "server.ts"), "// two\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "two");
  const next = git(repo, "rev-parse", "HEAD");
  const running = sameCommit ? next : old;

  // /opt/recursicachat, as the script sees it in the tests
  const base = path.join(dir, "base");
  fs.mkdirSync(path.join(base, "app"), { recursive: true });
  fs.writeFileSync(path.join(base, "app", "REVISION"), `commit ${running}\nbranch example-main\nrepo ${repo}\nnode v24.0.0\n`);
  fs.writeFileSync(path.join(base, "app", "server.ts"), "// the running app\n");
  fs.writeFileSync(path.join(base, "server.plist"), "<plist/>\n");
  fs.writeFileSync(path.join(base, "server.log"), LINES);

  // the owner's Node folder: node itself, and npm and npx stand-ins
  const nodeDir = path.join(dir, "node", "bin");
  fs.mkdirSync(nodeDir, { recursive: true });
  script(nodeDir, "node", `exec "${process.execPath}" "$@"`);
  script(nodeDir, "npm", ['case "$1" in', '  ci) mkdir -p node_modules/example && echo x > node_modules/example/index.js ;;', '  run) mkdir -p web/dist && echo "<html>" > web/dist/index.html ;;', "esac"].join("\n"));
  script(nodeDir, "npx", `[ -z "\${FAKE_TSC_FAILS:-}" ] || { echo "type error" >&2; exit 1; }`);

  // launchctl and curl, for the script itself
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const calls = path.join(dir, "launchctl.log");
  script(bin, "launchctl", [
    `echo "$1" >> "${calls}"`,
    `rev="$(sed -n 's/^commit //p' "${base}/app/REVISION")"`,
    `if [ "$1" = bootstrap ] && [ "$rev" != "\${FAKE_NO_LINES_FOR:-none}" ]; then printf '%s' "${LINES.replace(/'/g, "'\\''").replace(/\n/g, "\\n")}" >> "${base}/server.log"; fi`,
  ].join("\n"));
  script(bin, "curl", [`[ -z "\${FAKE_ALL_UNHEALTHY:-}" ] || exit 7`, `rev="$(sed -n 's/^commit //p' "${base}/app/REVISION")"`, `[ "$rev" = "\${FAKE_UNHEALTHY_FOR:-none}" ] && exit 7`, "echo ok"].join("\n"));
  script(bin, "sleep", "exit 0");

  const run = (extra = {}) => {
    const r = spawnSync("bash", [path.join(here, "rc-deploy.sh")], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RC_DEPLOY_TEST: "1", RC_DEPLOY_BASE: base, RC_DEPLOY_NODE: path.join(nodeDir, "node"), ...extra },
      encoding: "utf8",
    });
    const rev = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8").match(/^commit (\S+)/m)?.[1] : undefined);
    return {
      r,
      out: r.stdout + r.stderr,
      app: rev(path.join(base, "app", "REVISION")),
      prev: rev(path.join(base, "app.prev", "REVISION")),
      bad: rev(path.join(base, "app.bad", "REVISION")),
      calls: fs.existsSync(calls) ? fs.readFileSync(calls, "utf8").trim().split("\n") : [],
      log: fs.existsSync(path.join(base, "rc-deploy.log")) ? fs.readFileSync(path.join(base, "rc-deploy.log"), "utf8") : "",
    };
  };
  return { run, base, old, next, short: (c) => c.slice(0, 7) };
}

test("rc-deploy builds the branch's latest commit, swaps it in, checks it and starts it, in one summary line", () => {
  const s = setup();
  const r = s.run();
  assert.equal(r.r.status, 0, r.out + r.log);
  assert.equal(r.out.trim().split("\n").length, 1, "one line");
  assert.match(r.out, new RegExp(`^rc-deploy: ${s.short(s.old)} -> ${s.short(s.next)} \\(example-main\\) deployed and checked: file by file, /healthz, sign-in and tools lines, in \\d+s\\.`));
  assert.equal(r.app, s.next);
  assert.equal(r.prev, s.old, "the previous app is kept");
  assert.deepEqual(r.calls, ["bootout", "bootstrap"]);
  const app = path.join(s.base, "app");
  assert.ok(fs.existsSync(path.join(app, "server.ts")) && fs.existsSync(path.join(app, "web", "dist", "index.html")) && fs.existsSync(path.join(app, "node_modules", "example", "index.js")));
  assert.match(fs.readFileSync(path.join(app, "REVISION"), "utf8"), /^built .* with npm ci --ignore-scripts/m);
  assert.equal(fs.statSync(path.join(app, "server.ts")).mode & 0o022, 0, "no write for the group or others");
  assert.ok(!fs.existsSync(path.join(s.base, ".rc-deploy.lock")), "the lock is gone");
});

test("rc-deploy changes nothing when the branch is at the running commit, or when the build fails", () => {
  const same = setup({ sameCommit: true }).run();
  assert.equal(same.r.status, 0, same.out);
  assert.match(same.out, /^rc-deploy: already at [0-9a-f]{7} \(example-main\)\. Nothing to do\.$/m);
  assert.deepEqual(same.calls, [], "the server is never stopped");

  const s = setup();
  const failed = s.run({ FAKE_TSC_FAILS: "1" });
  assert.equal(failed.r.status, 1);
  assert.match(failed.out, /^rc-deploy: FAILED at build: the build failed \(the log says where\)\. Nothing changed\./);
  assert.match(failed.log, /type error/, "the build's output is in the log");
  assert.equal(failed.app, s.old);
  assert.deepEqual(failed.calls, []);
});

test("rc-deploy rolls back when the new server isn't healthy, or doesn't print the same start lines", () => {
  const s = setup();
  const sick = s.run({ FAKE_UNHEALTHY_FOR: s.next });
  assert.equal(sick.r.status, 1, sick.out + sick.log);
  assert.match(sick.out, new RegExp(`^rc-deploy: FAILED at start: /healthz did not answer ok within \\d+s\\. Rolled back to ${s.short(s.old)}, /healthz ok; the failed copy is app\\.bad\\.`));
  assert.equal(sick.app, s.old);
  assert.equal(sick.bad, s.next);
  assert.deepEqual(sick.calls, ["bootout", "bootstrap", "bootout", "bootstrap"]);

  const t = setup();
  const quiet = t.run({ FAKE_NO_LINES_FOR: t.next });
  assert.equal(quiet.r.status, 1, quiet.out + quiet.log);
  assert.match(quiet.out, /FAILED at start: the new start didn't print the same sign-in and tools lines as the last one\. Rolled back/);
  assert.equal(quiet.app, t.old);
});

test("rc-deploy reports a rollback that failed too, refuses a second run at once, and needs sudo", () => {
  const s = setup();
  const both = s.run({ FAKE_ALL_UNHEALTHY: "1" });
  assert.equal(both.r.status, 3, both.out + both.log);
  assert.match(both.out, new RegExp(`^rc-deploy: FAILED at start: /healthz did not answer ok within \\d+s, and the rollback to ${s.short(s.old)} failed too \\(/healthz did not answer ok within \\d+s\\)\\. Log: `));
  assert.equal(both.app, s.old, "the previous app is back in place, even so");

  const t = setup();
  fs.mkdirSync(path.join(t.base, ".rc-deploy.lock"));
  const locked = t.run();
  assert.equal(locked.r.status, 1);
  assert.match(locked.out, /another rc-deploy is running/);
  assert.equal(locked.app, t.old);

  if (process.getuid() !== 0) {
    const plain = spawnSync("bash", [path.join(here, "rc-deploy.sh")], { env: { ...process.env, RC_DEPLOY_TEST: "" }, encoding: "utf8" });
    assert.equal(plain.status, 2);
    assert.match(plain.stdout, /run it with sudo/);
  }
});
