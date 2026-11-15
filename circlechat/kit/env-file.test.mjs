// The rendered app.env, porter.env and tenant.env (kit/render.mjs), read by the kit's shell scripts
// with kit/env-file.sh. No value runs, whatever the value holds: $, ;, a backtick, a quote or a
// space. render.mjs refuses a value with a line break, so a value never adds a line of its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { EnvValueError, envFile, render, validate } from "./render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const kit = path.join(here, "..");
const example = JSON.parse(fs.readFileSync(path.join(kit, "site.example.json"), "utf8"));

// Each value tries to make a file named "ran" in the test's folder.
const PAYLOADS = [
  "$(touch ran)",
  "x; touch ran",
  "`touch ran`",
  "it's \"quoted\" $(touch ran) 'x'",
  "${HOME:+$(touch ran)}",
  "a b & touch ran | cat > ran",
];

// Loads <file> in bash with the kit's reader, then prints each key's value, one per line, NUL
// after each. Runs in <dir>, so a value that runs makes <dir>/ran.
function load(dir, file, keys, how = 'load_env_file "$1"') {
  const script = `. "${path.join(here, "env-file.sh")}"; ${how}; for k in ${keys.join(" ")}; do printf '%s\\0' "\${!k}"; done`;
  const r = spawnSync("bash", ["-c", script, "load", file], { cwd: dir, encoding: "utf8" });
  return { ...r, values: r.stdout.split("\0").slice(0, keys.length) };
}

// The keys of each file render.mjs writes, from the example stack.
const r0 = render({ ...structuredClone(example), porter: { ...example.porter, owner: "acme", targets: ["https://github.com/acme/a"] } });
const FILES = { "app.env": r0.appEnv, "porter.env": r0.porterEnv, "tenant.env": r0.tenantEnv };
const keysOf = (text) => text.split("\n").filter(Boolean).map((l) => l.slice(0, l.indexOf("=")));

for (const [name, text] of Object.entries(FILES)) {
  test(`${name}: each value stays text, and no $, ;, backtick or quote runs`, () => {
    const keys = keysOf(text);
    assert.ok(keys.length >= 2, name);
    for (const payload of PAYLOADS) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-file-"));
      const file = path.join(dir, name);
      // Every key in the file gets the payload, so each kind of value is tried.
      fs.writeFileSync(file, envFile(keys.map((k) => `${k}=${payload}`)));
      const r = load(dir, file, keys);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(r.values, keys.map(() => payload), `${name}: ${payload}`);
      assert.ok(!fs.existsSync(path.join(dir, "ran")), `${name}: ${payload} ran`);
    }
  });
}

test("the old way, sourcing the file, runs the value: the tests above would catch a return to it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-file-"));
  const file = path.join(dir, "tenant.env");
  fs.writeFileSync(file, "TENANT=$(touch ran)\n");
  load(dir, file, ["TENANT"], '. "$1"');
  assert.ok(fs.existsSync(path.join(dir, "ran")));
});

test("render refuses a value with a line break, so a value never adds a line", () => {
  for (const nl of ["\n", "\r", "\r\n", "\0"]) {
    assert.throws(() => envFile([`BACKUP_REMOTE=x${nl}TENANT=evil`]), EnvValueError);
  }
  assert.throws(() => envFile(["lower=x"]), /not a setting name/);
  // porter.owner passes the config check with any text. A line break in the owner stops render.
  const s = structuredClone(example);
  s.porter = { ...example.porter, owner: "acme\nTENANT=evil", targets: ["https://github.com/acme/a"] };
  assert.deepEqual(validate(s).filter((e) => /porter/.test(e)), []);
  assert.throws(() => render(s), /the value for PORTER_OWNER holds a line break/);
});

test("render.mjs stops with a message, and writes nothing, for a value with a line break", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-file-"));
  const site = path.join(dir, "site.json"), out = path.join(dir, "out");
  fs.writeFileSync(site, JSON.stringify({ ...example, porter: { ...example.porter, owner: "acme\n$(touch ran)", targets: ["https://github.com/acme/a"] } }));
  const r = spawnSync(process.execPath, [path.join(here, "render.mjs"), site, out], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /site.json has problems:\n {2}- the value for PORTER_OWNER holds a line break/);
  assert.ok(!fs.existsSync(out));
  assert.ok(!fs.existsSync(path.join(dir, "ran")));
});

test("a porter.owner with shell characters reaches porter.env as text, and the reader never runs it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-file-"));
  const site = path.join(dir, "site.json"), out = path.join(dir, "out");
  const owner = "acme$(touch ran);`touch ran`'\"";
  fs.writeFileSync(site, JSON.stringify({ ...example, porter: { ...example.porter, owner, targets: ["https://github.com/acme/a"] } }));
  const rr = spawnSync(process.execPath, [path.join(here, "render.mjs"), site, out], { cwd: dir, encoding: "utf8" });
  assert.equal(rr.status, 0, rr.stderr);
  const r = load(dir, path.join(out, "porter.env"), ["PORTER_OWNER"]);
  assert.deepEqual(r.values, [owner]);
  assert.ok(!fs.existsSync(path.join(dir, "ran")));
});

test("a line that is not KEY=value is skipped, and a missing file returns 1", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-file-"));
  const file = path.join(dir, "tenant.env");
  fs.writeFileSync(file, "touch ran\nlower=1\n$(touch ran)=1\nTENANT=acme");
  const r = load(dir, file, ["TENANT"]);
  assert.deepEqual(r.values, ["acme"], "the last line needs no line break");
  assert.ok(!fs.existsSync(path.join(dir, "ran")));
  assert.equal(load(dir, path.join(dir, "none.env"), [], 'load_env_file "$1"; echo "rc=$?"').stdout, "rc=1\n");
});

test("no kit script sources a rendered env file", () => {
  const offenders = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); continue; }
      if (!e.name.endsWith(".sh")) continue;
      fs.readFileSync(p, "utf8").split("\n").forEach((l, i) => {
        if (/^\s*(\.|source)\s+\S*(tenant|app|porter)\.env\b|^\s*(\.|source)\s+"?\$TENANT_ENV/.test(l)) offenders.push(`${path.relative(kit, p)}:${i + 1}`);
      });
    }
  };
  walk(kit);
  assert.deepEqual(offenders, []);
});

test("a cloud approver's email takes letters, digits and . _ % + - only", () => {
  const withEmail = (email) => validate({ ...structuredClone(example), site: { ...example.site, slack_channel_id: "C0STACK01" }, cloud_approvers: [{ email, slack_user: "U0AAAA001" }] }).filter((e) => /cloud_approvers/.test(e));
  assert.deepEqual(withEmail("person.a+ops@acme.com"), []);
  for (const bad of ["a$(id)@acme.com", "a;b@acme.com", "a`id`@acme.com", "a'b@acme.com", 'a"b@acme.com', "a\nb@acme.com", "a b@acme.com"]) {
    assert.match(withEmail(bad).join("\n"), /cloud_approvers\[0\].email must be the person's CircleChat email/, JSON.stringify(bad));
  }
});
