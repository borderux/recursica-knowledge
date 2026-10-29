// The Mac's Colima and Ollama services (kit/lib.sh mac_services, kit/colima-service.sh), and the
// update job's rerun of the secrets helper as root. Run with stand-ins for colima, brew, docker,
// sudo and id.
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
  const env = { ...process.env, HOME: dir, PATH: `${bin}:/usr/bin:/bin` };
  return { dir, bin, log, units, stub, env, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "") };
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
  assert.deepEqual(s.calls().trim().split("\n"), ["colima status --profile default", "colima start -f --profile default", "colima stop --profile default"]);
  assert.throws(() => process.kill(Number(fs.readFileSync(pidFile, "utf8")), 0), /ESRCH/, "colima start -f has ended");
});

test("Colima's service stops a VM that was started another way, then runs the VM itself", async () => {
  const s = sandbox();
  s.stub("colima", `case "$1" in status) exit 0 ;; start) exit 0 ;; esac; exit 0`);
  const r = spawnSync("bash", [path.join(here, "colima-service.sh"), "work"], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.deepEqual(s.calls().trim().split("\n"), ["colima status --profile work", "colima stop --profile work", "colima start -f --profile work"]);
});

test("on a Mac, Colima and Ollama run as LaunchDaemons as the owner, and Homebrew's LaunchAgents stop", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew", `[ "$1 $2" = "services list" ] && printf 'Name   Status  User  File\\ncolima started owner ~/Library/LaunchAgents/homebrew.mxcl.colima.plist\\nollama started owner ~/Library/LaunchAgents/homebrew.mxcl.ollama.plist\\n'; exit 0`);
  s.stub("colima"); s.stub("ollama"); s.stub("docker");
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; [ "$1" = launchctl ] && [ "$2" = print ] && exit 1; exit 0`);
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services default 11500`], { env: s.env, encoding: "utf8" });
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
  assert.match(ollama, new RegExp(`HOME=${s.dir} OLLAMA_HOST=127\\.0\\.0\\.1:11500 exec ${s.bin}/ollama serve`));
  assert.match(calls, /sudo launchctl bootstrap system \/Library\/LaunchDaemons\/io\.recursica\.colima\.plist/);
  assert.match(calls, /sudo launchctl bootstrap system \/Library\/LaunchDaemons\/io\.recursica\.ollama\.plist/);
});

test("on a Mac, an unchanged Colima service keeps running when the setup runs again", () => {
  const s = sandbox();
  s.stub("uname", `echo Darwin`);
  s.stub("brew"); s.stub("colima"); s.stub("docker");
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; if [ "$1" = cat ]; then cat "${s.units}/$(basename "$2")" 2>/dev/null; exit; fi; exit 0`);
  const run = () => spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services default ""`], { env: s.env, encoding: "utf8" });
  assert.equal(run().status, 0);
  fs.writeFileSync(s.log, "");
  const again = run();
  assert.equal(again.status, 0);
  assert.match(again.stdout, /colima is running and unchanged/);
  assert.doesNotMatch(s.calls(), /launchctl bootout|brew services stop|ollama/);
});

test("Linux gets no Mac services", () => {
  const s = sandbox();
  s.stub("uname", `echo Linux`); s.stub("sudo");
  const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"; mac_services default 11434`], { env: s.env, encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(s.calls(), "uname -s\n");
});

test("the update job reruns the secrets helper as root, for the owner and the runner the first run recorded", () => {
  const s = sandbox();
  const conf = path.join(s.dir, "agent-stacks.conf");
  fs.writeFileSync(conf, "OWNER=owner\nOWNER_HOME=/Users/owner\nKIT=/old/kit\nNODE_BIN=/opt/homebrew/bin/node\n");
  s.stub("id", `[ "$1" = -un ] && { echo root; exit 0; }; exit 0`);
  s.stub("sudo", `if [ "$1" = tee ]; then cat > "${s.units}/$(basename "$2")"; exit 0; fi; exit 0`);
  const r = spawnSync("bash", [path.join(here, "../deploy/install-secrets-helper.sh"), "gh-runner"], { env: { ...s.env, AGENT_STACKS_CONF: conf }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const kit = path.resolve(here, "../..");
  assert.equal(fs.readFileSync(path.join(s.units, "agent-stacks.conf"), "utf8"),
    `OWNER=owner\nOWNER_HOME=/Users/owner\nRUNNER=gh-runner\nKIT=${kit}\nNODE_BIN=/opt/homebrew/bin/node\n`);
  assert.match(s.calls(), new RegExp(`sudo install -m 755 -o root ${kit}/circlechat/deploy/apply-secrets.sh /usr/local/bin/agent-stacks-apply`));
  // As root with no first run on record, the script still refuses.
  fs.rmSync(conf);
  const fresh = spawnSync("bash", [path.join(here, "../deploy/install-secrets-helper.sh"), "gh-runner"], { env: { ...s.env, AGENT_STACKS_CONF: conf }, encoding: "utf8" });
  assert.equal(fresh.status, 1);
  assert.match(fresh.stdout, /not as root/);
});
