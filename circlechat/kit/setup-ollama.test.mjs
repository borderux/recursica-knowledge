// setup-ollama.sh, run with stand-ins for sudo, curl, zstd, systemd and the account tools. The
// archive is a plain tar with a stand-in ollama, and zstd's stand-in passes the archive through.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const VERSION = "0.40.15";

function sandbox({ hash = null, account = null, foreignUnit = false, portHeld = false, missing = [], have = [], answers = true } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "setup-ollama-"));
  const bin = path.join(home, "bin"), log = path.join(home, "calls.log"), units = path.join(home, "units");
  const root = path.join(home, "opt"), state = path.join(home, "state"), pkg = path.join(home, "pkg");
  for (const d of [bin, units, path.join(pkg, "bin")]) fs.mkdirSync(d, { recursive: true });
  // The stand-in ollama records each pull.
  fs.writeFileSync(path.join(pkg, "bin", "ollama"), `#!/usr/bin/env bash\necho "ollama $* OLLAMA_HOST=$OLLAMA_HOST" >> "${log}"\n`, { mode: 0o755 });
  const archive = path.join(home, "ollama.tar");
  assert.equal(spawnSync("tar", ["cf", archive, "-C", pkg, "bin"]).status, 0);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`, { mode: 0o755 });
  stub("sudo", `exec "$@"`);
  stub("zstd", `[ "$1" = -dc ] && exec cat "$2"`);
  fs.writeFileSync(path.join(home, "tags.json"), JSON.stringify({ models: have.map((name) => ({ name, model: name })) }));
  stub("curl", `out=""; url=""; while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift ;; http*) url="$1" ;; esac; shift; done
if [ -n "$out" ]; then cp "${archive}" "$out"; exit 0; fi
case "$url" in
  */api/version) ${answers ? `echo '{"version":"${VERSION}"}'` : "exit 7"} ;;
  */api/tags) cat "${home}/tags.json" ;;
  *) exit 22 ;;
esac`);
  stub("getent", `case "$1 $2" in
  "passwd recursica-ollama") ${account ? `echo "recursica-ollama:x:998:998::${state}:${account}"` : "exit 2"} ;;
  "group video") echo "video:x:44:" ;;
  *) exit 2 ;;
esac`);
  for (const t of ["useradd", "usermod", "chown", "systemctl", "sleep"]) stub(t, t === "systemctl" ? `[ "$1" = is-active ] && exit 3; exit 0` : "exit 0");
  stub("ss", portHeld ? `echo 'LISTEN 0 4096 127.0.0.1:11434 0.0.0.0:* users:(("ollama",pid=77,fd=3))'` : "exit 0");
  const foreign = path.join(home, "foreign-ollama.service");
  if (foreignUnit) fs.writeFileSync(foreign, "[Service]\n");
  const spec = path.join(home, "node.json");
  fs.writeFileSync(spec, JSON.stringify({ os: "linux", services: [], ollama: {
    version: VERSION, archives: { amd64: { url: "https://example.invalid/ollama-linux-amd64.tar.zst", sha256: hash ?? sha }, arm64: { url: "https://example.invalid/ollama-linux-arm64.tar.zst", sha256: hash ?? sha } },
    listen: "127.0.0.1", port: 11434,
    env: ["OLLAMA_CONTEXT_LENGTH=8192", "OLLAMA_NUM_PARALLEL=2", "OLLAMA_KEEP_ALIVE=-1", "OLLAMA_KV_CACHE_TYPE=q8_0", "OLLAMA_MAX_LOADED_MODELS=1", "OLLAMA_FLASH_ATTENTION=1"],
    models: ["qwen3:4b", "gemma3"] } }));
  const run = () => {
    // The stand-ins come first and the real tools after. For a missing tool, the PATH holds links to
    // each other tool the script needs, and nothing named after the missing tool.
    let PATH = `${bin}:${process.env.PATH}`;
    if (missing.length) {
      const tools = path.join(home, "tools");
      fs.mkdirSync(tools);
      for (const t of ["bash", "dirname", "cat", "cut", "uname", "mkdir", "rm", "mv", "cp", "chmod", "tar", "sha256sum", "grep", "seq", "mktemp", "node"]) {
        if (missing.includes(t)) continue;
        const real = spawnSync("bash", ["-c", `command -v ${t}`], { encoding: "utf8" }).stdout.trim();
        if (real) fs.symlinkSync(real, path.join(tools, t));
      }
      for (const t of missing) fs.rmSync(path.join(bin, t), { force: true });
      PATH = `${bin}:${tools}`;
    }
    return spawnSync("bash", [path.join(here, "setup-ollama.sh"), spec], { encoding: "utf8",
      env: { ...process.env, PATH, OLLAMA_ROOT: root, OLLAMA_STATE: state, SYSTEMD_UNIT_DIR: units, OLLAMA_FOREIGN_UNITS: foreign, OLLAMA_START_TRIES: "2" } });
  };
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { run, calls, root, state, units, home };
}

test("setup-ollama installs the pinned release, an account with no login shell, and the service with site.json's settings", () => {
  const s = sandbox();
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(s.root, VERSION, "bin", "ollama")));
  assert.match(s.calls(), /^useradd --system --user-group --home-dir \S+state --no-create-home --shell \/usr\/sbin\/nologin recursica-ollama$/m);
  assert.match(s.calls(), /^usermod -aG video recursica-ollama$/m);
  assert.doesNotMatch(s.calls(), /^usermod -aG render/m, "a group the computer lacks is left out");
  assert.match(s.calls(), /^chown -R recursica-ollama:recursica-ollama \S+state$/m);
  assert.equal(fs.statSync(path.join(s.state, "models")).mode & 0o777, 0o700, "only the account can write the models folder");
  const unit = fs.readFileSync(path.join(s.units, "recursica-ollama.service"), "utf8");
  assert.match(unit, /^User=recursica-ollama$/m);
  assert.match(unit, new RegExp(`^ExecStart=${s.root}/${VERSION}/bin/ollama serve$`, "m"));
  for (const line of ["OLLAMA_HOST=127.0.0.1:11434", `OLLAMA_MODELS=${s.state}/models`, "OLLAMA_CONTEXT_LENGTH=8192", "OLLAMA_NUM_PARALLEL=2", "OLLAMA_KEEP_ALIVE=-1", "OLLAMA_KV_CACHE_TYPE=q8_0", "OLLAMA_MAX_LOADED_MODELS=1", "OLLAMA_FLASH_ATTENTION=1"]) {
    assert.ok(unit.includes(`\nEnvironment=${line}\n`), `the unit sets ${line}`);
  }
  assert.match(unit, /^ProtectSystem=strict$/m);
  assert.match(unit, new RegExp(`^ReadWritePaths=${s.state}$`, "m"));
  assert.match(s.calls(), /^systemctl restart recursica-ollama\.service$/m);
});

test("setup-ollama pulls only the models site.json lists that the server lacks, and removes none", () => {
  const s = sandbox({ have: ["qwen3:4b", "old-model:7b"] });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Model qwen3:4b: already on the server\./);
  assert.match(s.calls(), /^ollama pull gemma3 OLLAMA_HOST=127\.0\.0\.1:11434$/m);
  assert.doesNotMatch(s.calls(), /^ollama pull qwen3:4b/m);
  assert.doesNotMatch(s.calls(), /^ollama (rm|delete|prune)/m);
  assert.doesNotMatch(s.calls(), /old-model/, "a model site.json doesn't list stays, untouched");
});

test("setup-ollama installs nothing when the archive's hash differs from the pinned hash", () => {
  const s = sandbox({ hash: "0".repeat(64) });
  const r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /The Ollama archive's SHA-256 is [0-9a-f]{64}, and kit\/ollama\.mjs pins 0{64}\. Nothing was installed\./);
  assert.ok(!fs.existsSync(path.join(s.root, VERSION)) && !fs.existsSync(path.join(s.root, `${VERSION}.new`)));
  assert.ok(!fs.existsSync(path.join(s.units, "recursica-ollama.service")));
  assert.doesNotMatch(s.calls(), /^(zstd|useradd) /m);
});

test("setup-ollama downloads a version once, and a rerun leaves the service unchanged", () => {
  const s = sandbox();
  assert.equal(s.run().status, 0);
  fs.writeFileSync(path.join(s.home, "calls.log"), "");
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(s.calls(), /-o \S+ollama\.tar\.zst/);
  assert.match(r.stdout, /recursica-ollama is running and unchanged/);
});

test("setup-ollama stops, and changes nothing, beside another Ollama", () => {
  let s = sandbox({ foreignUnit: true });
  let r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Ollama's own installer set up \S+, so another Ollama already runs on this computer/);
  assert.match(r.stdout, /sudo systemctl disable --now ollama/);
  s = sandbox({ portHeld: true });
  r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Another program listens on port 11434/);
  for (const t of [s]) {
    assert.ok(!fs.existsSync(path.join(t.root, VERSION)));
    assert.doesNotMatch(t.calls(), /^(curl -fsSL|useradd)/m);
  }
});

test("setup-ollama refuses an existing account with a login shell", () => {
  const s = sandbox({ account: "/bin/bash" });
  const r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /The account recursica-ollama has the login shell \/bin\/bash/);
  assert.ok(!fs.existsSync(path.join(s.units, "recursica-ollama.service")));
});

test("setup-ollama names a missing tool and the command that installs the tool", () => {
  const s = sandbox({ missing: ["zstd"] });
  const r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /zstd is not installed\. Install zstd with: sudo apt install zstd\./);
});

test("setup-ollama stops when the server never answers", () => {
  const s = sandbox({ answers: false });
  const r = s.run();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /The Ollama server does not answer on 127\.0\.0\.1:11434/);
});

test("setup-ollama gives an older unit the new description with a reload, and leaves Ollama running", () => {
  const s = sandbox();
  assert.equal(s.run().status, 0);
  const unit = path.join(s.units, "recursica-ollama.service");
  assert.match(fs.readFileSync(unit, "utf8"), /^Description=Ollama 0\.40\.15 \(agent cluster kit\)$/m);
  fs.writeFileSync(unit, fs.readFileSync(unit, "utf8").replace("(agent cluster kit)", "(circlechat kit)"));
  fs.writeFileSync(path.join(s.home, "calls.log"), "");
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /recursica-ollama is running and unchanged, with a new description/);
  assert.match(s.calls(), /^systemctl daemon-reload$/m);
  assert.doesNotMatch(s.calls(), /^systemctl restart/m);
  assert.match(fs.readFileSync(unit, "utf8"), /\(agent cluster kit\)/);
});
