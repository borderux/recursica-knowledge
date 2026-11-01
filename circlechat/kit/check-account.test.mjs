// kit/check-account.mjs and check-agent.sh against stand-ins: an in-memory copy of CircleChat's
// tables for the account's rules, stand-in packages for the script the api container runs, a
// stand-in docker that records its arguments, and a stand-in node for check-agent.sh. Nothing here
// reaches Docker or a database.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ACCOUNT_SCRIPT, HANDLE, ensureAccount, readCheckPassword, run } from "./check-account.mjs";

const CHECK_AGENT = fileURLToPath(new URL("../check-agent.sh", import.meta.url));

const PASSWORD = "stand-in-password-0123456789";
const EMAIL = "agent-check@circlechat.example.com";

// CircleChat's users, workspace_members and members tables, in memory.
function store({ workspaces = [{ id: "w_agents", agents: 2 }], users = [], memberships = [] } = {}) {
  const s = { workspaces, users: [...users], memberships: [...memberships], members: [], sessions: [] };
  const db = {
    workspaces: async () => s.workspaces,
    userByEmail: async (e) => s.users.find((u) => u.email.toLowerCase() === e) ?? null,
    handleTaken: async (h) => s.users.some((u) => u.handle.toLowerCase() === h.toLowerCase()),
    createUser: async (u) => { s.users.push({ ...u }); },
    setPassword: async (id, h) => { s.users.find((u) => u.id === id).passwordHash = h; },
    memberships: async (id) => s.memberships.filter((m) => m.userId === id).map(({ workspaceId, role }) => ({ workspaceId, role })),
    addMembership: async (w, id) => { s.memberships.push({ workspaceId: w, userId: id, role: "member" }); },
    setMemberRole: async (w, id) => { s.memberships.find((m) => m.workspaceId === w && m.userId === id).role = "member"; },
    removeMembership: async (w, id) => { s.memberships = s.memberships.filter((m) => !(m.workspaceId === w && m.userId === id)); },
    ensureMember: async (w, id, mid) => { if (!s.members.some((m) => m.workspaceId === w && m.refId === id)) s.members.push({ id: mid, workspaceId: w, kind: "user", refId: id }); },
    endSessions: async (id) => { const n = s.sessions.filter((x) => x.userId === id).length; s.sessions = s.sessions.filter((x) => x.userId !== id); return n; },
  };
  return { s, db };
}
let seq = 0;
// Locked by default; { unlock: true } is a check's unlock.
const opts = ({ unlock = false, password = PASSWORD } = {}) => ({
  email: EMAIL, password: unlock ? password : "", unlock, handle: HANDLE, name: "Agent check",
  hash: async (pw) => `hashed:${pw}`, compare: async (pw, h) => h === `hashed:${pw}`, newId: (p) => `${p}_${++seq}`,
  secret: () => `secret-${++seq}`,
});
// Whether the delivered password would sign in: CircleChat compares it with the stored hash.
const signsIn = (s, password = PASSWORD) => s.users[0]?.passwordHash === `hashed:${password}`;

test("makes the account as a member of the agents' workspace, locked, and a second run keeps it so", async () => {
  const { s, db } = store({ workspaces: [{ id: "w_empty", agents: 0 }, { id: "w_agents", agents: 3 }] });
  const first = await ensureAccount(db, opts());
  assert.equal(first.workspaceId, "w_agents");
  assert.deepEqual(first.changes, ["made the account", "locked the account", "joined the agents' workspace as a member"]);
  assert.equal(s.users.length, 1);
  assert.equal(s.users[0].handle, HANDLE);
  assert.equal(signsIn(s), false, "made locked: the delivered password signs in nowhere");
  assert.deepEqual(s.memberships.map((m) => m.role), ["member"]);
  assert.equal(s.members.length, 1);
  const again = await ensureAccount(db, opts());
  assert.deepEqual(again.changes, ["locked the account"]);
  assert.equal(signsIn(s), false);
  assert.equal(s.users.length, 1);
  assert.equal(s.memberships.length, 1);
  assert.equal(s.members.length, 1);
});

test("unlocked only for a check: unlock sets the delivered password, lock replaces it and ends every session", async () => {
  const { s, db } = store();
  await ensureAccount(db, opts());
  const open = await ensureAccount(db, opts({ unlock: true }));
  assert.deepEqual(open.changes, ["unlocked the account for this check"]);
  assert.equal(signsIn(s), true);
  // The check signs in, and something else signs in with the same password while it runs.
  s.sessions.push({ id: "s_check", userId: s.users[0].id }, { id: "s_other", userId: s.users[0].id });
  const shut = await ensureAccount(db, opts());
  assert.deepEqual(shut.changes, ["locked the account, and ended 2 sessions"]);
  assert.equal(signsIn(s), false);
  assert.equal(s.sessions.length, 0);
  // Locking needs no password: a stack without agent-check.env can still lock the account.
  assert.equal(opts().password, "");
  // Each lock is a fresh secret, never the delivered password.
  const before = s.users[0].passwordHash;
  await ensureAccount(db, opts());
  assert.notEqual(s.users[0].passwordHash, before);
  assert.equal(signsIn(s), false);
});

test("an account made an admin is set back to member, and leaves every other workspace", async () => {
  const user = { id: "u_check", email: EMAIL, name: "Agent check", handle: HANDLE, passwordHash: `hashed:${PASSWORD}` };
  const { s, db } = store({
    workspaces: [{ id: "w_agents", agents: 1 }, { id: "w_other", agents: 0 }],
    users: [user],
    memberships: [{ workspaceId: "w_other", userId: "u_check", role: "admin" }, { workspaceId: "w_agents", userId: "u_check", role: "admin" }],
  });
  const r = await ensureAccount(db, opts());
  assert.deepEqual(r.changes, ["locked the account", "left another workspace, where the account was admin", "set the role from admin back to member"]);
  assert.deepEqual(s.memberships, [{ workspaceId: "w_agents", userId: "u_check", role: "member" }]);
  assert.equal(signsIn(s), false, "an account found unlocked is locked");
  assert.deepEqual((await ensureAccount(db, opts())).changes, ["locked the account"]);
});

test("a check after a password rotation unlocks with the new password", async () => {
  const { s, db } = store();
  await ensureAccount(db, opts());
  await ensureAccount(db, opts({ unlock: true, password: "a-rotated-password-0123456789" }));
  assert.equal(signsIn(s, "a-rotated-password-0123456789"), true);
  assert.equal(signsIn(s), false, "the old password signs in nowhere");
});

test("stops with a message when the workspace is unclear or the handle belongs to another account", async () => {
  await assert.rejects(ensureAccount(store({ workspaces: [] }).db, opts()), /no workspace yet/);
  await assert.rejects(ensureAccount(store({ workspaces: [{ id: "a", agents: 1 }, { id: "b", agents: 1 }] }).db, opts()), /2 workspaces with agents/);
  const taken = store({ users: [{ id: "u_x", email: "person-a@example.com", name: "A", handle: HANDLE, passwordHash: "x" }] });
  await assert.rejects(ensureAccount(taken.db, opts()), /already has the handle agent-check/);
  assert.equal(taken.s.memberships.length, 0);
  // With no agent yet, the only workspace is the agents' workspace.
  assert.equal((await ensureAccount(store({ workspaces: [{ id: "w_1", agents: 0 }] }).db, opts())).workspaceId, "w_1");
});

test("the password comes from agent-check.env only, and a short or missing one is refused without printing it", () => {
  const cc = fs.mkdtempSync(path.join(os.tmpdir(), "check-account-"));
  assert.throws(() => readCheckPassword(cc), /no .*agent-check\.env.*CC_CHECK_PASSWORD/);
  fs.writeFileSync(path.join(cc, "agent-check.env"), "CC_CHECK_PASSWORD=short\n");
  assert.throws(() => readCheckPassword(cc), (e) => /at least 16 characters/.test(e.message) && !e.message.includes("short\n"));
  fs.writeFileSync(path.join(cc, "agent-check.env"), `CC_CHECK_PASSWORD=${PASSWORD}\n`);
  assert.equal(readCheckPassword(cc), PASSWORD);
});

// The api container's packages, as stand-ins: postgres answers each query from the in-memory
// tables above, bcryptjs prefixes, and nanoid counts.
function fakeApp() {
  const app = fs.mkdtempSync(path.join(os.tmpdir(), "check-account-app-"));
  const mod = (name, body) => {
    fs.mkdirSync(path.join(app, "node_modules", name), { recursive: true });
    fs.writeFileSync(path.join(app, "node_modules", name, "package.json"), JSON.stringify({ name, type: "module", main: "index.js" }));
    fs.writeFileSync(path.join(app, "node_modules", name, "index.js"), body);
  };
  mod("bcryptjs", "export default { hash: async (p) => 'hashed:' + p, compare: async (p, h) => h === 'hashed:' + p };\n");
  mod("nanoid", "let n = 0; export const customAlphabet = () => () => String(++n);\n");
  mod("postgres", `import fs from "node:fs";
const log = process.env.FAKE_SQL_LOG;
export default function postgres() {
  const rows = { users: [], wm: [] };
  const tx = (strings, ...v) => {
    const text = strings.join("?").replace(/\\s+/g, " ").trim();
    fs.appendFileSync(log, text + " | " + v.map((x) => (String(x).startsWith("hashed:") ? "<hash>" : x)).join(",") + "\\n");
    if (text.startsWith("select w.id")) return Promise.resolve([{ id: "w_agents", agents: 1 }]);
    if (text.startsWith("select id, password_hash")) return Promise.resolve(rows.users.filter((u) => u.email === v[0]));
    if (text.startsWith("select 1 from users")) return Promise.resolve([]);
    if (text.startsWith("insert into users")) { rows.users.push({ id: v[0], email: v[1], passwordHash: v[4] }); return Promise.resolve([]); }
    if (text.startsWith("select workspace_id")) return Promise.resolve(rows.wm);
    if (text.startsWith("insert into workspace_members")) { rows.wm.push({ workspaceId: v[0], role: "member" }); return Promise.resolve([]); }
    if (text.startsWith("delete from sessions")) return Promise.resolve([{ id: "s_1" }]);
    return Promise.resolve([]);
  };
  return { begin: async (fn) => fn(tx), end: async () => {} };
}
`);
  return app;
}

function runScript(input) {
  const app = fakeApp();
  const log = path.join(app, "sql.log");
  fs.writeFileSync(log, "");
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", ACCOUNT_SCRIPT], {
    cwd: app, env: { ...process.env, FAKE_SQL_LOG: log, DATABASE_URL: "postgres://stand-in" },
    input: JSON.stringify({ email: EMAIL, handle: HANDLE, name: "Agent check", ...input }), encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  return { out: JSON.parse(r.stdout.trim()), sql: fs.readFileSync(log, "utf8") };
}

test("the api container's script makes the account locked, through CircleChat's own packages", () => {
  const { out, sql } = runScript({ password: "", unlock: false });
  assert.equal(out.ok, true);
  assert.deepEqual(out.changes, ["made the account", "locked the account, and ended 1 session", "joined the agents' workspace as a member"]);
  assert.match(sql, /^insert into users \(id, email, name, handle, password_hash\)/m);
  assert.match(sql, /^delete from sessions where user_id = \?/m);
  assert.match(sql, /^insert into workspace_members .* 'member'\)/m);
  assert.doesNotMatch(sql, /'admin'/);
});

test("the api container's script unlocks with the password from stdin, and stores only its hash", () => {
  const { out, sql } = runScript({ password: PASSWORD, unlock: true });
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.deepEqual(out.changes, ["made the account", "unlocked the account for this check", "joined the agents' workspace as a member"]);
  assert.doesNotMatch(sql, /delete from sessions/);
  assert.ok(!sql.includes(PASSWORD), "only the hash reaches the database");
});

test("the step passes the password to the api container on stdin, never in an argument, and never prints it", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "check-account-run-"));
  const cc = path.join(home, "circlechat");
  fs.mkdirSync(path.join(cc, "kit-out"), { recursive: true });
  fs.writeFileSync(path.join(cc, "kit-out", "tenant.env"), "TENANT=acme\nDOCKER_CONTEXT=colima-acme\n");
  fs.writeFileSync(path.join(cc, "agent-check.env"), `CC_CHECK_PASSWORD=${PASSWORD}\n`, { mode: 0o600 });
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin);
  const log = path.join(home, "docker.log");
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash
in="$(cat)"
{ echo "args=$*"; echo "context=$DOCKER_CONTEXT pwd=$(pwd)"; echo "stdin=$in"; } > "${log}"
echo '{"ok":true,"workspaceId":"w_1","changes":["set the role from admin back to member"]}'
`, { mode: 0o755 });
  const site = { site: { public_host: "circlechat.example.com" } };
  const r = run({ ccDir: cc, site, mode: "unlock", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(r.ok, true, r.lines.join("\n"));
  assert.match(r.lines[0], new RegExp(`${EMAIL} is a member of the agents' workspace, never an admin: set the role from admin back to member`));
  const calls = fs.readFileSync(log, "utf8");
  const args = calls.split("\n").find((l) => l.startsWith("args="));
  assert.match(args, /^args=compose exec -T api node --input-type=module -e /);
  assert.ok(!args.includes(PASSWORD), "no password in docker's arguments");
  assert.match(calls, new RegExp(`^context=colima-acme pwd=${cc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.equal(JSON.parse(calls.split("\n").find((l) => l.startsWith("stdin=")).slice(6)).password, PASSWORD);
  assert.ok(r.lines.every((l) => !l.includes(PASSWORD)));
  // A refusal from the container is printed without the password.
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash\ncat >/dev/null\necho '{"ok":false,"error":"bad ${PASSWORD}"}'\n`, { mode: 0o755 });
  const bad = run({ ccDir: cc, site, mode: "unlock", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(bad.ok, false);
  assert.ok(bad.lines.every((l) => !l.includes(PASSWORD)), bad.lines.join("\n"));
  // No running api container: a clear message.
  fs.writeFileSync(path.join(bin, "docker"), "#!/usr/bin/env bash\ncat >/dev/null\nexit 1\n", { mode: 0o755 });
  const down = run({ ccDir: cc, site, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.match(down.lines[0], /api container did not answer/);
});

test("locking reads no password, and an unknown mode is refused", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "check-account-lock-"));
  const cc = path.join(home, "circlechat");
  fs.mkdirSync(cc, { recursive: true });
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin);
  const log = path.join(home, "stdin.log");
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash\ncat > "${log}"\necho '{"ok":true,"workspaceId":"w_1","changes":["locked the account"]}'\n`, { mode: 0o755 });
  const site = { site: { public_host: "circlechat.example.com" } };
  // No agent-check.env at all: locking still works.
  const r = run({ ccDir: cc, site, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(r.ok, true, r.lines.join("\n"));
  const sent = JSON.parse(fs.readFileSync(log, "utf8"));
  assert.equal(sent.unlock, false);
  assert.equal(sent.password, "");
  assert.match(run({ ccDir: cc, site, mode: "open" }).lines[0], /unknown mode open/);
  // Unlocking needs the password file.
  assert.match(run({ ccDir: cc, site, mode: "unlock" }).lines[0], /no .*agent-check\.env/);
});

// check-agent.sh with a stand-in node: it records each call to the account step and the check,
// and makes the check pass, fail, error out or hang until a signal.
function runCheckAgent(checkBehavior, { signal } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "check-agent-sh-"));
  const cc = path.join(home, "circlechat");
  fs.mkdirSync(cc, { recursive: true });
  fs.writeFileSync(path.join(cc, ".env"), "CC_API_BASE=http://127.0.0.1:9/api\n");
  const log = path.join(home, "calls.log");
  const stub = path.join(home, "node-stub");
  fs.writeFileSync(stub, `#!/usr/bin/env bash
script="$(basename "$1")"; shift
echo "$script $*" >> "${log}"
if [ "$script" = agent-check.mjs ]; then
  case "${checkBehavior}" in
    pass) exit 0 ;;
    fail) echo "FAIL check 1"; exit 1 ;;
    hang) sleep 30 ;;
  esac
fi
if [ "$script" = check-account.mjs ] && [ "$1" = unlock ] && [ "${checkBehavior}" = "unlock-fails" ]; then exit 1; fi
exit 0
`, { mode: 0o755 });
  const env = { ...process.env, HOME: home, CC_DIR: cc, CHECK_NODE: stub };
  if (!signal) {
    const r = spawnSync("bash", [CHECK_AGENT, "writer"], { env, encoding: "utf8" });
    return { status: r.status, calls: fs.readFileSync(log, "utf8").trim().split("\n") };
  }
  return new Promise((resolve) => {
    const child = spawn("bash", [CHECK_AGENT, "writer"], { env });
    const wait = setInterval(() => {
      if (fs.existsSync(log) && fs.readFileSync(log, "utf8").includes("agent-check.mjs")) {
        clearInterval(wait);
        child.kill(signal);
      }
    }, 50);
    child.on("exit", (code) => resolve({ status: code, calls: fs.readFileSync(log, "utf8").trim().split("\n") }));
  });
}

test("check-agent.sh unlocks, runs the check, and locks again when the check passes or fails", () => {
  for (const [behavior, status] of [["pass", 0], ["fail", 1]]) {
    const r = runCheckAgent(behavior);
    assert.deepEqual(r.calls, ["check-account.mjs unlock", "agent-check.mjs writer", "check-account.mjs lock"], behavior);
    assert.equal(r.status, status, behavior);
  }
});

test("check-agent.sh locks again when the unlock fails, and when the check is interrupted", async () => {
  const failed = runCheckAgent("unlock-fails");
  assert.deepEqual(failed.calls, ["check-account.mjs unlock", "check-account.mjs lock"]);
  assert.equal(failed.status, 2);
  for (const signal of ["SIGINT", "SIGTERM"]) {
    const r = await runCheckAgent("hang", { signal });
    assert.equal(r.calls.at(-1), "check-account.mjs lock", signal);
    assert.equal(r.calls.filter((c) => c.endsWith("lock") && c.startsWith("check-account.mjs lock")).length, 1, signal);
  }
});
