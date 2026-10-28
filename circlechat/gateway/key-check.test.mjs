import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import zlib from "node:zlib";

const here = path.dirname(new URL(import.meta.url).pathname);
const check = (args, input) => spawnSync(process.execPath, [path.join(here, "key-check.mjs"), ...args], { input, encoding: "utf8" });
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "keycheck-"));

test("passes on a clean folder, with gateway keys and the old master key in it", () => {
  const d = dir();
  fs.writeFileSync(path.join(d, "config.yaml"), 'api_key: "ccg_0123456789abcdef0123456789abcdef0123456789abcdef"\n');
  fs.writeFileSync(path.join(d, "generated.env"), "LITELLM_MASTER_KEY=sk-0123456789abcdef0123456789abcdef\n");
  const r = check([d]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Key check passed/);
});

test("finds each provider's key shape, in plain and packed files, and never prints the key", () => {
  const d = dir();
  const keys = { anthropic: "sk-ant-api03-" + "x".repeat(40), xai: "xai-" + "y".repeat(40), openai: "sk-proj-" + "z".repeat(40) };
  fs.mkdirSync(path.join(d, ".hermes-betty"));
  fs.writeFileSync(path.join(d, ".hermes-betty", "auth.json"), JSON.stringify({ key: keys.anthropic }));
  fs.writeFileSync(path.join(d, "db.sql.gz"), zlib.gzipSync(`INSERT INTO agents VALUES ('${keys.xai}');`));
  fs.writeFileSync(path.join(d, "notes.md"), `OPENAI=${keys.openai}`);
  const r = check([d]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /auth\.json: Anthropic/);
  assert.match(r.stdout, /db\.sql\.gz: xAI/);
  assert.match(r.stdout, /notes\.md: OpenAI/);
  for (const k of Object.values(keys)) assert.ok(!r.stdout.includes(k));
});

test("finds a key from the gateway's secrets file by its exact value, in a database dump on stdin", () => {
  const d = dir();
  const secrets = path.join(d, "model-keys.env");
  fs.writeFileSync(secrets, "MODEL_KEY_ACME=custom-provider-secret-value-42\nMODEL_KEY_BR=AKIAEXAMPLEEXAMPLE1:abcdefghijklmnopqrstuvwxyz0123\n");
  const r = check(["--secrets", secrets, "--stdin", "CircleChat's database"], "COPY agents (config) FROM stdin;\n{\"k\":\"abcdefghijklmnopqrstuvwxyz0123\"}\n");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /CircleChat's database: a key from the gateway's secrets file/);
  assert.equal(check(["--secrets", secrets, "--stdin", "db"], "nothing here").status, 0);
});
