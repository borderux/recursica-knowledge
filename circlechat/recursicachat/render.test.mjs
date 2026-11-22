import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render, values, fill, programs, TEMPLATES } from "./render.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = {
  recursicachat: {
    google_client_id: "123456-abc123.apps.googleusercontent.com",
    google_domain: "example.com",
    public_url: "https://chat.example.ts.net/",
    node: "/opt/node/v24.0.0/bin/node",
  },
};
const DIRS = { ownerHome: "/Users/owner", kit: "/Users/owner/kit/circlechat", ccDir: "/Users/owner/circlechat" };

test("every template renders with no token left", () => {
  const files = render(SITE, DIRS);
  for (const name of [...TEMPLATES, "colima-service.sh", "build-pdftext.sh", "rc-clear.mjs"]) {
    assert.ok(files[name], name);
    assert.doesNotMatch(files[name], /@[A-Z_]+@/, name);
  }
  assert.match(files["run.sh"], /^GOOGLE_CLIENT_ID=123456-abc123\.apps\.googleusercontent\.com$/m);
  assert.match(files["run.sh"], /^GOOGLE_DOMAIN=example\.com$/m);
  assert.match(files["run.sh"], /^PUBLIC_URL=https:\/\/chat\.example\.ts\.net$/m, "the trailing slash is dropped");
  assert.match(files["run.sh"], /^export CIRCLECHAT_GOOGLE_CLIENT_ID="\$GOOGLE_CLIENT_ID" CIRCLECHAT_GOOGLE_CLIENT_SECRET_FILE="\$GOOGLE_SECRET_FILE"$/m);
  assert.match(files["run.sh"], /^export CIRCLECHAT_PUBLIC_URL="\$PUBLIC_URL"$/m);
  for (const name of ["backup.sh", "restore-test.sh", "stack-backup.sh", "stack-restore-test.sh"]) {
    assert.match(files[name], /^OWNER_HOME=\/Users\/owner$/m, name);
    assert.match(files[name], /^KIT=\/Users\/owner\/kit\/circlechat$/m, name);
    assert.match(files[name], /^CC_DIR=\/Users\/owner\/circlechat$/m, name);
  }
  assert.match(files["rc-deploy.sh"], /^BUILD_NODE=\/opt\/node\/v24\.0\.0\/bin\/node$/m, "rc-deploy builds with the owner's Node");
  assert.match(files["rc-clear.sh"], /^PROGRAMS=""$/m, "no service has a job: rc-clear stops and starts the server alone");
  assert.equal(files["rc-clear.mjs"], readFileSync(join(here, "rc-clear.mjs"), "utf8"), "copied as it is");
});

test("rc-clear gets each service that has a job: its name, job, account and state folder", () => {
  const services = [
    { name: "example-service", agents: ["designer"], account: "_program", file: "/opt/program/run/token", job: "io.example.program", state: "/opt/program/home/state" },
    { name: "no-state", agents: ["writer"], account: "_other", file: "/opt/other/run/token", job: "io.example.other" },
    { name: "no-job", agents: ["researcher"], account: "_third", file: "/opt/third/run/token" },
  ];
  const site = { recursicachat: { ...SITE.recursicachat, services } };
  const line = "example-service:io.example.program:_program:/opt/program/home/state no-state:io.example.other:_other:";
  assert.deepEqual(programs(site), { value: line, errs: [] });
  assert.ok(render(site, DIRS)["rc-clear.sh"].split("\n").includes(`PROGRAMS="${line}"`));

  // The kit's site check holds each shape: nothing that fails it reaches the root script.
  const bad = [
    [{ job: "io.example.program; id" }, "job must be"],
    [{ job: "io.recursica.recursicachat-backup" }, "not one of the server's own"],
    [{ name: "two words" }, "name must be"],
    [{ account: "$(id)" }, "account must be"],
    [{ state: "relative/state" }, "state must be"],
    [{ state: "/opt/my program" }, "state must be"],
    [{ state: "/opt/program/state", job: undefined }, "state needs job"],
    [{ shell: "/bin/sh" }, "shell is not a setting"],
  ];
  for (const [change, why] of bad) {
    const entry = { ...services[0], ...change };
    const { value, errs } = programs({ recursicachat: { services: [entry] } });
    assert.equal(value, "", JSON.stringify(change));
    assert.ok(errs.some((e) => e.includes(why)), `${JSON.stringify(change)}: ${errs.join(" | ")}`);
    assert.throws(() => render({ recursicachat: { ...SITE.recursicachat, services: [entry] } }, DIRS), JSON.stringify(change));
  }
});

test("the colima service is the kit's own script, not a second copy", () => {
  assert.equal(render(SITE, DIRS)["colima-service.sh"], readFileSync(join(here, "..", "kit", "colima-service.sh"), "utf8"));
});

test("the PDF text reader: built and recorded by build-pdftext.sh, checked by run.sh and run by its image ID", () => {
  const files = render(SITE, DIRS);
  const build = files["build-pdftext.sh"];
  assert.equal(build, readFileSync(join(here, "build-pdftext.sh"), "utf8"), "copied as it is");
  assert.match(build, /has a base image not pinned by digest/, "it refuses an unpinned base");
  assert.match(build, /DOCKER_HOST="unix:\/\/\$SOCK"/, "on the server's own VM");
  assert.match(build, /ID_FILE="\$BASE\/pdftext\.image-id"/);
  assert.match(build, /docker run --rm --network none --user 65534:65534/, "the tools answer, with no network");
  const run = files["run.sh"];
  assert.match(run, /^PDF_ID_FILE=\/opt\/recursicachat\/pdftext\.image-id$/m);
  assert.match(run, /is not the recorded image \(have: \$\{pdf_have:-none\}\); run sudo \/opt\/recursicachat\/bin\/build-pdftext\.sh/);
  assert.match(run, /^\[ -z "\$pdf_id" \] \|\| export CIRCLECHAT_PDF_IMAGE="\$pdf_id"$/m, "the server runs the recorded ID");
});

test("a missing or badly shaped value is refused", () => {
  const bad = [
    [{ ...SITE.recursicachat, google_client_id: undefined }, "google_client_id"],
    [{ ...SITE.recursicachat, google_client_id: "x; rm -rf /" }, "google_client_id"],
    [{ ...SITE.recursicachat, google_domain: "example.com evil" }, "google_domain"],
    [{ ...SITE.recursicachat, public_url: "http://chat.example.ts.net" }, "public_url"],
    [{ ...SITE.recursicachat, public_url: "https://chat.example.ts.net/$(id)" }, "public_url"],
    [{ ...SITE.recursicachat, node: undefined }, "recursicachat.node"],
    [{ ...SITE.recursicachat, node: "node; id" }, "recursicachat.node"],
  ];
  for (const [rc, key] of bad) {
    const { errs } = values({ recursicachat: rc }, DIRS);
    assert.ok(errs.some((e) => e.includes(key)), `${key}: ${JSON.stringify(rc)}`);
  }
  assert.ok(values(SITE, { ...DIRS, kit: "/Users/owner/my kit" }).errs.length, "a path with a space");
  assert.ok(values(SITE, { ...DIRS, ccDir: "relative" }).errs.length, "a relative path");
  assert.throws(() => render({}, DIRS), /google_client_id/);
});

test("a token with no value throws", () => {
  assert.throws(() => fill("A=@NOPE@", {}), /@NOPE@/);
});

test("no template names a real host, domain or account", () => {
  // The kit is public: each value comes from site.json or the installing account.
  for (const name of TEMPLATES) {
    const text = readFileSync(join(here, name), "utf8");
    assert.doesNotMatch(text, /\.apps\.googleusercontent\.com(?!\$)/, `${name}: a client ID`);
    assert.doesNotMatch(text, /\btail[0-9a-f]{4,}\b|\.ts\.net/, `${name}: a tailnet name`);
    assert.doesNotMatch(text, /\/Users\/[^/@\s"]+/, `${name}: a home folder`);
  }
});

const engineFiles = (text) => {
  const m = text.match(/^ENGINE_FILES=\(\n([\s\S]*?)\n\)$/m);
  assert.ok(m, "ENGINE_FILES");
  return m[1].split("\n").map((l) => l.trim().replace(/^'|'$/g, ""));
};

test("backup.sh leaves out the engine settings that restore-test.sh checks for", () => {
  const backup = engineFiles(readFileSync(join(here, "backup.sh"), "utf8"));
  const restore = engineFiles(readFileSync(join(here, "restore-test.sh"), "utf8"));
  assert.deepEqual(backup, restore);
  for (const f of [".hermes/.env", ".hermes/config.yaml", ".openclaw/openclaw.json", ".config/opencode/opencode.json"]) {
    assert.ok(backup.includes(`./agents/*/home/${f}`), f);
  }
});

test("the guard checks the archive that restic stores", () => {
  const text = readFileSync(join(here, "backup.sh"), "utf8");
  const at = (s) => {
    const i = text.indexOf(s);
    assert.ok(i >= 0, s);
    return i;
  };
  assert.ok(at('tar -cf "$TAR" "${excludes[@]}" @"$ARCHIVE"') < at('STEP="archive check"'));
  assert.ok(at('STEP="archive check"') < at('< "$TAR"'), "restic reads the checked tar");
  assert.match(text, /grep -a -c -F -f "\$secret" "\$TAR"/);
  assert.match(text, /\(master\\\.key\|\[\^\/\]\*\\\.key\|seed\\\.json\|\\\.env\)\$/, "the name check is kept");
});

// The exclude itself needs bsdtar (macOS tar), which reads one archive into another with @.
const bsdtar = ["tar", "bsdtar"].find((t) => /bsdtar/.test(spawnSync(t, ["--version"], { encoding: "utf8" }).stdout ?? ""));
test("bsdtar leaves out exactly the engine settings", { skip: !bsdtar && "no bsdtar" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "rc-backup-test-"));
  try {
    const root = join(dir, "r");
    const keep = ["circlechat.db", "files/f", "agents/a_1/home/.hermes/SOUL.md", "agents/a_1/home/.hermes/skills/s/config.yaml", "agents/a_1/home/work/.hermes/config.yaml", "agents/a_1/home/work/.env.example"];
    const drop = ["agents/a_1/home/.hermes/.env", "agents/a_1/home/.hermes/config.yaml", "agents/a_2/home/.openclaw/openclaw.json", "agents/a_2/home/.config/opencode/opencode.json"];
    for (const f of [...keep, ...drop]) {
      mkdirSync(dirname(join(root, f)), { recursive: true });
      writeFileSync(join(root, f), "x");
    }
    execFileSync(bsdtar, ["-czf", join(dir, "a.tgz"), "-C", root, "."]);
    const excludes = engineFiles(readFileSync(join(here, "backup.sh"), "utf8")).flatMap((f) => ["--exclude", f]);
    execFileSync(bsdtar, ["-cf", join(dir, "b.tar"), ...excludes, `@${join(dir, "a.tgz")}`]);
    const list = execFileSync(bsdtar, ["-tf", join(dir, "b.tar")], { encoding: "utf8" }).split("\n");
    for (const f of keep) assert.ok(list.includes(`./${f}`), `kept ${f}`);
    for (const f of drop) assert.ok(!list.includes(`./${f}`), `left out ${f}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// CircleChat 1.x's nightly backup was the only backup of site.json and the workspace. With 1.x
// retired, stack-backup.sh backs them up, and stack-restore-test.sh proves the backup restores.
test("the stack's files: their own repository, the server's restic password, and a restore test that reads the same repository", () => {
  const backup = readFileSync(join(here, "stack-backup.sh"), "utf8");
  const restore = readFileSync(join(here, "stack-restore-test.sh"), "utf8");
  const server = readFileSync(join(here, "backup.sh"), "utf8");
  const tag = (t) => /^TAG=(\S+)/m.exec(t)[1];
  assert.equal(tag(backup), "stack-files");
  assert.equal(tag(restore), tag(backup), "the restore test reads the backup's repository");
  assert.notEqual(tag(backup), tag(server), "a repository of its own, apart from the server's");
  for (const t of [backup, restore]) {
    assert.match(t, /^PW_FILE=\/etc\/recursicachat\/restic\.password$/m, "the server's password: one secret for both");
    assert.match(t, /^export RESTIC_REPOSITORY="rclone:\$BACKUP_REMOTE\/\$TAG"$/m);
    assert.match(t, /^WS="\$OWNER_HOME\/circlechat-workspace"$/m);
    assert.match(t, /^SITE="\$CC_DIR\/site\.json"$/m);
  }
  assert.match(backup, /restic backup --tag "\$TAG" --host "\$HOST" "\$\{EXCLUDES\[@\]\}" "\$SITE" "\$WS"/);
  // what the backup leaves out, it also leaves out of its checks, and the restore test fails on a .env
  for (const x of ["node_modules", ".env", "'.env.*'", ".DS_Store"]) assert.ok(backup.includes(`--exclude ${x}`), x);
  assert.match(backup, /-name node_modules -o -name \.env -o -name '\.env\.\*' -o -name \.DS_Store \) -prune/);
  assert.match(restore, /-name \.env -o -name '\.env\.\*' -o -name master\.key -o -name '\*\.key' -o -name seed\.json/);
  // the backup refuses a key-named file and the secrets' values before restic runs
  assert.ok(backup.indexOf('STEP="file check"') < backup.indexOf('STEP="restic backup"'));
  for (const t of [backup, restore]) for (const f of ["$KEY_FILE", "$PW_FILE"]) assert.ok(t.includes(`for secret in "${"$"}KEY_FILE" "${"$"}PW_FILE"`), f);
  // the restore test: every file back, the kit's site check, Kev and the app
  assert.match(restore, /restic restore --tag "\$TAG" latest --target "\$OUT"/);
  assert.match(restore, /node "\$KIT\/kit\/render\.mjs" "\$R_SITE"/);
  assert.match(restore, /\$R_WS\/kev\/package\.json/);
});

test("the stack's jobs: nightly at 04:00 after the server's backup, a monthly restore test, and labels install.sh reloads without touching the server", () => {
  const job = (name) => readFileSync(join(here, name), "utf8");
  const nightly = job("io.recursica.stack-backup.plist");
  const monthly = job("io.recursica.stack-restore-test.plist");
  assert.match(nightly, /<string>io\.recursica\.stack-backup<\/string>/);
  assert.match(nightly, /<key>Hour<\/key><integer>4<\/integer>\s*<key>Minute<\/key><integer>0<\/integer>/);
  assert.match(nightly, /\/opt\/recursicachat\/bin\/stack-backup\.sh/);
  assert.match(monthly, /<string>io\.recursica\.stack-restore-test<\/string>/);
  assert.match(monthly, /<key>Day<\/key><integer>1<\/integer>\s*<key>Hour<\/key><integer>5<\/integer>\s*<key>Minute<\/key><integer>30<\/integer>/);
  assert.match(monthly, /\/opt\/recursicachat\/bin\/stack-restore-test\.sh/);
  // install.sh loads a changed *-backup or *-restore-test job at once, and installs both scripts
  const install = readFileSync(join(here, "install.sh"), "utf8");
  assert.match(install, /\*-backup \| \*-restore-test\)/);
  assert.match(install, /^for f in [^\n]*\bstack-backup\.sh stack-restore-test\.sh\b/m);
  for (const t of ["stack-backup.sh", "stack-restore-test.sh", "io.recursica.stack-backup.plist", "io.recursica.stack-restore-test.plist"]) assert.ok(TEMPLATES.includes(t), t);
});
