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
const DIRS = { ownerHome: "/Users/owner", kit: "/Users/owner/kit/circlechat", ccDir: "/Users/owner/recursica-stack", ws: "/Users/owner/recursica-workspace" };

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
    assert.match(files[name], /^CC_DIR=\/Users\/owner\/recursica-stack$/m, name);
  }
  for (const name of ["stack-backup.sh", "stack-restore-test.sh"]) assert.match(files[name], /^WS=\/Users\/owner\/recursica-workspace$/m, name);
  assert.match(files["rc-deploy.sh"], /^BUILD_NODE=\/opt\/node\/v24\.0\.0\/bin\/node$/m, "rc-deploy builds with the owner's Node");
  assert.match(files["rc-clear.sh"], /^PROGRAMS=""$/m, "no service has a job: rc-clear stops and starts the server alone");
  assert.equal(files["rc-clear.mjs"], readFileSync(join(here, "rc-clear.mjs"), "utf8"), "copied as it is");
});

// The contract between the kit and the server: the task-settings file's exact shape.
test("task-settings.json declares the Model use setting, exactly as the server reads it, with the stall", () => {
  const want = {
    settings: [
      {
        key: "model_use", label: "Model use", default: "local_only",
        choices: [
          { value: "local_only", label: "Local only" },
          { value: "local_then_cloud", label: "Local, then cloud if significantly delayed" },
          { value: "cloud_now", label: "Cloud from the start" },
        ],
      },
    ],
    stall_minutes: 15,
  };
  assert.deepEqual(JSON.parse(render(SITE, DIRS)["task-settings.json"]), want);
  const later = { ...SITE, site: { cloud_models: { stall_minutes: 20 } } };
  assert.deepEqual(JSON.parse(render(later, DIRS)["task-settings.json"]), { ...want, stall_minutes: 20 }, "site.cloud_models.stall_minutes");
  // The server's own checks (keys and values [a-z0-9_]{1,40}, labels at most 80, 2 to 10 choices, the default among them).
  for (const st of want.settings) {
    assert.match(st.key, /^[a-z0-9_]{1,40}$/);
    assert.ok(st.label.length <= 80 && st.choices.length >= 2 && st.choices.length <= 10);
    assert.ok(st.choices.some((c) => c.value === st.default));
    for (const c of st.choices) { assert.match(c.value, /^[a-z0-9_]{1,40}$/); assert.ok(c.label.length <= 80); }
  }
  for (const v of [0, 2000, "15", 1.5]) assert.throws(() => render({ ...SITE, site: { cloud_models: { stall_minutes: v } } }, DIRS), /stall_minutes must be a whole number/, String(v));
});

test("run.sh gives the server its task settings and its gateway listener, on 127.0.0.1 only, when the key file is there", () => {
  const run = render(SITE, DIRS)["run.sh"];
  assert.match(run, /^TASK_SETTINGS_FILE=\/etc\/recursicachat\/task-settings\.json$/m);
  assert.match(run, /^GATEWAY_KEY_FILE=\/etc\/recursicachat\/gateway\.key$/m);
  assert.match(run, /^GATEWAY_PORT=3101$/m);
  assert.match(run, /^  export CIRCLECHAT_TASK_SETTINGS_FILE="\$TASK_SETTINGS_FILE"$/m);
  assert.match(run, /^  export CIRCLECHAT_GATEWAY_PORT="\$GATEWAY_PORT" CIRCLECHAT_GATEWAY_HOST=127\.0\.0\.1 CIRCLECHAT_GATEWAY_KEY_FILE="\$GATEWAY_KEY_FILE"$/m);
  assert.match(run, /root:_recursicachat:440 \] \|\| fail "\$GATEWAY_KEY_FILE must be root:_recursicachat, mode 440"/);
  assert.match(run, /if \[ -e "\$GATEWAY_KEY_FILE" \]; then/, "no key file: no task settings and no listener");
  assert.doesNotMatch(run, /CIRCLECHAT_GATEWAY_KEY=/, "the key itself is never in the environment");
});

test("install.sh copies the gateway's key into the server's key file only from a plain file with a key's shape", () => {
  const install = readFileSync(join(here, "install.sh"), "utf8");
  assert.match(install, /GW_KEY_SRC="\$CC_DIR\/gateway-state\/rc-tasks\.key"/);
  assert.match(install, /\[ -L "\$GW_KEY_SRC" \]/, "never through a link");
  assert.match(install, /\^rct_\[0-9a-f\]\{48\}\$/, "only a gateway key's shape");
  assert.match(install, /install -m 440 -o root -g _recursicachat "\$OUT\/gateway\.key" "\$ETC\/gateway\.key"/);
  assert.match(install, /install -m 440 -o root -g _recursicachat "\$OUT\/task-settings\.json" "\$ETC\/task-settings\.json"/);
  assert.doesNotMatch(install, /install -m 644 [^\n]*task-settings\.json/, "only the server's account reads the task settings");
  assert.doesNotMatch(install, /echo "\$gw_key"/, "the key is never printed");
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

// sudo recursicachat/install.sh stopped on a site.json that the kit's own setup accepted: "gateway.routes:
// "judge" is not one of site.json's routes" and "needs site.gateway_local_port". The check got no site.
test("a service with a gateway block passes when site.json has its routes and the gateway's port", () => {
  const example = JSON.parse(readFileSync(join(here, "..", "site.example.json"), "utf8"));
  const site = structuredClone(example);
  site.site.gateway_local_port = 4005;
  site.routes.judge = ["machine-2/ollama/large-local"];
  site.recursicachat = { ...SITE.recursicachat, services: [{ name: "example-service", agents: ["designer"], account: "_program", file: "/opt/program/run/token", job: "io.example.program", gateway: { routes: ["judge"], max_parallel: 4, daily_requests: 5000 } }] };
  assert.deepEqual(programs(site), { value: "example-service:io.example.program:_program:", errs: [] });
  assert.ok(render(site, DIRS)["rc-clear.sh"].includes('PROGRAMS="example-service:io.example.program:_program:"'));
  // A route site.json lacks still fails, against the real site.
  site.recursicachat.services[0].gateway.routes = ["no-such-route"];
  assert.ok(programs(site).errs.some((e) => e.includes('"no-such-route" is not one of site.json\'s routes')));
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
  assert.ok(values(SITE, { ...DIRS, ws: undefined }).errs.length, "no workspace");
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

// CircleChat 1.x's nightly backup held site.json and the workspace. 1.x is gone, so stack-backup.sh
// backs them up, and stack-restore-test.sh proves the backup restores.
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
    assert.match(t, /^WS=@WS@$/m);
    // A script installed before migrate-off-1x.sh moved the folders follows the move.
    assert.ok(t.includes('[ -L "$WS" ] && [ -d "$OWNER_HOME/recursica-workspace" ] && [ ! -L "$OWNER_HOME/recursica-workspace" ] && WS="$OWNER_HOME/recursica-workspace"'));
    assert.ok(t.includes('[ -L "$CC_DIR" ] && [ -d "$OWNER_HOME/recursica-stack" ] && [ ! -L "$OWNER_HOME/recursica-stack" ] && CC_DIR="$OWNER_HOME/recursica-stack"'));
    assert.match(t, /^SITE="\$CC_DIR\/site\.json"$/m);
  }
  assert.match(backup, /restic backup --tag "\$TAG" --host "\$HOST" "\$\{EXCLUDES\[@\]\}" "\$SITE" "\$WS"/);
  // what the backup leaves out, it also leaves out of its checks, and the restore test fails on a .env
  for (const x of ["node_modules", ".env", "'.env.*'", ".DS_Store"]) assert.ok(backup.includes(`--exclude ${x}`), x);
  assert.ok(backup.includes(`-name node_modules -o -name .env -o -name '.env.*' -o -name .DS_Store \\) -prune`), "the file check leaves out what restic leaves out");
  assert.ok(restore.includes(`-name .env -o -name '.env.*' -o -name master.key -o -name '*.key' -o -name seed.json`), "the restore test fails on a .env or a key-named file");
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

// The jobs post only on trouble (or a passed restore test), so each post's result goes to the job's
// log, never to /dev/null, and each run records its result for the morning summary
// (cluster/daily-summary.mjs).
test("the backups and restore tests log each post's result, log a success line, and record ok or failed", () => {
  const jobs = { "backup.sh": "recursicachat-backup", "stack-backup.sh": "stack-backup", "restore-test.sh": "recursicachat-restore-test", "stack-restore-test.sh": "stack-restore-test" };
  for (const [file, job] of Object.entries(jobs)) {
    const t = readFileSync(join(here, file), "utf8");
    assert.match(t, /^  CC_DIR="\$CC_DIR" node "\$KIT\/kit\/slack\.mjs" "\$1" \|\| true$/m, file);
    assert.doesNotMatch(t, /slack\.mjs[^\n]*\/dev\/null/, file);
    assert.ok(t.includes(`status() { node "$KIT/kit/job-status.mjs" ${job} "$1" "$2" || true; }`), file);
    assert.match(t, /^trap '\[ "\$BASH_SUBSHELL" -gt 0 \] \|\| \{ say "[^\n]*"; status failed "at step: \$STEP"; \}' ERR$/m, `${file}: a failure is recorded`);
    assert.match(t, /^status ok "/m, `${file}: a success is recorded`);
  }
  for (const file of ["backup.sh", "stack-backup.sh"]) {
    const t = readFileSync(join(here, file), "utf8");
    assert.match(t, /^restic backup [^\n]*\| tee "\$WORK\/restic\.out"$/m, `${file}: restic's output still reaches the log`);
    assert.match(t, /^echo "\$\(date -u \+%FT%TZ\) Backup of [^\n]* done: snapshot \$\{SNAP:-saved\}, \$N [a-z ]+\."$/m, `${file}: the success line names the snapshot`);
  }
  for (const file of ["restore-test.sh", "stack-restore-test.sh"]) assert.match(readFileSync(join(here, file), "utf8"), /^fail\(\) \{ say "[^\n]*"; status failed "\$1"; exit 1; \}$/m, file);
  const rustdesk = readFileSync(join(here, "..", "rustdesk", "backup-rustdesk.sh"), "utf8");
  assert.doesNotMatch(rustdesk, /post\.mjs[^\n]*>\/dev\/null/);
});
