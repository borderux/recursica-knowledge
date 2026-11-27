// firewall/pf-apply-tailnet.sh, run with stand-ins for pfctl, launchctl, id and who in a scratch
// folder. Nothing here touches a real firewall or launchd. The pfctl stand-in keeps the anchor's rules
// in a file, and fails on a table command: a load keeps the anchor's tables (circlechat/ci/pf-tables.sh),
// so the script never touches the blocked or allowed addresses. One log holds each pfctl and
// launchctl call in order. kit.yml runs this file on macOS too, with macOS's own bash 3.2.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const script = path.join(here, "firewall/pf-apply-tailnet.sh");

const PFCTL = `#!/bin/bash
d="$STANDIN_DIR"; echo "pfctl $*" >>"$d/calls"
n=""; f=""; sr=""
while [ $# -gt 0 ]; do
  case "$1" in -n) n=1 ;; -a) shift ;; -f) f="$2"; shift ;; -sr) sr=1 ;; -t | -T) exit 9 ;; esac
  shift
done
if [ -n "$sr" ]; then cat "$d/anchor.rules" 2>/dev/null; exit 0; fi
if [ -n "$f" ] && [ -n "$n" ]; then
  if [ -e "$d/reject" ]; then echo "$f:3: syntax error" >&2; exit 1; fi
  exit 0
fi
if [ -n "$f" ]; then cp "$f" "$d/anchor.rules"; exit 0; fi
exit 1
`;
const LAUNCHCTL = `#!/bin/bash
d="$STANDIN_DIR"; echo "launchctl $*" >>"$d/calls"
case "$1" in
  bootstrap) touch "$d/job-loaded" ;;
  bootout) [ -e "$d/job-loaded" ] || exit 3; rm -f "$d/job-loaded" ;;
  print) [ -e "$d/job-loaded" ] ;;
esac
`;
const ID = `#!/bin/bash
echo "\${STANDIN_UID:-0}"
`;
const WHO = `#!/bin/bash
exit 0
`;

// The rules an earlier kit installed: Tailscale only on two utun interfaces.
const OLD_BASE = [
  'tailscale_if = "{ utun0 utun1 }"',
  "table <blocked> persist",
  "table <allowed> persist",
  "block in log quick from <blocked>",
  "pass in quick on $tailscale_if inet from 100.64.0.0/10",
  "pass in quick on $tailscale_if inet6 from fd7a:115c:a1e0::/48",
  "block in log all",
  "pass out all keep state",
  "",
].join("\n");
const OLD_LOCKDOWN = "table <blocked> persist\nblock in log all\nblock out log all\n";

// What install-cluster.sh installs with remote_access.direct_ip false.
const rendered = (f) => fs.readFileSync(path.join(here, `firewall/pf-${f}.conf`), "utf8")
  .replaceAll("@CANARY_PORTS@", "2222 2121 8088")
  .replace(/^@RUSTDESK_DIRECT@$/m, "block in quick proto { tcp udp } to port { 21118 21119 }");

// stacks: the owner's stack folders, each with a site.json, as { folder: site }. The stack's folder
// is ~/recursica-stack, or ~/circlechat before the move (kit/stack-paths.sh).
function setup({ wait = 300, stacks = { "recursica-stack": { remote_access: { direct_ip: false } } } } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-apply-"));
  const bin = path.join(tmp, "bin"), standin = path.join(tmp, "standin"), cluster = path.join(tmp, "cluster");
  const launchd = path.join(tmp, "launchd"), home = path.join(tmp, "home");
  for (const d of [bin, standin, cluster, launchd, home]) fs.mkdirSync(d, { recursive: true });
  for (const [name, body] of [["pfctl", PFCTL], ["launchctl", LAUNCHCTL], ["id", ID], ["who", WHO]]) fs.writeFileSync(path.join(bin, name), body, { mode: 0o755 });
  for (const [folder, site] of Object.entries(stacks)) {
    fs.mkdirSync(path.join(home, folder), { recursive: true });
    fs.writeFileSync(path.join(home, folder, "site.json"), JSON.stringify(site));
  }
  const conf = path.join(tmp, "agent-cluster.conf");
  fs.writeFileSync(conf, `COMPUTER=machine-1\nOWNER_HOME=${home}\nPATH=${bin}:${path.dirname(process.execPath)}:/usr/bin:/bin\n`);
  fs.writeFileSync(path.join(cluster, "pf-base.conf"), OLD_BASE);
  fs.writeFileSync(path.join(cluster, "pf-lockdown.conf"), OLD_LOCKDOWN);
  // The anchor holds the installed rules.
  fs.writeFileSync(path.join(standin, "anchor.rules"), OLD_BASE);
  const env = { PATH: `${bin}:/usr/bin:/bin`, HOME: home, STANDIN_DIR: standin, AGENT_CLUSTER_DIR: cluster, LAUNCHD_DIR: launchd, CLUSTER_CONF: conf, PF_APPLY_WAIT: String(wait) };
  const run = (args = [], extra = {}) => spawnSync("bash", [script, ...args], { env: { ...env, ...extra }, encoding: "utf8" });
  const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
  const plist = path.join(launchd, "io.recursica.pf-apply-undo.plist");
  // The undo job, as launchd starts it: the plist's ProgramArguments, read at the first start.
  let jobArgs = null;
  const runJob = () => {
    jobArgs ??= [...read(plist).match(/<key>ProgramArguments<\/key><array>(.*?)<\/array>/)[1].matchAll(/<string>(.*?)<\/string>/g)].map((m) => m[1]);
    return spawnSync(jobArgs[0], jobArgs.slice(1), { env, encoding: "utf8" });
  };
  return {
    run, runJob, plist, read,
    calls: () => (read(path.join(standin, "calls")) ?? "").trim().split("\n"),
    anchor: () => read(path.join(standin, "anchor.rules")),
    installed: (f = "base") => read(path.join(cluster, `pf-${f}.conf`)),
    pending: () => fs.existsSync(path.join(cluster, "pf-apply/pending")),
    log: () => read(path.join(cluster, "pf-apply.log")) ?? "",
    standin, cluster, home,
  };
}

test("the apply checks the new rules, arms the undo job, then loads the rules, and keeps the installed file old", () => {
  const s = setup();
  const r = s.run([], { SSH_CONNECTION: "100.100.1.2 50000 100.100.9.9 22" });
  assert.equal(r.status, 0, r.stderr);
  const calls = s.calls();
  const check = calls.findIndex((c) => /^pfctl -n -a agentguard -f .*new-base\.conf$/.test(c));
  const arm = calls.findIndex((c) => /^launchctl bootstrap system .*io\.recursica\.pf-apply-undo\.plist$/.test(c));
  const load = calls.findIndex((c) => /^pfctl -a agentguard -f .*pf-apply\/new-base\.conf$/.test(c));
  assert.ok(check >= 0 && arm > check && load > arm, `the syntax check, then the undo job, then the load:\n${calls.join("\n")}`);
  assert.equal(s.anchor(), rendered("base"), "the anchor holds the new rules, rendered as install-cluster.sh renders them");
  assert.match(s.anchor(), /^pass in quick inet from 100\.64\.0\.0\/10$/m);
  assert.match(s.anchor(), /^block in quick proto \{ tcp udp \} to port \{ 21118 21119 \}$/m, "remote_access.direct_ip false, from site.json");
  assert.equal(s.installed(), OLD_BASE, "a restart before --confirm loads the old rules");
  assert.equal(s.installed("lockdown"), OLD_LOCKDOWN);
  assert.ok(!calls.some((c) => / -[tT] /.test(c)), "no table command: a load keeps the blocked and allowed addresses");
  assert.ok(s.pending());
  assert.match(s.read(s.plist), /<string>\/bin\/bash<\/string><string>[^<]*pf-apply-undo\.sh<\/string><string>--timer<\/string>/);
  assert.match(s.read(s.plist), /<key>KeepAlive<\/key><dict><key>SuccessfulExit<\/key><false\/><\/dict>/);
  assert.match(r.stdout, /^Checked the new base and lockdown rules with pfctl -n: both parse\.$/m);
  assert.match(r.stdout, /^Armed the undo: the launchd job io\.recursica\.pf-apply-undo puts the old rules back at \d\d:\d\d\.$/m);
  assert.match(r.stdout, /^Loaded the new rules into the agentguard anchor\. The installed rules stay the old ones until --confirm\.$/m);
  assert.match(r.stdout, /^Next: open a NEW RustDesk or SSH session over Tailscale, and in that session run: sudo .*pf-apply-tailnet\.sh --confirm$/m);
  assert.match(s.log(), /Loaded the new rules into the agentguard anchor/);

  const again = s.run();
  assert.equal(again.status, 1);
  assert.match(again.stderr, /^An apply is pending since /);
});

// site.json comes from the owner's stack folder, as install-cluster.sh finds it: ~/recursica-stack,
// or ~/circlechat on a computer a person has not moved yet. --site names another file.
test("the apply reads site.json from ~/recursica-stack, or from ~/circlechat before the move", () => {
  const direct = /^block in quick proto \{ tcp udp \} to port \{ 21118 21119 \}$/m;
  const both = setup({ stacks: { "recursica-stack": { remote_access: { direct_ip: false } }, circlechat: {} } });
  const r = both.run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`^Rendered the new rules from .* with ${path.join(both.home, "recursica-stack/site.json").replaceAll(".", "\\.")}\\.$`, "m"));
  assert.match(both.anchor(), direct, "~/recursica-stack's site.json, not ~/circlechat's");

  const old = setup({ stacks: { circlechat: { remote_access: { direct_ip: false } } } });
  const o = old.run();
  assert.equal(o.status, 0, o.stderr);
  assert.match(o.stdout, new RegExp(`^Rendered the new rules from .* with ${path.join(old.home, "circlechat/site.json").replaceAll(".", "\\.")}\\.$`, "m"));
  assert.match(old.anchor(), direct);

  const other = setup({ stacks: { "recursica-stack": { remote_access: { direct_ip: false } } } });
  const site = path.join(other.home, "elsewhere.json");
  fs.writeFileSync(site, JSON.stringify({}));
  const s = other.run(["--site", site]);
  assert.equal(s.status, 0, s.stderr);
  assert.match(s.stdout, /^Rendered the new rules from .* with .*\/elsewhere\.json\.$/m);
  assert.doesNotMatch(other.anchor(), direct, "--site wins over the stack's folder");

  const none = setup({ stacks: {} });
  const n = none.run();
  assert.equal(n.status, 1);
  assert.match(n.stderr, /^No site\.json at .*\/recursica-stack\/site\.json\. Pass the path: --site <site\.json>\.$/m);
});

test("rules that pfctl -n rejects load nothing and arm nothing", () => {
  const s = setup();
  fs.writeFileSync(path.join(s.standin, "reject"), "");
  const r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^pfctl rejects new-base\.conf, so nothing changed: .*syntax error/);
  assert.ok(!s.calls().some((c) => /^pfctl -a agentguard -f /.test(c) || /^launchctl bootstrap/.test(c)), s.calls().join("\n"));
  assert.equal(s.anchor(), OLD_BASE);
  assert.ok(!s.pending() && !fs.existsSync(s.plist));
});

test("with no --confirm, the undo job loads the old rules back and removes its plist", () => {
  const s = setup({ wait: 0 });
  assert.equal(s.run().status, 0);
  const j = s.runJob();
  assert.equal(j.status, 0, j.stderr);
  assert.equal(j.stdout, "", "the job writes to the log only");
  assert.equal(s.anchor(), OLD_BASE);
  assert.ok(!s.calls().some((c) => / -[tT] /.test(c)), "the undo touches no table");
  assert.equal(s.installed(), OLD_BASE);
  assert.ok(!s.pending() && !fs.existsSync(s.plist));
  assert.equal(fs.readFileSync(path.join(s.cluster, "pf-apply.last/old-base.conf"), "utf8"), OLD_BASE);
  assert.match(s.log(), /Undo \(no --confirm by \d\d:\d\d\): loaded the old rules, .*old-base\.conf, back into the agentguard anchor\./);
  assert.equal(s.runJob().status, 0, "a second start finds nothing pending");
});

test("the undo job leaves the anchor alone after the guard loads its lockdown rules", () => {
  const s = setup({ wait: 0 });
  assert.equal(s.run().status, 0);
  const lockdown = "block drop in log all\nblock drop out log all\n";
  fs.writeFileSync(path.join(s.standin, "anchor.rules"), lockdown);
  assert.equal(s.runJob().status, 0);
  assert.equal(s.anchor(), lockdown);
  assert.ok(!s.pending());
  assert.match(s.log(), /the agentguard anchor no longer holds the new rules, so the anchor stays as it is/);
});

test("--confirm refuses a session from outside Tailscale, and the session that ran the apply", () => {
  const s = setup();
  const applied = "100.100.1.2 50000 100.100.9.9 22";
  assert.equal(s.run([], { SSH_CONNECTION: applied }).status, 0);
  for (const client of ["192.0.2.5", "100.63.255.1", "100.128.0.1", "fd7a:115c:a1e1::5", "2001:db8::5"]) {
    const r = s.run(["--confirm"], { SSH_CONNECTION: `${client} 51000 192.0.2.10 22` });
    assert.equal(r.status, 1, client);
    assert.match(r.stderr, new RegExp(`^This session comes from ${client.replaceAll(".", "\\.")}, outside Tailscale`), client);
  }
  const same = s.run(["--confirm"], { SSH_CONNECTION: applied });
  assert.equal(same.status, 1);
  assert.match(same.stderr, /^This is the SSH session that ran the apply\./);
  assert.ok(s.pending());
  assert.equal(s.installed(), OLD_BASE);
  assert.ok(fs.existsSync(s.plist), "the undo stays armed");
});

test("--confirm from a new session over Tailscale cancels the undo and installs the new rules", () => {
  for (const client of ["100.101.102.103", "FD7A:115C:A1E0::1234"]) {
    const s = setup();
    assert.equal(s.run([], { SSH_CONNECTION: "100.100.1.2 50000 100.100.9.9 22" }).status, 0);
    const before = s.calls().length;
    const r = s.run(["--confirm"], { SSH_CONNECTION: `${client} 51000 100.100.9.9 22` });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(s.calls().slice(before).includes("launchctl bootout system/io.recursica.pf-apply-undo"));
    assert.ok(!fs.existsSync(s.plist));
    assert.equal(s.installed(), rendered("base"));
    assert.equal(s.installed("lockdown"), rendered("lockdown"));
    assert.equal(s.anchor(), rendered("base"));
    assert.ok(!s.pending());
    assert.match(r.stdout, new RegExp(`^This session comes from ${client}, a Tailscale address\\.$`, "m"));
    assert.match(r.stdout, /^Cancelled the undo job io\.recursica\.pf-apply-undo\.$/m);
    assert.match(r.stdout, /^Installed the new rules as .*pf-base\.conf and .*pf-lockdown\.conf\. The boot job loads the new base rules at each start-up\.$/m);
    assert.match(r.stdout, /^Confirmed\. The old rules stay in .*pf-apply\.last\/old-base\.conf\.$/m);
    assert.match(s.run(["--status"]).stdout, /^No apply is pending\.\nThe installed rules, .*, pass Tailscale from any utun number\.$/m);
  }
});

test("--confirm refuses once other rules replace the new rules", () => {
  const s = setup();
  assert.equal(s.run().status, 0);
  fs.writeFileSync(path.join(s.standin, "anchor.rules"), OLD_BASE);   // the guard's release loads the installed file
  const r = s.run(["--confirm"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^The agentguard anchor no longer holds the new rules/);
  assert.equal(s.installed(), OLD_BASE);
});

test("--undo loads the old rules back now and cancels the undo job", () => {
  const s = setup();
  assert.equal(s.run().status, 0);
  const st = s.run(["--status"]);
  assert.match(st.stdout, /^An apply is pending since .*The undo runs at \d\d:\d\d, in \d+ min \d+ s\.\nThe agentguard anchor holds the new rules\.\nThe undo job io\.recursica\.pf-apply-undo is loaded\./m);
  const before = s.calls().length;
  const r = s.run(["--undo"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(s.anchor(), OLD_BASE);
  assert.ok(s.calls().slice(before).includes("launchctl bootout system/io.recursica.pf-apply-undo"));
  assert.ok(!s.pending() && !fs.existsSync(s.plist));
  assert.match(r.stdout, /^Undo \(asked with --undo\): loaded the old rules/m);
  assert.equal(s.run(["--undo"]).status, 1, "nothing left to undo");
});

test("the apply refuses without root, during a lockdown, and with nothing to change", () => {
  const s = setup();
  const notRoot = s.run([], { STANDIN_UID: "501" });
  assert.equal(notRoot.status, 1);
  assert.match(notRoot.stderr, /^Run as root: sudo /);
  fs.writeFileSync(path.join(s.cluster, "lockdown.json"), JSON.stringify({ status: "watching" }, null, 2));
  assert.match(s.run().stderr, /^The guard has a lockdown open/);
  fs.writeFileSync(path.join(s.cluster, "lockdown.json"), JSON.stringify({ status: "normal" }, null, 2));
  fs.writeFileSync(path.join(s.standin, "anchor.rules"), "block drop in log all\nblock drop out log all\n");
  assert.match(s.run().stderr, /^The agentguard anchor holds the lockdown rules\./);
  assert.ok(!s.calls().some((c) => /^pfctl -a agentguard -f /.test(c)));
  fs.writeFileSync(path.join(s.standin, "anchor.rules"), OLD_BASE);
  fs.writeFileSync(path.join(s.cluster, "pf-base.conf"), rendered("base"));
  fs.writeFileSync(path.join(s.cluster, "pf-lockdown.conf"), rendered("lockdown"));
  const none = s.run();
  assert.equal(none.status, 0, none.stderr);
  assert.match(none.stdout, /^The installed rules are the new rules already\. Nothing to apply\.$/m);
  assert.ok(!s.pending());
});
