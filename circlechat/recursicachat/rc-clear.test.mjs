// rc-clear.mjs on a real SQLite database, and rc-clear.sh run as a plain account in a folder laid
// out like /opt/recursicachat, with stand-ins: launchctl that keeps a file for each loaded job,
// curl that answers /healthz while the server's job is loaded, and sleep that returns at once.
// The script runs with /bin/bash, as its first line says: on a Mac, the bash that macOS ships.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { WORK, KEPT, Refusal, refusals, summary, clear, copy, main } from "./rc-clear.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// The server's tables, with the columns these tests need. A child names its parent with no
// ON DELETE CASCADE, so a delete in the wrong order fails. tool_calls counts its own rows, which
// makes SQLite's own sqlite_sequence table.
const SCHEMA = `
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL);
CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id));
CREATE TABLE agents (id TEXT PRIMARY KEY, handle TEXT NOT NULL);
CREATE TABLE secrets (id TEXT PRIMARY KEY);
CREATE TABLE service_accounts (id TEXT PRIMARY KEY);
CREATE TABLE grants (resource_id TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL DEFAULT '');
CREATE TABLE triggers (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL);
CREATE TABLE bridges (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL);
CREATE TABLE usage (agent_id TEXT NOT NULL, day TEXT NOT NULL);
CREATE TABLE tool_calls (seq INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL DEFAULT '');
CREATE TABLE memories (id TEXT PRIMARY KEY, scope TEXT NOT NULL, scope_id TEXT NOT NULL DEFAULT '');
CREATE TABLE chats (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE chat_members (chat_id TEXT NOT NULL REFERENCES chats(id), member_id TEXT NOT NULL);
CREATE TABLE chat_reads (chat_id TEXT NOT NULL, user_id TEXT NOT NULL);
CREATE TABLE messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES chats(id), body TEXT NOT NULL DEFAULT '');
CREATE TABLE tasks (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES chats(id), plan_id TEXT NOT NULL DEFAULT '');
CREATE TABLE files (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES chats(id), message_id TEXT REFERENCES messages(id));
CREATE TABLE file_texts (file_id TEXT PRIMARY KEY, text TEXT NOT NULL DEFAULT '');
CREATE TABLE deliveries (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL);
CREATE TABLE service_requests (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL);
CREATE TABLE service_instructions (delivery_id TEXT PRIMARY KEY, service_id TEXT NOT NULL, private INTEGER NOT NULL DEFAULT 0, fresh INTEGER NOT NULL DEFAULT 0);
CREATE TABLE service_replies (delivery_id TEXT PRIMARY KEY, service_id TEXT NOT NULL, chat_id TEXT NOT NULL, body TEXT NOT NULL);
CREATE TABLE approvals (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL DEFAULT '');
CREATE TABLE agent_sessions (agent_id TEXT NOT NULL, scope TEXT NOT NULL);
`;
const ROWS = `
INSERT INTO settings VALUES ('workspace', 'acme');
INSERT INTO users VALUES ('u_1', 'person-a@example.com'), ('u_2', 'person-b@example.com');
INSERT INTO sessions VALUES ('s_1', 'u_1');
INSERT INTO agents VALUES ('a_1', 'designer');
INSERT INTO secrets VALUES ('k_1');
INSERT INTO service_accounts VALUES ('sv_1');
INSERT INTO grants VALUES ('mcp_1', 'workspace', ''), ('mcp_1', 'agent', 'a_1');
INSERT INTO usage(agent_id, day) VALUES ('a_1', '2026-01-01');
INSERT INTO tool_calls(chat_id) VALUES ('c_1'), ('c_2');
INSERT INTO memories VALUES ('m_chat', 'chat', 'c_1'), ('m_team', 'team', ''), ('m_agent', 'agent', 'a_1');
INSERT INTO chats VALUES ('c_1', 'General'), ('c_2', 'A direct chat');
INSERT INTO chat_members VALUES ('c_1', 'u_1'), ('c_1', 'a_1'), ('c_2', 'u_2');
INSERT INTO chat_reads VALUES ('c_1', 'u_1');
INSERT INTO messages VALUES ('msg_1', 'c_1', 'hello'), ('msg_2', 'c_1', 'a plan'), ('msg_3', 'c_2', 'hi');
INSERT INTO tasks VALUES ('t_1', 'c_1', 'p_1');
INSERT INTO files VALUES ('f_one', 'c_1', 'msg_1'), ('f_two', 'c_1', NULL);
INSERT INTO file_texts VALUES ('f_one', 'the text of an upload');
INSERT INTO deliveries VALUES ('d_1', 'c_1');
INSERT INTO service_requests VALUES ('r_1', 'c_1');
INSERT INTO service_instructions VALUES ('d_1', 'sv_1', 1, 1);
INSERT INTO service_replies VALUES ('d_1', 'sv_1', 'c_1', 'a reply for the service alone');
INSERT INTO approvals VALUES ('ap_1', 'c_1');
INSERT INTO agent_sessions VALUES ('a_1', 'c_1');
`;
// A kept table whose rows name a chat, for the tests of a delete that fails or reaches too far.
const USAGE = "CREATE TABLE usage (agent_id TEXT NOT NULL, day TEXT NOT NULL);";
const usageNamesAChat = (rule = "") => SCHEMA.replace(USAGE, `CREATE TABLE usage (agent_id TEXT NOT NULL, day TEXT NOT NULL, chat_id TEXT REFERENCES chats(id)${rule});`);
const NAMES_A_CHAT = "UPDATE usage SET chat_id = 'c_1';";
const WORK_LINE = "2 chats, 3 messages, 1 task and 2 files";
const KEPT_LINE = "2 people, 1 agent, 1 secret and 1 service";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rc-clear-"));
/** A database file with the server's tables and rows, changed by `more`. */
function makeDb(file, { schema = SCHEMA, more = "" } = {}) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(schema);
  db.exec(ROWS);
  db.exec(more);
  return db;
}
const count = (db, table, where = "") => db.prepare(`SELECT count(*) AS n FROM ${table} ${where}`).get().n;
const tableNames = (db) => db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
const workTables = WORK.map(([t]) => t).filter((t) => t !== "memories");

test("the fixture has every table rc-clear lists as work, and no table rc-clear does not list", () => {
  const db = makeDb(path.join(tmp(), "t.db"));
  const have = tableNames(db).filter((t) => !t.startsWith("sqlite_"));
  for (const [t] of WORK) assert.ok(have.includes(t), t);
  for (const t of have) assert.ok(WORK.some(([w]) => w === t) || KEPT.includes(t), t);
  assert.deepEqual(refusals(db), []);
  db.close();
});

test("clear deletes the work's rows, children first, keeps the rest, and drops no table", () => {
  const db = makeDb(path.join(tmp(), "t.db"));
  const tablesBefore = tableNames(db);
  assert.deepEqual(summary(db), { work: WORK_LINE, kept: KEPT_LINE });

  assert.deepEqual(clear(db), { emptied: WORK_LINE, kept: KEPT_LINE });

  for (const t of workTables) assert.equal(count(db, t), 0, t);
  assert.deepEqual(tableNames(db), tablesBefore, "every table is still there");
  assert.equal(count(db, "memories", "WHERE scope = 'chat'"), 0, "chat memories are work");
  assert.equal(count(db, "memories"), 2, "the team's and an agent's memories stay");
  assert.equal(count(db, "users"), 2);
  assert.equal(count(db, "sessions"), 1, "people stay signed in");
  assert.equal(count(db, "agents"), 1);
  assert.equal(count(db, "secrets"), 1);
  assert.equal(count(db, "service_accounts"), 1);
  assert.equal(count(db, "grants"), 2);
  assert.equal(count(db, "tool_calls"), 2, "the tool log stays whole");
  assert.equal(count(db, "usage"), 1);
  assert.equal(count(db, "settings"), 1);
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  db.close();
});

test("clear refuses a trigger, a bridge or a chat grant, and deletes nothing", () => {
  const cases = [
    ["INSERT INTO triggers VALUES ('tr_1', 'c_1');", "1 trigger"],
    ["INSERT INTO bridges VALUES ('b_1', 'c_1'), ('b_2', 'c_2');", "2 bridges"],
    ["INSERT INTO grants VALUES ('mcp_1', 'chat', 'c_1');", "1 chat grant"],
    ["INSERT INTO triggers VALUES ('tr_1', 'c_1'); INSERT INTO grants VALUES ('mcp_1', 'chat', 'c_1');", "1 trigger and 1 chat grant"],
  ];
  for (const [more, named] of cases) {
    const db = makeDb(path.join(tmp(), "t.db"), { more });
    assert.deepEqual(refusals(db), [`Rows that rc-clear keeps point at chats: ${named}. Remove each one first.`]);
    assert.throws(() => clear(db), Refusal, named);
    assert.deepEqual(summary(db), { work: WORK_LINE, kept: KEPT_LINE }, named);
    db.close();
  }
});

test("clear refuses a table rc-clear does not list, and deletes nothing", () => {
  const db = makeDb(path.join(tmp(), "t.db"), { more: "CREATE TABLE example_notes (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL); CREATE TABLE example_tags (id TEXT PRIMARY KEY);" });
  assert.deepEqual(refusals(db), ["The database has a table rc-clear does not list: example_notes, example_tags. Add each one to rc-clear.mjs first, as work or as kept."]);
  assert.throws(() => clear(db), Refusal);
  assert.equal(count(db, "messages"), 3);
  db.close();

  const other = new DatabaseSync(path.join(tmp(), "other.db"));
  other.exec("CREATE TABLE notes (id TEXT PRIMARY KEY);");
  assert.match(refusals(other)[0], /no chats table/, "not the server's database");
  other.close();
});

test("a table the server has not made yet is no problem", () => {
  const schema = SCHEMA.split("\n")
    .filter((l) => !/CREATE TABLE (file_texts|service_requests|service_instructions|service_replies|service_accounts|bridges) /.test(l))
    .join("\n");
  const db = new DatabaseSync(path.join(tmp(), "t.db"));
  db.exec(schema);
  db.exec("INSERT INTO chats VALUES ('c_1', 'General'); INSERT INTO messages VALUES ('msg_1', 'c_1', 'hello'); INSERT INTO users VALUES ('u_1', 'person-a@example.com');");
  assert.deepEqual(refusals(db), []);
  assert.deepEqual(clear(db), { emptied: "1 chat, 1 message, 0 tasks and 0 files", kept: "1 person, 0 agents, 0 secrets and 0 services" });
  assert.equal(count(db, "chats"), 0);
  db.close();
});

test("a failure inside the transaction undoes every delete", () => {
  assert.notEqual(usageNamesAChat(), SCHEMA);
  // A kept row names a chat, so the chat cannot be deleted.
  const blocks = makeDb(path.join(tmp(), "t.db"), { schema: usageNamesAChat(), more: NAMES_A_CHAT });
  assert.throws(
    () => clear(blocks),
    (e) => !(e instanceof Refusal) && /FOREIGN KEY/i.test(e.message),
  );
  assert.deepEqual(summary(blocks), { work: WORK_LINE, kept: KEPT_LINE });
  assert.equal(count(blocks, "file_texts"), 1, "the first delete is undone too");
  assert.equal(count(blocks, "memories"), 3);
  blocks.close();

  // A kept row goes when its chat goes: the transaction notices, and undoes itself.
  const cascades = makeDb(path.join(tmp(), "t.db"), { schema: usageNamesAChat(" ON DELETE CASCADE"), more: NAMES_A_CHAT });
  assert.throws(() => clear(cascades), /deleting the work also changed usage, which rc-clear keeps/);
  assert.deepEqual(summary(cascades), { work: WORK_LINE, kept: KEPT_LINE });
  assert.equal(count(cascades, "usage"), 1);
  cascades.close();
});

test("copy writes a whole copy that holds the rows, and never writes over a file", () => {
  const dir = tmp();
  const db = makeDb(path.join(dir, "t.db"));
  const to = path.join(dir, "copy.db");
  const bytes = copy(db, to);
  assert.equal(bytes, fs.statSync(to).size);
  const made = new DatabaseSync(to, { readOnly: true });
  assert.deepEqual(summary(made), { work: WORK_LINE, kept: KEPT_LINE });
  made.close();
  assert.throws(() => copy(db, to), /is already there/);
  db.close();
});

test("the command line: check reads only, and the exit code says what happened", () => {
  const dir = tmp();
  const file = path.join(dir, "t.db");
  makeDb(file).close();
  const run = (...args) => {
    const out = [];
    const err = [];
    return { code: main(args, (l) => out.push(l), (l) => err.push(l)), out: out.join("\n"), err: err.join("\n") };
  };
  assert.deepEqual(run("check", file), { code: 0, out: `work ${WORK_LINE}\nkept ${KEPT_LINE}`, err: "" });
  assert.deepEqual(run("clear", file), { code: 0, out: `emptied ${WORK_LINE}\nkept ${KEPT_LINE}`, err: "" });
  assert.equal(run("check", file).out, `work 0 chats, 0 messages, 0 tasks and 0 files\nkept ${KEPT_LINE}`);

  const again = new DatabaseSync(file);
  again.exec("INSERT INTO chats VALUES ('c_9', 'General'); INSERT INTO triggers VALUES ('tr_1', 'c_9');");
  again.close();
  for (const cmd of ["check", "clear"]) {
    const refused = run(cmd, file);
    assert.equal(refused.code, 3, cmd);
    assert.match(refused.out, /^Rows that rc-clear keeps point at chats: 1 trigger\. Remove each one first\.$/, cmd);
  }

  const missing = run("clear", path.join(dir, "none.db"));
  assert.equal(missing.code, 1);
  assert.match(missing.err, /no database at/);
  assert.ok(!fs.existsSync(path.join(dir, "none.db")), "a missing database is never made");
  assert.equal(run("copy", file).code, 2, "copy needs a place for the copy");
  assert.equal(run("empty", file).code, 2);
});

// ---- rc-clear.sh ----

function script(dir, name, body) {
  fs.writeFileSync(path.join(dir, name), `#!/usr/bin/env bash\n${body}\n`);
  fs.chmodSync(path.join(dir, name), 0o755);
}
const DAY = 24 * 60 * 60 * 1000;
/** A folder's names, sorted. Empty when the folder is missing or is not a folder. */
const ls = (d) => (fs.existsSync(d) && fs.statSync(d).isDirectory() ? fs.readdirSync(d).sort() : []);

/** A server folder with work in it, one program with a state folder, both jobs loaded, and the stand-ins. */
function setup({ more = "", schema = SCHEMA, programs } = {}) {
  const dir = tmp();
  const base = path.join(dir, "base");
  const data = path.join(base, "data");
  const state = path.join(dir, "program", "state");
  const copies = path.join(base, "copies");
  const loaded = path.join(dir, "loaded");
  for (const d of [path.join(data, "files"), path.join(base, "daemons"), copies, state, loaded]) fs.mkdirSync(d, { recursive: true });
  makeDb(path.join(data, "circlechat.db"), { schema, more }).close();
  for (const f of ["f_one", "f_two", "notes.txt"]) fs.writeFileSync(path.join(data, "files", f), `${f}\n`);
  for (const f of ["state.db", "state.db-wal"]) fs.writeFileSync(path.join(state, f), `${f}\n`);
  for (const job of ["test.rc-clear", "test.program"]) {
    fs.writeFileSync(path.join(base, "daemons", `${job}.plist`), "<plist/>\n");
    fs.writeFileSync(path.join(loaded, job), "");
  }

  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const calls = path.join(dir, "launchctl.log");
  script(
    bin,
    "launchctl",
    [
      'case "$1" in',
      `  print) [ -e "${loaded}/\${2#system/}" ] ;;`,
      "  bootout)",
      `    echo "bootout \${2#system/}" >> "${calls}"`,
      `    [ -e "${loaded}/\${2#system/}" ] || exit 3`,
      `    [ "\${2#system/}" = "\${FAKE_WONT_STOP:-}" ] || rm -f "${loaded}/\${2#system/}" ;;`,
      "  bootstrap)",
      '    job="$(basename "$3" .plist)"',
      `    echo "bootstrap $job" >> "${calls}"`,
      '    [ "$job" != "${FAKE_WONT_START:-}" ] || exit 5',
      `    touch "${loaded}/$job" ;;`,
      "esac",
    ].join("\n"),
  );
  script(bin, "curl", [`[ -e "${loaded}/test.rc-clear" ] || exit 7`, '[ -z "${FAKE_UNHEALTHY:-}" ] || exit 7', "echo ok"].join("\n"));
  script(bin, "sleep", "exit 0");

  const me = os.userInfo().username;
  const run = (extra = {}) => {
    const r = spawnSync("/bin/bash", [path.join(here, "rc-clear.sh")], {
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        RC_CLEAR_TEST: "1",
        RC_CLEAR_BASE: base,
        RC_CLEAR_NODE: process.execPath,
        RC_CLEAR_TOOL: path.join(here, "rc-clear.mjs"),
        RC_CLEAR_PROGRAMS: programs ?? `example-program:test.program:${me}:${state}`,
        ...extra,
      },
      encoding: "utf8",
    });
    const db = new DatabaseSync(path.join(data, "circlechat.db"), { readOnly: true });
    const now = summary(db);
    db.close();
    return {
      r,
      out: r.stdout + r.stderr,
      now,
      calls: fs.existsSync(calls) ? fs.readFileSync(calls, "utf8").trim().split("\n") : [],
      copies: ls(copies),
      stored: ls(path.join(data, "files")),
      state: ls(state),
      dataFolder: ls(data).filter((f) => !f.startsWith("circlechat.db")),
      loaded: ls(loaded),
      log: fs.existsSync(path.join(base, "rc-clear.log")) ? fs.readFileSync(path.join(base, "rc-clear.log"), "utf8") : "",
    };
  };
  return { run, base, data, state, copies };
}
const UNTOUCHED = { stored: ["f_one", "f_two", "notes.txt"], state: ["state.db", "state.db-wal"] };
const STOPPED_AND_STARTED = ["bootout test.program", "bootout test.rc-clear", "bootstrap test.rc-clear", "bootstrap test.program"];

test("rc-clear stops the program then the server, copies aside, empties the work, and starts both, in one summary line", () => {
  const s = setup();
  const r = s.run();
  assert.equal(r.r.status, 0, r.out + r.log);
  assert.equal(r.out.trim().split("\n").length, 1, "one line");
  assert.deepEqual(r.calls, STOPPED_AND_STARTED);
  assert.deepEqual(r.loaded, ["test.program", "test.rc-clear"]);
  assert.deepEqual(r.now, { work: "0 chats, 0 messages, 0 tasks and 0 files", kept: KEPT_LINE });

  assert.equal(r.copies.length, 1);
  assert.match(r.copies[0], /^rc-work-\d{8}-\d{6}$/);
  const copyDir = path.join(s.copies, r.copies[0]);
  assert.equal(r.out.trim(), `rc-clear: emptied ${WORK_LINE}; kept ${KEPT_LINE}. The server answers ok; started example-program. The copy is ${copyDir}.`);
  assert.equal(fs.statSync(copyDir).mode & 0o077, 0, "only its owner opens the copy");

  // the copy holds what was removed
  const saved = new DatabaseSync(path.join(copyDir, "circlechat.db"), { readOnly: true });
  assert.deepEqual(summary(saved), { work: WORK_LINE, kept: KEPT_LINE });
  saved.close();
  assert.deepEqual(fs.readdirSync(path.join(copyDir, "files")).sort(), UNTOUCHED.stored);
  assert.equal(fs.readFileSync(path.join(copyDir, "files", "f_one"), "utf8"), "f_one\n");
  assert.deepEqual(fs.readdirSync(path.join(copyDir, "state-example-program")).sort(), UNTOUCHED.state);

  // the stored files are gone and their folder stays; the program's state is cleared
  assert.deepEqual(r.stored, ["notes.txt"], "only the server's stored files go");
  assert.deepEqual(r.state, []);
  assert.deepEqual(r.dataFolder, ["files"], "no working copy is left in the data folder");
  assert.ok(!fs.existsSync(path.join(s.base, ".rc-clear.lock")), "the lock is gone");
  assert.match(r.log, /copied the database \(\d+ bytes\), 3 stored files/);
});

test("rc-clear deletes its copies older than 7 days, and no other folder", () => {
  const s = setup();
  const aged = (name, days) => {
    const d = path.join(s.copies, name);
    fs.mkdirSync(d);
    fs.writeFileSync(path.join(d, "circlechat.db"), "old\n");
    const then = new Date(Date.now() - days * DAY);
    fs.utimesSync(d, then, then);
  };
  aged("rc-work-20200101-000000", 8);
  aged("rc-work-20200102-000000", 30);
  aged("rc-work-20200103-000000", 6);
  aged("rc-work-notes", 30);
  aged("other-folder", 30);
  const r = s.run();
  assert.equal(r.r.status, 0, r.out + r.log);
  assert.match(r.out, /The copy is \S+\. Copies older than 7 days deleted: 2\.\n$/);
  assert.equal(r.copies.length, 4);
  assert.deepEqual(r.copies.filter((c) => !/^rc-work-\d{8}-\d{6}$/.test(c) || c.startsWith("rc-work-2020")), ["other-folder", "rc-work-20200103-000000", "rc-work-notes"]);
});

test("rc-clear refuses before it stops anything, when a kept row points at a chat or a table is not listed", () => {
  const pointed = setup({ more: "INSERT INTO triggers VALUES ('tr_1', 'c_1');" }).run();
  assert.equal(pointed.r.status, 1, pointed.out + pointed.log);
  assert.equal(pointed.out, "rc-clear: REFUSED. Rows that rc-clear keeps point at chats: 1 trigger. Remove each one first. Nothing changed.\n");
  assert.deepEqual(pointed.calls, [], "nothing is stopped");
  assert.deepEqual(pointed.copies, []);
  assert.deepEqual(pointed.now, { work: WORK_LINE, kept: KEPT_LINE });
  assert.deepEqual({ stored: pointed.stored, state: pointed.state }, UNTOUCHED);

  const unknown = setup({ more: "CREATE TABLE example_notes (id TEXT PRIMARY KEY);" }).run();
  assert.equal(unknown.r.status, 1);
  assert.match(unknown.out, /^rc-clear: REFUSED\. The database has a table rc-clear does not list: example_notes\. .* Nothing changed\.\n$/);
  assert.deepEqual(unknown.calls, []);
});

test("a failure after the stop deletes no work, and starts the server and the program again", () => {
  const AGAIN = "No work was deleted; the server and the programs were started again\\. Log: \\S+\\n$";

  // the program does not stop
  const stuck = setup().run({ FAKE_WONT_STOP: "test.program" });
  assert.equal(stuck.r.status, 1, stuck.out + stuck.log);
  assert.match(stuck.out, new RegExp(`^rc-clear: FAILED at stop: example-program did not stop within 3s\\. ${AGAIN}`));
  assert.deepEqual(stuck.calls, ["bootout test.program"], "the server is never stopped");
  assert.deepEqual(stuck.loaded, ["test.program", "test.rc-clear"]);
  assert.deepEqual(stuck.now, { work: WORK_LINE, kept: KEPT_LINE });
  assert.deepEqual(stuck.copies, []);

  // the copy cannot be made: the copies folder is a file
  const s = setup();
  fs.rmSync(s.copies, { recursive: true });
  fs.writeFileSync(s.copies, "not a folder\n");
  const r = s.run();
  assert.equal(r.r.status, 1, r.out + r.log);
  assert.match(r.out, new RegExp(`^rc-clear: FAILED at copy: could not make \\S+\\. ${AGAIN}`));
  assert.deepEqual(r.calls, STOPPED_AND_STARTED);
  assert.deepEqual(r.loaded, ["test.program", "test.rc-clear"]);
  assert.deepEqual(r.now, { work: WORK_LINE, kept: KEPT_LINE });
  assert.deepEqual({ stored: r.stored, state: r.state }, UNTOUCHED);

  // the delete fails inside its transaction: a kept row names a chat
  const undone = setup({ schema: usageNamesAChat(), more: NAMES_A_CHAT }).run();
  assert.equal(undone.r.status, 1, undone.out + undone.log);
  assert.match(undone.out, new RegExp(`^rc-clear: FAILED at delete: the delete failed and was undone \\(the log says why\\)\\. ${AGAIN}`));
  assert.match(undone.log, /FOREIGN KEY/i, "the reason is in the log");
  assert.deepEqual(undone.calls, STOPPED_AND_STARTED);
  assert.deepEqual(undone.now, { work: WORK_LINE, kept: KEPT_LINE });
  assert.deepEqual(undone.copies, [], "the copy of a run that deleted nothing is removed");
  assert.deepEqual({ stored: undone.stored, state: undone.state }, UNTOUCHED);
  assert.deepEqual(undone.dataFolder, ["files"]);
});

test("a restart that fails is reported: after the delete with the copy's path, before it with exit 3", () => {
  const s = setup();
  const after = s.run({ FAKE_UNHEALTHY: "1" });
  assert.equal(after.r.status, 1, after.out + after.log);
  assert.equal(after.copies.length, 1);
  assert.match(after.out, new RegExp(`^rc-clear: emptied ${WORK_LINE}; kept ${KEPT_LINE}\\. FAILED after the delete: /healthz did not answer ok within 4s\\. Log: \\S+ The copy is ${path.join(s.copies, after.copies[0])}\\.\\n$`));
  assert.deepEqual(after.calls, ["bootout test.program", "bootout test.rc-clear", "bootstrap test.rc-clear"], "the program waits for the server");
  assert.deepEqual(after.now.work, "0 chats, 0 messages, 0 tasks and 0 files");

  const before = setup().run({ FAKE_WONT_STOP: "test.program", FAKE_UNHEALTHY: "1" });
  assert.equal(before.r.status, 3, before.out + before.log);
  assert.match(before.out, /^rc-clear: FAILED at stop: example-program did not stop within 3s\. No work was deleted, and the restart failed too \(\/healthz did not answer ok within 4s\)\. Log: \S+\n$/);
  assert.deepEqual(before.now, { work: WORK_LINE, kept: KEPT_LINE });
});

test("rc-clear with no program, and with a program that keeps no state", () => {
  const alone = setup({ programs: "" }).run();
  assert.equal(alone.r.status, 0, alone.out + alone.log);
  assert.match(alone.out, /kept 2 people, 1 agent, 1 secret and 1 service\. The server answers ok\. The copy is /);
  assert.deepEqual(alone.calls, ["bootout test.rc-clear", "bootstrap test.rc-clear"]);
  assert.deepEqual(alone.state, UNTOUCHED.state, "a program rc-clear does not know keeps its state");

  const s = setup({ programs: `example-program:test.program:${os.userInfo().username}:` });
  const r = s.run();
  assert.equal(r.r.status, 0, r.out + r.log);
  assert.deepEqual(r.calls, STOPPED_AND_STARTED);
  assert.deepEqual(r.state, UNTOUCHED.state);
  assert.deepEqual(fs.readdirSync(path.join(s.copies, r.copies[0])).sort(), ["circlechat.db", "files"]);
});

test("rc-clear checks its setup first, refuses a second run at once, waits for rc-deploy, and needs sudo", () => {
  const s = setup();
  fs.rmSync(path.join(s.base, "daemons", "test.program.plist"));
  const noJob = s.run();
  assert.equal(noJob.r.status, 1);
  assert.match(noJob.out, /^rc-clear: FAILED at start: example-program has no \S+test\.program\.plist\. Nothing changed\./);
  assert.deepEqual(noJob.calls, []);

  const t = setup();
  fs.rmSync(t.state, { recursive: true });
  const noState = t.run();
  assert.equal(noState.r.status, 1);
  assert.match(noState.out, /FAILED at start: example-program's state folder \S+ is missing, is a link, or does not belong to \S+\. Nothing changed\./);
  assert.deepEqual(noState.calls, []);

  const u = setup();
  fs.mkdirSync(path.join(u.base, ".rc-clear.lock"));
  const locked = u.run();
  assert.equal(locked.r.status, 1);
  assert.match(locked.out, /another rc-clear is running/);
  assert.deepEqual(locked.calls, []);
  assert.ok(fs.existsSync(path.join(u.base, ".rc-clear.lock")), "another run's lock stays");

  const v = setup();
  fs.mkdirSync(path.join(v.base, ".rc-deploy.lock"));
  const deploying = v.run();
  assert.equal(deploying.r.status, 1);
  assert.equal(deploying.out, "rc-clear: rc-deploy is running. Nothing changed.\n");
  assert.deepEqual(deploying.now, { work: WORK_LINE, kept: KEPT_LINE });

  if (process.getuid() !== 0) {
    const plain = spawnSync("/bin/bash", [path.join(here, "rc-clear.sh")], { env: { ...process.env, RC_CLEAR_TEST: "" }, encoding: "utf8" });
    assert.equal(plain.status, 2);
    assert.match(plain.stdout, /run it with sudo/);
  }
});
