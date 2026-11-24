// The kit services that run old code, and the update job's restarts (restarts.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KIT_SERVICES, importClosure, instances, realRestartDeps, restartStep, staleServices, stackContainers } from "./restarts.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const kitRoot = path.join(here, "../..");
const readKit = (f) => { try { return fs.readFileSync(path.join(kitRoot, f), "utf8"); } catch { return null; } };
const STARTED = 1_000;

// The real kit's files, with one changed file: its change time is after every service started.
const world = (changed, over = {}) => ({
  read: readKit,
  mtime: (f) => (changed.includes(f) ? STARTED + 1 : STARTED - 1),
  started: (svc) => (over.started ? over.started(svc) : STARTED),
  copyDiffers: (svc) => (over.copyDiffers ? over.copyDiffers(svc) : false),
  head: () => "abcdef1234567890",
  restart: over.restart ?? (async () => ({ ok: true, output: "" })),
});
const one = [{ ccDir: "/home/owner/recursica-stack", tenant: "", suffix: "", context: "" }];
const ids = async (changed, over) => (await staleServices(instances(one), world(changed, over))).map((s) => s.id);

test("a service's code files are the entry and every file the entry imports by a relative path", () => {
  const files = { "a/main.mjs": 'import x from "./b.mjs";\nexport { y } from "../c/d.mjs";\nconst z = await import("./e.mjs");\nimport fs from "node:fs";\nimport p from "pkg";', "a/b.mjs": 'import "./main.mjs";', "c/d.mjs": "", "a/e.mjs": 'import q from "./missing.mjs";' };
  assert.deepEqual(importClosure("a/main.mjs", (f) => files[f] ?? null), ["a/b.mjs", "a/e.mjs", "a/main.mjs", "c/d.mjs"]);
  const agent = importClosure("circlechat/cluster/agent.mjs", readKit);
  assert.ok(agent.includes("circlechat/cluster/network.mjs"), "the cluster agent runs the network check");
  assert.ok(!agent.includes("circlechat/jobd/jobd.mjs"));
});

test("a changed file restarts only the service whose own code the file is", async () => {
  assert.deepEqual(await ids(["circlechat/cluster/network.mjs"]), ["cluster-agent"], "the network check is the cluster agent's code");
  assert.deepEqual(await ids(["circlechat/jobd/jobd.mjs"]), ["jobd"]);
  assert.deepEqual(await ids(["circlechat/github/token-service.mjs"]), ["github-tokens"]);
  assert.deepEqual(await ids(["circlechat/gateway/start-litellm.py"]), ["litellm"]);
  assert.deepEqual(await ids(["circlechat/recursicachat/run.sh", "circlechat/setup-node.sh", "skills/button/SKILL.md", "circlechat/cluster/updater.mjs"]), [],
    "RecursicaChat's files, a setup, a skill and the update job restart nothing");
  assert.deepEqual(await ids([]), [], "nothing changed: nothing restarts");
});

test("a service that isn't running, or has no known start time, is left alone, and kev-engine never restarts for a kit change", async () => {
  const changed = ["circlechat/cluster/network.mjs", "circlechat/gateway/start-litellm.py"];
  assert.deepEqual(await ids(changed, { started: (svc) => (svc.id === "cluster-agent" ? null : STARTED) }), ["litellm"]);
  assert.deepEqual(await ids(changed, { started: () => NaN }), []);
  assert.equal(KIT_SERVICES.find((s) => s.id === "kev-engine").files.length, 0, "kev-engine runs from the kev-engine's own checkout");
  assert.ok(!KIT_SERVICES.some((s) => /recursicachat|rc-|firewall|canary|ollama|updater/i.test(`${s.id} ${s.unit ?? ""} ${s.entry ?? ""}`)), "no RecursicaChat service, firewall, decoy, Ollama or the update job");
});

test("the model gateway restarts when the gateway's copy differs from the kit's files", async () => {
  assert.deepEqual(await ids([], { copyDiffers: (svc) => svc.id === "gateway" }), ["gateway"]);
  assert.deepEqual(instances([{ ccDir: "/s", tenant: "acme", suffix: "-acme" }]).filter((s) => s.container).map((s) => [s.id, s.container, s.label]),
    [["gateway-acme", "cc-gateway-acme", "the model gateway of stack acme"], ["litellm-acme", "cc-litellm-acme", "LiteLLM of stack acme"]]);
});

test("the light services restart at once, and the heavy ones wait until RecursicaChat is quiet, with one post that they wait", async () => {
  const restarted = [], posts = [], state = {};
  let quiet = false, t = 0;
  const deps = world(["circlechat/cluster/network.mjs", "circlechat/gateway/start-litellm.py"], {
    copyDiffers: (svc) => svc.id === "gateway",
    started: (svc) => (restarted.includes(svc.id) ? STARTED + 10 : STARTED),
    restart: async (svc) => { restarted.push(svc.id); return { ok: true, output: "" }; },
  });
  const run = () => restartStep({ computer: "studio", services: instances(one), deps, quiet: async () => ({ quiet, why: "1 agent message(s) queued or in a turn" }), post: async (x) => { posts.push(x); return { ok: true }; }, state, now: () => t });
  assert.deepEqual(await run(), ["the cluster agent"]);
  assert.deepEqual(restarted, ["cluster-agent"], "the heavy services wait");
  assert.deepEqual(posts, [
    ":hourglass: Kit on studio: the model gateway and LiteLLM wait to restart for abcdef1 until RecursicaChat is quiet, with no agent turn running or queued and no service run open. Now: 1 agent message(s) queued or in a turn.",
    ":arrows_counterclockwise: Kit on studio: restarted the cluster agent for abcdef1, so the cluster agent runs the kit's new code.",
  ]);
  t += 3600_000;
  assert.deepEqual(await run(), []);
  assert.equal(posts.length, 2, "an hour later, still busy: no second post");
  quiet = true; t += 3600_000;
  assert.deepEqual(await run(), ["the model gateway", "LiteLLM"]);
  assert.deepEqual(restarted, ["cluster-agent", "gateway", "litellm"]);
  assert.match(posts.at(-1), /^:arrows_counterclockwise: Kit on studio: restarted LiteLLM for abcdef1/);
  assert.equal(posts.length, 4, "one line for each restart");
});

test("a failed restart posts one line with the last lines of the output", async () => {
  const posts = [];
  const deps = world(["circlechat/jobd/jobd.mjs"], { restart: async () => ({ ok: false, output: "a\nb\nJob for jobd.service failed.\n" }) });
  assert.deepEqual(await restartStep({ computer: "pc", services: instances([]), deps, quiet: async () => ({ quiet: true }), post: async (x) => { posts.push(x); return { ok: true }; }, state: {} }), []);
  assert.deepEqual(posts, [":x: Kit on pc: the restart of jobd for abcdef1 failed. a b Job for jobd.service failed."]);
});

// realRestartDeps, with stand-ins for the commands and a kit checkout in a temp folder.
function realWorld(platform) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "restarts-"));
  const kit = path.join(dir, "kit"), cc = path.join(dir, "stack");
  fs.mkdirSync(path.join(kit, "circlechat/gateway"), { recursive: true });
  fs.mkdirSync(path.join(cc, "gateway-app"), { recursive: true });
  fs.mkdirSync(path.join(cc, "kit-out"), { recursive: true });
  for (const [f, text] of [["router.mjs", "v2"], ["keys.mjs", "k"], ["package.json", "{}"], ["start-litellm.py", "py"]]) fs.writeFileSync(path.join(kit, "circlechat/gateway", f), text);
  for (const [f, text] of [["router.mjs", "v1"], ["keys.mjs", "k"], ["package.json", "{}"]]) fs.writeFileSync(path.join(cc, "gateway-app", f), text);
  fs.writeFileSync(path.join(cc, "kit-out/tenant.env"), "DOCKER_CONTEXT=colima\n");
  const calls = [];
  const out = {};
  const spawn = (cmd, args) => { calls.push([cmd, ...args].join(" ")); const k = Object.keys(out).find((x) => [cmd, ...args].join(" ").includes(x)); return { status: 0, stdout: k ? out[k] : "", stderr: "" }; };
  const units = new Set();
  const fsx = { ...fs, existsSync: (p) => units.has(p) || fs.existsSync(p) };
  const deps = realRestartDeps({ env: { OWNER: "owner", KIT: kit, PATH: "/usr/bin" }, platform, spawn, fsx });
  const stack = stackContainers([{ ccDir: cc, tenant: "" }])[0];
  return { deps, calls, out, units, stack, kit, cc };
}

test("on Linux, the start time comes from systemd, and a restart is systemctl restart", () => {
  const w = realWorld("linux");
  const agent = instances([]).find((s) => s.id === "cluster-agent");
  assert.equal(w.deps.started(agent), null, "no unit file: not installed");
  w.units.add("/etc/systemd/system/cluster-agent.service");
  w.out["systemctl show"] = "ActiveState=active\nActiveEnterTimestamp=@1795497391\n";
  assert.equal(w.deps.started(agent), 1795497391000);
  w.out["systemctl show"] = "ActiveState=inactive\nActiveEnterTimestamp=@1795497391\n";
  assert.equal(w.deps.started(agent), null, "a stopped service is left alone");
  assert.deepEqual(w.deps.restart(agent), { ok: true, output: "" });
  assert.equal(w.calls.at(-1), "systemctl restart cluster-agent.service");
});

test("on a Mac, the start time comes from the job's process, and a restart is launchctl kickstart -k", () => {
  const w = realWorld("darwin");
  const jobd = instances([]).find((s) => s.id === "jobd");
  w.units.add("/Library/LaunchDaemons/io.recursica.jobd.plist");
  w.out["launchctl print"] = "\tstate = running\n\tpid = 4242\n";
  w.out["ps -o lstart="] = "Mon Nov 23 21:16:31 2026\n";
  assert.equal(w.deps.started(jobd), Date.parse("Mon Nov 23 21:16:31 2026"));
  w.deps.restart(jobd);
  assert.equal(w.calls.at(-1), "launchctl kickstart -k system/io.recursica.jobd");
});

test("the gateway's copy is compared with the kit's files, copied again before the restart, and Docker runs as the owner with the stack's context", () => {
  const w = realWorld("darwin");
  const gateway = instances([w.stack]).find((s) => s.id === "gateway");
  assert.equal(w.deps.copyDiffers(gateway), true, "router.mjs differs");
  fs.writeFileSync(path.join(w.cc, "gateway-app/router.mjs"), "v2");
  assert.equal(w.deps.copyDiffers(gateway), false);
  w.out["docker inspect"] = "true 2026-11-23T10:00:00.5Z\n";
  assert.equal(w.deps.started(gateway), Date.parse("2026-11-23T10:00:00.5Z"));
  w.deps.restart(gateway);
  const [cp, restart] = w.calls.slice(-2);
  assert.match(cp, /^sudo -u owner -H cp \S+\/circlechat\/gateway\/keys\.mjs \S+\/circlechat\/gateway\/package\.json \S+\/circlechat\/gateway\/router\.mjs \S+\/gateway-app\/$/);
  assert.equal(restart, "sudo -u owner -H env PATH=/usr/bin DOCKER_CONTEXT=colima docker restart cc-gateway");
});
