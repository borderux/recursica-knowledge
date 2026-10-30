// The Mac's Colima and Ollama services (kit/lib.sh mac_services, kit/colima-service.sh), the check
// for a LaunchDaemon outside the kit, the root jobs' HOME, and the update job's rerun of the secrets
// helper as root. Run with stand-ins for colima, brew, docker, sudo, plutil and id.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mac-services-"));
  const bin = path.join(dir, "bin"), log = path.join(dir, "calls.log"), units = path.join(dir, "units");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body = "") => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  // The Colima service checks the VM every 0.2 seconds, and gives colima start -f 1 second to end.
  const env = { ...process.env, HOME: dir, PATH: `${bin}:/usr/bin:/bin`, COLIMA_SERVICE_POLL: "0.2", COLIMA_SERVICE_GRACE: "1" };
  return { dir, bin, log, units, stub, env, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "") };
}

// launchd's pid for the kit's Colima service, and ps, which lists the pid's child processes. For the
// first `stopping` calls of ps, the service's child is colima stop, as when the service stops a VM
// started by hand. After those calls, the child is the service's own colima start. A colima start
// of another process is listed on every call.
function colimaService(s, { stopping = 0 } = {}) {
  const n = path.join(s.dir, "ps.count");
  s.stub("launchctl", `[ "$1 $2" = "print system/io.recursica.colima" ] || exit 1; printf 'system/io.recursica.colima = {\\n\\tactive count = 1\\n\\tpid = 4242\\n}\\n'`);
  s.stub("ps", `c=$(( $(cat "${n}" 2>/dev/null || echo 0) + 1 )); echo $c > "${n}"; echo "999 /opt/homebrew/bin/colima start -f --profile default"; if [ $c -le ${stopping} ]; then echo "4242 /opt/homebrew/bin/colima stop --profile default"; else echo "4242 /opt/homebrew/bin/colima start -f --profile default"; fi`);
}

test("Colima's service stops the VM on SIGTERM, then ends colima start -f, so the service exits", async () => {
  const s = sandbox();
  // colima start -f keeps running after the VM stops, as the real command does.
  const pidFile = path.join(s.dir, "start.pid");
  s.stub("colima", `case "$1" in status) exit 1 ;; start) echo $$ > "${pidFile}"; exec sleep 60 ;; esac; exit 0`);
  const child = spawn("bash", [path.join(here, "colima-service.sh"), "default"], { env: s.env, stdio: "ignore" });
  for (let i = 0; i < 50 && !s.calls().includes("colima start"); i++) await new Promise((r) => setTimeout(r, 100));
  const started = Date.now();
  child.kill("SIGTERM");
  const code = await new Promise((r) => child.on("exit", r));
  assert.equal(code, 0);
  assert.ok(Date.now() - started < 5000, "the service exits at once, without waiting for colima start -f");
  const calls = s.calls().trim().split("\n");
  assert.equal(calls[0], "colima status --profile default");
  assert.ok(calls.includes("colima start -f --profile default"));
  assert.equal(calls.at(-1), "colima stop --profile default");
  assert.equal(calls.filter((c) => c.startsWith("colima stop")).length, 1, "the VM was not running, and stops once, on SIGTERM");
  assert.throws(() => process.kill(Number(fs.readFileSync(pidFile, "utf8")), 0), /ESRCH/, "colima start -f has ended");
});

test("Colima's service ends when the VM stops another way, though colima start -f keeps running", async () => {
  const s = sandbox();
  // The first check finds no VM, so nothing stops before the start. The VM then runs for two
  // checks and stops, such as after colima stop by hand.
  const n = path.join(s.dir, "status.count");
  s.stub("colima", `case "$1" in status) c=$(( $(cat "${n}" 2>/dev/null || echo 0) + 1 )); echo $c > "${n}"; [ $c -ge 2 ] && [ $c -le 3 ] ;; start) echo $$ > "${path.join(s.dir, "start.pid")}"; exec sleep 60 ;; esac`);
  const started = Date.now();
  const child = spawn("bash", [path.join(here, "colima-service.sh"), "default"], { env: s.env, stdio: ["ignore", "pipe", "ignore"] });
  let out = ""; child.stdout.on("data", (d) => { out += d; });
  const code = await new Promise((r) => child.on("exit", r));
  assert.equal(code, 1, "launchd starts the service again");
  assert.ok(Date.now() - started < 10_000, "the service ends within a few checks");
  assert.match(out, /Colima's VM default stopped/);
  assert.doesNotMatch(s.calls(), /colima stop/, "the VM had already stopped");
  assert.throws(() => process.kill(Number(fs.readFileSync(path.join(s.dir, "start.pid"), "utf8")), 0), /ESRCH/, "colima start -f has ended");
});

test("Colima's service ends on SIGTERM even when colima start -f ignores SIGTERM", async () => {
  const s = sandbox();
  const pidFile = path.join(s.dir, "start.pid");
  s.stub("colima", `case "$1" in status) exit 1 ;; start) echo $$ > "${pidFile}"; trap '' TERM; while :; do sleep 0.1; done ;; esac; exit 0`);
  const child = spawn("bash", [path.join(here, "colima-service.sh"), "default"], { env: s.env, stdio: "ignore" });
  for (let i = 0; i < 50 && !fs.existsSync(pidFile); i++) await new Promise((r) => setTimeout(r, 100));
  const started = Date.now();
  child.kill("SIGTERM");
  const code = await new Promise((r) => child.on("exit", r));
  assert.equal(code, 0);
  assert.ok(Date.now() - started < 5000, "the service waits COLIMA_SERVICE_GRACE, then ends colima start -f with SIGKILL");
  assert.match(s.calls(), /colima stop --profile default/);
  assert.throws(() => process.kill(Number(fs.readFileSync(pidFile, "utf8")), 0), /ESRCH/, "colima start -f has ended");
});

test("Colima's service stops a VM that was started another way, then runs the VM itself", async () => {
  const s = sandbox();
  s.stub("colima", `case "$1" in status) exit 0 ;; start) exit 0 ;; esac; exit 0`);
  const r = spawnSync("bash", [path.join(here, "colima-service.sh"), "work"], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0);
  // The service's own checks of the VM can come before or after the start's line in the log.
  const calls = s.calls().trim().split("\n");
  assert.deepEqual(calls.slice(0, 2), ["colima status --profile work", "colima stop --profile work"]);
  assert.ok(calls.includes("colima start -f --profile work"));
  assert.equal(calls.filter((c) => c.startsWith("colima stop")).length, 1);
});

test("on a Mac, Colima and Ollama run as LaunchDaemons as the owner, and Homebrew's LaunchAgents stop", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew", `[ "$1 $2" = "services list" ] && printf 'Name   Status  User  File\\ncolima started owner ~/Library/LaunchAgents/homebrew.mxcl.colima.plist\\nollama started owner ~/Library/LaunchAgents/homebrew.mxcl.ollama.plist\\n'; exit 0`);
  s.stub("colima"); s.stub("ollama"); s.stub("docker");
  colimaService(s);
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; [ "$1" = launchctl ] && [ "$2" = print ] && exit 1; exit 0`);
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services default 11500 OLLAMA_CONTEXT_LENGTH=131072 OLLAMA_NUM_PARALLEL=4 OLLAMA_KEEP_ALIVE=-1`], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = s.calls();
  assert.ok(calls.indexOf("colima stop --profile default") < calls.indexOf("brew services stop colima"), "the VM stops cleanly before Homebrew's service ends");
  assert.match(calls, /brew services stop ollama/);
  const me = os.userInfo().username;
  const colima = fs.readFileSync(path.join(s.units, "io.recursica.colima.plist"), "utf8");
  assert.match(colima, new RegExp(`<key>UserName</key><string>${me}</string>`));
  assert.match(colima, new RegExp(`HOME=${s.dir} PATH=${s.bin}:/usr/bin:/bin:/usr/sbin:/sbin exec ${here}/colima-service.sh default`));
  assert.match(colima, /<key>KeepAlive<\/key><true\/><key>ExitTimeOut<\/key><integer>150<\/integer>/);
  const ollama = fs.readFileSync(path.join(s.units, "io.recursica.ollama.plist"), "utf8");
  assert.match(ollama, new RegExp(`<key>UserName</key><string>${me}</string>`));
  assert.match(ollama, new RegExp(`HOME=${s.dir} OLLAMA_HOST=127\\.0\\.0\\.1:11500 OLLAMA_CONTEXT_LENGTH=131072 OLLAMA_NUM_PARALLEL=4 OLLAMA_KEEP_ALIVE=-1 exec ${s.bin}/ollama serve`));
  assert.doesNotMatch(ollama, /EnvironmentVariables/, "a job that runs as the owner sets HOME itself");
  assert.match(calls, /sudo launchctl bootstrap system \/Library\/LaunchDaemons\/io\.recursica\.colima\.plist/);
  assert.match(calls, /sudo launchctl bootstrap system \/Library\/LaunchDaemons\/io\.recursica\.ollama\.plist/);
});

test("on a Mac, an unchanged Colima service keeps running when the setup runs again", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew"); s.stub("colima"); s.stub("docker");
  colimaService(s);
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; if [ "$1" = cat ]; then cat "${s.units}/$(basename "$2")" 2>/dev/null; exit; fi; exit 0`);
  const run = () => spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services default ""`], { env: s.env, encoding: "utf8" });
  assert.equal(run().status, 0);
  fs.writeFileSync(s.log, "");
  const again = run();
  assert.equal(again.status, 0);
  assert.match(again.stdout, /colima is running and unchanged/);
  assert.doesNotMatch(s.calls(), /launchctl bootout|brew services stop|ollama/);
});

test("on a Mac, the Colima profile comes from the Docker context, or from ~/.colima while the VM is stopped", () => {
  const s = sandbox();
  const daemonsDir = path.join(s.dir, "LaunchDaemons");
  const profile = (context, { answers = false } = {}) => {
    s.stub("docker", `[ "$1 $2" = "context show" ] && { echo ${context}; exit 0; }; [ "$1" = info ] && exit ${answers ? 0 : 1}; exit 0`);
    return spawnSync("bash", ["-c", `. "${here}/lib.sh"; colima_profile`], { env: { ...s.env, COLIMA_HOME: "", LAUNCH_DAEMONS_DIR: daemonsDir }, encoding: "utf8" });
  };
  assert.equal(profile("colima").stdout, "default\n");
  assert.equal(profile("colima-work").stdout, "work\n");
  assert.equal(profile("default").stdout, "", "no Colima VM, and no Docker");
  // A stopped VM has no Docker context, and Docker answers on no other context. Colima's own
  // folders, such as _lima and _store, start with an underscore.
  for (const d of ["default", "_store", "_templates"]) fs.mkdirSync(path.join(s.dir, ".colima", d), { recursive: true });
  for (const d of ["default", "_store"]) fs.writeFileSync(path.join(s.dir, ".colima", d, "colima.yaml"), "cpu: 4\n");
  const stopped = profile("default");
  assert.equal(stopped.status, 0, stopped.stderr);
  assert.equal(stopped.stdout, "default\n");
  assert.equal(profile("orbstack", { answers: true }).stdout, "", "Docker that answers on another context, such as OrbStack, is not Colima");
  // Two stopped profiles: the profile the kit's Colima service runs, or none and a message.
  fs.mkdirSync(path.join(s.dir, ".colima/work"));
  fs.writeFileSync(path.join(s.dir, ".colima/work/colima.yaml"), "cpu: 2\n");
  const two = profile("default");
  assert.equal(two.status, 1);
  assert.equal(two.stdout, "");
  assert.match(two.stderr, /Colima has the profiles default work in .*every VM is stopped.*colima start --profile <profile>/);
  fs.mkdirSync(daemonsDir);
  fs.writeFileSync(path.join(daemonsDir, "io.recursica.colima.plist"), `<string>HOME=${s.dir} PATH=/usr/bin:/bin exec /kit/colima-service.sh work</string>\n`);
  assert.equal(profile("default").stdout, "work\n");
});

test("on a Mac, the setup waits for the VM of the kit's Colima service, not for a VM the service is about to stop", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew"); s.stub("colima"); s.stub("sleep");
  // A VM started by hand answers the whole time. The service stops that VM during the first two
  // checks, then runs its own colima start.
  s.stub("docker");
  colimaService(s, { stopping: 2 });
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; [ "$1" = launchctl ] && [ "$2" = print ] && exit 1; exit 0`);
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services work ""`], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const calls = s.calls().trim().split("\n");
  assert.ok(calls.findIndex((c) => c.startsWith("sudo launchctl bootstrap system ")) < calls.findIndex((c) => c.startsWith("docker ")), "the wait starts after the service is installed");
  assert.equal(calls.filter((c) => c.startsWith("ps ")).length, 3);
  assert.equal(calls.filter((c) => c.startsWith("sleep ")).length, 2);
  assert.deepEqual(calls.filter((c) => c.startsWith("docker ")), ["docker --context colima-work info"], "Docker is asked only once the service's own colima start runs, on the VM's own context");
});

test("on a Mac, the setup stops when the kit's Colima service never runs its own VM", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew"); s.stub("colima"); s.stub("sleep"); s.stub("docker");
  colimaService(s, { stopping: 1000 });
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; [ "$1" = launchctl ] && [ "$2" = print ] && exit 1; exit 0`);
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services default ""`], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Colima's VM default did not start\. Read \/tmp\/colima\.log\./);
  assert.doesNotMatch(s.calls(), /^docker /m, "a VM outside the service never counts as started");
});

test("on a Mac, the kit's Ollama service runs with Ollama's defaults when site.json sets nothing", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew"); s.stub("ollama");
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; [ "$1" = launchctl ] && [ "$2" = print ] && exit 1; exit 0`);
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services "" 11434`], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(path.join(s.units, "io.recursica.ollama.plist"), "utf8"), new RegExp(`OLLAMA_HOST=127\\.0\\.0\\.1:11434 exec ${s.bin}/ollama serve`));
});

// LaunchDaemons for the check, each a plain-text stand-in that the plutil stand-in reads.
function daemons(s, list) {
  const dir = path.join(s.dir, "LaunchDaemons");
  fs.mkdirSync(dir, { recursive: true });
  for (const [label, args] of list) fs.writeFileSync(path.join(dir, `${label}.plist`), `Label=${label}\nProgramArguments=${JSON.stringify(args)}\n`);
  s.stub("plutil", `f="\${@: -1}"; sed -n "s/^$2=//p" "$f" | grep . || exit 1`);
  return dir;
}

test("on a Mac, a LaunchDaemon outside the kit that runs Colima or Ollama stops the setup, and the message names the commands to retire it", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("sudo"); s.stub("brew"); s.stub("colima"); s.stub("ollama");
  const dir = daemons(s, [
    ["local.colima", ["/bin/bash", "-c", "colima start -f & wait"]],
    ["local.ollama", ["/opt/homebrew/opt/ollama/bin/ollama", "serve"]],
    ["io.recursica.colima", ["/bin/bash", "-lc", "exec colima-service.sh default"]],
    ["com.example.other", ["/usr/local/bin/other"]],
  ]);
  const check = (args) => spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services_check ${args}`], { env: { ...s.env, LAUNCH_DAEMONS_DIR: dir }, encoding: "utf8" });
  const r = check("default 11434");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /setup-host\.sh changed nothing/);
  assert.match(r.stdout, new RegExp(`colima: sudo launchctl bootout system/local\\.colima && sudo rm ${dir}/local\\.colima\\.plist`));
  assert.match(r.stdout, new RegExp(`ollama: sudo launchctl bootout system/local\\.ollama && sudo rm ${dir}/local\\.ollama\\.plist`));
  assert.doesNotMatch(r.stdout, /io\.recursica\.colima &&|com\.example\.other/, "the kit's own daemons and other daemons pass");
  assert.doesNotMatch(s.calls(), /^(sudo|brew|colima|ollama) /m, "the check changes nothing");
  // Only the services the kit installs are checked: no Ollama server, or no Colima VM.
  assert.doesNotMatch(check(`default ""`).stdout, /local\.ollama/);
  assert.doesNotMatch(check(`"" 11434`).stdout, /local\.colima/);
  fs.rmSync(path.join(dir, "local.colima.plist")); fs.rmSync(path.join(dir, "local.ollama.plist"));
  assert.equal(check("default 11434").status, 0, "with only the kit's daemons, the setup goes on");
});

test("on a Mac, each root job gets HOME, so restic in the backup finds a cache folder", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; exit 0`);
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"
    install_unit backup "backup.sh" /cc root "*-*-* 02:00"
    install_unit restore-test "restore-test.sh" /cc root "*-*-01 04:30"
    install_unit cluster-updater "updater.mjs" / root hourly
    install_unit release-watch "release-watch.mjs" /cc owner hourly`], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const name of ["backup", "restore-test", "cluster-updater"]) {
    assert.match(fs.readFileSync(path.join(s.units, `io.recursica.${name}.plist`), "utf8"), /<key>EnvironmentVariables<\/key><dict><key>HOME<\/key><string>\/var\/root<\/string><\/dict>/, name);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(s.units, "io.recursica.release-watch.plist"), "utf8"), /EnvironmentVariables/);
});

test("Linux gets no Mac services", () => {
  const s = sandbox();
  s.stub("uname", `echo Linux`); s.stub("sudo");
  for (const f of ["mac_services default 11434", "mac_services_check default 11434"]) {
    fs.writeFileSync(s.log, "");
    const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; ${f}`], { env: s.env, encoding: "utf8" });
    assert.equal(r.status, 0, f);
    assert.equal(s.calls(), "uname -s\n", f);
  }
});

test("the update job reruns the secrets helper as root, for the owner and the runner the first run recorded", () => {
  const s = sandbox();
  const conf = path.join(s.dir, "agent-stacks.conf");
  // The kit check reads the real owner of this checkout.
  const me = os.userInfo().username;
  fs.writeFileSync(conf, `OWNER=${me}\nOWNER_HOME=/Users/owner\nKIT=/old/kit\nNODE_BIN=/opt/homebrew/bin/node\n`);
  s.stub("id", `[ "$1" = -un ] && { echo root; exit 0; }; exit 0`);
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; exit 0`);
  const r = spawnSync("bash", [path.join(here, "../deploy/install-secrets-helper.sh"), "gh-runner"], { env: { ...s.env, AGENT_STACKS_CONF: conf }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const kit = path.resolve(here, "../..");
  assert.equal(fs.readFileSync(path.join(s.units, "agent-stacks.conf"), "utf8"),
    `OWNER=${me}\nOWNER_HOME=/Users/owner\nRUNNER=gh-runner\nKIT=${kit}\nNODE_BIN=/opt/homebrew/bin/node\n`);
  assert.match(s.calls(), new RegExp(`sudo install -m 755 -o root ${kit}/circlechat/deploy/apply-secrets.sh /usr/local/bin/agent-stacks-apply`));
  // As root with no first run on record, the script still refuses.
  fs.rmSync(conf);
  const fresh = spawnSync("bash", [path.join(here, "../deploy/install-secrets-helper.sh"), "gh-runner"], { env: { ...s.env, AGENT_STACKS_CONF: conf }, encoding: "utf8" });
  assert.equal(fresh.status, 1);
  assert.match(fresh.stdout, /not as root/);
});
