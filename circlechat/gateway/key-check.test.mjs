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

test("as root over the agents' homes, the check skips each symlink, reads none of their targets, and names each symlink", () => {
  const homes = dir(), outside = dir();
  // Outside the homes: a file and a folder that each hold a key. The check would fail if it read them.
  const key = "sk-ant-api03-" + "k".repeat(40);
  fs.writeFileSync(path.join(outside, "secret.txt"), `ANTHROPIC_API_KEY=${key}\n`);
  fs.mkdirSync(path.join(outside, "folder"));
  fs.writeFileSync(path.join(outside, "folder", "auth.json"), JSON.stringify({ key }));
  fs.mkdirSync(path.join(homes, ".hermes-betty"));
  fs.writeFileSync(path.join(homes, ".hermes-betty", "config.yaml"), "agent:\n  reasoning_effort: low\n");
  fs.symlinkSync(path.join(outside, "secret.txt"), path.join(homes, ".hermes-betty", ".env"));
  fs.symlinkSync(path.join(outside, "folder"), path.join(homes, ".hermes-betty", "skills"));
  // A symlinked top folder, as given on the command line, is skipped the same way.
  const linkedHome = path.join(dir(), "hermes-homes");
  fs.symlinkSync(path.join(outside, "folder"), linkedHome);
  const r = check([homes, linkedHome]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Skipped 3 symlink\(s\), never followed or read:/);
  for (const l of [path.join(homes, ".hermes-betty", ".env"), path.join(homes, ".hermes-betty", "skills"), linkedHome]) assert.ok(r.stdout.includes(`  - ${l}\n`), l);
  assert.ok(!r.stdout.includes(outside), "the report never names a symlink's target");
  assert.ok(!r.stdout.includes(key));
});

test("a symlinked secrets file is skipped and named, and its target never read", () => {
  const d = dir(), outside = dir();
  fs.writeFileSync(path.join(outside, "values.env"), "MODEL_KEY_ACME=custom-provider-secret-value-42\n");
  const secrets = path.join(d, "model-keys.env");
  fs.symlinkSync(path.join(outside, "values.env"), secrets);
  // A dump that holds the target's value: found only if the check read the target.
  const r = check(["--secrets", secrets, "--stdin", "db"], "custom-provider-secret-value-42");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, new RegExp(`Skipped 1 symlink\\(s\\), never followed or read:\\n  - ${secrets.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\n`));
});

test("finds a private key, such as a GitHub App's, in an agent home, a database dump and a backup, and never prints the key", () => {
  const d = dir();
  const body = "MIIEowIBAAKCAQEA" + "q".repeat(48);
  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${body}\n-----END RSA PRIVATE KEY-----\n`;
  fs.mkdirSync(path.join(d, ".hermes-alan"));
  fs.writeFileSync(path.join(d, ".hermes-alan", "notes.md"), pem);
  fs.writeFileSync(path.join(d, "backup.tgz"), zlib.gzipSync(`-----BEGIN PRIVATE KEY-----\n${body}\n`));
  let r = check([d], "");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /notes\.md: a private key/);
  assert.match(r.stdout, /backup\.tgz: a private key/);
  assert.ok(!r.stdout.includes(body));
  // A key with its PEM header removed matches the app's key file by the key's first line.
  const keys = path.join(dir(), "github-apps");
  fs.mkdirSync(keys);
  fs.writeFileSync(path.join(keys, "alan.pem"), pem);
  r = check(["--private-keys", keys, "--stdin", "CircleChat's database"], `INSERT INTO messages VALUES ('${body}');`);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /CircleChat's database: a GitHub App's private key/);
  assert.ok(!r.stdout.includes(body));
});
