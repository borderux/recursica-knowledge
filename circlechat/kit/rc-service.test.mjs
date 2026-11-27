// circlechat/rc-service.sh and recursicachat.services in site.json: a service account for a program
// that drives agents on the server, the agents it drives, and its token in a file only the program's
// account can read. The script runs here with stand-ins for the server's CLI and sudo.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { rcServiceErrors, recursicachatErrors } from "./render.mjs";
import { main, rcServices } from "./rc-sync.mjs";
import { createGateway } from "../gateway/router.mjs";
import { loadKeys } from "../gateway/keys.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ME = os.userInfo().username;
const ENTRY = { name: "example-service", agents: ["designer"], account: "_program", file: "/opt/program/run/token" };
const KEY_FILE = "/opt/program/run/example-service.gateway-key";

test("recursicachat.services: a name, its agents, a non-root account and a file outside the server's folders", () => {
  assert.deepEqual(rcServiceErrors({}), []);
  assert.deepEqual(rcServiceErrors({ services: [ENTRY] }), []);
  const bad = (entry, re) => assert.ok(rcServiceErrors({ services: [{ ...ENTRY, ...entry }] }).some((e) => re.test(e)), JSON.stringify(entry));
  bad({ name: "Has Space" }, /name must be/);
  bad({ name: "x" }, /name must be/);
  bad({ agents: [] }, /must list the handles/);
  bad({ agents: "designer" }, /must list the handles/);
  bad({ agents: ["Not A Handle"] }, /not an agent's handle/);
  bad({ account: "root" }, /not root/);
  bad({ file: "relative/token" }, /absolute path/);
  bad({ file: "/opt/recursicachat/data/token" }, /outside the server's folders/);
  bad({ extra: 1 }, /extra is not a setting/);
  // job and state, for sudo rc-clear: the program's launchd job, and its state folder
  assert.deepEqual(rcServiceErrors({ services: [{ ...ENTRY, job: "io.example.program", state: "/opt/program/home/state" }] }), []);
  assert.deepEqual(rcServiceErrors({ services: [{ ...ENTRY, job: "io.example.program" }] }), [], "a program may keep no state");
  bad({ job: "io.example.program; id" }, /job must be the program's launchd job/);
  bad({ job: "two words" }, /job must be the program's launchd job/);
  bad({ job: "a:b" }, /job must be the program's launchd job/);
  bad({ job: 7 }, /job must be the program's launchd job/);
  bad({ job: "io.recursica.recursicachat" }, /not one of the server's own/);
  bad({ job: "io.recursica.recursicachat-backup" }, /not one of the server's own/);
  bad({ job: "io.example.program", state: "relative/state" }, /state must be the absolute path/);
  bad({ job: "io.example.program", state: "/opt/program/../../etc" }, /state must be the absolute path/);
  bad({ job: "io.example.program", state: "/opt/my program" }, /state must be the absolute path/);
  bad({ job: "io.example.program", state: "/opt/program/$(id)" }, /state must be the absolute path/);
  bad({ job: "io.example.program", state: "/opt/recursicachat/data" }, /state must be outside the server's folders/);
  bad({ job: "io.example.program", state: "/opt/recursicachat/data/files/" }, /state must be outside the server's folders/);
  bad({ state: "/opt/program/home/state" }, /state needs job/);
  assert.match(rcServiceErrors({ services: {} })[0], /must be a list/);
  const two = rcServiceErrors({ services: [ENTRY, { ...ENTRY, name: "other-service", file: "/opt/other/run/token" }] });
  assert.ok(two.some((e) => /already driven by example-service/.test(e)), "an agent has at most one service");
  assert.ok(rcServiceErrors({ services: [ENTRY, { ...ENTRY, agents: ["writer"], file: "/opt/other/run/token" }] }).some((e) => /listed twice/.test(e)));
  assert.ok(rcServiceErrors({ sessions: [{ email: "program@example.com", account: "_program", file: ENTRY.file }], services: [ENTRY] }).some((e) => /file is listed twice/.test(e)), "not the same file as a session");
  assert.ok(recursicachatErrors({ site: {}, recursicachat: { services: [{ ...ENTRY, account: "root" }] } }).some((e) => /not root/.test(e)), "the site check runs it");
});

test("recursicachat.services health_report: true or false, and true needs state and account", () => {
  const STATEFUL = { ...ENTRY, job: "io.example.program", state: "/opt/program/home/state" };
  assert.deepEqual(rcServiceErrors({ services: [{ ...STATEFUL, health_report: true }] }), []);
  assert.deepEqual(rcServiceErrors({ services: [{ ...ENTRY, health_report: false }] }), [], "false needs nothing");
  const errs = (entry) => rcServiceErrors({ services: [entry] });
  assert.ok(errs({ ...STATEFUL, health_report: "yes" }).some((e) => /health_report must be true or false/.test(e)));
  assert.ok(errs({ ...STATEFUL, health_report: 1 }).some((e) => /health_report must be true or false/.test(e)));
  assert.ok(errs({ ...ENTRY, health_report: true }).some((e) => /health_report needs state/.test(e)));
  const noAccount = { ...STATEFUL };
  delete noAccount.account;
  assert.ok(errs({ ...noAccount, health_report: true }).some((e) => /health_report needs account/.test(e)));
  assert.ok(!errs({ ...STATEFUL, health_report: true }).some((e) => /is not a setting/.test(e)), "health_report is a setting");
});

test("rc-sync.mjs services prints one tab-separated line for each entry", async () => {
  assert.deepEqual(rcServices({ recursicachat: { services: [{ ...ENTRY, agents: ["designer", "writer"] }] } }), [[ENTRY.name, ENTRY.account, ENTRY.file, "designer,writer", "svc-example-service", KEY_FILE, ""]]);
  assert.deepEqual(rcServices({ recursicachat: { services: [{ ...ENTRY, gateway: { routes: ["judge", "local-small"], max_parallel: 2, daily_requests: 10 } }] } })[0].slice(4), ["svc-example-service", KEY_FILE, "judge,local-small"], "the routes come last");
  assert.deepEqual(rcServices({}), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-service-site-"));
  const file = path.join(dir, "site.json");
  fs.writeFileSync(file, JSON.stringify({ site: { public_host: "chat.example.ts.net" }, recursicachat: { services: [ENTRY] } }));
  let out = "";
  const code = await main(["services", file], { out: (t) => (out += t), log: () => {} });
  assert.equal(code, 0);
  assert.equal(out, `${ENTRY.name}\t${ENTRY.account}\t${ENTRY.file}\tdesigner\tsvc-example-service\t${KEY_FILE}\t\n`);
});

// The script with stand-ins: sudo runs its command; the server's Node is a small fake of the CLI's
// service-* commands, keeping its state in a folder. Every call is logged with whether the vault key
// reached it in its environment.
const TOKEN = "ccsvc_" + "t".repeat(43);
const FAKE_CLI = `
import fs from "node:fs";
import path from "node:path";
const [, , , cmd, ...args] = process.argv;
const state = process.env.FAKE_STATE;
const read = () => (fs.existsSync(state) ? JSON.parse(fs.readFileSync(state, "utf8")) : {});
const save = (s) => fs.writeFileSync(state, JSON.stringify(s));
const s = read();
fs.appendFileSync(process.env.FAKE_LOG, ["cli", cmd, ...args].join(" ") + " key=" + (process.env.CIRCLECHAT_MASTER_KEY ? "set" : "") + "\\n");
const fail = (m) => { process.stderr.write(m + "\\n"); process.exit(3); };
if (cmd === "service-list") {
  for (const [n, v] of Object.entries(s)) console.log(n + "  token: " + v.token + "  agents: " + (v.agents.map((a) => "@" + a).join(" ") || "none") + "  made: 2026-01-01 00:00  last used: never");
} else if (cmd === "service-create") {
  if (s[args[0]]) fail("there is already a service " + args[0]);
  s[args[0]] = { token: "none", agents: [] }; save(s);
} else if (cmd === "service-drive") {
  if (process.env.FAKE_NO_AGENT === args[1]) fail("no agent @" + args[1]);
  s[args[0]].agents = [...new Set([...s[args[0]].agents, args[1]])]; save(s);
} else if (cmd === "service-undrive") {
  for (const v of Object.values(s)) v.agents = v.agents.filter((a) => a !== args[0]); save(s);
} else if (cmd === "service-token") {
  if (process.env.FAKE_NO_TOKEN) fail("no token");
  s[args[0]].token = "yes"; save(s);
  process.stdout.write(${JSON.stringify(TOKEN)} + "\\n");
} else fail("unknown " + cmd);
`;

function setup({ account = ME, folderMode = 0o755, folderOwner = ME, services, oldToken = true, state, gateway, gwPort, only = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-service-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const log = path.join(dir, "calls.log");
  const stateFile = path.join(dir, "state.json");
  if (state) fs.writeFileSync(stateFile, JSON.stringify(state));
  fs.writeFileSync(path.join(dir, "fake-cli.mjs"), FAKE_CLI);
  const script = (name, body) => {
    fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
    fs.chmodSync(path.join(bin, name), 0o755);
  };
  script("sudo", `exec "$@"`);
  // The kit's Node, logging every argument list it is given.
  const argvLog = path.join(dir, "argv.log");
  script("kit-node", `printf '%s\\n' "$*" >> "${argvLog}"\nexec "${process.execPath}" "$@"`);
  const gwState = path.join(dir, "gateway-state");
  fs.mkdirSync(gwState);
  script("server-node", [`[ "$1" = -p ] && { echo 24; exit 0; }`, `exec "${process.execPath}" "${path.join(dir, "fake-cli.mjs")}" "$@"`].join("\n"));
  const run = path.join(dir, "run");
  fs.mkdirSync(run);
  fs.chmodSync(run, folderMode);
  const file = path.join(run, "token");
  if (oldToken) fs.writeFileSync(file, "old-token\n");
  const key = path.join(dir, "vault.key");
  fs.writeFileSync(key, "vault-key-standin\n");
  const site = {
    site: { public_host: "chat.example.ts.net", ...(gwPort ? { gateway_local_port: gwPort } : {}) },
    nodes: [{ name: "m1", control: true, os: "macos", address: "host.docker.internal", servers: [{ id: "ollama", kind: "ollama", port: 11434, models: [{ id: "large", model: "example-model" }] }] }],
    routes: { judge: ["m1/ollama/large"] },
    recursicachat: {
      app: path.join(dir, "srv", "app"),
      data: path.join(dir, "srv", "data"),
      node: path.join(bin, "server-node"),
      vault_key_file: key,
      ...(services === null ? {} : { services: services ?? (only ? [{ name: ENTRY.name, account, file: path.join(run, "example-service.gateway-key"), gateway }] : [{ ...ENTRY, account, file, ...(gateway ? { gateway } : {}) }]) }),
    },
  };
  const siteFile = path.join(dir, "site.json");
  fs.writeFileSync(siteFile, JSON.stringify(site));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SITE: siteFile, KIT_NODE: path.join(bin, "kit-node"), GW_STATE: gwState, RC_SERVICE_ROOT_OWNER: folderOwner, FAKE_STATE: stateFile, FAKE_LOG: log };
  const keyFile = path.join(run, "example-service.gateway-key");
  const result = (r) => ({
    r,
    out: r.stdout + r.stderr,
    text: fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null,
    mode: fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : null,
    key: fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : null,
    keyMode: fs.existsSync(keyFile) ? fs.statSync(keyFile).mode & 0o777 : null,
    calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "",
    argv: fs.existsSync(argvLog) ? fs.readFileSync(argvLog, "utf8") : "",
    state: fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {},
    files: fs.readdirSync(run).sort(),
    recorded: loadKeys(gwState)["svc-example-service"]?.sha256 ?? null,
  });
  // The script while a gateway runs in this process: spawned, so the gateway can answer.
  const goAsync = (args = [], extra = {}) => new Promise((resolve) => {
    const c = spawn("bash", [path.join(here, "../rc-service.sh"), ...args], { env: { ...env, ...extra } });
    let stdout = "", stderr = "";
    c.stdout.on("data", (d) => (stdout += d));
    c.stderr.on("data", (d) => (stderr += d));
    c.on("close", (status) => resolve(result({ status, stdout, stderr })));
  });
  const go = (args = [], extra = {}) => result(spawnSync("bash", [path.join(here, "../rc-service.sh"), ...args], { env: { ...env, ...extra }, encoding: "utf8" }));
  return { go, goAsync, file, log, gwState, keyFile };
}

test("rc-service.sh makes the service, drives its agents, and writes its token, mode 400, never printing it", () => {
  const { go } = setup();
  const first = go();
  assert.equal(first.r.status, 0, first.out);
  assert.deepEqual(first.state, { "example-service": { token: "yes", agents: ["designer"] } });
  assert.equal(first.text, `${TOKEN}\n`);
  assert.equal(first.mode, 0o400);
  assert.ok(!first.out.includes(TOKEN), "the token is never in the output");
  assert.match(first.out, /made the service/);
  assert.match(first.out, /drives @designer/);
  assert.match(first.out, /a new token in .*token \(the server has no token for it\)/);
  assert.match(first.calls, /^cli service-token example-service key=set$/m, "the vault key reaches the CLI in its environment");
  assert.ok(!first.calls.includes("vault-key-standin"), "never as an argument");
  assert.deepEqual(first.files, ["token"], "no temporary file is left");

  // again: nothing to do, and no new token
  const again = go();
  assert.equal(again.r.status, 0, again.out);
  assert.match(again.out, /example-service: up to date/);
  assert.equal(again.calls.match(/service-token/g).length, 1, "a token is made only once");
});

test("rc-service.sh makes a new token when asked, when the file is missing, or when the server has none", () => {
  const rotated = setup({ state: { "example-service": { token: "yes", agents: ["designer"] } } }).go(["--rotate", "example-service"]);
  assert.equal(rotated.r.status, 0, rotated.out);
  assert.equal(rotated.text, `${TOKEN}\n`);
  assert.match(rotated.out, /a new token, as asked/);

  const missing = setup({ oldToken: false, state: { "example-service": { token: "yes", agents: ["designer"] } } }).go();
  assert.equal(missing.text, `${TOKEN}\n`);
  assert.match(missing.out, /no token file yet/);

  const revoked = setup({ state: { "example-service": { token: "revoked", agents: ["designer"] } } }).go();
  assert.equal(revoked.text, `${TOKEN}\n`);

  const unknown = setup({ state: { "example-service": { token: "yes", agents: ["designer"] } } }).go(["--rotate", "no-such-service"]);
  assert.equal(unknown.r.status, 1);
  assert.match(unknown.out, /no-such-service: no such service in site.json/);
});

test("rc-service.sh drives exactly the agents listed: an agent no longer listed answers for itself again", () => {
  const { go } = setup({ state: { "example-service": { token: "yes", agents: ["designer", "writer"] } } });
  const r = go();
  assert.equal(r.r.status, 0, r.out);
  assert.deepEqual(r.state["example-service"].agents, ["designer"]);
  assert.match(r.out, /no longer drives @writer/);
});

test("rc-service.sh keeps the old file and says why: no token, an unknown agent, a folder or account that is wrong", () => {
  const noToken = setup({ state: { "example-service": { token: "none", agents: ["designer"] } } }).go([], { FAKE_NO_TOKEN: "1" });
  assert.equal(noToken.r.status, 1);
  assert.equal(noToken.text, "old-token\n");
  assert.match(noToken.out, /the server made no token/);
  assert.deepEqual(noToken.files, ["token"]);

  const noAgent = setup().go([], { FAKE_NO_AGENT: "designer" });
  assert.equal(noAgent.r.status, 1);
  assert.match(noAgent.out, /could not drive @designer: no agent @designer/);
  assert.equal(noAgent.text, "old-token\n");

  const writable = setup({ folderMode: 0o775 }).go();
  assert.equal(writable.r.status, 1);
  assert.match(writable.out, /no write for the group or others/);
  assert.equal(writable.calls, "", "nothing is asked of the server");

  const noAccount = setup({ account: "_no-such-account" }).go();
  assert.equal(noAccount.r.status, 1);
  assert.match(noAccount.out, /there is no account _no-such-account/);
});

test("rc-service.sh does nothing without services in site.json, and refuses a bad argument", () => {
  const none = setup({ services: null }).go();
  assert.equal(none.r.status, 0);
  assert.match(none.out, /lists no recursicachat\.services/);
  assert.equal(none.calls, "");
  const bad = setup().go(["--what"]);
  assert.equal(bad.r.status, 2);
  assert.match(bad.out, /usage: rc-service.sh/);
});

// A service's gateway block: its own gateway key, svc-<name>, in <name>.gateway-key beside the token.
const JUDGE = { routes: ["judge"], max_parallel: 2, daily_requests: 10 };
const SITE = { site: { gateway_local_port: 4005 }, nodes: [{ name: "m1", servers: [{ id: "ollama", kind: "ollama", port: 11434, models: [{ id: "large" }] }] }], routes: { judge: ["m1/ollama/large"] } };

test("recursicachat.services: a gateway block names local routes and two caps, and nothing else", () => {
  const rc = (gateway) => ({ services: [{ ...ENTRY, gateway }] });
  assert.deepEqual(rcServiceErrors(rc(JUDGE), SITE), []);
  assert.ok(rcServiceErrors(rc({ ...JUDGE, extra: 1 }), SITE).some((e) => /gateway\.extra is not a setting/.test(e)));
  assert.ok(rcServiceErrors(rc({ ...JUDGE, routes: ["other"] }), SITE).some((e) => /"other" is not one of site\.json's routes/.test(e)));
  assert.ok(rcServiceErrors(rc(JUDGE), { ...SITE, routes: { judge: ["m1/ollama/large", "anthropic/claude-sonnet-5-5"] } }).some((e) => /cluster models only/.test(e)));
  assert.ok(rcServiceErrors(rc({ ...JUDGE, max_parallel: 0 }), SITE).some((e) => /max_parallel must be a whole number/.test(e)));
  assert.ok(rcServiceErrors(rc({ ...JUDGE, daily_requests: -1 }), SITE).some((e) => /daily_requests must be a whole number/.test(e)));
  assert.ok(recursicachatErrors({ ...SITE, recursicachat: rc({ ...JUDGE, max_parallel: 100 }) }).some((e) => /max_parallel/.test(e)), "the site check runs it");
});

// A gateway in this process, from the same key records the script writes: GET /v1/models lists the
// routes gateway.json gives svc-example-service.
async function liveGateway(gwState, routes = ["judge"]) {
  const config = { agents: routes ? { "svc-example-service": { routes, cloud: false, key: null, service: true, max_parallel: 2, daily_requests: 10 } } : {}, routes: { judge: { local: true } } };
  const db = { runTasks: async () => [], onTask: async () => false, setting: async () => null, botToken: async () => null };
  const server = http.createServer(createGateway({ config, db, litellm: "http://127.0.0.1:9", stateDir: gwState, spendLog: null }));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return server;
}
const sha = (k) => crypto.createHash("sha256").update(k).digest("hex");
const models = async (port, key) => fetch(`http://127.0.0.1:${port}/v1/models`, { headers: { authorization: `Bearer ${key}` } });

test("rc-service.sh issues the service's gateway key into a file only its account reads, checked on the gateway, never printing it or passing it as an argument", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-service-gw-"));
  const gwState = path.join(dir, "state");
  fs.mkdirSync(gwState);
  // The port is known only once the gateway listens, so the gateway reads the key records the
  // script's state folder holds: the test points GW_STATE at the gateway's folder.
  const server = await liveGateway(gwState);
  const port = server.address().port;
  try {
    const { goAsync, keyFile } = setup({ gateway: JUDGE, gwPort: port });
    const first = await goAsync([], { GW_STATE: gwState });
    assert.equal(first.r.status, 0, first.out);
    const key = first.key.trim();
    assert.match(key, /^ccg_[0-9a-f]{48}$/);
    assert.equal(first.keyMode, 0o400);
    assert.equal(fs.statSync(keyFile).uid, os.userInfo().uid, "the entry's account owns the key file");
    assert.equal(loadKeys(gwState)["svc-example-service"].sha256, sha(key), "the gateway records the key");
    assert.match(first.out, /a new gateway key for svc-example-service in .*example-service\.gateway-key \(no gateway key file yet\)/);
    assert.ok(!first.out.includes(key), "the key is never in the output");
    assert.ok(!first.argv.includes(key) && !first.calls.includes(key), "the key is never an argument");
    assert.match(first.argv, /rc-gateway-key\.mjs issue \S+ svc-example-service http:\/\/127\.0\.0\.1:\d+\/v1 judge judge/);
    assert.deepEqual(first.files, ["example-service.gateway-key", "token"], "no temporary file is left");
    const listed = await (await models(port, key)).json();
    assert.deepEqual(listed.data.map((m) => m.id), ["judge"]);

    // again: the file holds the recorded key, so the key stays
    const again = await goAsync([], { GW_STATE: gwState });
    assert.equal(again.r.status, 0, again.out);
    assert.match(again.out, /the gateway key in .* is current/);
    assert.equal(again.key.trim(), key);
    assert.equal((again.argv.match(/ issue /g) ?? []).length, 1, "a rerun issues no new key");

    // --rotate: a new key, and the old one stops working at once
    const rotated = await goAsync(["--rotate", "example-service"], { GW_STATE: gwState });
    assert.equal(rotated.r.status, 0, rotated.out);
    assert.match(rotated.out, /a new gateway key, as asked/);
    assert.notEqual(rotated.key.trim(), key);
    assert.equal((await models(port, key)).status, 401);
    assert.equal((await models(port, rotated.key.trim())).status, 200);
    assert.ok(!rotated.out.includes(rotated.key.trim()));

    // a file that holds another key: a new key
    fs.chmodSync(keyFile, 0o600);
    fs.writeFileSync(keyFile, "ccg_" + "0".repeat(48) + "\n");
    const replaced = await goAsync([], { GW_STATE: gwState });
    assert.equal(replaced.r.status, 0, replaced.out);
    assert.match(replaced.out, /the file holds no key the gateway knows/);
    assert.equal(loadKeys(gwState)["svc-example-service"].sha256, sha(replaced.key.trim()));
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});

// A program that only asks models: a gateway block and no agents. Its file is its gateway key file.
test("recursicachat.services: an entry with a gateway block may leave agents out, and its file is its key file", () => {
  const only = { name: "example-eval", account: "_program", file: "/opt/program/run/example-eval.gateway-key", gateway: JUDGE };
  assert.deepEqual(rcServiceErrors({ services: [only] }, SITE), []);
  assert.deepEqual(rcServices({ ...SITE, recursicachat: { services: [only] } })[0], ["example-eval", "_program", only.file, "-", "svc-example-eval", only.file, "judge"], "the key file is the entry's file, and no agents: never an empty field, which bash's read would drop");
  const { gateway, ...neither } = only;
  assert.ok(rcServiceErrors({ services: [neither] }, SITE).some((e) => /agents must list the handles of the agents it drives, or, for a program that only asks models/.test(e)), "no agents and no gateway block is still refused");
  assert.ok(rcServiceErrors({ services: [{ ...only, agents: [] }] }, SITE).some((e) => /must list the handles/.test(e)), "an empty agents list is not a program that only asks models");
  assert.ok(rcServiceErrors({ services: [only, { ...ENTRY, file: only.file }] }, SITE).some((e) => /file is listed twice/.test(e)), "its key file is no other entry's file");
});

test("rc-service.sh gives a program that only asks models its gateway key in its own file, and no service, token or agent on the server", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-service-only-"));
  const gwState = path.join(dir, "state");
  fs.mkdirSync(gwState);
  const server = await liveGateway(gwState);
  try {
    const { goAsync, keyFile } = setup({ gateway: JUDGE, gwPort: server.address().port, only: true, oldToken: false });
    const r = await goAsync([], { GW_STATE: gwState });
    assert.equal(r.r.status, 0, r.out);
    const key = r.key.trim();
    assert.match(key, /^ccg_[0-9a-f]{48}$/);
    assert.equal(r.keyMode, 0o400);
    assert.equal(fs.statSync(keyFile).uid, os.userInfo().uid, "the entry's account owns the key file");
    assert.equal(loadKeys(gwState)["svc-example-service"].sha256, sha(key));
    assert.deepEqual(r.state, {}, "the server has no service for it");
    assert.doesNotMatch(r.calls, /service-create|service-drive|service-token/, "no call to the server's service commands");
    assert.deepEqual(r.files, ["example-service.gateway-key"], "no token file, and no temporary file left");
    assert.ok(!r.out.includes(key), "the key is never in the output");
    const again = await goAsync([], { GW_STATE: gwState });
    assert.match(again.out, /the gateway key in .* is current/);
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});

test("rc-service.sh revokes a key the gateway does not serve, and keeps no file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-service-gw-"));
  const gwState = path.join(dir, "state");
  fs.mkdirSync(gwState);
  // A gateway started before site.json named the service: no route for svc-example-service.
  const server = await liveGateway(gwState, null);
  try {
    const { goAsync } = setup({ gateway: JUDGE, gwPort: server.address().port });
    const r = await goAsync([], { GW_STATE: gwState });
    assert.equal(r.r.status, 1);
    assert.match(r.out, /failed the check, and is revoked/);
    assert.match(r.out, /Rerun setup-host\.sh/);
    assert.match(r.out, /no new gateway key for svc-example-service/);
    assert.equal(r.key, null);
    assert.equal(loadKeys(gwState)["svc-example-service"], undefined);
    assert.deepEqual(r.files, ["token"], "no temporary file is left");
    assert.doesNotMatch(r.out, /ccg_[0-9a-f]{48}/, "no key in the output");
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});

test("rc-service.sh revokes the key and removes its file once the gateway block is gone", () => {
  const { go, gwState, keyFile } = setup();
  const keys = { "svc-example-service": { sha256: sha("ccg_" + "1".repeat(48)), issued: "2026-01-01T00:00:00.000Z" }, designer: { sha256: sha("other"), issued: "2026-01-01T00:00:00.000Z" } };
  fs.writeFileSync(path.join(gwState, "agent-keys.json"), JSON.stringify(keys));
  fs.writeFileSync(keyFile, "ccg_" + "1".repeat(48) + "\n");
  const r = go();
  assert.equal(r.r.status, 0, r.out);
  assert.match(r.out, /no gateway block in site\.json, so the gateway key of svc-example-service is revoked/);
  assert.match(r.out, /removed .*example-service\.gateway-key/);
  assert.equal(r.key, null);
  assert.equal(r.recorded, null);
  assert.equal(loadKeys(gwState).designer.sha256, sha("other"), "another handle's key stays");
  const again = go();
  assert.doesNotMatch(again.out, /revoked|removed/, "nothing to do the second time");
});
