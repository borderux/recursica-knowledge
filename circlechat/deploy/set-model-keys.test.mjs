// set-model-keys.sh: the only way a demo's or a client's cloud key values reach GitHub. It runs only
// with a person at the keyboard, outside Claude Code. util-linux script gives the test a terminal.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const here = path.dirname(new URL(import.meta.url).pathname);
const hasPty = process.platform === "linux" && spawnSync("script", ["--version"]).status === 0;

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "keys-"));
  const bin = path.join(dir, "bin"); fs.mkdirSync(bin);
  // gh stand-in: records its arguments and the value it reads on stdin.
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env bash\nprintf '%s|%s\\n' "$*" "$(cat)" >> "${dir}/gh.log"\n`, { mode: 0o755 });
  const site = path.join(dir, "site.json");
  fs.writeFileSync(site, JSON.stringify({ site: { tenant: "acme", kind: "demo" }, model_keys: { default: { provider: "anthropic", model: "claude-sonnet-5-5" }, xai: { provider: "xai", model: "grok-4" } } }));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` }; delete env.CLAUDECODE;
  const gh = () => (fs.existsSync(path.join(dir, "gh.log")) ? fs.readFileSync(path.join(dir, "gh.log"), "utf8") : "");
  return { dir, site, env, gh };
}
const cmd = (site) => `bash '${path.join(here, "set-model-keys.sh")}' '${site}' acme-org/stacks`;

test("refuses to run without a person at the keyboard", () => {
  const s = sandbox();
  const r = spawnSync("bash", [path.join(here, "set-model-keys.sh"), s.site, "acme-org/stacks"], { input: "secret-value\n", encoding: "utf8", env: s.env });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Run set-model-keys.sh yourself, in your own terminal, outside Claude Code/);
  assert.equal(s.gh(), "");
});

test("refuses inside a Claude Code session, even with a terminal", { skip: !hasPty && "needs util-linux script for a terminal" }, () => {
  const s = sandbox();
  const r = spawnSync("script", ["-qec", cmd(s.site), "/dev/null"], { input: "secret-value\n", encoding: "utf8", env: { ...s.env, CLAUDECODE: "1" } });
  assert.match(r.stdout, /outside Claude Code/);
  assert.equal(s.gh(), "");
});

test("at the keyboard, saves each key as MODEL_KEY_<NAME> in the stack's environment, through stdin, and never shows it", { skip: !hasPty && "needs util-linux script for a terminal" }, () => {
  const s = sandbox();
  const r = spawnSync("script", ["-qec", cmd(s.site), "/dev/null"], { input: "first-secret-value\n\n", encoding: "utf8", env: s.env });
  assert.equal(r.status, 0, r.stdout);
  assert.equal(s.gh(), "secret set MODEL_KEY_DEFAULT --env client-acme --repo acme-org/stacks|first-secret-value\n");
  assert.match(r.stdout, /saved MODEL_KEY_DEFAULT/);
  assert.match(r.stdout, /skipped MODEL_KEY_XAI/);
  // script echoes the typed input before the program reads it; the program itself prints no value.
  assert.equal(r.stdout.split("first-secret-value").length - 1, 1, "the value appears only where the terminal echoed the typing");
});
