// rc-clear.mjs: the database work of rc-clear.sh. rc-clear.sh runs it as the server's account, with
// the server's Node, whose node:sqlite is built in. The comment at the top of rc-clear.sh says what
// the whole command does.
//
//   node rc-clear.mjs check <database>         reads only: prints what a clear empties and keeps
//   node rc-clear.mjs copy <database> <copy>   writes a consistent copy, checks it, prints its bytes
//   node rc-clear.mjs clear <database>         deletes the work's rows, in one transaction
//   node rc-clear.mjs hermes <database>        reads only: prints the Docker volume of each agent
//                                              that runs Hermes in a Docker sandbox, one a line
//   node rc-clear.mjs history                  prints the Hermes history's entries, one a word
//   node rc-clear.mjs unlisted                 stdin: a Hermes home's entries, one a line; prints
//                                              each that neither list below names
//   node rc-clear.mjs schema <server/src>      reads only: each table the server's code creates
//                                              that neither WORK nor KEPT names, one a line; exit 1
//                                              when there is one. The kit's CI runs it on the
//                                              fork's branch, so a table a new server adds is
//                                              listed before rc-clear meets it.
//
// Exit 0 when done. Exit 3 when rc-clear refuses: stdout says why, and nothing changed. Exit 1 on
// any other failure, with the reason on stderr, and 2 on a usage error.
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The work, in the order its rows are deleted: children first. A second value is the condition
// that picks the work's rows in a table that also holds rows to keep.
export const WORK = [
  ["file_texts"], // the text read from each uploaded file, by the file's id
  ["files"],
  ["messages"],
  ["task_progress"], // a task's progress line, such as "Step 17 of 43", which goes with the task
  ["task_settings"], // a task's choice for each task setting, such as Model use
  ["task_setting_changes"], // each change of a task's setting: who, when, from and to
  ["task_cloud_switches"], // each move of a task to a cloud model, which the model gateway reports
  ["task_status_by"], // the person who last set a task's status, and when
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

// Kept whole: people and their profiles, agents and their settings, the vault, apps and access, service accounts,
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
  "agent_starters", // the suggestions an empty chat with an agent shows: settings, set by rc-sync
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

// A Hermes agent's home, in its Docker volume (HERMES_HOME, /var/lib/hermes/home), holds Hermes's
// history beside its settings. rc-clear empties the history, with the engine stopped, and leaves
// the rest: each entry here is a path inside the home.
export const HERMES_HISTORY = [
  "state.db", // the session store: every conversation
  "state.db-wal",
  "state.db-shm",
  "sessions", // session transcripts
  "logs", // agent, errors, gateway, curator and update logs
  "pending_messages",
  "runtime/active_sessions.json", // which sessions are open
  "kanban", // boards and projects Hermes kept for itself
  "kanban.db",
  "kanban.db-wal",
  "kanban.db-shm",
  "projects.db",
  "projects.db-wal",
  "projects.db-shm",
  "cron", // past scheduled runs and their output
  "cache", // documents, scratch, probe and discovery caches
  "audio_cache",
  "image_cache",
];
// Kept: the settings the server writes at every start, the skills (the agent's own and its learned
// ones, with the curator's copies), the install and its plugins, the agent's memories, and Hermes's
// own runtime files. An entry whose name starts with "gateway" is the gateway's runtime too.
export const HERMES_KEPT = [
  ".env",
  "config.yaml",
  "SOUL.md",
  "skills",
  ".curator_backups",
  ".skills_prompt_snapshot.json",
  "install_id",
  ".install_id.lock",
  "installs",
  "auth.lock",
  "hooks",
  "plugins",
  "plugin-update-checks",
  "platforms",
  "pairing",
  "backups",
  "memories",
  "provider_models_cache.json",
  "channel_directory.json",
  "state", // the gateway's heartbeats, lifecycle and loop socket
  "runtime",
];

/** The Docker volume of an agent's Hermes home: the server names it after the agent's id (server/src/agents/runtime.ts). */
export const hermesVolume = (id) => `cc-${String(id).toLowerCase().replace(/[^a-z0-9]/g, "")}-hermes`;

/** Each agent's Hermes volume, for every agent that runs Hermes in a Docker sandbox, archived ones too. */
export function hermesVolumes(db) {
  const cols = db.prepare("PRAGMA table_info(agents)").all().map((c) => c.name);
  if (!cols.includes("engine") || !cols.includes("sandbox")) return [];
  return db.prepare("SELECT id FROM agents WHERE engine = 'hermes' AND sandbox = 'docker' ORDER BY id").all().map((r) => hermesVolume(r.id));
}

/** A Hermes home's top-level entries that neither list names: rc-clear leaves them, with a note. */
export const unlisted = (entries) =>
  entries.map((e) => e.trim()).filter((e) => e && !e.startsWith("gateway") && !HERMES_KEPT.includes(e) && !HERMES_HISTORY.some((h) => h === e || h.startsWith(`${e}/`)));

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

/**
 * The tables a server's code creates: each CREATE TABLE in the text, without a table a migration
 * builds under a passing name and renames ("ALTER TABLE tasks_new RENAME TO tasks").
 */
export function schemaTables(text) {
  const made = [...text.matchAll(/\bCREATE\s+(?:VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([A-Za-z_][A-Za-z0-9_]*)/gi)].map((m) => m[1]);
  const passing = new Set([...text.matchAll(/\bALTER\s+TABLE\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s+RENAME\s+TO\b/gi)].map((m) => m[1]));
  return [...new Set(made)].filter((t) => !passing.has(t) && !t.startsWith("sqlite_")).sort();
}

/** The tables neither list names. */
export const unlistedTables = (names) => names.filter((t) => !WORK.some(([w]) => w === t) && !KEPT.includes(t));

/** The text of each source file under a folder, tests and node_modules left out. */
function sourceText(dir) {
  let text = "";
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") text += sourceText(p);
    } else if (/\.(ts|mts|js|mjs|sql)$/.test(e.name) && !/\.test\./.test(e.name)) text += readFileSync(p, "utf8") + "\n";
  }
  return text;
}

export function main([cmd, file, to], out = (line) => console.log(line), err = (line) => console.error(line)) {
  if (cmd === "schema") {
    if (!file || !existsSync(file) || !statSync(file).isDirectory()) {
      err("usage: rc-clear.mjs schema <the server's source folder, such as server/src>");
      return 2;
    }
    const names = schemaTables(sourceText(file));
    if (!names.includes("chats")) {
      err(`${file} creates no chats table, so it is not the server's source.`);
      return 2;
    }
    const missing = unlistedTables(names);
    for (const t of missing) out(`${t}: the server creates it, and rc-clear.mjs lists it neither as work nor as kept`);
    if (missing.length) {
      err(`Add each table to WORK or KEPT in circlechat/recursicachat/rc-clear.mjs, or sudo rc-clear refuses the server's database.`);
      return 1;
    }
    out(`rc-clear lists every table the server creates: ${names.length} tables.`);
    return 0;
  }
  if (cmd === "history") {
    out(HERMES_HISTORY.join(" "));
    return 0;
  }
  if (cmd === "unlisted") {
    for (const e of unlisted(readFileSync(0, "utf8").split("\n"))) out(e);
    return 0;
  }
  if (!["check", "copy", "clear", "hermes"].includes(cmd) || !file || (cmd === "copy") !== Boolean(to)) {
    err("usage: rc-clear.mjs check <database> | copy <database> <copy> | clear <database> | hermes <database> | unlisted | schema <server/src>");
    return 2;
  }
  let db;
  try {
    // node:sqlite makes a missing file, and an empty database is never the server's.
    if (!existsSync(file)) throw new Error(`no database at ${file}`);
    db = new DatabaseSync(file, { readOnly: cmd === "check" || cmd === "hermes" });
    if (cmd === "hermes") {
      for (const v of hermesVolumes(db)) out(v);
    } else if (cmd === "copy") {
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
