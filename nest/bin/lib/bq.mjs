// BigQuery access for the agent tools, over bq-exec.mjs.
//
// Extracted from scribe-ingest.mjs when the tagger tool needed the same three things:
// run a statement, escape a string literal, and name a table. A hand-copied second
// version of SQL-literal escaping is exactly the second source of truth this repo keeps
// being bitten by — get the escaping subtly wrong in one copy and it is a broken write in
// one agent and not the other.
//
// Every value comes back from bq-exec as a string (the REST API's f[i].v), so a caller
// that needs a number coerces it. That is deliberately not hidden here: guessing which
// columns are numeric is how a count silently becomes a string comparison.

import { spawnSync } from 'node:child_process'

/**
 * Single-quoted BigQuery string literal.
 *
 * Order matters: the backslash is escaped first, or the escapes added below get escaped a
 * second time and the literal arrives corrupted. Transcript text carries newlines, tabs and
 * apostrophes routinely, so all three are handled rather than assumed absent.
 */
export const q = (s) =>
  s === null || s === undefined
    ? 'NULL'
    : `'${String(s)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}'`

/** Numeric literal, or NULL. Never quotes — a quoted number compares as a string. */
export const num = (v) => (v === null || v === undefined || v === '' ? 'NULL' : String(Number(v)))

/** Backtick-quoted fully-qualified table reference. */
export const tableRef = (project, dataset, name) => `\`${project}.${dataset}.${name}\``

/**
 * Build a `bq(sql, opts)` bound to one key and project.
 *
 * `onError` receives `{ label, sql, error }` and is expected not to return — the callers
 * here all emit a JSON report and exit with a specific code, and letting execution
 * continue past a failed write is how a half-written conversation gets reported as done.
 *
 * `dryRun` skips statements that would change data and lets reads through, so a caller can
 * exercise its whole path without writing.
 */
export function makeBq({ bqExecPath, keyPath, project, dryRun = false, onError }) {
  const WRITES = /\b(MERGE|UPDATE|DELETE|INSERT|CREATE|DROP|TRUNCATE)\b/i

  return function bq(sql, { json = false, label = 'statement' } = {}) {
    if (dryRun && WRITES.test(sql)) return json ? [] : null

    const res = spawnSync(
      process.execPath,
      [bqExecPath, '--key', keyPath, '--project', project, '--file', '-', ...(json ? [] : ['--quiet'])],
      { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    )

    if (res.status !== 0) {
      onError({
        label,
        // The agent's job on a rejected statement is to fix and retry, so it needs to see
        // the statement — truncated, because a chunk MERGE can be longer than any message.
        sql: sql.length > 4000 ? `${sql.slice(0, 4000)}\n-- [truncated]` : sql,
        error: (res.stdout || '').trim() || (res.stderr || '').trim(),
      })
      return json ? [] : null
    }

    if (!json) return null
    try {
      return JSON.parse(res.stdout)
    } catch {
      // A statement that returns no result set prints a human line rather than JSON.
      return []
    }
  }
}
