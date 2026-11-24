// Runs rotate-tokens.sh with a stand-in for gh, which keeps the environment's secrets and the
// Deploy secrets runs in a state file. Nothing reaches GitHub.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const TOKEN = "github_pat_one-day-token";

// Two computers, each with jobd and a kev-engine. The helper computer's engine comes first.
const SITE = {
  site: { stack_name: "acme" },
  nodes: [
    { name: "machine-1", control: true, kev: { port: 8009, priority: 2 }, jobs: { port: 7400 }, services: [{ name: "kev-engine", secret_env: ["KEV_API_KEY"] }] },
    { name: "machine-2", kev: { port: 8009, priority: 1 }, jobs: { port: 7400 }, services: [{ name: "kev-engine", secret_env: ["KEV_API_KEY"] }] },
  ],
};

// The stand-in for gh. Each call is logged with gh's arguments and whether GH_TOKEN held the token.
// A run's result comes from state.results["<computer> <mode>"], mode being check, rotation or plain.
const FAKE_GH = `#!/usr/bin/env node
const fs = require("fs");
const file = process.env.FAKE_GH_STATE;
const st = JSON.parse(fs.readFileSync(file, "utf8"));
const args = process.argv.slice(2);
st.calls.push({ args, token: process.env.GH_TOKEN === ${JSON.stringify(TOKEN)} });
const save = () => fs.writeFileSync(file, JSON.stringify(st));
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const fields = () => { const f = {}; args.forEach((a, i) => { if (args[i - 1] === "-f") { const k = a.slice(0, a.indexOf("=")); f[k] = a.slice(k.length + 1); } }); return f; };
const [a, b] = args;
if (a === "api") { save(); process.exit(st.deny.some((d) => b.includes(d)) ? 1 : 0); }
if (a === "secret" && b === "set") {
  const value = fs.readFileSync(0, "utf8");
  st.secrets[args[2]] = value; st.events.push({ secret: args[2], env: opt("--env") }); save(); process.exit(0);
}
if (a === "workflow" && b === "run") {
  const f = fields();
  if (st.noRotationInput) { save(); console.error('HTTP 422: Unexpected inputs provided: ["kev_rotation"]'); process.exit(1); }
  const mode = f.kev_rotation === "check" ? "check" : f.kev_rotation ? "rotation" : "plain";
  const id = 100 + st.runs.length + 1;
  const title = "Deploy secrets: " + f.stack + " on " + f.computer + (mode === "check" ? ", key rotation check" : mode === "rotation" ? ", key rotation" : "");
  st.runs.push({ databaseId: id, displayTitle: title, inputs: f, mode, secrets: { ...st.secrets }, conclusion: st.results[f.computer + " " + mode] ?? "success" });
  st.events.push({ run: f.computer, mode, restart: f.restart });
  save(); process.exit(0);
}
if (a === "run" && b === "list") { save(); console.log(JSON.stringify([...st.runs].reverse().slice(0, Number(opt("--limit") ?? 20)))); process.exit(0); }
if (a === "run" && b === "view") {
  const r = st.runs.find((x) => x.databaseId === Number(args[2])); save();
  if (args.includes("--log")) { console.log("deploy\\tWrite the secrets\\t2026-11-24T00:00:00.0000000Z " + (st.oldHelper ? "Secrets written. Nothing restarted." : "kev-engine on " + r.inputs.computer + " may stop for the key rotation. Nothing was written.")); process.exit(0); }
  if (args.includes("--log-failed")) { console.log("deploy\\tWrite the secrets\\t2026-11-24T00:00:00.0000000Z   kev-engine is not idle: 1 connection(s) open to port 8009."); process.exit(0); }
  console.log(JSON.stringify({ status: "completed", conclusion: r.conclusion })); process.exit(0);
}
if (a === "run" && b === "cancel") { save(); process.exit(0); }
save(); console.error("unexpected gh call: " + args.join(" ")); process.exit(2);
`;

function world({ results = {}, deny = [], noRotationInput = false, oldHelper = false, site = SITE } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rotate-"));
  const gh = path.join(dir, "gh");
  fs.writeFileSync(gh, FAKE_GH, { mode: 0o755 });
  const state = path.join(dir, "state.json");
  fs.writeFileSync(state, JSON.stringify({ calls: [], secrets: {}, events: [], runs: [], results, deny, noRotationInput, oldHelper }));
  const siteFile = path.join(dir, "site.json");
  fs.writeFileSync(siteFile, JSON.stringify(site));
  const run = (args = [], input = `${TOKEN}\n`) => spawnSync("bash", [path.join(here, "rotate-tokens.sh"), "--repo", "acme/stacks", "--site", siteFile, ...args], {
    input, encoding: "utf8", env: { ...process.env, GH: gh, FAKE_GH_STATE: state, ROTATE_POLL_SECONDS: "0" } });
  const read = () => JSON.parse(fs.readFileSync(state, "utf8"));
  return { run, read, close: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const proof = (key) => crypto.createHash("sha256").update(`kev-rotation\n${key}`).digest("hex");
const leaks = (st, out) => [TOKEN, ...Object.values(st.secrets)].filter((v) => out.includes(v));

test("a rotation checks kev-engine first, then deploys one token at a time in the order that keeps each switch short", () => {
  const w = world();
  try {
    const r = w.run();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const st = w.read();
    const steps = st.events.map((e) => (e.secret ? `set ${e.secret}` : `${e.mode} ${e.run}${e.mode === "check" ? "" : ` restart=${e.restart}`}`));
    assert.deepEqual(steps, [
      "check machine-2", "check machine-1",
      "set CLUSTER_TOKEN", "plain machine-1 restart=true", "plain machine-2 restart=true",
      "set JOBD_TOKEN", "plain machine-1 restart=true", "plain machine-2 restart=true",
      "set KEV_API_KEY", "set KEV_ENGINE_KEY", "rotation machine-2 restart=true", "rotation machine-1 restart=true",
    ]);
    assert.ok(st.events.filter((e) => e.secret).every((e) => e.env === "acme"), "each secret goes to the stack's environment");
    for (const k of ["CLUSTER_TOKEN", "JOBD_TOKEN", "KEV_API_KEY"]) assert.match(st.secrets[k], /^[0-9a-f]{64}$/, k);
    assert.equal(new Set([st.secrets.CLUSTER_TOKEN, st.secrets.JOBD_TOKEN, st.secrets.KEV_API_KEY]).size, 3);
    assert.equal(st.secrets.KEV_ENGINE_KEY, st.secrets.KEV_API_KEY, "the callers' copy holds the same key");
    // Each run saw only the tokens changed so far: the cluster runs ran before JOBD_TOKEN changed.
    const plain = st.runs.filter((x) => x.mode === "plain");
    assert.equal(plain[0].secrets.JOBD_TOKEN, undefined);
    assert.equal(plain[2].secrets.KEV_API_KEY, undefined);
    for (const x of st.runs.filter((y) => y.mode === "rotation")) assert.equal(x.inputs.kev_rotation, proof(st.secrets.KEV_API_KEY));
    for (const x of st.runs.filter((y) => y.mode === "check")) assert.equal(x.inputs.restart, "false");
    assert.ok(st.calls.every((c) => c.token), "gh gets the token in GH_TOKEN for every call");
    assert.ok(st.calls.every((c) => !c.args.join(" ").includes(TOKEN) && Object.values(st.secrets).every((v) => !c.args.join(" ").includes(v))), "no token or value on a command line");
    assert.deepEqual(leaks(st, r.stdout + r.stderr), [], "no token or value in the output");
    assert.match(r.stdout, /Nothing calls jobd today, so the rotation changes JOBD_TOKEN on both sides/);
    assert.match(r.stdout, /Nothing calls kev-engine today, so the rotation changes both sides: KEV_API_KEY in each engine, and KEV_ENGINE_KEY/);
  } finally { w.close(); }
});

test("a failed kev-engine check stops the rotation before anything changes, and shows why", () => {
  const w = world({ results: { "machine-1 check": "failure" } });
  try {
    const r = w.run();
    assert.equal(r.status, 1);
    assert.match(r.stdout, /  machine-1: failure \(run \d+\)\. The run's last lines:\n      kev-engine is not idle: 1 connection\(s\) open to port 8009\./);
    assert.match(r.stdout, /kev-engine may not stop now, and the run's lines say why\. Nothing changed\./);
    assert.deepEqual(w.read().secrets, {});
    assert.ok(w.read().runs.every((x) => x.mode === "check"));
  } finally { w.close(); }
});

test("--check runs the checks and changes nothing; --only rotates only the named token, with no kev-engine check", () => {
  let w = world();
  try {
    const r = w.run(["--check"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /Every check passed\. --check changes nothing\./);
    assert.deepEqual(w.read().secrets, {});
  } finally { w.close(); }
  w = world();
  try {
    const r = w.run(["--only", "jobd"]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(Object.keys(w.read().secrets), ["JOBD_TOKEN"]);
    assert.ok(w.read().runs.every((x) => x.mode === "plain"));
  } finally { w.close(); }
});

test("a kev-engine that refuses in the rotation run stops the command, and says to run --only kev again", () => {
  const w = world({ results: { "machine-1 rotation": "failure" } });
  try {
    const r = w.run(["--only", "kev"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /  machine-2: done/);
    assert.match(r.stdout, /kev-engine on machine-1 keeps its old key: its run wrote nothing\. The engines before machine-1 in the list run with the new key\./);
    assert.match(r.stdout, /Run this command again with --only kev, before any other Deploy secrets run\./);
  } finally { w.close(); }
});

test("a token without a permission, no token, or a workflow without kev_rotation changes nothing", () => {
  let w = world({ deny: ["/secrets/public-key"] });
  try {
    const r = w.run();
    assert.equal(r.status, 1);
    assert.match(r.stdout, /The token can't read the secrets of environment acme\. Give it Environments: read and write\./);
    assert.deepEqual(w.read().events, []);
  } finally { w.close(); }
  w = world();
  try {
    const r = w.run([], "");
    assert.equal(r.status, 1);
    assert.match(r.stdout, /No token given\. Nothing changed\./);
    assert.deepEqual(w.read().calls, []);
  } finally { w.close(); }
  w = world({ noRotationInput: true });
  try {
    const r = w.run();
    assert.equal(r.status, 1);
    assert.match(r.stderr, /The Deploy secrets workflow in acme\/stacks has no kev_rotation input\. Copy the kit's circlechat\/deploy\/deploy-secrets\.yml/);
    assert.deepEqual(w.read().secrets, {});
  } finally { w.close(); }
});

test("a check run by an older helper, which ignores kev_rotation, stops the rotation before anything changes", () => {
  const w = world({ oldHelper: true });
  try {
    const r = w.run();
    assert.equal(r.status, 1);
    assert.match(r.stdout, /  machine-2 runs an older secrets helper, which can't check kev-engine\. The hourly update installs the new helper\./);
    assert.match(r.stdout, /Nothing changed\.\n$/);
    assert.deepEqual(w.read().secrets, {});
  } finally { w.close(); }
});
