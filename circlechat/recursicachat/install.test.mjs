// install.sh's check that an installed file in /etc/recursicachat is current: the same text, owner,
// group and mode. A file with the right text and a wrong mode is installed again, so a wrong mode is
// put right. install.sh runs only on a Mac, as root, and `stat -f` is macOS's form, so the behavior
// test runs on macOS (kit.yml's macOS job). On Linux only the text checks run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const install = readFileSync(join(here, "install.sh"), "utf8");
const line = (name) => {
  const m = install.match(new RegExp(`^${name}\\(\\) \\{.*\\}$`, "m"));
  assert.ok(m, `install.sh defines ${name}()`);
  return m[0];
};

test("both files in /etc/recursicachat are checked and installed as root:_recursicachat 440", () => {
  for (const f of ["gateway.key", "task-settings.json"]) {
    const esc = f.replace(".", "\\.");
    assert.match(install, new RegExp(`if current "\\$OUT/${esc}" "\\$ETC/${esc}" root:_recursicachat:440; then`), f);
    assert.match(install, new RegExp(`install -m 440 -o root -g _recursicachat "\\$OUT/${esc}" "\\$ETC/${esc}"`), f);
  }
  assert.match(install, /task-settings\.json, the task settings the server offers +root:_recursicachat 440$/m, "the header comment matches");
});

test("current(): the text, owner, group and mode must all match", { skip: process.platform !== "darwin" && "stat -f is macOS's form" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "install-current-"));
  try {
    const fresh = join(dir, "new.json");
    const installed = join(dir, "installed.json");
    writeFileSync(fresh, '{"settings":[]}\n');
    const check = (want, file = installed) =>
      spawnSync("bash", ["-c", `${line("same")}\n${line("current")}\ncurrent "$1" "$2" "$3"`, "check", fresh, file, want]).status === 0;

    assert.equal(check("nobody:nobody:440", join(dir, "missing.json")), false, "no installed file");

    writeFileSync(installed, '{"settings":[]}\n');
    chmodSync(installed, 0o440);
    const who = execFileSync("stat", ["-f", "%Su:%Sg", installed], { encoding: "utf8" }).trim();
    assert.equal(check(`${who}:440`), true, "the same text, owner, group and mode");

    chmodSync(installed, 0o644);
    assert.equal(check(`${who}:440`), false, "the same text with a wrong mode is installed again");

    chmodSync(installed, 0o640);
    writeFileSync(installed, '{"settings":[{"id":"example"}]}\n');
    chmodSync(installed, 0o440);
    assert.equal(check(`${who}:440`), false, "changed text");

    writeFileSync(fresh, '{"settings":[{"id":"example"}]}\n');
    if (process.getuid() !== 0) assert.equal(check("root:wheel:440"), false, "another owner");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
