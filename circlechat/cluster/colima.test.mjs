import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseColimaList, stopColimaVms, STOP_WAIT_MS } from "./colima.mjs";
import { afterBrewUpgrade, installHeld } from "./updates.mjs";

// A Mac with the cluster's VM, one unlocked client stack's VM, and Colima's LaunchDaemon. Each VM
// shows as stopped one listing after colima stop.
function mac({ stops = true } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "colima-"));
  const daemons = path.join(home, "LaunchDaemons");
  for (const d of [".colima", "tenants/acme/colima", "tenants/locked", "LaunchDaemons"]) fs.mkdirSync(path.join(home, d), { recursive: true });
  fs.writeFileSync(path.join(daemons, "io.recursica.colima.plist"), "");
  fs.writeFileSync(path.join(daemons, "io.recursica.jobd.plist"), "");
  const vms = { [path.join(home, ".colima")]: { default: "Running" }, [path.join(home, "tenants/acme/colima")]: { acme: "Running" } };
  const calls = [], stopping = new Set();
  const run = async (cmd, args) => {
    calls.push([cmd, ...args].join(" "));
    const colimaHome = (args.find((a) => a.startsWith("COLIMA_HOME=")) ?? "").slice(12);
    const i = args.indexOf("colima");
    if (i < 0) return "";
    const [verb, , profile] = args.slice(i + 1);
    if (verb === "stop") stopping.add(`${colimaHome}/${profile}`);
    if (verb !== "list") return "";
    const out = Object.entries(vms[colimaHome] ?? {}).map(([name, status]) => JSON.stringify({ name, status, arch: "aarch64" }));
    for (const name of Object.keys(vms[colimaHome] ?? {})) if (stops && stopping.has(`${colimaHome}/${name}`)) vms[colimaHome][name] = "Stopped";
    return out.join("\n") + "\n";
  };
  let clock = 0;
  const opts = { owner: "owner", ownerHome: home, run, daemonDir: daemons, envPath: "/opt/homebrew/bin:/usr/bin", now: () => clock, sleep: async (ms) => { clock += ms; } };
  return { home, calls, opts, elapsed: () => clock };
}

test("reads colima list --json, one VM per line", () => {
  assert.deepEqual(parseColimaList('{"name":"default","status":"Running"}\n{"name":"acme","status":"Stopped"}\nnot json\n'),
    [{ name: "default", status: "Running" }, { name: "acme", status: "Stopped" }]);
});

test("before a Mac restart: Colima's LaunchDaemon is booted out, then each VM stops, and the restart waits for colima list", async () => {
  const m = mac();
  const r = await stopColimaVms(m.opts);
  assert.deepEqual(r.running, []);
  const daemon = m.calls.indexOf(`launchctl bootout system ${path.join(m.home, "LaunchDaemons/io.recursica.colima.plist")}`);
  assert.equal(daemon, 0, "the daemon goes first, so launchd never starts the VM again");
  assert.ok(!m.calls.some((c) => c.includes("io.recursica.jobd")), "other services stay");
  const owner = "sudo -u owner -H env PATH=/opt/homebrew/bin:/usr/bin";
  assert.ok(m.calls.includes(`${owner} COLIMA_HOME=${m.home}/.colima colima stop --profile default`));
  assert.ok(m.calls.includes(`${owner} COLIMA_HOME=${m.home}/tenants/acme/colima colima stop --profile acme`), "an unlocked client stack's VM stops too");
  assert.ok(!m.calls.some((c) => c.includes("tenants/locked")), "a locked stack has no Colima folder to read");
  assert.ok(m.calls.lastIndexOf(`${owner} COLIMA_HOME=${m.home}/.colima colima list --json`) > m.calls.indexOf(`${owner} COLIMA_HOME=${m.home}/.colima colima stop --profile default`));
});

test("a VM that never stops holds the restart for 2 minutes, no longer", async () => {
  const m = mac({ stops: false });
  const r = await stopColimaVms(m.opts);
  assert.deepEqual(r.running.map((v) => v.name), ["default", "acme"]);
  assert.equal(m.elapsed(), STOP_WAIT_MS);
});

test("installHeld stops each Colima VM on a Mac, and on Linux runs no colima command", async () => {
  for (const isMac of [true, false]) {
    const m = mac();
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "held-"));
    await installHeld({ stateDir, mac: isMac, run: m.opts.run, env: { OWNER: "owner", OWNER_HOME: m.home, PATH: "/usr/bin" } });
    assert.equal(m.calls.some((c) => c.endsWith("colima stop --profile default")), isMac, `mac: ${isMac}`);
    assert.equal(m.calls.some((c) => c.endsWith("colima stop --profile acme")), isMac, `mac: ${isMac}`);
    assert.equal(fs.readFileSync(path.join(stateDir, "updates-held.json"), "utf8"), "[]");
  }
});

test("after Homebrew upgrades tailscale, the daemon's copy comes from the new Homebrew binary", async () => {
  const calls = [];
  const run = async (cmd, args) => { calls.push([cmd, ...args].join(" ")); return args.includes("--prefix") ? "/opt/homebrew/opt/tailscale\n" : ""; };
  await afterBrewUpgrade(["git", "tailscale"], { owner: "owner", run });
  assert.deepEqual(calls, ["sudo -u owner -H brew --prefix tailscale", "/opt/homebrew/opt/tailscale/bin/tailscaled install-system-daemon"]);
  calls.length = 0;
  await afterBrewUpgrade(["git"], { owner: "owner", run });
  assert.deepEqual(calls, []);
});

test("after Homebrew upgrades ollama, the kit's Ollama service restarts on the new version", async () => {
  const calls = [];
  const run = async (cmd, args) => { calls.push([cmd, ...args].join(" ")); return ""; };
  const daemonDir = fs.mkdtempSync(path.join(os.tmpdir(), "daemons-"));
  // Without the kit's Ollama service, such as on a computer with no Ollama server, nothing restarts.
  await afterBrewUpgrade(["ollama"], { owner: "owner", run, daemonDir });
  assert.deepEqual(calls, []);
  fs.writeFileSync(path.join(daemonDir, "io.recursica.ollama.plist"), "");
  await afterBrewUpgrade(["git", "ollama"], { owner: "owner", run, daemonDir });
  assert.deepEqual(calls, ["launchctl kickstart -k system/io.recursica.ollama"]);
  calls.length = 0;
  await afterBrewUpgrade(["git", "colima"], { owner: "owner", run, daemonDir });
  assert.deepEqual(calls, [], "another upgrade restarts nothing");
});
