// The cluster's RustDesk server: its settings in site.json, the Compose file, the checks, and
// setup-rustdesk.sh run with stand-ins for Tailscale, Docker, ss, ip, nft and systemd.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validate, render } from "../kit/render.mjs";
import { stackSite } from "../kit/stack-site.mjs";
import { composeFile, listenProblems, rustdeskErrors, serveProblems } from "./rustdesk.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const example = JSON.parse(fs.readFileSync(path.join(here, "../site.example.json"), "utf8"));
const IMAGE = `docker.io/rustdesk/rustdesk-server-pro@sha256:${"a".repeat(64)}`;
const TS = "100.64.0.7";
const withServer = (change = (s) => s) => {
  const s = structuredClone(example);
  s.backup = { remote: "offsite:backups" };
  s.nodes.push({ name: "machine-3", os: "linux", address: TS, rustdesk: { image: IMAGE, console_host: "machine-3.example.ts.net" } });
  return change(s);
};
const node3 = (s) => s.nodes.find((n) => n.name === "machine-3");

test("a RustDesk server on Linux or WSL, at its Tailscale address, with a pinned image, passes the config check", () => {
  assert.deepEqual(rustdeskErrors(withServer()), []);
  assert.deepEqual(validate(withServer()).filter((e) => /rustdesk|remote_access/.test(e)), []);
  const spec = render(withServer()).services["machine-3"].rustdesk;
  assert.deepEqual(spec, { image: IMAGE, address: TS, console_host: "machine-3.example.ts.net", https_port: 443, backup_time: "03:30" });
  assert.equal(render(withServer()).services["machine-1"].rustdesk, null);
});

test("the config check refuses a RustDesk server that would open beyond Tailscale or run unpinned", () => {
  const errs = (change) => rustdeskErrors(withServer(change)).join("\n");
  assert.match(errs((s) => { node3(s).os = "macos"; return s; }), /Colima cannot publish UDP port 21116/);
  assert.match(errs((s) => { node3(s).address = "192.168.1.30"; return s; }), /Tailscale IPv4 address/);
  assert.match(errs((s) => { node3(s).address = "100.128.0.1"; return s; }), /Tailscale IPv4 address/);
  assert.match(errs((s) => { node3(s).rustdesk.image = "docker.io/rustdesk/rustdesk-server-pro:latest"; return s; }), /pinned by digest/);
  assert.match(errs((s) => { node3(s).rustdesk.image = `docker.io/acme/other@sha256:${"a".repeat(64)}`; return s; }), /pinned by digest/);
  assert.match(errs((s) => { node3(s).rustdesk.console_host = "rustdesk.example.com"; return s; }), /Tailscale name/);
  assert.match(errs((s) => { node3(s).rustdesk.backup_time = "3am"; return s; }), /time of day/);
  assert.match(errs((s) => { delete s.backup; return s; }), /needs backup.remote/);
  assert.match(errs((s) => { s.site.tenant = "acme"; return s; }), /cluster's own stack/);
  assert.match(errs((s) => { node3(s).kev = { port: 21116 }; return s; }), /port 21116 on this computer is one of RustDesk's ports/);
  assert.match(errs((s) => { s.nodes[0].rustdesk = node3(s).rustdesk; s.nodes[0].address = "100.64.0.1"; return s; }), /only one computer runs the RustDesk server/);
  assert.match(errs((s) => { s.remote_access = { direct_ip: "no" }; return s; }), /remote_access.direct_ip must be true or false/);
  assert.deepEqual(rustdeskErrors({ ...example, remote_access: { direct_ip: false } }), []);
});

test("a client or demo stack never carries the cluster's RustDesk server", () => {
  const s = stackSite(withServer(), { stack: "acme", kind: "demo", computers: "cluster", cloud: null, tenantsDir: fs.mkdtempSync(path.join(os.tmpdir(), "tenants-")) });
  assert.ok(s.nodes.every((n) => n.rustdesk === undefined));
});

test("the Compose file opens the server's ports on the Tailscale address only, and the console on 127.0.0.1", () => {
  const c = composeFile(render(withServer()).services["machine-3"].rustdesk);
  const ports = Object.values(c.services).flatMap((s) => s.ports);
  assert.deepEqual(ports.sort(), [`127.0.0.1:21114:21114/tcp`, `${TS}:21115:21115/tcp`, `${TS}:21116:21116/tcp`, `${TS}:21116:21116/udp`, `${TS}:21117:21117/tcp`].sort());
  for (const s of Object.values(c.services)) {
    assert.equal(s.image, IMAGE);
    assert.deepEqual(s.volumes, ["rustdesk_data:/root"]);
    assert.equal(s.network_mode, undefined, "never the host's network, where each port would open on every address");
  }
  assert.ok(!ports.some((p) => /2111[89]/.test(p)), "the web client's ports stay closed");
});

test("the serve check wants HTTPS 443 passed to the console, and refuses Funnel", () => {
  const ok = { Web: { "machine-3.example.ts.net:443": { Handlers: { "/": { Proxy: "http://127.0.0.1:21114" } } } } };
  assert.deepEqual(serveProblems(ok, 443, 21114), []);
  assert.match(serveProblems({}, 443, 21114)[0], /does not pass/);
  assert.match(serveProblems({ ...ok, AllowFunnel: { "machine-3.example.ts.net:443": true } }, 443, 21114)[0], /Funnel serves/);
});

const goodSs = [
  `tcp LISTEN 0 4096 127.0.0.1:21114 0.0.0.0:* users:(("docker-proxy",pid=1))`,
  `tcp LISTEN 0 4096 ${TS}:21115 0.0.0.0:*`,
  `tcp LISTEN 0 4096 ${TS}:21116 0.0.0.0:*`,
  `udp UNCONN 0 0 ${TS}:21116 0.0.0.0:*`,
  `tcp LISTEN 0 4096 ${TS}:21117 0.0.0.0:*`,
  `tcp LISTEN 0 4096 0.0.0.0:22 0.0.0.0:*`,
].join("\n");

test("the listener check wants each port on its one address, and nothing else on RustDesk's ports", () => {
  assert.deepEqual(listenProblems(goodSs, TS), []);
  assert.match(listenProblems(goodSs.replace(`${TS}:21117`, "0.0.0.0:21117"), TS).join("\n"), /tcp port 21117 listens on 0.0.0.0/);
  assert.match(listenProblems(goodSs + "\ntcp LISTEN 0 4096 [::]:21116 [::]:*", TS).join("\n"), /tcp port 21116 listens on ::/);
  assert.match(listenProblems(goodSs + `\ntcp LISTEN 0 4096 ${TS}:21118 0.0.0.0:*`, TS).join("\n"), /21118 .*web client's ports stay closed/);
  assert.match(listenProblems(goodSs.split("\n").filter((l) => !l.startsWith("udp")).join("\n"), TS).join("\n"), /nothing listens on .*udp port 21116.*userland-proxy/);
});

// setup-rustdesk.sh with stand-ins. Each stand-in logs its call.
function sandbox({ ss = goodSs, secret = true, nftRule = true, answersOn = "", serve = true } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-"));
  const bin = path.join(home, "bin"), units = path.join(home, "units"), log = path.join(home, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  const status = serve ? { Web: { "machine-3.example.ts.net:443": { Handlers: { "/": { Proxy: "http://127.0.0.1:21114" } } } } } : {};
  stub("uname", "echo Linux");
  stub("sudo", `exec "$@"`);
  stub("systemctl", "exit 0");
  stub("nft", nftRule ? `echo '    meta l4proto { tcp, udp } th dport 21115-21117 ip saddr != 100.64.0.0/10 drop comment "rustdesk"'` : "exit 0");
  stub("tailscale", `case "$1" in ip) echo ${TS} ;; serve) [ "$2" = status ] && echo '${JSON.stringify(status)}' ;; esac; exit 0`);
  stub("ip", `printf '1: lo    inet 127.0.0.1/8 scope host lo\\n2: eth0    inet 192.168.1.30/24 scope global eth0\\n3: eth1    inet ${TS}/32 scope global eth1\\n'`);
  stub("ss", `cat <<'SS'\n${ss}\nSS`);
  stub("docker", "exit 0");
  stub("sleep", "exit 0");
  // A port answers on an address only when the test says so.
  stub("timeout", `case "$*" in *"${answersOn}"*) [ -n "${answersOn}" ] && exit 0 ;; esac; exit 1`);
  const secrets = path.join(home, "node.env");
  fs.writeFileSync(secrets, secret ? "RUSTDESK_RESTIC_PASSWORD=p\n" : "JOBD_TOKEN=t\n");
  const out = path.join(home, "out");
  fs.mkdirSync(path.join(out, "services"), { recursive: true });
  const r = render(withServer());
  fs.writeFileSync(path.join(out, "services", "machine-3.json"), JSON.stringify(r.services["machine-3"]));
  fs.writeFileSync(path.join(out, "tenant.env"), r.tenantEnv);
  fs.writeFileSync(path.join(home, "version"), "Linux version 6.8.0 (a plain Linux computer)\n");
  const run = spawnSync("bash", [path.join(here, "setup-rustdesk.sh"), path.join(out, "services", "machine-3.json"), path.join(out, "tenant.env")], {
    env: { ...process.env, HOME: home, SECRETS: secrets, PROC_VERSION: path.join(home, "version"), SYSTEMD_UNIT_DIR: units, RUSTDESK_LISTEN_TRIES: "2", PATH: `${bin}:${path.dirname(process.execPath)}:/usr/bin:/bin` },
    encoding: "utf8",
  });
  return { ...run, home, units, calls: () => fs.readFileSync(log, "utf8") };
}

test("the setup starts the server, checks it, gives the console its HTTPS address and installs the nightly backup", () => {
  const r = sandbox();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const compose = JSON.parse(fs.readFileSync(path.join(r.home, ".recursica-rustdesk", "compose.json"), "utf8"));
  assert.ok(compose.services.hbbs.ports.includes(`${TS}:21116:21116/udp`));
  assert.match(r.calls(), /^docker compose -f \S+compose\.json up -d --remove-orphans$/m);
  assert.match(r.calls(), /^tailscale serve --bg --https=443 http:\/\/127\.0\.0\.1:21114$/m);
  const unit = fs.readFileSync(path.join(r.units, "rustdesk-backup.service"), "utf8");
  assert.match(unit, /User=root/);
  assert.match(unit, /BACKUP_REMOTE=offsite:backups .*backup-rustdesk\.sh/);
  assert.match(fs.readFileSync(path.join(r.units, "rustdesk-backup.timer"), "utf8"), /OnCalendar=\*-\*-\* 03:30/);
  assert.match(r.stdout, /Console, tailnet only: https:\/\/machine-3\.example\.ts\.net/);
});

test("the setup starts nothing without the firewall rule or the backup's secret", () => {
  let r = sandbox({ nftRule: false });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no RustDesk rule\. Run circlechat\/cluster\/install-cluster\.sh first/);
  assert.doesNotMatch(r.calls(), /docker compose/);
  r = sandbox({ secret: false });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /No RUSTDESK_RESTIC_PASSWORD/);
  assert.doesNotMatch(r.calls(), /docker compose/);
});

test("the setup stops the server when a port listens on a wrong address or answers outside Tailscale", () => {
  let r = sandbox({ ss: goodSs.replace(`${TS}:21115`, "0.0.0.0:21115") });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /tcp port 21115 listens on 0\.0\.0\.0/);
  assert.match(r.calls(), /^docker compose -f \S+ stop$/m);
  r = sandbox({ answersOn: "192.168.1.30/21116" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Port 21116 answers on 192\.168\.1\.30/);
  assert.match(r.calls(), /^docker compose -f \S+ stop$/m);
});

test("the setup stops when tailscale serve does not pass HTTPS 443 to the console", () => {
  const r = sandbox({ serve: false });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /HTTPS port 443 does not pass to http:\/\/127\.0\.0\.1:21114/);
  assert.ok(!fs.existsSync(path.join(r.units, "rustdesk-backup.service")));
});

// The Windows guard's block ranges: everything outside Tailscale and loopback.
const v4 = (a) => a.split(".").reduce((n, o) => n * 256 + +o, 0);
test("the Windows and Hyper-V block rules cover every address but Tailscale's and loopback", () => {
  const ps = fs.readFileSync(path.join(here, "../cluster/windows/install-windows-guard.ps1"), "utf8");
  const list = /^\$notTailscale = @\((.*)\)$/m.exec(ps)[1].split(",").map((x) => x.trim().replace(/"/g, ""));
  const ranges = list.filter((r) => !r.includes(":")).map((r) => r.split("-").map(v4));
  const blocked = (a) => ranges.some(([lo, hi]) => v4(a) >= lo && v4(a) <= hi);
  for (const a of ["100.64.0.0", "100.82.1.2", "100.127.255.255", "127.0.0.1"]) assert.ok(!blocked(a), `${a} passes`);
  for (const a of ["0.0.0.0", "10.0.0.5", "100.63.255.255", "100.128.0.0", "192.168.1.30", "255.255.255.255"]) assert.ok(blocked(a), `${a} is blocked`);
  assert.ok(list.includes("::2-fd7a:115c:a1df:ffff:ffff:ffff:ffff:ffff") && list.includes("fd7a:115c:a1e1::-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"));
  for (const name of ["AgentGuard-RustDesk-Server-TCP", "AgentGuard-RustDesk-Server-UDP"]) {
    assert.match(ps, new RegExp(`New-NetFirewallHyperVRule -Name "${name}" .*-VMCreatorId \\$wsl .*-RemoteAddresses \\$notTailscale -Action Block`));
  }
  assert.match(ps, /New-NetFirewallRule -DisplayName "AgentGuard: RustDesk server TCP, Tailscale only" .*-LocalPort 21114-21117 -RemoteAddress \$notTailscale -Action Block/);
  assert.match(ps, /New-NetFirewallRule -DisplayName "AgentGuard: RustDesk server UDP, Tailscale only" .*-Protocol UDP -LocalPort 21116 -RemoteAddress \$notTailscale -Action Block/);
});

// backup-rustdesk.sh, with stand-ins for docker and restic. Both listings run far past a pipe's
// buffer, with the file the check looks for near the top. A check that pipes a listing into
// grep -q stops reading at the match, the lister then fails on the closed pipe, and pipefail turns
// the found file into "the volume holds no id_ed25519".
function backupRun({ withKey = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-backup-"));
  const bin = path.join(tmp, "bin"), data = path.join(tmp, "data"), log = path.join(tmp, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(data);
  const names = [];
  if (withKey) { fs.writeFileSync(path.join(data, "id_ed25519"), "key\n"); names.push("./id_ed25519"); }
  // About 300 KB of file names after the key.
  const long = "x".repeat(90);
  fs.mkdirSync(path.join(data, "db"));
  for (let i = 0; i < 3000; i++) { fs.writeFileSync(path.join(data, "db", `${long}-${i}`), ""); }
  names.push("./db");
  const fixture = path.join(tmp, "fixture.tgz");
  const t = spawnSync("tar", ["czf", fixture, "-C", data, ...names]);
  assert.equal(t.status, 0, String(t.stderr));
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> ${log}\n${body}\n`, { mode: 0o755 });
  stub("docker", `case "$1" in
  run) for a in "$@"; do case "$a" in *:/out) out="\${a%%:/out}" ;; esac; done; cp ${fixture} "$out/rustdesk.tgz" ;;
esac; exit 0`);
  stub("restic", `case "$1" in
  cat) exit 0 ;;
  ls) echo "/var/tmp/stage/rustdesk.tgz"; seq 1 40000 | sed 's|^|/var/tmp/stage/other-file-|' ;;
esac; exit 0`);
  const secrets = path.join(tmp, "node.env");
  fs.writeFileSync(secrets, "RUSTDESK_RESTIC_PASSWORD=pw\n");
  const r = spawnSync("bash", [path.join(here, "backup-rustdesk.sh")], { encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, OWNER_HOME: tmp, STACK: "cluster", BACKUP_REMOTE: "offsite:backups", SECRETS: secrets, KIT: "" } });
  return { r, calls: fs.readFileSync(log, "utf8") };
}

test("the backup finds the key in a long archive listing, and the archive in a long snapshot listing", () => {
  const { r, calls } = backupRun();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /write error|holds no id_ed25519|has no rustdesk\.tgz/);
  assert.match(r.stdout, /Backup of the RustDesk server done\./);
  assert.match(calls, /^restic backup --tag rustdesk /m);
  assert.match(calls, /^restic forget --tag rustdesk /m);
});

test("the backup still stops when the volume holds no id_ed25519", () => {
  const { r, calls } = backupRun({ withKey: false });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /at step: the volume holds no id_ed25519/);
  assert.doesNotMatch(calls, /^restic backup /m);
});
