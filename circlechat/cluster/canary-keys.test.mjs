// canary-keys.sh: OpenCanary's fake SSH host keys move from the old folder into a key folder only
// the account that runs the script reads. install-cluster.sh runs the script as root. The test runs
// it as the test's own account, on scratch folders, so the account's own files count as the keys.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const SCRIPT = path.join(here, "canary-keys.sh");
const KEYS = ["id_rsa", "id_rsa.pub", "id_dsa", "id_dsa.pub"];

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canary-keys-"));
  const old = path.join(dir, "tmp"), keys = path.join(dir, "lib", "opencanary");
  fs.mkdirSync(old);
  const run = () => spawnSync("bash", [SCRIPT, old, keys], { encoding: "utf8" });
  const put = (folder, name, text = `${name} from ${path.basename(folder)}\n`) => { fs.mkdirSync(folder, { recursive: true }); fs.writeFileSync(path.join(folder, name), text, { mode: 0o644 }); };
  const mode = (p) => (fs.statSync(p).mode & 0o777).toString(8);
  return { dir, old, keys, run, put, mode };
}

test("both pairs move into a key folder of mode 700, each key mode 600, with the text unchanged", () => {
  const s = scratch();
  try {
    for (const k of KEYS) s.put(s.old, k);
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(s.mode(s.keys), "700");
    for (const k of KEYS) {
      assert.equal(fs.existsSync(path.join(s.old, k)), false, `${k} left the old folder`);
      assert.equal(fs.readFileSync(path.join(s.keys, k), "utf8"), `${k} from tmp\n`, `${k} kept the decoy's key`);
      assert.equal(s.mode(path.join(s.keys, k)), "600", k);
    }
    assert.match(r.stdout, /moved the decoy's id_rsa pair/);
    assert.match(r.stdout, /moved the decoy's id_dsa pair/);

    const again = s.run();
    assert.equal(again.status, 0, again.stderr);
    assert.equal(again.stdout, "", "a second run changes nothing");
  } finally {
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
});

test("a pair the key folder holds already stays, and the old copy is removed", () => {
  const s = scratch();
  try {
    for (const k of KEYS) { s.put(s.keys, k); s.put(s.old, k); }
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    for (const k of KEYS) {
      assert.equal(fs.existsSync(path.join(s.old, k)), false, k);
      assert.equal(fs.readFileSync(path.join(s.keys, k), "utf8"), `${k} from opencanary\n`, `${k}: the key folder's copy stays`);
      assert.equal(s.mode(path.join(s.keys, k)), "600", k);
    }
  } finally {
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
});

test("half a pair in the old folder is removed and never mixed with another pair", () => {
  const s = scratch();
  try {
    s.put(s.old, "id_rsa");
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.existsSync(path.join(s.old, "id_rsa")), false);
    assert.equal(fs.existsSync(path.join(s.keys, "id_rsa")), false, "OpenCanary makes a whole new pair at its start");
  } finally {
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
});

test("a link in the old folder is never moved, and the file the link points to is untouched", () => {
  const s = scratch();
  try {
    const target = path.join(s.dir, "not-a-key");
    fs.writeFileSync(target, "another file\n", { mode: 0o644 });
    fs.symlinkSync(target, path.join(s.old, "id_rsa"));
    s.put(s.old, "id_rsa.pub");
    const r = s.run();
    assert.equal(r.status, 0, r.stderr);
    assert.equal(fs.lstatSync(path.join(s.old, "id_rsa")).isSymbolicLink(), true, "the link stays where it is");
    assert.equal(fs.existsSync(path.join(s.keys, "id_rsa")), false);
    assert.equal(fs.readFileSync(target, "utf8"), "another file\n");
    assert.equal(s.mode(target), "644", "never set to 600 through the link");
  } finally {
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
});

test("a key folder that is a link stops the script", () => {
  const s = scratch();
  try {
    fs.mkdirSync(path.join(s.dir, "elsewhere"));
    fs.mkdirSync(path.dirname(s.keys), { recursive: true });
    fs.symlinkSync(path.join(s.dir, "elsewhere"), s.keys);
    s.put(s.old, "id_rsa");
    s.put(s.old, "id_rsa.pub");
    const r = s.run();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /is a link/);
    assert.equal(fs.existsSync(path.join(s.old, "id_rsa")), true, "nothing moved");
  } finally {
    fs.rmSync(s.dir, { recursive: true, force: true });
  }
});

test("install-cluster.sh runs the script before OpenCanary's settings, and OpenCanary starts with umask 077", () => {
  const install = fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8");
  const move = install.indexOf('sudo bash "$HERE/canary-keys.sh" /var/tmp "$CANARY_KEYS"');
  const conf = install.indexOf("sudo tee /etc/opencanaryd/opencanary.conf");
  assert.ok(move > 0 && move < conf, "the keys move before the settings change restarts OpenCanary");
  assert.match(install, /^CANARY_KEYS=\/var\/lib\/opencanary$/m);
  assert.match(install, /^ {2}"ssh\.key_path": "\$CANARY_KEYS",$/m);
  assert.match(install, /install_unit opencanary "umask 077; exec \/opt\/opencanary\/bin\/opencanaryd --dev" \/ root/);
});
