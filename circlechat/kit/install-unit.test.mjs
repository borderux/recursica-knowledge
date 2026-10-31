// A rerun of the setup scripts restarts each service whose unit, command or settings change, and
// leaves every other service running (kit/lib.sh install_unit). Run with stand-ins for sudo,
// systemctl, launchctl and uname, and a sandbox folder in place of the systems' unit folders.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);

function sandbox(system) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "install-unit-"));
  const bin = path.join(dir, "bin"), units = path.join(dir, "units"), log = path.join(dir, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body = "") => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  stub("uname", `echo ${system}`);
  // sudo runs the command as the test's own user, through the stand-ins on PATH.
  stub("sudo", `exec "$@"`);
  stub("systemctl", `echo "systemctl $*" >> "${log}"`);
  // launchctl print finds each service whose plist bootstrap loaded. bootout fails for a service
  // that is not loaded, as the real command does.
  const loaded = path.join(dir, "loaded");
  stub("launchctl", `echo "launchctl $*" >> "${log}"
case "$1" in
  print) grep -qx "\${2#system/}" "${loaded}" 2>/dev/null ;;
  bootstrap) basename "$3" .plist >> "${loaded}" ;;
  bootout) l=$(basename "$3" .plist); grep -qx "$l" "${loaded}" 2>/dev/null || exit 5; grep -vx "$l" "${loaded}" > "${loaded}.new"; mv "${loaded}.new" "${loaded}" ;;
esac`);
  const env = { ...process.env, PATH: `${bin}:/usr/bin:/bin`, SYSTEMD_UNIT_DIR: units, LAUNCHD_DIR: units };
  const run = (script, extra = {}) => {
    fs.writeFileSync(log, "");
    const r = spawnSync("bash", ["-c", `. "${here}/lib.sh"\n${script}`], { env: { ...env, ...extra }, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return { out: r.stdout, calls: fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean) };
  };
  return { dir, units, run };
}

test("Linux: a new service starts, an unchanged service keeps running, and a changed command restarts the service", () => {
  const s = sandbox("Linux");
  const install = (host) => `install_unit kev-engine "exec kev.serve --port 8009 --host ${host}" /kev owner`;

  let r = s.run(install("0.0.0.0"));
  assert.match(fs.readFileSync(path.join(s.units, "kev-engine.service"), "utf8"), /--host 0\.0\.0\.0/);
  assert.ok(r.calls.includes("systemctl restart kev-engine.service"), "a new service starts");

  r = s.run(install("0.0.0.0"));
  assert.match(r.out, /kev-engine is running and unchanged/);
  assert.ok(!r.calls.some((c) => /restart|daemon-reload/.test(c)), r.calls.join("\n"));
  assert.ok(r.calls.includes("systemctl enable --quiet --now kev-engine.service"), "a stopped service starts, a running service keeps running");

  r = s.run(install("192.0.2.10"));
  assert.match(fs.readFileSync(path.join(s.units, "kev-engine.service"), "utf8"), /--host 192\.0\.2\.10/);
  assert.deepEqual(r.calls, ["systemctl daemon-reload", "systemctl enable --quiet kev-engine.service", "systemctl restart kev-engine.service"]);
  assert.match(r.out, /kev-engine changed: restarted/);
});

test("Linux: a change to a settings file restarts the service, and the unit holds only a fingerprint", () => {
  const s = sandbox("Linux");
  const secrets = path.join(s.dir, "node.env");
  fs.writeFileSync(secrets, "JOBD_TOKEN=first-value\n");
  const install = `install_unit jobd "set -a; . ${secrets}; set +a; exec node jobd.mjs" /home/owner owner`;

  s.run(install, { UNIT_SETTINGS: secrets });
  const unit = fs.readFileSync(path.join(s.units, "jobd.service"), "utf8");
  assert.match(unit, /^# settings [0-9a-f]{16}$/m);
  assert.doesNotMatch(unit, /first-value/);

  let r = s.run(install, { UNIT_SETTINGS: secrets });
  assert.ok(!r.calls.some((c) => c.includes("restart")), "the same settings keep the service running");

  fs.writeFileSync(secrets, "JOBD_TOKEN=second-value\n");
  r = s.run(install, { UNIT_SETTINGS: secrets });
  assert.ok(r.calls.includes("systemctl restart jobd.service"), r.calls.join("\n"));
  assert.doesNotMatch(fs.readFileSync(path.join(s.units, "jobd.service"), "utf8"), /second-value/);
});

test("Linux: a unit from an earlier kit, with the same text, counts as unchanged", () => {
  const s = sandbox("Linux");
  fs.writeFileSync(path.join(s.units, "kev-engine.service"), `[Unit]
Description=kev-engine (circlechat kit)
After=network-online.target docker.service
Wants=network-online.target

[Service]
User=owner
WorkingDirectory=/kev
ExecStart=/bin/bash -lc 'exec kev.serve'
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
`);
  const r = s.run(`install_unit kev-engine "exec kev.serve" /kev owner`);
  assert.match(r.out, /kev-engine is running and unchanged/);
  assert.ok(!r.calls.some((c) => c.includes("restart")));
});

test("Linux: a scheduled job's change rewrites the job, and runs nothing at once", () => {
  const s = sandbox("Linux");
  s.run(`install_unit backup "backup.sh" /cc root "*-*-* 02:00"`);
  let r = s.run(`install_unit backup "backup.sh" /cc root "*-*-* 02:00"`);
  assert.match(r.out, /backup is unchanged/);
  assert.ok(!r.calls.includes("systemctl daemon-reload"));
  r = s.run(`install_unit backup "backup.sh" /cc root "*-*-* 03:00"`);
  assert.match(fs.readFileSync(path.join(s.units, "backup.timer"), "utf8"), /OnCalendar=\*-\*-\* 03:00/);
  assert.ok(r.calls.includes("systemctl daemon-reload"));
  assert.ok(!r.calls.some((c) => c.includes("restart")), r.calls.join("\n"));
});

test("macOS: an unchanged service keeps running, and a changed command or setting restarts the service", () => {
  const s = sandbox("Darwin");
  const settings = path.join(s.dir, "package.json");
  fs.writeFileSync(settings, '{"version":"1.0.0"}');
  const install = (host) => `install_unit github-tokens "TOKEN_HOSTS=${host} exec node token-service.mjs" /cc root`;

  let r = s.run(install("127.0.0.1"), { UNIT_SETTINGS: settings });
  assert.match(r.out, /installed github-tokens/);
  const plist = path.join(s.units, "io.recursica.github-tokens.plist");
  assert.match(fs.readFileSync(plist, "utf8"), /<!-- settings [0-9a-f]{16} -->/);

  r = s.run(install("127.0.0.1"), { UNIT_SETTINGS: settings });
  assert.match(r.out, /github-tokens is running and unchanged/);
  assert.ok(!r.calls.some((c) => /bootout|bootstrap/.test(c)), r.calls.join("\n"));

  r = s.run(install("127.0.0.1,192.0.2.10"), { UNIT_SETTINGS: settings });
  assert.match(r.out, /github-tokens changed: restarted/);
  assert.deepEqual(r.calls.filter((c) => /bootout|bootstrap/.test(c)).map((c) => c.split(" ")[1]), ["bootout", "bootstrap"]);

  fs.writeFileSync(settings, '{"version":"1.1.0"}');
  r = s.run(install("127.0.0.1,192.0.2.10"), { UNIT_SETTINGS: settings });
  assert.match(r.out, /github-tokens changed: restarted/);
});

test("the setup scripts pass each service's settings files", () => {
  const node = fs.readFileSync(path.join(here, "../setup-node.sh"), "utf8");
  assert.match(node, /UNIT_SETTINGS="\$settings" install_unit "\$name"/);
  assert.match(node, /UNIT_SETTINGS="\$SECRETS \$ROOT\/package\.json" install_unit "jobd\$SUFFIX"/);
  const host = fs.readFileSync(path.join(here, "../setup-host.sh"), "utf8");
  assert.match(host, /UNIT_SETTINGS="\$\(cd "\$HERE\/\.\." && pwd\)\/package\.json" install_unit "github-tokens\$SUFFIX"/);
});
