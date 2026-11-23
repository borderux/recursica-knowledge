import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkVerified, decide, followMain, githubRepo, lastLines, networkChanges, realDeps, resultPost, touchedSetups } from "./follow-main.mjs";

test("each setup runs again only for a change to a file the setup reads, and a helper runs no setup-host.sh", () => {
  assert.deepEqual(touchedSetups(["README.md", "skills/button/SKILL.md"], { control: true }), []);
  assert.deepEqual(touchedSetups(["circlechat/kit/lib.sh"], { control: true }), ["setup-host.sh", "setup-node.sh", "install-cluster.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/kit/lib.sh"], { control: false }), ["setup-node.sh", "install-cluster.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/cluster/firewall/nft-base.nft"], { control: true }), ["install-cluster.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/gateway/key-check.mjs"], { control: true }), ["setup-host.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/gateway/key-check.mjs"], { control: false }), []);
  assert.deepEqual(touchedSetups(["circlechat/rustdesk/setup-rustdesk.sh"], { control: false }), ["setup-node.sh"]);
  assert.deepEqual(touchedSetups(["circlechat/kit/lib.shx"], { control: false }), [], "a file name must match the whole name");
  assert.deepEqual(touchedSetups(["README.md"], { control: false, carried: ["install-cluster.sh"] }), ["install-cluster.sh"], "a setup an earlier update left runs again");
});

test("the GitHub repo comes from the origin's address, and a remote off GitHub has none", () => {
  assert.equal(githubRepo("https://github.com/acme/kit.git"), "acme/kit");
  assert.equal(githubRepo("git@github.com:acme/kit.git\n"), "acme/kit");
  assert.equal(githubRepo("https://github.com/acme/kit"), "acme/kit");
  assert.equal(githubRepo("https://git.acme.com/acme/kit.git"), "");
});

const commit = (sha, verified = true, reason = verified ? "valid" : "unsigned") => ({ sha, commit: { verification: { verified, reason } } });

test("every new commit must be verified by GitHub, and GitHub must list exactly the fetched commits", async () => {
  const page = (commits, extra = {}) => async () => ({ status: "ahead", total_commits: commits.length, commits, ...extra });
  assert.deepEqual(await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c", "b"], get: page([commit("b"), commit("c")]) }), { ok: true });
  const bad = await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c", "b"], get: page([commit("b", false), commit("c")]) });
  assert.equal(bad.ok, false);
  assert.equal(bad.sha, "b");
  assert.match(bad.reason, /not verified \(unsigned\)/);
  const other = await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c", "b", "x"], get: page([commit("b"), commit("c")]) });
  assert.equal(other.sha, "x");
  assert.match(other.reason, /differs from the commits git fetched/);
  assert.match((await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c"], get: page([commit("c")], { status: "diverged" }) })).reason, /diverged/);
  assert.match((await checkVerified({ repo: "", from: "a", to: "c", shas: ["c"], get: page([]) })).reason, /not on GitHub/);
  assert.deepEqual(await checkVerified({ repo: "acme/kit", from: "a", to: "c", shas: ["c"], get: async () => { throw new Error("HTTP 403"); } }), { error: "GitHub's compare view failed: HTTP 403" });
  // A long update spans several pages of 100 commits.
  const many = Array.from({ length: 150 }, (_, i) => commit(`s${i}`));
  const urls = [];
  const paged = async (url) => { urls.push(url); const p = Number(new URL(url).searchParams.get("page")); return { status: "ahead", total_commits: 150, commits: many.slice((p - 1) * 100, p * 100) }; };
  assert.deepEqual(await checkVerified({ repo: "acme/kit", from: "a", to: "s149", shas: many.map((c) => c.sha), get: paged }), { ok: true });
  assert.equal(urls.length, 2);
  assert.match(urls[0], /^https:\/\/api\.github\.com\/repos\/acme\/kit\/compare\/a\.\.\.s149\?per_page=100&page=1$/);
});

test("Slack gets the last lines of a setup's output, with token-like text hidden", () => {
  const out = `${Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n")}\nkey sk-${"a".repeat(40)}\ntoken ${"Z".repeat(40)}\n`;
  const t = lastLines(out, 3);
  assert.equal(t.split("\n").length, 3);
  assert.match(t, /^line 19\nkey sk-<hidden>\ntoken <hidden>$/);
  assert.doesNotMatch(t, /aaaa|ZZZZ/);
});

test("the post names the computer, the old and new commit, and the result", () => {
  const base = { computer: "machine-2", from: "1111111aaaa", to: "2222222bbbb", count: 3 };
  assert.equal(resultPost({ ...base, ran: ["setup-node.sh", "install-cluster.sh"] }),
    ":white_check_mark: Kit on machine-2: 1111111 → 2222222, 3 new commits on main. Ran setup-node.sh and install-cluster.sh again.");
  assert.equal(resultPost({ ...base, count: 1 }), ":white_check_mark: Kit on machine-2: 1111111 → 2222222, 1 new commit on main. No setup needed to run again.");
  assert.match(resultPost({ ...base, manual: [{ setup: "setup-node.sh", command: "./circlechat/setup-node.sh machine-2" }] }),
    /^:warning: .* setup-node\.sh needs a person, because the owner has no password-free sudo\. Run \.\/circlechat\/setup-node\.sh machine-2 by hand\.$/);
  const failed = resultPost({ ...base, ran: ["setup-node.sh"], failed: { setup: "install-cluster.sh", output: "ok\nnft: syntax error\n" } });
  assert.match(failed, /^:x: Kit on machine-2: 1111111 → 2222222, 3 new commits on main\. install-cluster\.sh failed after setup-node\.sh passed\. The checkout stays at 2222222/);
  assert.match(failed, /```\nok\nnft: syntax error\n```$/);
});

test("the checkout moves only by a fast-forward on main", () => {
  const ok = { head: "a", target: "b", ancestor: true, branch: "main", mainAncestor: true };
  assert.deepEqual(decide(ok), { action: "update" });
  assert.deepEqual(decide({ ...ok, target: "a" }), { action: "none" });
  assert.deepEqual(decide({ ...ok, branch: "" }), { action: "update" }, "a detached checkout, such as a release tag, moves to main");
  assert.match(decide({ ...ok, ancestor: false }).reason, /not on main's history/);
  assert.match(decide({ ...ok, branch: "fix" }).reason, /on the branch fix, not main/);
  assert.match(decide({ ...ok, branch: "", mainAncestor: false }).reason, /main branch has commits that origin\/main lacks/);
});

// A real origin and kit checkout in a temporary folder, and a stand-in for GitHub's compare view.
// A kit with a lib.sh that defines network_held, as every kit after the hold does. hold: false
// for a kit from before the hold.
const HOLD_LIB = "#!/usr/bin/env bash\n# network-step begin: the hold on network steps\nnetwork_held() {\n  [ \"${KIT_HOLD_NETWORK:-}\" = 1 ] || return 1\n}\n# network-step end\nsedi() { :; }\n# network-code begin: the job installer\ninstall_unit() {\n  write_unit a\n}\n# network-code end\n";
function repos({ hold = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "follow-"));
  const sh = (cwd, ...a) => {
    const r = spawnSync("git", ["-c", "user.name=Person A", "-c", "user.email=person-a@acme.com", "-c", "init.defaultBranch=main", "-c", "commit.gpgsign=false", ...a], { cwd, encoding: "utf8" });
    if (r.status !== 0) throw new Error(r.stderr);
    return r.stdout.trim();
  };
  const work = path.join(dir, "work");
  fs.mkdirSync(work);
  sh(work, "init", "-q");
  fs.writeFileSync(path.join(work, "README.md"), "kit\n");
  fs.mkdirSync(path.join(work, "circlechat/kit"), { recursive: true });
  fs.writeFileSync(path.join(work, "circlechat/kit/lib.sh"), hold ? HOLD_LIB : "#!/usr/bin/env bash\nsedi() { :; }\n");
  sh(work, "add", "-A");
  sh(work, "commit", "-qm", "start");
  sh(dir, "clone", "-q", "--bare", work, "origin.git");
  sh(work, "remote", "add", "origin", path.join(dir, "origin.git"));
  sh(dir, "clone", "-q", path.join(dir, "origin.git"), "kit");
  const kit = path.join(dir, "kit");
  const push = (file, text = "changed\n") => {
    fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true });
    fs.writeFileSync(path.join(work, file), text);
    sh(work, "add", "-A");
    sh(work, "commit", "-qm", `change ${file}`);
    sh(work, "push", "-q", "origin", "main");
    return sh(work, "rev-parse", "HEAD");
  };
  const git = (...a) => spawnSync("git", ["-C", kit, ...a], { encoding: "utf8" });
  const head = () => git("rev-parse", "HEAD").stdout.trim();
  const unverified = new Set();
  // GitHub's compare view, from the work repo's history.
  const get = async (url) => {
    const [from, to] = url.match(/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)/).slice(1);
    const shas = sh(work, "rev-list", "--reverse", `${from}..${to}`).split("\n").filter(Boolean);
    return { status: "ahead", total_commits: shas.length, commits: shas.map((s) => commit(s, !unverified.has(s))) };
  };
  return { dir, kit, push, git, head, get, unverified, sh };
}

function world(r, over = {}) {
  const posts = [], setups = [];
  const deps = {
    computer: "machine-2", control: false, state: {}, git: r.git, get: r.get,
    quiet: async () => ({ quiet: true, why: "" }),
    post: async (text) => { posts.push(text); return { ok: true }; },
    sudoFree: async () => true,
    setup: async (name) => { setups.push(name); return { status: 0, output: "" }; },
    hostUpgrade: async () => { setups.push("setup-host.sh --upgrade"); return { ok: true, output: "", problems: [] }; },
    ...over,
  };
  // The origin's address is a folder, not GitHub, so the tests name a GitHub repo instead.
  const git = (...a) => (a[0] === "remote" && a[1] === "get-url" ? { status: 0, stdout: "https://github.com/acme/kit.git\n" } : r.git(...a));
  return { posts, setups, deps: { ...deps, git: over.git ?? git } };
}

test("a verified commit fast-forwards the kit, runs the setups the change touches, and posts one line", async () => {
  const r = repos();
  const w = world(r);
  const old = r.head();
  assert.equal(await followMain(w.deps), "none", "nothing new on main");
  assert.equal(w.posts.length, 0);
  const sha = r.push("circlechat/setup-node.sh");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.deepEqual(w.setups, ["setup-node.sh"]);
  assert.deepEqual(w.posts, [`:white_check_mark: Kit on machine-2: ${old.slice(0, 7)} → ${sha.slice(0, 7)}, 1 new commit on main. Ran setup-node.sh again.`]);
  assert.equal(r.git("symbolic-ref", "--short", "HEAD").stdout.trim(), "main");
});

test("a commit GitHub doesn't verify stops the update, with one alert", async () => {
  const r = repos();
  const w = world(r);
  const old = r.head();
  const bad = r.push("circlechat/setup-node.sh");
  r.push("README.md", "later\n");
  r.unverified.add(bad);
  assert.equal(await followMain(w.deps), "stopped");
  assert.equal(r.head(), old, "the kit stays where it was");
  assert.equal(w.setups.length, 0);
  assert.equal(w.posts.length, 1);
  assert.match(w.posts[0], new RegExp(`^:rotating_light: Kit on machine-2 stays at ${old.slice(0, 7)}: commit ${bad.slice(0, 7)} on main stops the update\\. GitHub shows the commit as not verified`));
  assert.equal(await followMain(w.deps), "stopped");
  assert.equal(w.posts.length, 1, "the same commit is announced once");
});

test("an update waits until RecursicaChat is quiet, and says so once", async () => {
  const r = repos();
  let quiet = false;
  const w = world(r, { quiet: async () => ({ quiet, why: "1 agent message(s) queued or in a turn" }) });
  const old = r.head();
  const sha = r.push("circlechat/cluster/install-cluster.sh");
  assert.equal(await followMain(w.deps), "waiting");
  assert.equal(await followMain(w.deps), "waiting");
  assert.equal(r.head(), old);
  assert.equal(w.posts.length, 1);
  assert.match(w.posts[0], /^:hourglass: Kit on machine-2: the update from .* waits until RecursicaChat is quiet, with no agent turn running or queued and no service run open\. Now: 1 agent message\(s\) queued or in a turn\.$/);
  quiet = true;
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.deepEqual(w.setups, ["install-cluster.sh"]);
});

test("a failed setup posts the last lines, keeps the new commit, and runs again with the next commit on main", async () => {
  const r = repos();
  let fail = true;
  const w = world(r, { setup: async (name) => { w.setups.push(name); return fail && name === "install-cluster.sh" ? { status: 1, output: "loading rules\nnft: syntax error in line 4\n" } : { status: 0, output: "" }; } });
  // Two setups, with no change to lib.sh, whose network_held lets setups run at all.
  r.push("circlechat/setup-node.sh");
  const sha = r.push("circlechat/cluster/install-cluster.sh");
  assert.equal(await followMain(w.deps), "failed");
  assert.equal(r.head(), sha, "the checkout stays at the new commit");
  assert.deepEqual(w.setups, ["setup-node.sh", "install-cluster.sh"]);
  assert.match(w.posts[0], /install-cluster\.sh failed after setup-node\.sh passed\. The checkout stays at/);
  assert.match(w.posts[0], /```\nloading rules\nnft: syntax error in line 4\n```$/);
  assert.equal(await followMain(w.deps), "none", "nothing runs again until main moves");
  fail = false;
  w.setups.length = 0;
  const fix = r.push("docs/notes.md");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), fix);
  assert.deepEqual(w.setups, ["install-cluster.sh"], "the failed setup runs again, though the newer change touches no setup");
  assert.deepEqual(w.deps.state.follow, {});
});

test("without password-free sudo, a setup runs only through root's own steps, and the post names each command to run by hand", async () => {
  const r = repos();
  const w = world(r, { control: true, sudoFree: async () => false });
  r.push("circlechat/setup-host.sh", "install_unit \"backup\" \"$BENV\" \"$CC_DIR\" root\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.deepEqual(w.setups, ["setup-host.sh --upgrade"]);
  assert.match(w.posts[0], /^:warning: .* Ran setup-host\.sh --upgrade again\. setup-host\.sh needs a person, because the owner has no password-free sudo\. Run \.\/circlechat\/setup-host\.sh by hand\.$/);
  w.setups.length = 0;
  r.push("circlechat/kit/lib.sh", `${HOLD_LIB}echo lib\n`);
  await followMain(w.deps);
  assert.deepEqual(w.setups, ["setup-host.sh --upgrade"], "a change with no service or job needs only setup-host.sh --upgrade");
  assert.match(w.posts[1], /setup-node\.sh and install-cluster\.sh need a person.*Run \.\/circlechat\/setup-node\.sh machine-2, then \.\/circlechat\/cluster\/install-cluster\.sh machine-2 by hand\.$/);
  assert.doesNotMatch(w.posts[1], /Run \.\/circlechat\/setup-host\.sh/);
});

test("a detached checkout, such as a release tag, moves to main; a checkout on another branch stays", async () => {
  const r = repos();
  const w = world(r);
  r.git("checkout", "-q", "--detach");
  const sha = r.push("README.md", "next\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.equal(r.git("symbolic-ref", "--short", "HEAD").stdout.trim(), "main");
  r.git("checkout", "-q", "-b", "fix");
  const before = r.head();
  r.push("README.md", "again\n");
  assert.equal(await followMain(w.deps), "stopped");
  assert.equal(r.head(), before);
  assert.match(w.posts.at(-1), /on the branch fix, not main/);
});

// The network changes of one edit to a file, with the old and new text side by side.
function changesOf(file, before, after, { control = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "net-diff-"));
  fs.writeFileSync(path.join(dir, "a"), before);
  fs.writeFileSync(path.join(dir, "b"), after);
  const diff = spawnSync("git", ["diff", "--no-index", "-U0", path.join(dir, "a"), path.join(dir, "b")], { encoding: "utf8" }).stdout;
  return networkChanges({ files: [file], control, oldText: () => before, newText: () => after, diff: () => diff });
}

// A setup script with one network step and one ordinary step.
const SCRIPT = [
  "#!/usr/bin/env bash",
  "echo start",
  "# network-step begin: the firewall rules",
  'if network_held "the firewall rules"; then :',
  "else",
  "  sudo nft -f /etc/agentguard.nft",
  "fi",
  "# network-step end",
  'install_unit opencanary "/opt/opencanary/bin/opencanaryd --dev" / root',
  "echo done",
].join("\n") + "\n";
const edit = (text, from, to) => { assert.ok(text.includes(from), from); return text.replace(from, to); };

test("a change to the firewall folder or to a network step is a network change, and an ordinary change is not", () => {
  const ic = "circlechat/cluster/install-cluster.sh";
  assert.deepEqual(changesOf("circlechat/cluster/firewall/pf-base.conf", "a\n", "b\n"), [{ setup: "install-cluster.sh", file: "circlechat/cluster/firewall/pf-base.conf", what: ["the firewall rules"], whole: false }]);
  assert.deepEqual(changesOf("circlechat/cluster/firewall/nft-base.nft", "a\n", "b\n").map((c) => c.setup), ["install-cluster.sh"]);
  assert.deepEqual(changesOf(ic, SCRIPT, edit(SCRIPT, "nft -f /etc/agentguard.nft", "nft -f /etc/agentguard-v2.nft")), [{ setup: "install-cluster.sh", file: ic, what: ["the firewall rules"], whole: false }]);
  assert.deepEqual(changesOf(ic, SCRIPT, edit(SCRIPT, "fi\n", "  echo loaded\nfi\n")).map((c) => c.what), [["the firewall rules"]], "a line added inside the step");
  assert.deepEqual(changesOf(ic, SCRIPT, edit(SCRIPT, "--dev", "--dev --verbose")), [], "the decoys are no network step");
  assert.deepEqual(changesOf(ic, SCRIPT, edit(SCRIPT, "echo done", "tailscale serve status --json >/dev/null; echo done")), [], "reading tailscale serve's rules changes nothing");
  assert.deepEqual(changesOf(ic, SCRIPT, edit(SCRIPT, "echo done", 'echo "Install Tailscale, then run: tailscale serve --bg 443"')), [], "text that names a command runs nothing");
  assert.deepEqual(changesOf("README.md", "a\n", "b\n"), []);
  assert.deepEqual(changesOf("circlechat/gateway/router.mjs", "a\n", "b\n"), []);
});

test("a tailscale serve step in setup-host.sh or setup-rustdesk.sh is a network change for its own setup only", () => {
  const host = "#!/usr/bin/env bash\n# network-step begin: tailscale serve for the app preview\nif network_held \"tailscale serve\"; then :\nelse\n  ts_serve --https=5173 http://127.0.0.1:5173\nfi\n# network-step end\necho done\n";
  const changed = edit(host, "--https=5173", "--https=5174");
  assert.deepEqual(changesOf("circlechat/setup-host.sh", host, changed), [{ setup: "setup-host.sh", file: "circlechat/setup-host.sh", what: ["tailscale serve for the app preview"], whole: false }]);
  assert.deepEqual(changesOf("circlechat/setup-host.sh", host, changed, { control: false }), [], "a helper runs no setup-host.sh");
  assert.deepEqual(changesOf("circlechat/rustdesk/setup-rustdesk.sh", host, changed).map((c) => c.setup), ["setup-node.sh"]);
});

test("a setup waits whole when a change moves the hold itself or adds a network command outside a network step", () => {
  const ic = "circlechat/cluster/install-cluster.sh";
  // A network command outside every network step would run under the hold.
  const stray = changesOf(ic, SCRIPT, edit(SCRIPT, "echo done", "sudo pfctl -a agentguard -f /var/lib/agent-cluster/pf-base.conf\necho done"));
  assert.deepEqual(stray, [{ setup: "install-cluster.sh", file: ic, what: ["a network command outside a network step"], whole: true, why: "the change moves the hold or adds a network command outside a network step" }]);
  for (const cmd of ["tailscale set --ssh", "sudo tailscale up", "printf x | sudo tee /etc/pf.conf", "ts serve --bg --https=443 http://127.0.0.1:21114", "sudo nft add element inet agentguard allowed4 { 100.64.0.9 }"]) {
    assert.equal(changesOf(ic, SCRIPT, edit(SCRIPT, "echo done", cmd))[0]?.whole, true, cmd);
  }
  // Without network_held, the step's commands would run under the hold.
  assert.equal(changesOf(ic, SCRIPT, edit(SCRIPT, 'if network_held "the firewall rules"; then :\nelse\n', "if true; then\n"))[0].whole, true);
  assert.equal(changesOf(ic, SCRIPT, edit(SCRIPT, "# network-step end\n", ""))[0].whole, true, "an end line removed");
  // lib.sh holds network_held: a change to the hold runs none of the setups that read lib.sh.
  const lib = "#!/usr/bin/env bash\n# network-step begin: the hold on network steps\nnetwork_held() {\n  [ \"${KIT_HOLD_NETWORK:-}\" = 1 ] || return 1\n}\n# network-step end\nsedi() { :; }\n# network-code begin: the job installer\ninstall_unit() { :; }\n# network-code end\n";
  const held = changesOf("circlechat/kit/lib.sh", lib, edit(lib, "= 1 ] || return 1", "= yes ] || return 1"));
  assert.deepEqual(held.map((c) => [c.setup, c.whole]), [["setup-host.sh", true], ["setup-node.sh", true], ["install-cluster.sh", true]]);
  assert.deepEqual(changesOf("circlechat/kit/lib.sh", lib, edit(lib, "sedi() { :; }", "sedi() { true; }")), [], "an ordinary lib.sh change");
});

test("follow-main runs each setup and setup-host.sh --upgrade with KIT_HOLD_NETWORK=1", async () => {
  const calls = [];
  const spawn = (cmd, args, opts) => { calls.push({ cmd, args, input: opts?.input }); return { status: 0, stdout: "", stderr: "" }; };
  const env = { COMPUTER: "machine-2", OWNER: "owner", OWNER_HOME: "/home/owner", KIT: "/home/owner/kit", PATH: "/usr/bin" };
  const stacks = [{ ccDir: "/home/owner/circlechat", ws: "/home/owner/circlechat-workspace" }];
  const deps = realDeps({ env, stacks, afterUpgrade: () => [], prepare: () => "pw", spawn, platform: "linux" });
  for (const s of ["setup-host.sh", "setup-node.sh", "install-cluster.sh"]) assert.equal((await deps.setup(s)).status, 0);
  assert.equal((await deps.hostUpgrade()).ok, true);
  assert.equal(calls.length, 4);
  for (const c of calls) {
    assert.equal(c.cmd, "sudo");
    assert.ok(c.args.includes("KIT_HOLD_NETWORK=1"), c.args.join(" "));
    assert.ok(c.args.indexOf("KIT_HOLD_NETWORK=1") < c.args.indexOf("bash"), "set before the script starts");
  }
  assert.ok(calls.at(-1).args.includes("--upgrade"));
});

test("the applied commit comes from the setup's run by hand, and the installed rules' fingerprint follows the rule files", () => {
  const files = { "/home/owner/.recursica-kit/network-applied/install-cluster.sh": `${"a".repeat(40)}\n`, "/etc/agentguard.nft": "table v1" };
  const read = (f) => { if (!(f in files)) throw new Error("ENOENT"); return files[f]; };
  const env = { COMPUTER: "machine-2", OWNER: "owner", OWNER_HOME: "/home/owner", KIT: "/home/owner/kit", PATH: "/usr/bin" };
  const deps = realDeps({ env, stacks: [], afterUpgrade: () => [], prepare: () => "", read, platform: "linux" });
  assert.equal(deps.applied("install-cluster.sh"), "a".repeat(40));
  assert.equal(deps.applied("setup-node.sh"), "");
  const before = deps.installed();
  assert.equal(deps.installed(), before);
  files["/etc/agentguard.nft"] = "table v2";
  assert.notEqual(deps.installed(), before);
});

const FIREWALL = "circlechat/cluster/firewall/pf-base.conf";

test("a firewall change fast-forwards, runs install-cluster.sh under the hold, and posts once what waits, with the command for a Mac", async () => {
  const r = repos();
  const w = world(r, { kit: "/home/owner/kit", platform: "darwin" });
  const old = r.head();
  const sha = r.push(FIREWALL, "pass in quick inet from 100.64.0.0/10\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), sha);
  assert.deepEqual(w.setups, ["install-cluster.sh"], "the setup's other steps still run");
  assert.equal(w.posts.length, 2);
  assert.match(w.posts[0], /^:warning: Kit on machine-2: .* Ran install-cluster\.sh again\. Network changes wait for a person, in the next message\.$/);
  const p = w.posts[1];
  assert.match(p, new RegExp(`^:warning: Kit on machine-2: network changes from ${old.slice(0, 7)} to ${sha.slice(0, 7)} wait for a person\\.`));
  assert.match(p, new RegExp(`^• ${sha.slice(0, 7)} change ${FIREWALL}$`, "m"));
  assert.match(p, /^• install-cluster\.sh: the network steps wait\. Steps: the firewall rules \(circlechat\/cluster\/firewall\/pf-base\.conf\)\.$/m);
  assert.match(p, /^• `\/home\/owner\/kit\/circlechat\/cluster\/install-cluster\.sh machine-2` applies the firewall rules\. The command has no automatic undo/m, "no apply script in the checkout");
  assert.doesNotMatch(p, /pf-apply-tailnet/);
  // The next hour, nothing new: no post. A change with no network step: the result line only.
  assert.equal(await followMain(w.deps), "none");
  assert.equal(w.posts.length, 2);
  r.push("README.md", "docs\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(w.posts.length, 3);
  assert.doesNotMatch(w.posts[2], /Network changes wait/);
  // A newer network change posts again, for the whole range that waits.
  const newer = r.push("circlechat/cluster/firewall/pf-lockdown.conf", "block drop out log all\n");
  await followMain(w.deps);
  assert.equal(w.posts.length, 5);
  assert.match(w.posts[4], new RegExp(`from ${old.slice(0, 7)} to ${newer.slice(0, 7)} wait`));
  assert.match(w.posts[4], /Steps: the firewall rules \(circlechat\/cluster\/firewall\/pf-base\.conf, circlechat\/cluster\/firewall\/pf-lockdown\.conf\)/);
  assert.equal(w.posts[4].match(/^• [0-9a-f]{7} change /gm).length, 2, "the commits that touch a waiting file");
});

test("with the apply script in the new checkout, a Mac's post names the apply script and --confirm from a new session", async () => {
  const r = repos();
  const w = world(r, { kit: "/home/owner/kit", platform: "darwin" });
  r.push("circlechat/cluster/firewall/pf-apply-tailnet.sh", "#!/usr/bin/env bash\n");
  r.push(FIREWALL, "rules v2\n");
  await followMain(w.deps);
  const p = w.posts.at(-1);
  assert.match(p, /^• `sudo \/home\/owner\/kit\/circlechat\/cluster\/firewall\/pf-apply-tailnet\.sh` loads the firewall rules with an automatic undo\. Then, within 5 minutes, open a new RustDesk or SSH session over Tailscale and run `sudo \/home\/owner\/kit\/circlechat\/cluster\/firewall\/pf-apply-tailnet\.sh --confirm` there\. With no --confirm, the old rules come back\.$/m);
  assert.doesNotMatch(p, /install-cluster\.sh machine-2/);
});

test("on Linux, the post names install-cluster.sh, or the apply script when the checkout has one", async () => {
  const r = repos();
  const w = world(r, { kit: "/home/owner/kit/", platform: "linux" });
  r.push("circlechat/cluster/firewall/nft-base.nft", "table inet agentguard {}\n");
  await followMain(w.deps);
  assert.match(w.posts.at(-1), /^• `\/home\/owner\/kit\/circlechat\/cluster\/install-cluster\.sh machine-2` applies the firewall rules\. The command has no automatic undo/m);
  // A checkout with the apply script.
  const r2 = repos();
  const w2 = world(r2, { kit: "/home/owner/kit", platform: "linux" });
  r2.push("circlechat/cluster/firewall/nft-apply-tailnet.sh", "#!/usr/bin/env bash\n");
  await followMain(w2.deps);
  assert.match(w2.posts.at(-1), /^• `sudo \/home\/owner\/kit\/circlechat\/cluster\/firewall\/nft-apply-tailnet\.sh` loads the firewall rules with an automatic undo/m);
});

test("the waiting change clears once a person applies it: the setup's run by hand, or new installed rules", async () => {
  const r = repos();
  let mark = "", rules = "v1";
  const w = world(r, { kit: "/home/owner/kit", platform: "darwin", applied: async (s) => (s === "install-cluster.sh" ? mark : ""), installed: async () => rules });
  const first = r.push(FIREWALL, "rules v2\n");
  await followMain(w.deps);
  assert.ok(w.deps.state.follow.network);
  // A run by hand from an older commit clears nothing.
  mark = r.git("rev-parse", "HEAD~1").stdout.trim();
  await followMain(w.deps);
  assert.ok(w.deps.state.follow.network);
  mark = first;
  assert.equal(await followMain(w.deps), "none");
  assert.equal(w.deps.state.follow.network, undefined, "install-cluster.sh ran by hand at the waiting commit");
  // A newer change waits again, from its own commit, and new installed rules clear the change.
  const before = r.head();
  r.push(FIREWALL, "rules v3\n");
  await followMain(w.deps);
  assert.equal(w.deps.state.follow.network.from, before);
  assert.equal(w.posts.filter((p) => /network changes from/.test(p)).length, 2);
  await followMain(w.deps);
  assert.ok(w.deps.state.follow.network, "the same installed rules");
  rules = "v3";
  await followMain(w.deps);
  assert.equal(w.deps.state.follow.network, undefined, "the apply script's --confirm installed new rules");
  assert.equal(w.posts.filter((p) => /network changes from/.test(p)).length, 2, "no post when a change clears");
});

test("a change to the hold itself runs none of the setups that read lib.sh, and the post asks for each whole setup", async () => {
  const r = repos();
  const w = world(r, { kit: "/home/owner/kit", platform: "linux" });
  const lib = "#!/usr/bin/env bash\n# network-step begin: the hold on network steps\nnetwork_held() {\n  [ \"${KIT_HOLD_NETWORK:-}\" = 1 ] || return 1\n}\n# network-step end\n";
  r.push("circlechat/kit/lib.sh", lib);
  w.setups.length = 0;
  w.posts.length = 0;
  r.push("circlechat/kit/lib.sh", lib.replace("= 1 ]", "= yes ]"));
  assert.equal(await followMain(w.deps), "updated");
  assert.deepEqual(w.setups, [], "no setup ran");
  const p = w.posts.at(-1);
  assert.match(p, /^• setup-node\.sh: the whole setup waits, since the change moves the hold or adds a network command outside a network step\. Steps: the hold on network steps \(circlechat\/kit\/lib\.sh\)\.$/m);
  assert.match(p, /^• `\/home\/owner\/kit\/circlechat\/setup-node\.sh machine-2` applies the whole setup\./m);
  assert.match(p, /^• `\/home\/owner\/kit\/circlechat\/cluster\/install-cluster\.sh machine-2` applies the whole setup\./m);
  // A later change to the same setup still runs nothing, until a person runs the setup.
  r.push("circlechat/cluster/install-cluster.sh", "echo next\n");
  await followMain(w.deps);
  assert.deepEqual(w.setups, []);
});

test("a failed setup keeps the waiting network change, and a post that failed is sent the next hour", async () => {
  const r = repos();
  let slack = false;
  const w = world(r, {
    kit: "/home/owner/kit", platform: "linux",
    setup: async (name) => ({ status: 1, output: `${name} failed` }),
    post: async (text) => { if (!slack) return { ok: false }; w.posts.push(text); return { ok: true }; },
  });
  r.push("circlechat/cluster/firewall/nft-base.nft", "table v2\n");
  assert.equal(await followMain(w.deps), "failed");
  assert.deepEqual(w.deps.state.follow.pending, ["install-cluster.sh"]);
  assert.ok(w.deps.state.follow.network);
  slack = true;
  await followMain(w.deps);
  assert.equal(w.posts.length, 1);
  assert.match(w.posts[0], /network changes from .* wait for a person/);
  await followMain(w.deps);
  assert.equal(w.posts.length, 1);
});

// The hold came after the update job could run setups. A kit from before it can't skip a network
// step, so the update job must not run a setup there at all.
test("a kit with no network_held runs no setup: each setup the change touches waits whole, and the post says why", async () => {
  const r = repos({ hold: false });
  const w = world(r, { kit: "/home/owner/kit", platform: "darwin" });
  r.push(FIREWALL, "rules v2\n");
  const to = r.push("circlechat/setup-node.sh", "echo node v2\n");
  assert.equal(await followMain(w.deps), "updated");
  assert.equal(r.head(), to, "the checkout still fast-forwards");
  assert.deepEqual(w.setups, [], "no setup ran, not even under the hold");
  assert.match(w.posts[0], /2 new commits on main\. Network changes wait for a person, in the next message\.$/, "no \"No setup needed\" while setups wait");
  const p = w.posts[1];
  const why = `since the kit at ${to.slice(0, 7)} has no hold for network steps \\(no network_held in kit\\/lib\\.sh\\)`;
  assert.match(p, new RegExp(`^• setup-node\\.sh: the whole setup waits, ${why}\\. Steps: every step \\(circlechat/setup-node\\.sh\\)\\.$`, "m"));
  assert.match(p, new RegExp(`^• install-cluster\\.sh: the whole setup waits, ${why}\\. Steps: every step \\(${FIREWALL.replace(/[./]/g, "\\$&")}\\)\\.$`, "m"));
  assert.match(p, /^• `\/home\/owner\/kit\/circlechat\/cluster\/install-cluster\.sh machine-2` applies the whole setup\. The command has no automatic undo/m);
  // The hostUpgrade path too: setup-host.sh --upgrade has network steps, so it doesn't run.
  const r2 = repos({ hold: false });
  const w2 = world(r2, { control: true, sudoFree: async () => false });
  r2.push("circlechat/gateway/router.mjs", "v2\n");
  await followMain(w2.deps);
  assert.deepEqual(w2.setups, []);
  assert.match(w2.posts.at(-1), /^• setup-host\.sh: the whole setup waits, since the kit at /m);
  // The kit that brings the hold: every setup that reads the hold waits whole, and none runs.
  r2.push("circlechat/kit/lib.sh", HOLD_LIB);
  await followMain(w2.deps);
  assert.deepEqual(w2.setups, []);
  assert.deepEqual(Object.keys(w2.deps.state.follow.network.waiting), ["setup-host.sh", "setup-node.sh", "install-cluster.sh"]);
});

test("an edit to lib.sh's job installer is a network change for install-cluster.sh, applied by its run by hand", () => {
  const lib = HOLD_LIB + "site_get() { :; }\n";
  const job = changesOf("circlechat/kit/lib.sh", lib, edit(lib, "write_unit a", "write_unit b"));
  assert.deepEqual(job, [{ setup: "install-cluster.sh", file: "circlechat/kit/lib.sh", what: ["the job installer"], whole: false, byHand: true }]);
  assert.deepEqual(changesOf("circlechat/kit/lib.sh", lib, edit(lib, "site_get() { :; }", "site_get() { true; }")), [], "an edit outside the job installer");
  assert.equal(changesOf("circlechat/kit/lib.sh", lib, edit(lib, "# network-code end\n", ""))[0].byHand, true, "an end line removed");
  // A lib.sh with no network-code lines: any edit counts.
  const bare = "#!/usr/bin/env bash\nsedi() { :; }\n";
  assert.deepEqual(changesOf("circlechat/kit/lib.sh", bare, edit(bare, "sedi() { :; }", "sedi() { true; }")).map((c) => [c.setup, c.what, c.byHand]), [["install-cluster.sh", ["the job installer, which writes the firewall's start-up job"], true]]);
});

test("a job installer change: install-cluster.sh runs under the hold, the post adds the run by hand after --confirm, and new rules don't clear it", async () => {
  const r = repos();
  let rules = "v1", mark = "";
  const w = world(r, { kit: "/home/owner/kit", platform: "darwin", installed: async () => rules, applied: async (s) => (s === "install-cluster.sh" ? mark : "") });
  r.push("circlechat/cluster/firewall/pf-apply-tailnet.sh", "#!/usr/bin/env bash\n");
  const to = r.push("circlechat/kit/lib.sh", HOLD_LIB.replace("write_unit a", "write_unit b"));
  await followMain(w.deps);
  assert.ok(w.setups.includes("install-cluster.sh"), "the setup's other steps still run");
  const p = w.posts.at(-1);
  assert.match(p, /^• install-cluster\.sh: the network steps wait\. Steps: the firewall rules, the job installer \(circlechat\/cluster\/firewall\/pf-apply-tailnet\.sh, circlechat\/kit\/lib\.sh\)\.$/m);
  assert.match(p, /pf-apply-tailnet\.sh loads only the anchor's rule files, so after --confirm run `\/home\/owner\/kit\/circlechat\/cluster\/install-cluster\.sh machine-2` for lib\.sh, which has no automatic undo\.$/m);
  rules = "v2";
  await followMain(w.deps);
  assert.ok(w.deps.state.follow.network?.waiting["install-cluster.sh"], "new rules don't apply the job installer");
  mark = to;
  await followMain(w.deps);
  assert.equal(w.deps.state.follow.network, undefined, "install-cluster.sh ran by hand");
});
