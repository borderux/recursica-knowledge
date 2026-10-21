// The diagnostics bundle's redaction: secrets and email addresses never leave the computer.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const here = new URL(".", import.meta.url).pathname;
const script = fs.readFileSync(`${here}diagnostics.sh`, "utf8");
const redact = script.slice(script.indexOf("redact() {"), script.indexOf("\n}\n", script.indexOf("redact() {")) + 3);

test("removes keys, tokens, webhook paths, passwords and email addresses", () => {
  const input = [
    "ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnop",
    "token xoxb-1234-5678-abcdefgh and xapp-1-A1B2C3",
    "ghp_abcdefghijklmnopqrstuvwxyz0123 github_pat_11ABCDEFG0123456789_abcdef",
    "https://hooks.slack.com/services/T000/B000/XXXX",
    "PG_PASSWORD=hunter2 MINIO_ROOT_PASSWORD=x",
    "from person-a@acme.com",
    "AKIAABCDEFGHIJKLMNOP",
    "keep: COMPOSE_PROJECT_NAME=cc-acme",
  ].join("\n");
  const r = spawnSync("bash", ["-c", `${redact}\nredact`], { input, encoding: "utf8" });
  for (const secret of ["sk-ant-api03", "xoxb-1234", "xapp-1-A1", "ghp_abcdef", "github_pat_11", "T000/B000", "hunter2", "person-a@acme.com", "AKIAABCD"]) {
    assert.ok(!r.stdout.includes(secret), `${secret} leaked: ${r.stdout}`);
  }
  assert.match(r.stdout, /COMPOSE_PROJECT_NAME=cc-acme/);
});
