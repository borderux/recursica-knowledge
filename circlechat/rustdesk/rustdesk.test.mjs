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
import { NFT_RULES, RELAY_KEY_WAIT, composeFile, guardProblems, listenProblems, rustdeskErrors, serveProblems } from "./rustdesk.mjs";

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

test("the config check refuses a RustDesk server off Linux, off its Tailscale address, or unpinned", () => {
  const errs = (change) => rustdeskErrors(withServer(change)).join("\n");
  assert.match(errs((s) => { node3(s).os = "macos"; return s; }), /On a Mac, Docker runs in Colima's VM/);
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

test("the Compose file runs hbbs and hbbr in the host's network, which RustDesk's license needs", () => {
  const c = composeFile(render(withServer()).services["machine-3"].rustdesk);
  assert.deepEqual(Object.keys(c.services).sort(), ["hbbr", "hbbs"]);
  for (const s of Object.values(c.services)) {
    assert.equal(s.network_mode, "host", "a container on Docker's own network is a new machine to the license server at each start");
    assert.equal(s.ports, undefined, "the host's network publishes no ports");
    assert.equal(s.image, IMAGE);
    assert.deepEqual(s.volumes, ["rustdesk_data:/root"]);
    assert.deepEqual(s.security_opt, ["no-new-privileges:true"]);
  }
});

test("hbbr starts after hbbs and waits for the key, and hbbs names the relay on the Tailscale address", () => {
  const c = composeFile(render(withServer()).services["machine-3"].rustdesk);
  assert.deepEqual(c.services.hbbs.command, ["hbbs", "-r", `${TS}:21117`]);
  assert.equal(c.services.hbbs.depends_on, undefined, "hbbs never waits for hbbr");
  assert.deepEqual(c.services.hbbr.depends_on, ["hbbs"]);
  assert.deepEqual(c.services.hbbr.command, ["sh", "-c", "until [ -s /root/id_ed25519.pub ]; do sleep 1; done; exec hbbr"]);
});

test("the relay's start waits until the key file exists, then runs hbbr", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-key-"));
  const bin = path.join(dir, "bin"), key = path.join(dir, "id_ed25519.pub"), ran = path.join(dir, "ran");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "hbbr"), `#!/bin/sh\n[ -s "${key}" ] && echo "with the key" > "${ran}" || echo "without the key" > "${ran}"\n`, { mode: 0o755 });
  // The same command, with the volume's /root in a scratch folder.
  const wait = RELAY_KEY_WAIT.replace("/root/id_ed25519.pub", key);
  const start = Date.now();
  // The key appears after about a second, as when hbbs makes the key on the server's first start.
  const r = spawnSync("sh", ["-c", `( sleep 1; echo key > "${key}" ) & ${wait}`], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: "utf8", timeout: 10_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Date.now() - start >= 900, "hbbr waited for the key");
  assert.equal(fs.readFileSync(ran, "utf8").trim(), "with the key");
});

test("the serve check wants HTTPS 443 passed to the console, and refuses Funnel", () => {
  const ok = { Web: { "machine-3.example.ts.net:443": { Handlers: { "/": { Proxy: "http://127.0.0.1:21114" } } } } };
  assert.deepEqual(serveProblems(ok, 443, 21114), []);
  assert.match(serveProblems({}, 443, 21114)[0], /does not pass/);
  assert.match(serveProblems({ ...ok, AllowFunnel: { "machine-3.example.ts.net:443": true } }, 443, 21114)[0], /Funnel serves/);
});

// In the host's network, hbbs and hbbr listen on every address.
const goodSs = [
  `tcp LISTEN 0 4096 *:21114 *:* users:(("hbbs",pid=1))`,
  `tcp LISTEN 0 4096 0.0.0.0:21115 0.0.0.0:*`,
  `tcp LISTEN 0 4096 [::]:21116 [::]:*`,
  `udp UNCONN 0 0 [::]:21116 [::]:*`,
  `tcp LISTEN 0 4096 [::]:21117 [::]:*`,
  `tcp LISTEN 0 4096 0.0.0.0:22 0.0.0.0:*`,
].join("\n");

test("the listener check wants each RustDesk port listening, on any address", () => {
  assert.deepEqual(listenProblems(goodSs), []);
  assert.deepEqual(listenProblems(goodSs.replace("*:21114", `${TS}:21114`)), []);
  assert.match(listenProblems(goodSs.split("\n").filter((l) => !l.startsWith("udp")).join("\n")).join("\n"), /nothing listens on udp port 21116\. Read the server's log: docker logs rustdesk-hbbs/);
  assert.match(listenProblems(goodSs.replace("[::]:21117", "[::]:21127")).join("\n"), /nothing listens on tcp port 21117\. .*rustdesk-hbbr/);
  assert.match(listenProblems("").join("\n"), /tcp port 21114/);
});

// The input chain of the agentguard table, as nft list chain prints the chain after install-cluster.sh.
const nftInput = () => {
  const base = fs.readFileSync(path.join(here, "../cluster/firewall/nft-base.nft"), "utf8");
  const start = base.indexOf("chain input {");
  return base.slice(start, base.indexOf("\n  }", start));
};
// The rules as setup-rustdesk.sh prints the rules from Windows: protocol|local ports|action|enabled|direction.
const winRules = "TCP|21114-21119|Block|True|Inbound\nUDP|21116|Block|True|Inbound";

test("the guard check finds the RustDesk rule in each of the three firewalls", () => {
  assert.deepEqual(guardProblems("nft", nftInput()), []);
  assert.equal(NFT_RULES.length, 4);
  assert.deepEqual(guardProblems("windows", winRules), []);
  assert.deepEqual(guardProblems("hyperv", winRules), []);
  assert.deepEqual(guardProblems("hyperv", "6|21114-21119|Block|True|Inbound\n17|21116|Block|True|Inbound"), [], "the Hyper-V firewall may print a protocol number");
  assert.deepEqual(guardProblems("windows", "TCP|21114,21115,21116-21119|Block|True|Inbound\nUDP|21116|Block|True|Inbound"), []);
});

test("the guard check names each firewall that lacks port 21114, port 21118 or 21119, or any RustDesk rule", () => {
  // The forward rule before this fix covered 21115 to 21117 only, and an input rule may lack 21114 too.
  assert.match(guardProblems("nft", nftInput().replaceAll("tcp dport 21114-21119", "tcp dport 21115-21119")).join("\n"), /The nftables rules lack the RustDesk rule: tcp dport 21114-21119 ip saddr .*Run circlechat\/cluster\/install-cluster\.sh first/);
  assert.equal(guardProblems("nft", "").length, 4, "an unreadable chain lacks every rule");
  assert.equal(guardProblems("nft", nftInput().replaceAll("tcp dport 21114-21119", "tcp dport 21114-21117")).length, 2, "the rules before the web client's ports");
  for (const [which, name] of [["windows", "Windows Firewall"], ["hyperv", "The Hyper-V firewall"]]) {
    assert.match(guardProblems(which, winRules.replace("21114-21119", "21115-21119")).join("\n"), new RegExp(`^${name} lacks the RustDesk rule: an enabled inbound block rule for TCP 21114\\. Run .*install-windows-guard\\.ps1 -RustDeskServer`));
    assert.equal(guardProblems(which, "").length, 2, "no rules, or rules WSL could not read");
    assert.match(guardProblems(which, winRules.replace("21114-21119", "21114-21117")).join("\n"), /block rule for TCP 21118, 21119\./, "the rules before the web client's ports");
    assert.match(guardProblems(which, winRules.replace("UDP|21116|Block|True", "UDP|21116|Block|False")).join("\n"), /UDP 21116/, "a turned-off rule guards nothing");
    assert.match(guardProblems(which, winRules.replace("TCP|21114-21119|Block", "TCP|21114-21119|Allow")).join("\n"), /TCP 21114, 21115, 21116, 21117, 21118, 21119/, "an allow rule guards nothing");
    assert.match(guardProblems(which, winRules.replace("TCP|21114-21119|Block|True|Inbound", "TCP|21114-21119|Block|True|Outbound")).join("\n"), /TCP 21114/);
  }
});

// setup-rustdesk.sh with stand-ins. Each stand-in logs its call.
function sandbox({ ss = goodSs, secret = true, nftRule = true, windowsRules = winRules, hypervRules = winRules, serve = true, console = "303", wsl = false, relayLog = "INFO Listening on tcp :21117" } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-"));
  const bin = path.join(home, "bin"), units = path.join(home, "units"), log = path.join(home, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  const status = serve ? { Web: { "machine-3.example.ts.net:443": { Handlers: { "/": { Proxy: "http://127.0.0.1:21114" } } } } } : {};
  stub("uname", "echo Linux");
  stub("sudo", `exec "$@"`);
  stub("systemctl", "exit 0");
  const chain = path.join(home, "input.nft");
  fs.writeFileSync(chain, nftRule ? nftInput() : "");
  stub("nft", `[ "$*" = "list chain inet agentguard input" ] && cat "${chain}"; exit 0`);
  stub("tailscale", `case "$1" in ip) echo ${TS} ;; serve) [ "$2" = status ] && echo '${JSON.stringify(status)}' ;; esac; exit 0`);
  stub("ip", `printf '1: lo    inet 127.0.0.1/8 scope host lo\\n2: eth0    inet 192.168.1.30/24 scope global eth0\\n3: eth1    inet ${TS}/32 scope global eth1\\n'`);
  stub("ss", `cat <<'SS'\n${ss}\nSS`);
  // The console's answer on 127.0.0.1:21114, as curl's -w '%{http_code}' prints the answer: 000 for none.
  stub("curl", `case "$*" in *127.0.0.1:21114*) printf '%s' '${console}' ;; *) exit 7 ;; esac`);
  // docker logs rustdesk-hbbr: the relay's start-up log, with or without the key.
  stub("docker", `[ "$1 $2" = "logs rustdesk-hbbr" ] && { printf '%s\\n' ${JSON.stringify(relayLog)}; exit 0; }; exit 0`);
  stub("sleep", "exit 0");
  const secrets = path.join(home, "node.env");
  fs.writeFileSync(secrets, secret ? "RUSTDESK_RESTIC_PASSWORD=p\n" : "JOBD_TOKEN=t\n");
  const out = path.join(home, "out");
  fs.mkdirSync(path.join(out, "services"), { recursive: true });
  const r = render(withServer());
  fs.writeFileSync(path.join(out, "services", "machine-3.json"), JSON.stringify(r.services["machine-3"]));
  fs.writeFileSync(path.join(out, "tenant.env"), r.tenantEnv);
  fs.writeFileSync(path.join(home, "version"), wsl ? "Linux version 6.6.87.2-microsoft-standard-WSL2\n" : "Linux version 6.8.0 (a plain Linux computer)\n");
  // In WSL: mirrored networking, and the AgentGuard RustDesk rules in each Windows firewall, as the
  // setup's PowerShell command prints the rules, with Windows' line ends.
  if (wsl) {
    fs.writeFileSync(path.join(home, "fw.txt"), windowsRules.replaceAll("\n", "\r\n"));
    fs.writeFileSync(path.join(home, "hv.txt"), hypervRules.replaceAll("\n", "\r\n"));
    stub("wslinfo", "echo mirrored");
    stub("powershell.exe", `case "$*" in *Get-NetFirewallHyperVRule*) cat "${home}/hv.txt" ;; *Get-NetFirewallRule*) cat "${home}/fw.txt" ;; esac`);
  }
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
  assert.equal(compose.services.hbbs.network_mode, "host");
  assert.equal(compose.services.hbbr.network_mode, "host");
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
  assert.match(r.stdout, /The nftables rules lack the RustDesk rule: .*Run circlechat\/cluster\/install-cluster\.sh first/);
  assert.match(r.stdout, /The RustDesk server did not start\./);
  assert.doesNotMatch(r.calls(), /docker compose/);
  r = sandbox({ secret: false });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /No RUSTDESK_RESTIC_PASSWORD/);
  assert.doesNotMatch(r.calls(), /docker compose/);
});

test("in WSL, the setup starts the server only when all three firewalls hold the RustDesk rules", () => {
  let r = sandbox({ wsl: true });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.calls(), /^powershell\.exe .*Get-NetFirewallRule -DisplayName 'AgentGuard: RustDesk server\*'/m);
  assert.match(r.calls(), /^powershell\.exe .*Get-NetFirewallHyperVRule -Name 'AgentGuard-RustDesk-Server-\*'/m);
  for (const [opts, said] of [
    [{ nftRule: false }, /The nftables rules lack the RustDesk rule/],
    [{ windowsRules: winRules.replace("21114-21119", "21115-21119") }, /Windows Firewall lacks the RustDesk rule: an enabled inbound block rule for TCP 21114\./],
    [{ hypervRules: winRules.replace("21114-21119", "21115-21119") }, /The Hyper-V firewall lacks the RustDesk rule: an enabled inbound block rule for TCP 21114\./],
    [{ windowsRules: winRules.replace("21114-21119", "21114-21117") }, /Windows Firewall lacks the RustDesk rule: an enabled inbound block rule for TCP 21118, 21119\./],
    [{ hypervRules: "" }, /The Hyper-V firewall lacks the RustDesk rule.*\n.*\n?.*WSL could not read the rules/],
    [{ windowsRules: "" }, /Windows Firewall lacks the RustDesk rule/],
  ]) {
    r = sandbox({ wsl: true, ...opts });
    assert.equal(r.status, 1, JSON.stringify(opts));
    assert.match(r.stdout, said);
    assert.match(r.stdout, /The RustDesk server did not start\./);
    assert.doesNotMatch(r.calls(), /docker compose/, `nothing starts: ${JSON.stringify(opts)}`);
  }
});

test("the setup stops the server when a RustDesk port does not listen", () => {
  const r = sandbox({ ss: goodSs.split("\n").filter((l) => !l.includes(":21115")).join("\n") });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /nothing listens on tcp port 21115/);
  assert.match(r.calls(), /^docker compose -f \S+ stop$/m);
  assert.doesNotMatch(r.stdout, /RustDesk server running/);
});

test("the setup stops the server when hbbr runs in public relay mode", () => {
  const r = sandbox({ relayLog: "WARN WARNING: hbbr is running in PUBLIC RELAY MODE because no key could be loaded from KEY, id_ed25519, or id_ed25519.pub" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /hbbr runs in public relay mode: hbbr found no key in the volume\. Stopped the RustDesk server\./);
  assert.match(r.calls(), /^docker compose -f \S+ stop$/m);
  assert.doesNotMatch(r.stdout, /RustDesk server running/);
  assert.match(sandbox().calls(), /^docker logs rustdesk-hbbr$/m, "the setup reads the relay's log");
});

test("the setup reports success only once the console answers on 127.0.0.1:21114", () => {
  let r = sandbox();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.calls(), /^curl -s -o \/dev\/null -w %\{http_code\} --max-time 5 http:\/\/127\.0\.0\.1:21114\/$/m);
  r = sandbox({ console: "000" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /The console does not answer on 127\.0\.0\.1:21114, so tailscale serve answers 502\./);
  assert.doesNotMatch(r.stdout, /RustDesk server running/);
  assert.ok(!fs.existsSync(path.join(r.units, "rustdesk-backup.service")));
  // In WSL, the message names the cause and the fix.
  r = sandbox({ console: "000", wsl: true });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /loopback traffic arrives on loopback0\. Run circlechat\/cluster\/install-cluster\.sh again/);
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
  assert.match(ps, /New-NetFirewallHyperVRule -Name "AgentGuard-RustDesk-Server-TCP" .*-Protocol TCP -LocalPorts 21114-21119 /);
  assert.match(ps, /New-NetFirewallHyperVRule -Name "AgentGuard-RustDesk-Server-UDP" .*-Protocol UDP -LocalPorts 21116 /);
  assert.match(ps, /New-NetFirewallRule -DisplayName "AgentGuard: RustDesk server TCP, Tailscale only" .*-LocalPort 21114-21119 -RemoteAddress \$notTailscale -Action Block/);
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
