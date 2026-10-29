// The kit check (check-kit.sh): root runs only a kit checkout outside the agents' workspace, which
// only the owner can change. Each test folder sits in the system's temporary folder, a root-owned
// folder with the sticky bit, which the check accepts above a checkout.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { kitProblem } from "../cluster/kit-check.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, "../..");
const me = os.userInfo().username;
const base = os.tmpdir();

// An owner's home folder with a kit checkout at <home>/<where>.
function home(where = "recursica-knowledge") {
  const h = fs.mkdtempSync(path.join(base, "home-"));
  fs.chmodSync(h, 0o755);
  const kit = path.join(h, where);
  fs.mkdirSync(path.join(kit, "circlechat"), { recursive: true, mode: 0o755 });
  for (let d = kit; d !== h; d = path.dirname(d)) fs.chmodSync(d, 0o755);
  fs.writeFileSync(path.join(kit, "circlechat", "setup-host.sh"), "", { mode: 0o644 });
  fs.chmodSync(path.join(kit, "circlechat", "setup-host.sh"), 0o644);
  return { h, kit };
}
const check = (kit, h, { owner = me, env = {} } = {}) =>
  spawnSync("bash", [path.join(here, "check-kit.sh"), kit, owner, h], { encoding: "utf8", env: { ...process.env, WS: "", ...env } });

test("a checkout outside the workspace that only the owner can change passes", () => {
  const { h, kit } = home();
  fs.mkdirSync(path.join(h, "circlechat-workspace"));
  const r = check(kit, h);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("a checkout inside an agents' workspace is refused, through a link too", () => {
  const ws = home("circlechat-workspace/recursica-knowledge");
  let r = check(ws.kit, ws.h);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /the checkout sits inside the agents' workspace .*circlechat-workspace\./);
  assert.match(r.stdout, /such as .*\/recursica-knowledge\./);
  const tenant = home("tenants/acme/workspace/recursica-knowledge");
  assert.match(check(tenant.kit, tenant.h).stdout, /inside the agents' workspace .*tenants\/acme\/workspace\./);
  const other = home("work/recursica-knowledge");
  assert.match(check(other.kit, other.h, { env: { WS: path.join(other.h, "work") } }).stdout, /inside the agents' workspace/, "the workspace in $WS");
  const linked = home("circlechat-workspace/recursica-knowledge");
  fs.symlinkSync(linked.kit, path.join(linked.h, "kit-link"));
  assert.match(check(path.join(linked.h, "kit-link"), linked.h).stdout, /inside the agents' workspace/);
});

test("a file or folder the group or other accounts can change is refused, in the checkout or above it", () => {
  const file = home();
  fs.chmodSync(path.join(file.kit, "circlechat", "setup-host.sh"), 0o664);
  let r = check(file.kit, file.h);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /the group or other accounts can change .*setup-host\.sh\. Run: chmod -R go-w /);
  const dir = home();
  fs.chmodSync(path.join(dir.kit, "circlechat"), 0o757);
  assert.match(check(dir.kit, dir.h).stdout, /the group or other accounts can change .*\/circlechat\./);
  const parent = home("code/recursica-knowledge");
  fs.chmodSync(path.join(parent.h, "code"), 0o775);
  r = check(parent.kit, parent.h);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /can change .*\/code, a folder above the checkout\./);
});

test("a checkout another account owns is refused", () => {
  const { h, kit } = home();
  // This test's account owns the files; the check is told the stacks belong to another account.
  const other = me === "root" ? "nobody" : "root";
  const r = check(kit, h, { owner: other });
  assert.equal(r.status, 1);
  assert.match(r.stdout, new RegExp(`belongs to ${me}, not ${other}\\.`));
});

test("with no owner named, the owner of the home folder is the owner", () => {
  const { h, kit } = home();
  const r = spawnSync("bash", [path.join(here, "check-kit.sh"), kit, "", h], { encoding: "utf8", env: { ...process.env, WS: "" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("the root services' check reports the reason, and passes a clean checkout", () => {
  assert.equal(kitProblem(repo, { OWNER: me, OWNER_HOME: os.homedir() }), null, "this checkout");
  const ws = home("circlechat-workspace/recursica-knowledge");
  fs.mkdirSync(path.join(ws.kit, "circlechat", "kit"), { mode: 0o755 });
  fs.copyFileSync(path.join(here, "check-kit.sh"), path.join(ws.kit, "circlechat", "kit", "check-kit.sh"));
  fs.chmodSync(path.join(ws.kit, "circlechat", "kit", "check-kit.sh"), 0o644);
  assert.match(kitProblem(ws.kit, { OWNER: me, OWNER_HOME: ws.h }), /inside the agents' workspace/);
});

// Every script that runs as root, or installs a command root runs, checks the kit before the
// script changes anything.
test("each root script and each installer of one checks the kit first", () => {
  const scripts = {
    "circlechat/setup-host.sh": /require_kit "\$HERE\/\.\."/,
    "circlechat/sync-skills.sh": /check-kit\.sh" "\$HERE\/\.\."/,
    "circlechat/backup/backup.sh": /require_kit /,
    "circlechat/backup/restore-test.sh": /check-kit\.sh" /,
    "circlechat/deploy/install-secrets-helper.sh": /check-kit\.sh" "\$KIT"/,
    "circlechat/deploy/apply-secrets.sh": /check-kit\.sh" "\$KIT"/,
    "circlechat/tenant/setup-pc.sh": /check-kit\.sh" "\$HERE\/\.\.\/\.\."/,
    "circlechat/cluster/install-cluster.sh": /require_kit "\$KIT"/,
  };
  for (const [file, guard] of Object.entries(scripts)) {
    const text = fs.readFileSync(path.join(repo, file), "utf8");
    const at = text.search(guard);
    assert.ok(at > 0, `${file} checks the kit`);
    const first = text.search(/^[^#\n]*\b(sudo|install_unit|install -m|rm -rf|tee) /m);
    assert.ok(first < 0 || at < first, `${file} checks the kit before the first change`);
  }
  for (const file of ["circlechat/cluster/agent.mjs", "circlechat/cluster/updater.mjs"]) {
    assert.match(fs.readFileSync(path.join(repo, file), "utf8"), /requireKit\(env\.KIT, env\)/, file);
  }
});
