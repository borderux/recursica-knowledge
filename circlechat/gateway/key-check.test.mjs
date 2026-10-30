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

// A private key needs a body (key-check.mjs, hasPrivateKey). Fake key bodies: base64 characters in
// a fixed pattern, never a real key.
const fakeBody = (n) => "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC".repeat(Math.ceil(n / 32)).slice(0, n);
const pemLines = (s, sep = "\n") => s.match(/.{1,64}/g).join(sep);
// npm's help text for its `key` setting, as Node's compile cache holds it after npm has run.
const NPM_KEY_HELP = 'key="-----BEGIN PRIVATE KEY-----\\nXXXX\\nXXXX\\n-----END PRIVATE KEY-----"';

test("the marker without a key body passes: documentation, code and prose that name the BEGIN line", () => {
  const d = dir();
  const texts = {
    "npm-help.txt": `A client key to pass when accessing the registry. For example:\n${NPM_KEY_HELP}\n`,
    "npm-source.js": 'key="-----BEGIN PRIVATE KEY-----\\\\nXXXX\\\\nXXXX\\\\n-----END PRIVATE KEY-----"\n',
    "build-pem.js": 'const pem = "-----BEGIN PRIVATE KEY-----\\n" + body + "\\n-----END PRIVATE KEY-----";\n',
    "template.js": "const pem = `-----BEGIN RSA PRIVATE KEY-----\\n${b64}\\n-----END RSA PRIVATE KEY-----`;\n",
    "notes.md": "-----BEGIN PRIVATE KEY----- is the header line that every PEM private key starts with, and the body follows it.\n",
    "howto.md": "-----BEGIN OPENSSH PRIVATE KEY-----\nThen paste the body here and keep it out of every repository and every chat message.\n",
  };
  for (const [name, text] of Object.entries(texts)) fs.writeFileSync(path.join(d, name), text);
  const r = check([d], "");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Key check passed/);
});

test("a real key shape is caught however it is written: lines, escaped line breaks, a dump, cut off, encrypted, short, OpenSSH, indented", () => {
  const body = fakeBody(256);
  const shapes = {
    "multi-line.pem": `-----BEGIN PRIVATE KEY-----\n${pemLines(body)}\n-----END PRIVATE KEY-----\n`,
    "one-line.env": `GITHUB_APP_KEY="-----BEGIN RSA PRIVATE KEY-----\\n${pemLines(body, "\\n")}\\n-----END RSA PRIVATE KEY-----"\n`,
    "dump.sql": `COPY settings (value) FROM stdin;\n{"key": "-----BEGIN PRIVATE KEY-----\\\\n${pemLines(body, "\\\\n")}\\\\n-----END PRIVATE KEY-----"}\n`,
    "cut-off.log": `error loading key: -----BEGIN RSA PRIVATE KEY-----\n${body.slice(0, 120)}`,
    "encrypted.pem": `-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,0123456789ABCDEF0123456789ABCDEF\n\n${pemLines(body)}\n-----END RSA PRIVATE KEY-----\n`,
    "ed25519.pem": `-----BEGIN PRIVATE KEY-----\n${fakeBody(64)}\n-----END PRIVATE KEY-----\n`,
    "id_ed25519": `-----BEGIN OPENSSH PRIVATE KEY-----\r\n${pemLines(fakeBody(200), "\r\n")}\r\n-----END OPENSSH PRIVATE KEY-----\r\n`,
    "config.yaml": `tls:\n  key: |\n    -----BEGIN EC PRIVATE KEY-----\n    ${pemLines(fakeBody(160), "\n    ")}\n    -----END EC PRIVATE KEY-----\n`,
  };
  for (const [name, text] of Object.entries(shapes)) {
    const d = dir();
    fs.writeFileSync(path.join(d, name), text);
    const r = check([d], "");
    assert.equal(r.status, 1, `${name}: ${r.stdout}`);
    assert.match(r.stdout, new RegExp(`${name.replace(".", "\\.")}: a private key`), name);
    assert.ok(!r.stdout.includes(body.slice(0, 40)), `${name}: the key is never printed`);
  }
});

test("a key split across the scanner's chunks is still caught", () => {
  // The scan reads 64 KiB at a time and keeps the last 512 characters: put the BEGIN line just
  // before a chunk ends, so the body starts in the next chunk.
  const d = dir();
  const pem = `-----BEGIN PRIVATE KEY-----\n${pemLines(fakeBody(256))}\n-----END PRIVATE KEY-----\n`;
  fs.writeFileSync(path.join(d, "big.txt"), "x".repeat(65536 - 30) + pem);
  const r = check([d], "");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /big\.txt: a private key/);
});

test("Node's compile cache stays in the scan: npm's help text passes, and a cache built around a real key is caught", () => {
  const home = dir();
  const cache = path.join(home, ".hermes-alice", "cache", "scratch", "node-compile-cache", "v26.0.0-arm64-00000000-10000");
  fs.mkdirSync(cache, { recursive: true });
  // A compile-cache entry: a binary header, then strings from the compiled source.
  const entry = (strings) => Buffer.concat([Buffer.from([0xb2, 0xdb, 0xdf, 0x8a, 0, 1, 2, 3]), Buffer.from(`\0install-strategy\0hoisted\0${strings}\0json\0`, "latin1")]);
  fs.writeFileSync(path.join(cache, "5abea46b"), entry(NPM_KEY_HELP));
  let r = check([home], "");
  assert.equal(r.status, 0, r.stdout);
  fs.writeFileSync(path.join(cache, "0badc0de"), entry(`-----BEGIN PRIVATE KEY-----\\n${pemLines(fakeBody(256), "\\n")}\\n-----END PRIVATE KEY-----`));
  r = check([home], "");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /node-compile-cache\/v26\.0\.0-arm64-00000000-10000\/0badc0de: a private key/);
  assert.doesNotMatch(r.stdout, /5abea46b/, "the entry with only npm's help text still passes");
});

test("the exact-value check still finds a GitHub App's key with no PEM lines at all, in a compile cache too", () => {
  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${pemLines(fakeBody(256))}\n-----END RSA PRIVATE KEY-----\n`;
  const keys = path.join(dir(), "github-apps");
  fs.mkdirSync(keys);
  fs.writeFileSync(path.join(keys, "alan.pem"), pem);
  const home = dir();
  const cache = path.join(home, "node-compile-cache", "v26");
  fs.mkdirSync(cache, { recursive: true });
  // Only the key's first body line, with no BEGIN line: the shape rule cannot see it, the exact value can.
  fs.writeFileSync(path.join(cache, "entry"), Buffer.from(`\0\0${pem.split("\n")[1]}\0\0`, "latin1"));
  const r = check(["--private-keys", keys, home], "");
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /node-compile-cache\/v26\/entry: a GitHub App's private key/);
  assert.doesNotMatch(r.stdout, /: a private key$/m);
});
