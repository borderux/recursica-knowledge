// The notifier's database role (notify/notify-db.sql): cc_notify reads only the columns the
// notifier reads, and writes only the code columns of CircleChat's Slack ID check.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const sql = fs.readFileSync(path.join(here, "notify-db.sql"), "utf8");
const code = fs.readFileSync(path.join(here, "notify.mjs"), "utf8");

test("cc_notify starts from nothing, and is no superuser", () => {
  assert.match(sql, /NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT/);
  assert.match(sql, /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM cc_notify;/);
  assert.doesNotMatch(sql, /GRANT (ALL|INSERT|DELETE|TRUNCATE)/i);
});

test("cc_notify updates only the code columns, never the Slack ID itself", () => {
  const updates = [...sql.matchAll(/GRANT UPDATE \(([^)]+)\)\s+ON public\.(\w+)/g)].map((m) => [m[2], m[1].split(",").map((c) => c.trim())]);
  assert.deepEqual(updates, [["user_slack", ["code_salt", "code_hash", "code_sent_at", "code_expires_at", "code_attempts", "send_error", "updated_at"]]]);
  for (const col of ["slack_user_id", "pending_slack_user_id", "verified_at", "prompt_closed_at"]) {
    assert.ok(!updates[0][1].includes(col), col);
  }
});

test("each user_slack column the notifier writes or reads is granted", () => {
  const reads = sql.match(/\['user_slack', '([^']+)'\]/)[1].split(",").map((c) => c.trim());
  const used = new Set([...code.matchAll(/\b(?:s\.)?(slack_user_id|pending_slack_user_id|code_requested_at|code_sent_at|send_error|user_id)\b/g)].map((m) => m[1]));
  for (const col of used) assert.ok(reads.includes(col), `${col} is read but not granted`);
});

test("the notifier never logs or stores the code", () => {
  // sendCodes, with comments and text in quotes taken out: each use of the variable code is left.
  const fn = code.slice(code.indexOf("async function sendCodes"), code.indexOf("async function listen"));
  const bare = fn.replace(/\/\/.*$/gm, "").replace(/`[^`]*`/g, "``").replace(/"[^"]*"/g, '""');
  const uses = [...bare.matchAll(/(?<![\w.])code(?![\w:])/g)].map((m) => bare.slice(m.index - 12, m.index + 8).replace(/\s+/g, " "));
  assert.equal(uses.length, 3, uses.join(" | "));
  assert.match(bare, /const code = newCode\(\)/);
  assert.match(bare, /hashCode\(salt, code\)/, "only the hash goes to the database");
  assert.match(bare, /codeText\(\{ code,/, "the code goes only into the DM");
  assert.doesNotMatch(fn, /\$\{code\}/, "no text holds the code");
});

test("the notifier reads turn_container_stops only through granted columns, and skips a CircleChat without the table", () => {
  const reads = sql.match(/\['turn_container_stops', '([^']+)'\]/)[1].split(",").map((c) => c.trim());
  assert.deepEqual(reads, ["container", "agent_id", "overdue_ms", "stopped_at"]);
  const fn = code.slice(code.indexOf("async function containerStops"), code.indexOf("async function tick"));
  for (const col of fn.matchAll(/\bs\.(\w+)/g)) assert.ok(reads.includes(col[1]), `${col[1]} is read but not granted`);
  assert.match(fn, /to_regclass\('public\.turn_container_stops'\)/);
  assert.match(fn, /if \(!on\("container_stopped"\)\) return;/);
  assert.match(fn, /\{ safe: true \}/);
  assert.match(code, /await containerStops\(\);/);
});
