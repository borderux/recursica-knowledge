// circlechat/rc-session.sh and recursicachat.sessions in site.json: a member session for a program
// outside the server, made through the server's root-only CLI into a file only that program's
// account can read. The script runs here with stand-ins for the CLI and sudo.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rcSessionErrors, recursicachatErrors } from "./render.mjs";
import { main, rcSessions } from "./rc-sync.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ME = os.userInfo().username;
const ENTRY = { email: "program@example.com", account: "_program", file: "/opt/program/run/session" };

test("recursicachat.sessions: an email, a non-root account and a file outside the server's folders", () => {
  assert.deepEqual(rcSessionErrors({}), []);
  assert.deepEqual(rcSessionErrors({ sessions: [ENTRY] }), []);
  const bad = (entry, re) => assert.ok(rcSessionErrors({ sessions: [{ ...ENTRY, ...entry }] }).some((e) => re.test(e)), JSON.stringify(entry));
  bad({ email: "not-an-email" }, /email must be/);
  bad({ account: "root" }, /not root/);
  bad({ account: "Has Space" }, /account must be/);
  bad({ file: "relative/session" }, /absolute path/);
  bad({ file: "/opt/program/../etc/session" }, /absolute path/);
  bad({ file: "/opt/recursicachat/data/session" }, /outside the server's folders/);
  bad({ extra: 1 }, /extra is not a setting/);
  assert.match(rcSessionErrors({ sessions: {} })[0], /must be a list/);
  assert.ok(rcSessionErrors({ sessions: [ENTRY, ENTRY] }).some((e) => /listed twice/.test(e)));
  assert.ok(recursicachatErrors({ site: {}, recursicachat: { sessions: [{ ...ENTRY, account: "root" }] } }).some((e) => /not root/.test(e)), "the site check runs it");
});

test("rc-sync.mjs sessions prints one tab-separated line for each entry", async () => {
  assert.deepEqual(rcSessions({ recursicachat: { sessions: [ENTRY] } }), [[ENTRY.email, ENTRY.account, ENTRY.file]]);
  assert.deepEqual(rcSessions({}), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-session-site-"));
  const file = path.join(dir, "site.json");
  fs.writeFileSync(file, JSON.stringify({ site: { public_host: "chat.example.ts.net" }, recursicachat: { sessions: [ENTRY] } }));
  let out = "";
  const code = await main(["sessions", file], { out: (t) => (out += t), log: () => {} });
  assert.equal(code, 0);
  assert.equal(out, `${ENTRY.email}\t${ENTRY.account}\t${ENTRY.file}\n`);
});

// The script with stand-ins: sudo runs its command; the server's Node answers `session` with a
// token, or fails. Every CLI call is logged with whether the vault key reached it in its environment.
const TOKEN = "Ab_" + "c".repeat(40);
function run({ cliFails = false, account = ME, folderMode = 0o755, folderOwner = ME, sessions, args = ["--once"] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-session-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const log = path.join(dir, "calls.log");
  const script = (name, body) => {
    fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
    fs.chmodSync(path.join(bin, name), 0o755);
  };
  script("sudo", `exec "$@"`);
  script("server-node", [
    `[ "$1" = -p ] && { echo 24; exit 0; }`,
    `echo "cli $2 $3 $4 $5 key=\${CIRCLECHAT_MASTER_KEY:+set}" >> "${log}"`,
    cliFails ? `echo "an owner or an admin gets no session" >&2; exit 1` : `echo ${TOKEN}`,
  ].join("\n"));
  const run = path.join(dir, "run");
  fs.mkdirSync(run);
  fs.chmodSync(run, folderMode);
  const file = path.join(run, "session");
  fs.writeFileSync(file, "old-session\n");
  const key = path.join(dir, "vault.key");
  fs.writeFileSync(key, "vault-key-standin\n");
  const site = {
    site: { public_host: "chat.example.ts.net" },
    recursicachat: {
      app: path.join(dir, "srv", "app"),
      data: path.join(dir, "srv", "data"),
      node: path.join(bin, "server-node"),
      vault_key_file: key,
      ...(sessions === undefined ? { sessions: [{ email: "program@example.com", account, file }] } : sessions === null ? {} : { sessions }),
    },
  };
  const siteFile = path.join(dir, "site.json");
  fs.writeFileSync(siteFile, JSON.stringify(site));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SITE: siteFile, KIT_NODE: process.execPath, RC_SESSION_ROOT_OWNER: folderOwner };
  const r = spawnSync("bash", [path.join(here, "../rc-session.sh"), ...args], { env, encoding: "utf8" });
  const st = fs.statSync(file);
  return { r, out: r.stdout + r.stderr, file, text: fs.readFileSync(file, "utf8"), mode: st.mode & 0o777, calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "", run };
}

test("rc-session.sh writes a 60-minute session into the file, mode 400, and never prints it", () => {
  const { r, out, text, mode, calls, run: folder } = run();
  assert.equal(r.status, 0, out);
  assert.equal(text, `${TOKEN}\n`);
  assert.equal(mode, 0o400);
  assert.ok(!out.includes(TOKEN), "the token is never in the output");
  assert.match(out, /a new session in .*session, for 60 minutes/);
  assert.match(calls, /^cli session program@example\.com --minutes 60 key=set$/m, "the vault key reaches the CLI in its environment");
  assert.ok(!calls.includes("vault-key-standin"), "never as an argument");
  assert.deepEqual(fs.readdirSync(folder), ["session"], "no temporary file is left");
});

test("rc-session.sh keeps the old file when the server makes no session, and says why", () => {
  const { r, out, text } = run({ cliFails: true });
  assert.equal(r.status, 1);
  assert.equal(text, "old-session\n");
  assert.match(out, /made no session/);
});

test("rc-session.sh refuses a folder the program could change, and an account that does not exist", () => {
  const writable = run({ folderMode: 0o775 });
  assert.equal(writable.r.status, 1);
  assert.match(writable.out, /no write for the group or others/);
  assert.equal(writable.text, "old-session\n");
  const notRoots = run({ folderOwner: "someone-else" });
  assert.equal(notRoots.r.status, 1);
  assert.match(notRoots.out, /must belong to someone-else/);
  const noAccount = run({ account: "_no-such-account" });
  assert.equal(noAccount.r.status, 1);
  assert.match(noAccount.out, /there is no account _no-such-account/);
  assert.equal(noAccount.calls, "", "no session is made for it");
});

test("rc-session.sh does nothing without sessions in site.json, and refuses an interval longer than a session", () => {
  const none = run({ sessions: null });
  assert.equal(none.r.status, 0);
  assert.match(none.out, /lists no recursicachat\.sessions/);
  assert.equal(none.calls, "");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-session-every-"));
  const r = spawnSync("bash", [path.join(here, "../rc-session.sh"), "--once"], {
    env: { ...process.env, SITE: path.join(dir, "none.json"), KIT_NODE: process.execPath, RC_SESSION_EVERY: "3600" },
    encoding: "utf8",
  });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /RC_SESSION_EVERY must be 60 to 3000 seconds/);
});
