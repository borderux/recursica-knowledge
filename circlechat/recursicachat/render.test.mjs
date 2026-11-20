import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { render, values, fill, TEMPLATES } from "./render.mjs";

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
  for (const name of [...TEMPLATES, "colima-service.sh"]) {
    assert.ok(files[name], name);
    assert.doesNotMatch(files[name], /@[A-Z_]+@/, name);
  }
  assert.match(files["run.sh"], /^GOOGLE_CLIENT_ID=123456-abc123\.apps\.googleusercontent\.com$/m);
  assert.match(files["run.sh"], /^GOOGLE_DOMAIN=example\.com$/m);
  assert.match(files["run.sh"], /^PUBLIC_URL=https:\/\/chat\.example\.ts\.net$/m, "the trailing slash is dropped");
  assert.match(files["run.sh"], /^export CIRCLECHAT_GOOGLE_CLIENT_ID="\$GOOGLE_CLIENT_ID" CIRCLECHAT_GOOGLE_CLIENT_SECRET_FILE="\$GOOGLE_SECRET_FILE"$/m);
  assert.match(files["run.sh"], /^export CIRCLECHAT_PUBLIC_URL="\$PUBLIC_URL"$/m);
  for (const name of ["backup.sh", "restore-test.sh"]) {
    assert.match(files[name], /^OWNER_HOME=\/Users\/owner$/m, name);
    assert.match(files[name], /^KIT=\/Users\/owner\/kit\/circlechat$/m, name);
    assert.match(files[name], /^CC_DIR=\/Users\/owner\/circlechat$/m, name);
  }
  assert.match(files["rc-deploy.sh"], /^BUILD_NODE=\/opt\/node\/v24\.0\.0\/bin\/node$/m, "rc-deploy builds with the owner's Node");
});

test("the colima service is the kit's own script, not a second copy", () => {
  assert.equal(render(SITE, DIRS)["colima-service.sh"], readFileSync(join(here, "..", "kit", "colima-service.sh"), "utf8"));
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
