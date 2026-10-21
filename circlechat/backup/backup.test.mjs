// Runs backup.sh and restore-test.sh with stand-ins for docker, restic and curl.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);

function setup({ restic = "ok" } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "backup-"));
  const bin = path.join(tmp, "bin"), cc = path.join(tmp, "cc"), log = path.join(tmp, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(path.join(cc, "kit-out"), { recursive: true }); fs.mkdirSync(path.join(cc, "hermes-homes", ".hermes-alan"), { recursive: true });
  fs.writeFileSync(path.join(cc, "site.json"), "{}");
  fs.writeFileSync(path.join(cc, ".env"), "RESTIC_PASSWORD=pw\nSLACK_BOT_TOKEN=xoxb-test\nSLACK_CHANNEL=C123\n");
  fs.writeFileSync(path.join(cc, "kit-out", "tenant.env"), "TENANT=acme\nSUFFIX=-acme\nCOMPOSE_PROJECT_NAME=cc-acme\nDOCKER_CONTEXT=\nBACKUP_REMOTE=gd:backups\n");
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> ${log}\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  stub("docker", `case "$1" in
  compose) echo "CREATE TABLE messages (id int);" ;;
  run) for a in "$@"; do case "$a" in *:/out) out="\${a%%:/out}" ;; esac; done; mkdir -p /tmp/e$$ && tar czf "$out/minio.tgz" -C /tmp/e$$ . ;;
esac`);
  stub("restic", restic === "fail-backup" ? `[ "$1" = backup ] && exit 1; [ "$1" = cat ] && exit 1; exit 0` : `
case "$1" in
  cat) exit 1 ;;
  restore) t="\${@: -1}"; mkdir -p "$t/stage" "$t/hermes-homes"; cp ${cc}/backup-saved/* "$t/stage/" ;;
  backup) mkdir -p ${cc}/backup-saved; cp ${cc}/backup-staging/* ${cc}/backup-saved/ ;;
  snapshots) echo '[{"time":"2026-10-20T02:00:00Z"}]' ;;
esac`);
  stub("curl", `cat >/dev/null; exit 0`);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, CC_DIR: cc, OWNER_HOME: tmp, WS: path.join(tmp, "ws"), FORCE: "1" };
  fs.mkdirSync(env.WS);
  return { env, cc, log };
}
const run = (script, env) => spawnSync("bash", [path.join(here, script)], { env, encoding: "utf8" });

test("backs up the stack, encrypted with the stack's key, then tests a restore", () => {
  const { env, cc, log } = setup();
  const b = run("backup.sh", env);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  const calls = fs.readFileSync(log, "utf8");
  assert.match(calls, /restic init/);
  assert.match(calls, /restic backup --tag acme/);
  assert.match(calls, /restic forget --tag acme --keep-daily 7/);
  assert.equal(fs.existsSync(path.join(cc, "backup-staging")), false);
  const r = run("restore-test.sh", env);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Test restore of stack acme passed/);
  assert.equal(fs.existsSync(path.join(cc, ".restore-test")), false);
});

test("a failed backup reports the failed step, for the stack's Slack channel", () => {
  const { env } = setup({ restic: "fail-backup" });
  const b = run("backup.sh", env);
  assert.notEqual(b.status, 0);
  assert.match(b.stdout, /Backup of stack acme failed .* at step: restic/);
});
