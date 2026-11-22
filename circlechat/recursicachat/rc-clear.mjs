// rc-clear.mjs: the database work of rc-clear.sh. rc-clear.sh runs it as the server's account, with
// the server's Node, whose node:sqlite is built in. The comment at the top of rc-clear.sh says what
// the whole command does.
//
//   node rc-clear.mjs check <database>         reads only: prints what a clear empties and keeps
//   node rc-clear.mjs copy <database> <copy>   writes a consistent copy, checks it, prints its bytes
//   node rc-clear.mjs clear <database>         deletes the work's rows, in one transaction
//
// Exit 0 when done. Exit 3 when rc-clear refuses: stdout says why, and nothing changed. Exit 1 on
// any other failure, with the reason on stderr, and 2 on a usage error.
import { DatabaseSync } from "node:sqlite";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The work, in the order its rows are deleted: children first. A second value is the condition
// that picks the work's rows in a table that also holds rows to keep.
export const WORK = [
  ["file_texts"], // the text read from each uploaded file, by the file's id
  ["files"],
  ["messages"],
  ["tasks"], // a plan is the tasks that share a plan_id
  ["chat_reads"],
  ["chat_members"],
  ["deliveries"],
  ["service_requests"],
  ["service_replies"], // the replies to a service's private instructions
  ["service_instructions"], // a service's instructions marked private or fresh
  ["approvals"],
  ["agent_sessions"],
  ["memories", "scope = 'chat'"],
  ["trigger_runs"], // each run of a trigger, with what it was given; the triggers themselves stay
  ["chats"],
];

// Kept whole: people and their profiles, agents, the vault, apps and access, service accounts,
// triggers, the tool log and the cost totals. Each row of the tool log holds the hash of the row before it, so
// the log stays whole. Memories of the team and of an agent stay too.
export const KEPT = [
  "settings",
  "users",
  "sessions",
  "deactivated_users",
  "user_looks",
  "user_handles",
  "user_photos",
  "agents",
  "managed_agents",
  "secrets",
  "connections",
  "mcp_servers",
  "grants",
  "policies",
  "service_accounts",
  "service_agents",
  "tool_calls",
  "usage",
  "triggers",
  "bridges",
  "sso_used",
];

/** rc-clear refuses, and says why. Nothing changed. */
export class Refusal extends Error {}

const tables = (db) =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => r.name);
// Every table name and condition comes from the lists above, never from outside this file.
const rows = (db, table, where) => db.prepare(`SELECT count(*) AS n FROM "${table}"${where ? ` WHERE ${where}` : ""}`).get().n;
const say = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]);

/** Why rc-clear refuses this database, one sentence each. Empty when it does not refuse. */
export function refusals(db) {
  const have = tables(db);
  if (!have.includes("chats")) return ["The database has no chats table, so it is not the server's database."];
  const why = [];
  // A table from a newer server: rc-clear cannot tell whether it holds work, so it deletes nothing.
  const known = new Set([...WORK.map(([t]) => t), ...KEPT]);
  const unknown = have.filter((t) => !known.has(t));
  if (unknown.length) why.push(`The database has a table rc-clear does not list: ${unknown.join(", ")}. Add each one to rc-clear.mjs first, as work or as kept.`);
  // Rows that name a chat, in tables rc-clear keeps: each would point at a deleted chat.
  const n = (t, where) => (have.includes(t) ? rows(db, t, where) : 0);
  const pointing = [
    [n("triggers"), "trigger"],
    [n("bridges"), "bridge"],
    [n("grants", "target_type = 'chat'"), "chat grant"],
  ].filter(([count]) => count > 0);
  if (pointing.length) why.push(`Rows that rc-clear keeps point at chats: ${list(pointing.map(([count, one]) => say(count, one)))}. Remove each one first.`);
  return why;
}

/** The two counts in rc-clear's summary line: the work, and what stays. */
export function summary(db) {
  const have = tables(db);
  const n = (t) => (have.includes(t) ? rows(db, t) : 0);
  return {
    work: list([say(n("chats"), "chat"), say(n("messages"), "message"), say(n("tasks"), "task"), say(n("files"), "file")]),
    kept: list([say(n("users"), "person", "people"), say(n("agents"), "agent"), say(n("secrets"), "secret"), say(n("service_accounts"), "service")]),
  };
}

/**
 * Deletes the work's rows in one transaction, with foreign keys on. Before the transaction ends it
 * checks that no work row is left and that every kept table has the rows it had. Any failure
 * undoes the whole transaction. Never drops a table.
 */
export function clear(db) {
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec("BEGIN IMMEDIATE");
  try {
    const why = refusals(db);
    if (why.length) throw new Refusal(why.join(" "));
    const have = tables(db);
    const steps = WORK.filter(([t]) => have.includes(t));
    const keptRows = () => {
      const counts = Object.fromEntries(KEPT.filter((t) => have.includes(t)).map((t) => [t, rows(db, t)]));
      if (have.includes("memories")) counts["memories outside chats"] = rows(db, "memories", "scope <> 'chat'");
      return counts;
    };
    const before = keptRows();
    const emptied = summary(db).work;
    for (const [t, where] of steps) db.exec(`DELETE FROM "${t}"${where ? ` WHERE ${where}` : ""}`);
    const left = steps.filter(([t, where]) => rows(db, t, where) > 0).map(([t]) => t);
    if (left.length) throw new Error(`rows are left in ${left.join(", ")}`);
    const after = keptRows();
    const changed = Object.keys(before).filter((t) => before[t] !== after[t]);
    if (changed.length) throw new Error(`deleting the work also changed ${changed.join(", ")}, which rc-clear keeps`);
    const kept = summary(db).kept;
    db.exec("COMMIT");
    return { emptied, kept };
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // SQLite already ended the transaction
    }
    throw e;
  }
}

/** Writes a consistent copy of the database to a new file, checks it, and returns its size in bytes. */
export function copy(db, to) {
  if (existsSync(to)) throw new Error(`${to} is already there`);
  db.prepare("VACUUM INTO ?").run(to);
  const made = new DatabaseSync(to, { readOnly: true });
  try {
    const result = Object.values(made.prepare("PRAGMA integrity_check").get())[0];
    if (result !== "ok") throw new Error("the copy fails SQLite's integrity check");
  } finally {
    made.close();
  }
  return statSync(to).size;
}

export function main([cmd, file, to], out = (line) => console.log(line), err = (line) => console.error(line)) {
  if (!["check", "copy", "clear"].includes(cmd) || !file || (cmd === "copy") !== Boolean(to)) {
    err("usage: rc-clear.mjs check <database> | copy <database> <copy> | clear <database>");
    return 2;
  }
  let db;
  try {
    // node:sqlite makes a missing file, and an empty database is never the server's.
    if (!existsSync(file)) throw new Error(`no database at ${file}`);
    db = new DatabaseSync(file, { readOnly: cmd === "check" });
    if (cmd === "copy") {
      out(String(copy(db, to)));
    } else if (cmd === "check") {
      const why = refusals(db);
      if (why.length) throw new Refusal(why.join(" "));
      const now = summary(db);
      out(`work ${now.work}\nkept ${now.kept}`);
    } else {
      const done = clear(db);
      out(`emptied ${done.emptied}\nkept ${done.kept}`);
    }
    return 0;
  } catch (e) {
    if (e instanceof Refusal) {
      out(e.message);
      return 3;
    }
    err(`rc-clear.mjs ${cmd}: ${e.message}`);
    return 1;
  } finally {
    db?.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
