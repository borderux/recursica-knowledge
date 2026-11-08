// No kit shell script pipes into grep -q. grep -q stops reading at the first match, the program
// before grep then fails on the closed pipe, and with pipefail the found text counts as a failure.
// A check with ! in front turns the same failure into a false pass. Read the whole output instead:
// grep -q on a here-string (grep -q x <<<"$text"), or grep with no -q, to /dev/null.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
// A pipe (not ||) into grep with q among the flags, such as grep -q, grep -qx or grep -vqx.
export const PIPE_INTO_GREP_Q = /(^|[^|])\|\s*grep\s+-[A-Za-z]*q/;

function shellScripts(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : shellScripts(p);
    return e.name.endsWith(".sh") ? [p] : [];
  });
}

test("the check finds a pipe into grep -q, and passes a here-string and an or-list", () => {
  assert.ok(PIPE_INTO_GREP_Q.test(`tar tzf "$f" | grep -qx './id_ed25519' || false`));
  assert.ok(PIPE_INTO_GREP_Q.test("gzip -dc \"$db\" | grep -q 'CREATE TABLE'"));
  assert.ok(PIPE_INTO_GREP_Q.test("! docker inspect x | grep -vqx y"));
  assert.ok(!PIPE_INTO_GREP_Q.test(`grep -qx './id_ed25519' <<<"$listing"`));
  assert.ok(!PIPE_INTO_GREP_Q.test(`[ -z "$x" ] || grep -vqx -e "$m" <<<"$x"`));
  assert.ok(!PIPE_INTO_GREP_Q.test(`gzip -dc "$db" | grep "CREATE TABLE" >/dev/null`));
});

test("no kit shell script pipes into grep -q", () => {
  const found = [];
  for (const f of shellScripts(root)) {
    fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (!/^\s*#/.test(line) && PIPE_INTO_GREP_Q.test(line)) found.push(`${path.relative(root, f)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(found, [], `Read the whole output instead of piping into grep -q:\n${found.join("\n")}`);
});
