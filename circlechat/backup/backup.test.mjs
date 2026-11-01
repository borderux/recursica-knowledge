// Runs backup.sh and restore-test.sh with stand-ins for docker, restic and curl.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);

// storage: whether the stack has CircleChat's storage volume (a CircleChat that keeps its stored
// files on a volume) or not (an older one that keeps them inside its containers).
function setup({ restic = "ok", system, chown = "ok", dump = "ok", storage = false } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "backup-"));
  const bin = path.join(tmp, "bin"), cc = path.join(tmp, "cc"), log = path.join(tmp, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(path.join(cc, "kit-out"), { recursive: true }); fs.mkdirSync(path.join(cc, "hermes-homes", ".hermes-alan"), { recursive: true });
  fs.writeFileSync(path.join(cc, "site.json"), "{}");
  fs.writeFileSync(path.join(cc, ".env"), "RESTIC_PASSWORD=pw\nSLACK_BOT_TOKEN=xoxb-test\nSLACK_CHANNEL=C123\nSESSION_SECRET=abc\nMINIO_ROOT_PASSWORD=def\n");
  fs.writeFileSync(path.join(cc, "kit-out", "tenant.env"), "TENANT=acme\nSUFFIX=-acme\nCOMPOSE_PROJECT_NAME=cc-acme\nDOCKER_CONTEXT=\nBACKUP_REMOTE=gd:backups\n");
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> ${log}\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  stub("docker", `case "$1" in
  compose) ${dump === "fail" ? "exit 1" : 'echo "CREATE TABLE messages (id int);"'} ;;
  run) for a in "$@"; do case "$a" in *:/out) out="\${a%%:/out}" ;; /out/*.tgz) name="\${a#/out/}" ;; esac; done; mkdir -p /tmp/e$$ && tar czf "$out/$name" -C /tmp/e$$ . ;;
  volume) [ "$2" = inspect ] && ${storage ? "exit 0" : "exit 1"} ;;
esac`);
  stub("restic", restic === "fail-backup" ? `[ "$1" = backup ] && exit 1; [ "$1" = cat ] && exit 1; exit 0` : `
case "$1" in
  cat) exit 1 ;;
  restore) ${restic === "fail-restore" ? "exit 1" : ":"}; t="\${@: -1}"; mkdir -p "$t/stage" "$t/hermes-homes"; cp ${cc}/backup-saved/* "$t/stage/" ;;
  backup) mkdir -p ${cc}/backup-saved; cp ${cc}/backup-staging/* ${cc}/backup-saved/ ;;
  snapshots) ${restic === "fail-snapshots" ? "exit 1" : `echo '[{"time":"2026-10-20T02:00:00Z"}]'`} ;;
esac`);
  stub("curl", `cat >/dev/null; exit 0`);
  // The node stand-in records each Slack post in the log, and runs every other script with the real
  // node.
  stub("node", `case "$1" in */slack.mjs) exit 0 ;; esac; exec "${process.execPath}" "$@"`);
  // Like the real sudo, the stand-in looks the command up in PATH, and fails when PATH has no such
  // command.
  stub("sudo", `command -v "$1" >/dev/null || { echo "sudo: $1: command not found" >&2; exit 1; }; exec "$@"`);
  if (system) stub("uname", `[ "$1" = -s ] || [ $# -eq 0 ] && { echo ${system}; exit 0; }; PATH=/usr/bin:/bin exec uname "$@"`);
  // The chown stand-in sits outside PATH, the way /usr/sbin/chown sits outside a job's PATH.
  const sbin = path.join(tmp, "sbin");
  fs.mkdirSync(sbin);
  fs.writeFileSync(path.join(sbin, "chown"), `#!/usr/bin/env bash\necho "chown $*" >> ${log}\n${chown === "fail" ? "exit 1" : ""}\n`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, CC_DIR: cc, OWNER_HOME: tmp, WS: path.join(tmp, "ws"), FORCE: "1", CHOWN: path.join(sbin, "chown") };
  fs.mkdirSync(env.WS);
  return { env, cc, log, bin };
}
const run = (script, env) => spawnSync("bash", [path.join(here, script)], { env, encoding: "utf8" });
const slackPosts = (log) => fs.readFileSync(log, "utf8").split("\n").filter((l) => /^node \S*\/slack\.mjs /.test(l));

test("backs up the stack, encrypted with the stack's key, then tests a restore", () => {
  const { env, cc, log } = setup();
  const b = run("backup.sh", env);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  const calls = fs.readFileSync(log, "utf8");
  assert.match(calls, /restic init/);
  assert.match(calls, /restic backup --tag acme/);
  assert.match(calls, /restic forget --tag acme --keep-daily 7/);
  assert.match(fs.readFileSync(path.join(cc, "backup-saved/generated.env"), "utf8"), /^MINIO_ROOT_PASSWORD=def$/m);
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

test("the restore test fails when a cloud key is in the backup", () => {
  const { env, cc } = setup();
  assert.equal(run("backup.sh", env).status, 0);
  fs.writeFileSync(path.join(cc, "backup-saved", "notes.txt"), `key ${"sk-ant-" + "a".repeat(40)}\n`);
  const r = run("restore-test.sh", env);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Test restore of stack acme failed .*the key check found a cloud key or a private key in the backup, in 1 place/);
  assert.doesNotMatch(r.stdout, /sk-ant-a/, "the report never shows the key");
});

test("the restore test finds a key from the gateway's secrets file by its exact value", () => {
  const { env, cc } = setup();
  fs.writeFileSync(path.join(cc, "model-keys.env"), "MODEL_KEY_ACME=plain-looking-provider-secret-1234\n");
  assert.equal(run("backup.sh", env).status, 0);
  fs.writeFileSync(path.join(cc, "backup-saved", "notes.txt"), "plain-looking-provider-secret-1234\n");
  assert.match(run("restore-test.sh", env).stdout, /found a cloud key or a private key in the backup/);
});

test("on a Mac, the stack's owner owns the staging folder before a container writes into it", () => {
  for (const [system, owned] of [["Darwin", true], ["Linux", false]]) {
    const { env, cc, log } = setup({ system });
    const b = run("backup.sh", env);
    assert.equal(b.status, 0, b.stdout + b.stderr);
    const calls = fs.readFileSync(log, "utf8").split("\n");
    const chown = calls.indexOf(`chown -h -R ${os.userInfo().username} ${path.join(cc, "backup-staging")}`);
    assert.equal(chown >= 0, owned, `${system}: ${calls.join("\n")}`);
    if (owned) assert.ok(chown < calls.findIndex((c) => c.startsWith("docker run")), "the chown comes before the file store step");
  }
});

test("on a Mac, the backup gives the staging folder to the owner with the job's own PATH, which has no /usr/sbin", () => {
  const { env, cc, log, bin } = setup({ system: "Darwin" });
  // The PATH that setup-host.sh gives the backup job, after the folder of stand-ins.
  env.PATH = `${bin}:${path.dirname(process.execPath)}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin`;
  const b = run("backup.sh", env);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  assert.ok(fs.readFileSync(log, "utf8").split("\n").includes(`chown -h -R ${os.userInfo().username} ${path.join(cc, "backup-staging")}`));
});

test("a failed chown of the staging folder stops the backup and reports the step", () => {
  const { env, log } = setup({ system: "Darwin", chown: "fail" });
  const b = run("backup.sh", env);
  assert.notEqual(b.status, 0);
  assert.match(b.stdout, /Backup of stack acme failed .* at step: staging folder\./);
  assert.doesNotMatch(fs.readFileSync(log, "utf8"), /^docker run/m, "the file store step never runs");
});

test("a failed database dump posts one report, though the dump runs in a subshell", () => {
  const { env, log } = setup({ dump: "fail" });
  const b = run("backup.sh", env);
  assert.notEqual(b.status, 0);
  const posts = slackPosts(log);
  assert.equal(posts.length, 1, posts.join("\n"));
  assert.match(posts[0], /Backup of stack acme failed .* at step: database dump\./);
});

test("an unexpected failure in the restore test posts one report, with the step", () => {
  const { env, log } = setup({ restic: "fail-snapshots" });
  assert.equal(run("backup.sh", env).status, 0);
  fs.writeFileSync(log, "");
  const r = run("restore-test.sh", env);
  assert.notEqual(r.status, 0);
  const posts = slackPosts(log);
  assert.equal(posts.length, 1, posts.join("\n"));
  assert.match(posts[0], /:x: Test restore of stack acme failed on .*, at step: newest backup's time\./);
});

test("an expected failure in the restore test posts its own reason once, and no step report", () => {
  const { env, log } = setup({ restic: "fail-restore" });
  assert.equal(run("backup.sh", env).status, 0);
  fs.writeFileSync(log, "");
  const r = run("restore-test.sh", env);
  assert.notEqual(r.status, 0);
  const posts = slackPosts(log);
  assert.equal(posts.length, 1, posts.join("\n"));
  assert.match(posts[0], /Test restore of stack acme failed on .*: restic could not restore the newest backup/);
});

test("with CircleChat's storage volume, the backup holds the stored files, and the restore test checks them", () => {
  const { env, cc, log } = setup({ storage: true });
  const b = run("backup.sh", env);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  assert.match(fs.readFileSync(log, "utf8"), /^docker run --rm -v cc-acme_storage:\/data:ro -v \S+:\/out alpine:3\.20 tar czf \/out\/storage\.tgz -C \/data \.$/m);
  assert.ok(fs.existsSync(path.join(cc, "backup-saved/storage.tgz")), "storage.tgz is in the backup");
  assert.ok(fs.existsSync(path.join(cc, "backup-saved/minio.tgz")), "MinIO's archive stays");
  assert.equal(fs.existsSync(path.join(cc, "backup-saved/storage.none")), false);
  const r = run("restore-test.sh", env);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // A damaged archive fails the restore test.
  fs.writeFileSync(path.join(cc, "backup-saved/storage.tgz"), "not a tar file");
  assert.match(run("restore-test.sh", env).stdout, /Test restore of stack acme failed .*: the stored files archive is damaged/);
});

test("without the storage volume, the backup skips the stored files with a log line, and says so for the restore test", () => {
  const { env, cc, log } = setup();
  const b = run("backup.sh", env);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  assert.match(b.stdout, /No volume cc-acme_storage: this CircleChat keeps its stored files inside its containers\. storage\.tgz skipped\./);
  assert.doesNotMatch(fs.readFileSync(log, "utf8"), /storage\.tgz/, "no archive step ran");
  assert.equal(fs.existsSync(path.join(cc, "backup-saved/storage.tgz")), false);
  assert.ok(fs.existsSync(path.join(cc, "backup-saved/minio.tgz")), "MinIO's archive stays");
  assert.ok(fs.existsSync(path.join(cc, "backup-saved/storage.none")));
  assert.equal(run("restore-test.sh", env).status, 0);
});

test("the restore test fails when the backup has neither the stored files nor the note that they were skipped", () => {
  const { env, cc } = setup();
  assert.equal(run("backup.sh", env).status, 0);
  fs.rmSync(path.join(cc, "backup-saved/storage.none"));
  const r = run("restore-test.sh", env);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /Test restore of stack acme failed .*: the stored files archive is missing/);
});
