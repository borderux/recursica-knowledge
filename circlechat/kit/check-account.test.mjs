// kit/check-account.mjs against stand-ins: an in-memory copy of CircleChat's tables for the
// account's rules, stand-in packages for the script the api container runs, and a stand-in docker
// that records its arguments. Nothing here reaches Docker or a database.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ACCOUNT_SCRIPT, HANDLE, ensureAccount, readCheckPassword, run } from "./check-account.mjs";

const PASSWORD = "stand-in-password-0123456789";
const EMAIL = "agent-check@circlechat.example.com";

// CircleChat's users, workspace_members and members tables, in memory.
function store({ workspaces = [{ id: "w_agents", agents: 2 }], users = [], memberships = [] } = {}) {
  const s = { workspaces, users: [...users], memberships: [...memberships], members: [] };
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
  };
  return { s, db };
}
let seq = 0;
const opts = (password = PASSWORD) => ({
  email: EMAIL, password, handle: HANDLE, name: "Agent check",
  hash: async (pw) => `hashed:${pw}`, compare: async (pw, h) => h === `hashed:${pw}`, newId: (p) => `${p}_${++seq}`,
});

test("makes the account as a member of the agents' workspace, and a second run changes nothing", async () => {
  const { s, db } = store({ workspaces: [{ id: "w_empty", agents: 0 }, { id: "w_agents", agents: 3 }] });
  const first = await ensureAccount(db, opts());
  assert.equal(first.workspaceId, "w_agents");
  assert.deepEqual(first.changes, ["made the account", "joined the agents' workspace as a member"]);
  assert.equal(s.users.length, 1);
  assert.equal(s.users[0].handle, HANDLE);
  assert.notEqual(s.users[0].passwordHash, PASSWORD, "only the hash is stored");
  assert.deepEqual(s.memberships.map((m) => m.role), ["member"]);
  assert.equal(s.members.length, 1);
  const again = await ensureAccount(db, opts());
  assert.deepEqual(again.changes, []);
  assert.equal(s.users.length, 1);
  assert.equal(s.memberships.length, 1);
  assert.equal(s.members.length, 1);
});

test("an account made an admin is set back to member, and leaves every other workspace", async () => {
  const user = { id: "u_check", email: EMAIL, name: "Agent check", handle: HANDLE, passwordHash: `hashed:${PASSWORD}` };
  const { s, db } = store({
    workspaces: [{ id: "w_agents", agents: 1 }, { id: "w_other", agents: 0 }],
    users: [user],
    memberships: [{ workspaceId: "w_other", userId: "u_check", role: "admin" }, { workspaceId: "w_agents", userId: "u_check", role: "admin" }],
  });
  const r = await ensureAccount(db, opts());
  assert.deepEqual(r.changes, ["left another workspace, where the account was admin", "set the role from admin back to member"]);
  assert.deepEqual(s.memberships, [{ workspaceId: "w_agents", userId: "u_check", role: "member" }]);
  assert.deepEqual((await ensureAccount(db, opts())).changes, []);
});

test("a new password from the secrets deploy replaces the stored one", async () => {
  const { s, db } = store();
  await ensureAccount(db, opts());
  const r = await ensureAccount(db, opts("a-rotated-password-0123456789"));
  assert.deepEqual(r.changes, ["set the delivered password"]);
  assert.equal(s.users[0].passwordHash, "hashed:a-rotated-password-0123456789");
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
    return Promise.resolve([]);
  };
  return { begin: async (fn) => fn(tx), end: async () => {} };
}
`);
  return app;
}

test("the api container's script makes the account through CircleChat's own packages, with the password on stdin only", () => {
  const app = fakeApp();
  const log = path.join(app, "sql.log");
  fs.writeFileSync(log, "");
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", ACCOUNT_SCRIPT], {
    cwd: app, env: { ...process.env, FAKE_SQL_LOG: log, DATABASE_URL: "postgres://stand-in" },
    input: JSON.stringify({ email: EMAIL, password: PASSWORD, handle: HANDLE, name: "Agent check" }), encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim());
  assert.equal(out.ok, true, r.stdout);
  assert.deepEqual(out.changes, ["made the account", "joined the agents' workspace as a member"]);
  const sql = fs.readFileSync(log, "utf8");
  assert.match(sql, /^insert into users \(id, email, name, handle, password_hash\)/m);
  assert.match(sql, /^insert into workspace_members .* 'member'\)/m);
  assert.doesNotMatch(sql, /'admin'/);
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
  const r = run({ ccDir: cc, site, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
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
  const bad = run({ ccDir: cc, site, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(bad.ok, false);
  assert.ok(bad.lines.every((l) => !l.includes(PASSWORD)), bad.lines.join("\n"));
  // No running api container: a clear message.
  fs.writeFileSync(path.join(bin, "docker"), "#!/usr/bin/env bash\ncat >/dev/null\nexit 1\n", { mode: 0o755 });
  const down = run({ ccDir: cc, site, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.match(down.lines[0], /api container did not answer/);
});
