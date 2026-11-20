// circlechat/rc-service.sh and recursicachat.services in site.json: a service account for a program
// that drives agents on the server, the agents it drives, and its token in a file only the program's
// account can read. The script runs here with stand-ins for the server's CLI and sudo.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rcServiceErrors, recursicachatErrors } from "./render.mjs";
import { main, rcServices } from "./rc-sync.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ME = os.userInfo().username;
const ENTRY = { name: "example-service", agents: ["designer"], account: "_program", file: "/opt/program/run/token" };

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

test("rc-sync.mjs services prints one tab-separated line for each entry", async () => {
  assert.deepEqual(rcServices({ recursicachat: { services: [{ ...ENTRY, agents: ["designer", "writer"] }] } }), [[ENTRY.name, ENTRY.account, ENTRY.file, "designer,writer"]]);
  assert.deepEqual(rcServices({}), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-service-site-"));
  const file = path.join(dir, "site.json");
  fs.writeFileSync(file, JSON.stringify({ site: { public_host: "chat.example.ts.net" }, recursicachat: { services: [ENTRY] } }));
  let out = "";
  const code = await main(["services", file], { out: (t) => (out += t), log: () => {} });
  assert.equal(code, 0);
  assert.equal(out, `${ENTRY.name}\t${ENTRY.account}\t${ENTRY.file}\tdesigner\n`);
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

function setup({ account = ME, folderMode = 0o755, folderOwner = ME, services, oldToken = true, state } = {}) {
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
  script("server-node", [`[ "$1" = -p ] && { echo 24; exit 0; }`, `exec "${process.execPath}" "${path.join(dir, "fake-cli.mjs")}" "$@"`].join("\n"));
  const run = path.join(dir, "run");
  fs.mkdirSync(run);
  fs.chmodSync(run, folderMode);
  const file = path.join(run, "token");
  if (oldToken) fs.writeFileSync(file, "old-token\n");
  const key = path.join(dir, "vault.key");
  fs.writeFileSync(key, "vault-key-standin\n");
  const site = {
    site: { public_host: "chat.example.ts.net" },
    recursicachat: {
      app: path.join(dir, "srv", "app"),
      data: path.join(dir, "srv", "data"),
      node: path.join(bin, "server-node"),
      vault_key_file: key,
      ...(services === null ? {} : { services: services ?? [{ ...ENTRY, account, file }] }),
    },
  };
  const siteFile = path.join(dir, "site.json");
  fs.writeFileSync(siteFile, JSON.stringify(site));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SITE: siteFile, KIT_NODE: process.execPath, RC_SERVICE_ROOT_OWNER: folderOwner, FAKE_STATE: stateFile, FAKE_LOG: log };
  const go = (args = [], extra = {}) => {
    const r = spawnSync("bash", [path.join(here, "../rc-service.sh"), ...args], { env: { ...env, ...extra }, encoding: "utf8" });
    return {
      r,
      out: r.stdout + r.stderr,
      text: fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null,
      mode: fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : null,
      calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "",
      state: fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {},
      files: fs.readdirSync(run),
    };
  };
  return { go, file, log };
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
