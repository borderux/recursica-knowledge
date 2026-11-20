// The diagnostics bundle's redaction: secrets and email addresses never leave the computer.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const here = new URL(".", import.meta.url).pathname;
const script = fs.readFileSync(`${here}diagnostics.sh`, "utf8");
const redact = script.slice(script.indexOf("redact() {"), script.indexOf("\n}\n", script.indexOf("redact() {")) + 3);

// Each fake key and token is joined from two pieces when the test runs, so no file in this
// repository holds a string shaped like a key. The key check (gateway/key-check.mjs) reads every
// file in a stack's backup, and the backup holds the workspace's clones of this repository. A
// key-shaped string in a test file then fails the stack's test restore.
const fake = (prefix, body) => prefix + body;

test("removes keys, tokens, webhook paths, passwords and email addresses", () => {
  const input = [
    `ANTHROPIC_API_KEY=${fake("sk-ant-", "api03-abcdefghijklmnop")}`,
    `token ${fake("xoxb-", "1234-5678-abcdefgh")} and ${fake("xapp-", "1-A1B2C3")}`,
    `${fake("ghp_", "abcdefghijklmnopqrstuvwxyz0123")} ${fake("github_pat_", "11ABCDEFG0123456789_abcdef")}`,
    "https://hooks.slack.com/services/T000/B000/XXXX",
    "PG_PASSWORD=hunter2 MINIO_ROOT_PASSWORD=x",
    "from person-a@acme.com",
    fake("AKIA", "ABCDEFGHIJKLMNOP"),
    "keep: COMPOSE_PROJECT_NAME=cc-acme",
  ].join("\n");
  const r = spawnSync("bash", ["-c", `${redact}\nredact`], { input, encoding: "utf8" });
  for (const secret of ["sk-ant-api03", "xoxb-1234", "xapp-1-A1", "ghp_abcdef", "github_pat_11", "T000/B000", "hunter2", "person-a@acme.com", "AKIAABCD"]) {
    assert.ok(!r.stdout.includes(secret), `${secret} leaked: ${r.stdout}`);
  }
  assert.match(r.stdout, /COMPOSE_PROJECT_NAME=cc-acme/);
});
