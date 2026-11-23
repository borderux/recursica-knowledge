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
import crypto from "node:crypto";
import { NFT_RULES, RELAY_KEY_WAIT, nftRuleKey, composeFile, keyFingerprint, keyPairProblem, newestSnapshot, restoreTestTime, directAccessPorts, guardProblems, listenProblems, rustdeskErrors, serveProblems, webPortProblems } from "./rustdesk.mjs";

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
  assert.deepEqual(spec, { image: IMAGE, address: TS, console_host: "machine-3.example.ts.net", https_port: 443, backup_time: "03:30", restore_test_time: "04:30" });
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
// The last line, "end", says the PowerShell command ran to the end.
const winRules = "TCP|21114-21119|Block|True|Inbound\nUDP|21116|Block|True|Inbound\nend";
// The input chain as nft list chain prints the chain on a WSL computer: nft sorts the ip6 set's
// members, ::1 first.
const nftPrinted = () => nftInput().replaceAll("{ fd7a:115c:a1e0::/48, ::1 }", "{ ::1, fd7a:115c:a1e0::/48 }");

test("the guard check finds the RustDesk rule in each of the three firewalls", () => {
  assert.deepEqual(guardProblems("nft", nftInput()), []);
  assert.equal(NFT_RULES.length, 4);
  assert.deepEqual(guardProblems("windows", winRules), []);
  assert.deepEqual(guardProblems("hyperv", winRules), []);
  assert.deepEqual(guardProblems("hyperv", "6|21114-21119|Block|True|Inbound\n17|21116|Block|True|Inbound\nend"), [], "the Hyper-V firewall may print a protocol number");
  assert.deepEqual(guardProblems("windows", "TCP|21114,21115,21116-21119|Block|True|Inbound\nUDP|21116|Block|True|Inbound\nend"), []);
});

test("the guard check names each firewall that lacks port 21114, port 21118 or 21119, or any RustDesk rule", () => {
  // The forward rule before this fix covered 21115 to 21117 only, and an input rule may lack 21114 too.
  assert.match(guardProblems("nft", nftInput().replaceAll("tcp dport 21114-21119", "tcp dport 21115-21119")).join("\n"), /The nftables rules lack the RustDesk rule: tcp dport 21114-21119 ip saddr .*Run circlechat\/cluster\/install-cluster\.sh first/);
  assert.deepEqual(guardProblems("nft", ""), ["Could not read the nftables rules. Check with: sudo nft list chain inet agentguard input. Run circlechat/cluster/install-cluster.sh first when the rules are missing, then run this script again."], "an unreadable chain");
  assert.equal(guardProblems("nft", nftInput().replaceAll("tcp dport 21114-21119", "tcp dport 21114-21117")).length, 2, "the rules before the web client's ports");
  for (const [which, name] of [["windows", "Windows Firewall"], ["hyperv", "The Hyper-V firewall"]]) {
    assert.match(guardProblems(which, winRules.replace("21114-21119", "21115-21119")).join("\n"), new RegExp(`^${name} lacks the RustDesk rule: an enabled inbound block rule for TCP 21114\\. Run .*install-windows-guard\\.ps1 -RustDeskServer`));
    assert.match(guardProblems(which, "").join("\n"), /^Could not read the (Windows Firewall|Hyper-V firewall) rules\. Check with: Get-NetFirewall/, "no output at all: the read failed");
    assert.equal(guardProblems(which, "").length, 1);
    assert.match(guardProblems(which, winRules.replace("\nend", "")).join("\n"), /^Could not read /, "rules without end: the command stopped part way");
    assert.equal(guardProblems(which, "end").length, 2, "the command ran, and found no rule");
    assert.doesNotMatch(guardProblems(which, "end").join("\n"), /Could not read/);
    assert.match(guardProblems(which, winRules.replace("21114-21119", "21114-21117")).join("\n"), /block rule for TCP 21118, 21119\./, "the rules before the web client's ports");
    assert.match(guardProblems(which, winRules.replace("UDP|21116|Block|True", "UDP|21116|Block|False")).join("\n"), /UDP 21116/, "a turned-off rule guards nothing");
    assert.match(guardProblems(which, winRules.replace("TCP|21114-21119|Block", "TCP|21114-21119|Allow")).join("\n"), /TCP 21114, 21115, 21116, 21117, 21118, 21119/, "an allow rule guards nothing");
    assert.match(guardProblems(which, winRules.replace("TCP|21114-21119|Block|True|Inbound", "TCP|21114-21119|Block|True|Outbound")).join("\n"), /TCP 21114/);
  }
});

// The web client's ports, 21118 and 21119. In the host's network, hbbs and hbbr must open both ports,
// and a RustDesk client's direct IP access uses 21118 by default.
const q = (v) => `'${v}'`;
const directOn = `[options]\ndirect-server = ${q("Y")}\n`;

test("a client's direct IP access uses 21118 unless direct-access-port says otherwise", () => {
  assert.deepEqual(directAccessPorts(""), []);
  assert.deepEqual(directAccessPorts(`[options]\ndirect-server = ${q("N")}\n`), []);
  assert.deepEqual(directAccessPorts(directOn), [21118]);
  assert.deepEqual(directAccessPorts(`${directOn}direct-access-port = ${q("21200")}\n`), [21200]);
  // Two settings files, the signed-in user's with direct access off and the service's with direct access on.
  assert.deepEqual(directAccessPorts(`direct-server = ${q("N")}\n${directOn}`), [21118]);
});

test("the web port check passes free ports, and ports held by hbbs and hbbr", () => {
  assert.deepEqual(webPortProblems({ ss: goodSs, windows: "end", clients: "" }), []);
  const held = `LISTEN 0 4096 *:21118 *:* users:(("hbbs",pid=1,fd=9))\nLISTEN 0 4096 *:21119 *:* users:(("hbbr",pid=2,fd=9))`;
  assert.deepEqual(webPortProblems({ ss: held, windows: "end" }), []);
  assert.deepEqual(webPortProblems({ ss: goodSs, windows: null }), [], "outside WSL, Windows is not read");
  assert.deepEqual(webPortProblems({ windows: "end", clients: `${directOn}direct-access-port = ${q("21200")}\n` }), [], "direct access on another port");
});

test("the web port check refuses each conflict that would break direct access or stop hbbs", () => {
  const why = /hbbs needs port 21118 and hbbr needs port 21119, and neither program can move the port or turn the port off/;
  let p = webPortProblems({ windows: "21118|rustdesk\nend" });
  assert.match(p.join("\n"), /^rustdesk listens on TCP 21118 in Windows, and WSL shares the port\./);
  assert.match(p.join("\n"), why);
  p = webPortProblems({ windows: "end", clients: directOn });
  assert.match(p.join("\n"), /^The RustDesk client on this computer has direct IP access on port 21118\..*the client's direct access would break$/);
  p = webPortProblems({ ss: `LISTEN 0 4096 *:21118 *:* users:(("rustdesk",pid=3,fd=9))`, windows: null });
  assert.match(p.join("\n"), /^rustdesk listens on TCP 21118 in Linux\./);
  p = webPortProblems({ ss: `LISTEN 0 4096 *:21119 *:* users:(("hbbs",pid=1,fd=9))` });
  assert.match(p.join("\n"), /^hbbs listens on TCP 21119 in Linux/, "only hbbr may hold 21119");
  assert.match(webPortProblems({ windows: "" }).join("\n"), /^Could not read Windows' listeners on TCP 21118 and 21119\./);
  assert.deepEqual(webPortProblems({ windows: "21118|wslrelay\nend" }), [], "WSL's own processes pass a WSL listener to Windows");
});

// setup-rustdesk.sh with stand-ins. Each stand-in logs its call.
function sandbox({ ss = goodSs, secret = true, nftRule = true, nftChain = null, windowsRules = winRules, hypervRules = winRules, windowsListeners = "end", clientSettings = "", winClientSettings = "", serve = true, console = "303", wsl = false, relayLog = "INFO Listening on tcp :21117", env = {} } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-"));
  const bin = path.join(home, "bin"), units = path.join(home, "units"), log = path.join(home, "calls.log");
  fs.mkdirSync(bin); fs.mkdirSync(units);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  const status = serve ? { Web: { "machine-3.example.ts.net:443": { Handlers: { "/": { Proxy: "http://127.0.0.1:21114" } } } } } : {};
  stub("uname", "echo Linux");
  stub("sudo", `exec "$@"`);
  stub("systemctl", "exit 0");
  const chain = path.join(home, "input.nft");
  // By default, the chain as nft prints the chain. nftRule false: a readable chain without the RustDesk rules.
  fs.writeFileSync(chain, nftChain ?? (nftRule ? nftPrinted() : nftPrinted().split("\n").filter((l) => !l.includes('comment "rustdesk"')).join("\n")));
  stub("nft", `[ "$*" = "list chain inet agentguard input" ] && cat "${chain}"; exit 0`);
  stub("tailscale", `case "$1" in ip) echo ${TS} ;; serve) [ "$2" = status ] && echo '${JSON.stringify(status)}' ;; esac; exit 0`);
  stub("ip", `printf '1: lo    inet 127.0.0.1/8 scope host lo\\n2: eth0    inet 192.168.1.30/24 scope global eth0\\n3: eth1    inet ${TS}/32 scope global eth1\\n'`);
  stub("ss", `cat <<'SS'\n${ss}\nSS`);
  // The console's answer on 127.0.0.1:21114, as curl's -w '%{http_code}' prints the answer: 000 for none.
  stub("curl", `case "$*" in *127.0.0.1:21114*) printf '%s' '${console}' ;; *) exit 7 ;; esac`);
  // docker logs rustdesk-hbbr: the relay's start-up log, with or without the key.
  stub("docker", `[ "$1 $2" = "logs rustdesk-hbbr" ] && { printf '%s\\n' ${JSON.stringify(relayLog)}; exit 0; }; exit 0`);
  stub("sleep", "exit 0");
  if (clientSettings) { fs.mkdirSync(path.join(home, ".config", "rustdesk"), { recursive: true }); fs.writeFileSync(path.join(home, ".config", "rustdesk", "RustDesk2.toml"), clientSettings); }
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
    fs.writeFileSync(path.join(home, "listeners.txt"), windowsListeners.replaceAll("\n", "\r\n"));
    fs.writeFileSync(path.join(home, "client.toml"), winClientSettings.replaceAll("\n", "\r\n"));
    stub("powershell.exe", `case "$*" in *Get-NetFirewallHyperVRule*) cat "${home}/hv.txt" ;; *Get-NetFirewallRule*) cat "${home}/fw.txt" ;; *Get-NetTCPConnection*) cat "${home}/listeners.txt" ;; *RustDesk2.toml*) cat "${home}/client.toml" ;; esac`);
  }
  const run = spawnSync("bash", [path.join(here, "setup-rustdesk.sh"), path.join(out, "services", "machine-3.json"), path.join(out, "tenant.env")], {
    env: { ...process.env, HOME: home, SECRETS: secrets, PROC_VERSION: path.join(home, "version"), SYSTEMD_UNIT_DIR: units, RUSTDESK_LISTEN_TRIES: "2", PATH: `${bin}:${path.dirname(process.execPath)}:/usr/bin:/bin`, ...env },
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
  const restoreUnit = fs.readFileSync(path.join(r.units, "rustdesk-restore-test.service"), "utf8");
  assert.match(restoreUnit, /User=root/);
  assert.match(restoreUnit, /BACKUP_REMOTE=offsite:backups .*restore-test-rustdesk\.sh/);
  assert.match(fs.readFileSync(path.join(r.units, "rustdesk-restore-test.timer"), "utf8"), /OnCalendar=\*-\*-01 04:30/);
  assert.match(r.stdout, /sudo systemctl start rustdesk-restore-test\.service/);
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
    [{ hypervRules: "" }, /^Could not read the Hyper-V firewall rules\. Check with: Get-NetFirewallHyperVRule/m],
    [{ windowsRules: "" }, /^Could not read the Windows Firewall rules\. Check with: Get-NetFirewallRule/m],
    [{ hypervRules: winRules.replace("\nend", "") }, /^Could not read the Hyper-V firewall rules/m],
    [{ hypervRules: "end" }, /^The Hyper-V firewall lacks the RustDesk rule: an enabled inbound block rule for TCP 21114, 21115/m],
    [{ nftChain: "" }, /^Could not read the nftables rules\. Check with: sudo nft list chain inet agentguard input/m],
  ]) {
    r = sandbox({ wsl: true, ...opts });
    assert.equal(r.status, 1, JSON.stringify(opts));
    assert.match(r.stdout, said);
    assert.match(r.stdout, /The RustDesk server did not start\./);
    assert.doesNotMatch(r.calls(), /docker compose/, `nothing starts: ${JSON.stringify(opts)}`);
  }
});

test("the setup starts the server when nft prints a set's members in another order", () => {
  // nft list chain prints { ::1, fd7a:115c:a1e0::/48 }, and the rule file says { fd7a:115c:a1e0::/48, ::1 }.
  assert.match(nftPrinted(), /ip6 saddr != \{ ::1, fd7a:115c:a1e0::\/48 \} drop comment "rustdesk"/);
  assert.deepEqual(guardProblems("nft", nftPrinted()), []);
  assert.equal(nftRuleKey("tcp dport 21114-21119 ip saddr != { 127.0.0.0/8,   100.64.0.0/10 } drop"), "tcp dport 21114-21119 ip saddr != { 100.64.0.0/10, 127.0.0.0/8 } drop");
  for (const wsl of [false, true]) {
    const r = sandbox({ wsl });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /lack|Could not read/);
  }
});

test("the set comparison stays strict: a missing, extra or wrong member still fails", () => {
  const ip6 = "{ ::1, fd7a:115c:a1e0::/48 }";
  for (const set of ["{ ::1 }", "{ fd7a:115c:a1e0::/48 }", "{ ::1, fd7a:115c:a1e0::/48, 2001:db8::/32 }", "{ ::1, fd7a:115c:a1e0::/64 }"]) {
    assert.equal(guardProblems("nft", nftPrinted().replaceAll(ip6, set)).length, 2, set);
  }
  assert.equal(guardProblems("nft", nftPrinted().replace("{ 100.64.0.0/10, 127.0.0.0/8 }", "{ 100.64.0.0/10, 127.0.0.0/8, 192.168.0.0/16 }")).length, 1);
  assert.equal(guardProblems("nft", nftPrinted().replace(/ drop comment "rustdesk"/, ' accept comment "rustdesk"')).length, 1);
});

test("in WSL, a missing nftables rule never says that WSL could not read the Windows rules", () => {
  // The old setup printed "WSL could not read the rules" after any problem, even when both Windows
  // reads worked.
  const r = sandbox({ wsl: true, nftRule: false });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /The nftables rules lack the RustDesk rule/);
  assert.doesNotMatch(r.stdout, /Could not read|could not read|Windows Firewall|Hyper-V/);
});

test("each Windows read needs no admin rights, prints end last, and stops before end on any error", () => {
  const sh = fs.readFileSync(path.join(here, "setup-rustdesk.sh"), "utf8");
  for (const [v, cmd] of [["fw_rules", "Get-NetFirewallRule -DisplayName 'AgentGuard: RustDesk server\\*'"], ["hv_rules", "Get-NetFirewallHyperVRule -Name 'AgentGuard-RustDesk-Server-\\*'"]]) {
    const line = new RegExp(`^  ${v}="(.*)"$`, "m").exec(sh)?.[1];
    assert.ok(line, v);
    assert.match(line, new RegExp(`^\\\\\\$ErrorActionPreference = 'Stop'; ${cmd} \\|`));
    assert.match(line, /; 'end'$/);
    assert.doesNotMatch(line, /SilentlyContinue|RunAs|Start-Process/);
  }
  assert.doesNotMatch(sh, /WSL could not read the rules/);
});

test("the setup starts nothing when the web client's ports would break the client's direct access", () => {
  for (const [opts, said] of [
    [{ wsl: true, windowsListeners: "21118|rustdesk\nend" }, /rustdesk listens on TCP 21118 in Windows/],
    [{ wsl: true, winClientSettings: directOn }, /The RustDesk client on this computer has direct IP access on port 21118/],
    [{ wsl: true, windowsListeners: "" }, /Could not read Windows' listeners/],
    [{ clientSettings: directOn }, /direct IP access on port 21118/],
    [{ ss: `${goodSs}\nLISTEN 0 4096 0.0.0.0:21118 0.0.0.0:* users:(("rustdesk",pid=3,fd=9))` }, /rustdesk listens on TCP 21118 in Linux/],
  ]) {
    const r = sandbox(opts);
    assert.equal(r.status, 1, JSON.stringify(opts));
    assert.match(r.stdout, said);
    assert.match(r.stdout, /would break the RustDesk client's direct IP access on this computer, or stop hbbs\. The RustDesk server did not start\./);
    assert.doesNotMatch(r.calls(), /docker compose/, `nothing starts: ${JSON.stringify(opts)}`);
  }
  const r = sandbox({ wsl: true, winClientSettings: `${directOn}direct-access-port = ${q("21200")}\n` });
  assert.equal(r.status, 0, r.stdout + r.stderr);
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

// With KIT_HOLD_NETWORK=1, as the update job runs setup-node.sh (cluster/follow-main.mjs), the
// console's tailscale serve rule waits for a person. The server and the backup still start.
test("with KIT_HOLD_NETWORK=1, the setup starts the server and changes no tailscale serve rule", () => {
  const r = sandbox({ serve: false, env: { KIT_HOLD_NETWORK: "1" } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^Held for a person, with KIT_HOLD_NETWORK=1: tailscale serve for the RustDesk console\.$/m);
  assert.doesNotMatch(r.calls(), /^tailscale serve --bg/m);
  assert.match(r.calls(), /^docker compose -f \S+compose\.json up -d --remove-orphans$/m);
  assert.ok(fs.existsSync(path.join(r.units, "rustdesk-backup.service")));
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
  const stage = path.join(tmp, "stage");
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
  ls) echo "${stage}/rustdesk.tgz"; seq 1 40000 | sed 's|^|${stage}/other-file-|' ;;
esac; exit 0`);
  const secrets = path.join(tmp, "node.env");
  fs.writeFileSync(secrets, "RUSTDESK_RESTIC_PASSWORD=pw\n");
  const r = spawnSync("bash", [path.join(here, "backup-rustdesk.sh")], { encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, OWNER_HOME: tmp, STACK: "cluster", BACKUP_REMOTE: "offsite:backups", SECRETS: secrets, KIT: "", RUSTDESK_STAGE: stage } });
  return { r, calls: fs.readFileSync(log, "utf8"), stage };
}

test("the backup finds the key in a long archive listing, and the archive in a long snapshot listing", () => {
  const { r, calls } = backupRun();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /write error|holds no id_ed25519|has no rustdesk\.tgz/);
  assert.match(r.stdout, /Backup of the RustDesk server done\./);
  assert.match(calls, /^restic backup --tag rustdesk /m);
  assert.match(calls, /^restic forget --tag rustdesk --group-by host,tags /m);
});

test("the backup uses one fixed path and leaves no archive behind", () => {
  const { r, calls, stage } = backupRun();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(calls.includes(`restic backup --tag rustdesk ${stage}/rustdesk.tgz\n`), calls);
  assert.ok(!fs.existsSync(path.join(stage, "rustdesk.tgz")), "the archive holds the server's key, so the run deletes the archive");
});

test("the backup still stops when the volume holds no id_ed25519", () => {
  const { r, calls } = backupRun({ withKey: false });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /at step: the volume holds no id_ed25519/);
  assert.doesNotMatch(calls, /^restic backup /m);
});

// backup-rustdesk.sh with the real restic, against a local rclone remote. Docker is still a
// stand-in. CI installs restic and rclone and sets RUSTDESK_RESTIC_REQUIRED, so a missing tool fails
// there instead of skipping the test.
const sh = (cmd) => spawnSync("bash", ["-c", `command -v ${cmd}`]).status === 0;
const realRestic = sh("restic") && sh("rclone");

test("two backups share one restic group, and the keep policy also removes snapshots from before the fixed path", { skip: !realRestic && !process.env.RUSTDESK_RESTIC_REQUIRED, timeout: 180_000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-restic-"));
  const bin = path.join(tmp, "bin"), data = path.join(tmp, "data"), stage = path.join(tmp, "stage");
  fs.mkdirSync(bin); fs.mkdirSync(data);
  fs.writeFileSync(path.join(data, "id_ed25519"), "key\n");
  const fixture = path.join(tmp, "fixture.tgz");
  assert.equal(spawnSync("tar", ["czf", fixture, "-C", data, "."]).status, 0);
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash
case "$1" in
  run) for a in "$@"; do case "$a" in *:/out) out="\${a%%:/out}" ;; esac; done; cp ${fixture} "$out/rustdesk.tgz" ;;
esac; exit 0
`, { mode: 0o755 });
  const rcloneConf = path.join(tmp, "rclone.conf");
  fs.writeFileSync(rcloneConf, "[offsite]\ntype = local\n");
  const secrets = path.join(tmp, "node.env");
  fs.writeFileSync(secrets, "RUSTDESK_RESTIC_PASSWORD=pw\n");
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, OWNER_HOME: tmp, STACK: "cluster", BACKUP_REMOTE: `offsite:${tmp}/remote`,
    SECRETS: secrets, KIT: "", RUSTDESK_STAGE: stage, RCLONE_CONFIG: rcloneConf,
    RESTIC_PASSWORD: "pw", RESTIC_REPOSITORY: `rclone:offsite:${tmp}/remote/cluster-rustdesk`, RESTIC_CACHE_DIR: path.join(tmp, "cache") };
  const restic = (...args) => {
    const r = spawnSync("restic", args, { encoding: "utf8", env });
    assert.equal(r.status, 0, `restic ${args.join(" ")}\n${r.stderr}`);
    return r.stdout;
  };
  const snapshots = () => JSON.parse(restic("snapshots", "--json")).sort((a, b) => a.time.localeCompare(b.time));
  const backup = () => {
    const r = spawnSync("bash", [path.join(here, "backup-rustdesk.sh")], { encoding: "utf8", env });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  };

  // Before the fixed path: each run backed up from a new temp folder. Two runs a day, three days ago
  // to one day ago, give six snapshots in six groups.
  restic("init");
  const day = (ago) => { const d = new Date(Date.now() - ago * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  for (const ago of [3, 2, 1]) for (const at of ["12:00", "12:30"]) {
    const old = path.join(tmp, `old-${ago}-${at.replace(":", "")}`);
    fs.mkdirSync(old); fs.copyFileSync(fixture, path.join(old, "rustdesk.tgz"));
    restic("backup", "--tag", "rustdesk", "--time", `${day(ago)} ${at}:00`, path.join(old, "rustdesk.tgz"));
  }
  assert.equal(snapshots().length, 6);

  const archive = path.join(stage, "rustdesk.tgz");
  backup();
  const first = snapshots().at(-1);
  backup();
  const all = snapshots();
  const second = all.at(-1);

  assert.deepEqual(first.paths, [archive]);
  assert.deepEqual(second.paths, [archive]);
  assert.equal(second.parent, first.id, "the second run links to the first run's snapshot");
  // Keep-daily keeps the newest snapshot of each day: the second run today, and the 12:30 snapshot
  // of each earlier day, from before the fixed path. restic 0.16 and later also keeps the oldest
  // snapshot while the policy has fewer days than the policy asks for, so the test leaves the
  // oldest snapshot, from three days ago at 12:00, unchecked.
  const kept = new Set(all.map((s) => s.paths[0]));
  const old = (ago, at) => path.join(tmp, `old-${ago}-${at}`, "rustdesk.tgz");
  assert.ok(!all.some((s) => s.id === first.id), "the keep policy removes the first run's snapshot");
  for (const ago of [3, 2, 1]) assert.ok(kept.has(old(ago, "1230")), `the keep policy keeps the newest snapshot from ${ago} day(s) ago`);
  for (const ago of [2, 1]) assert.ok(!kept.has(old(ago, "1200")), `the keep policy removes the older snapshot from ${ago} day(s) ago`);
  assert.ok(!fs.existsSync(archive), "the run deletes the archive");

  // The restore steps in README.md: the newest snapshot holds rustdesk.tgz at the fixed path, with the key.
  const target = path.join(tmp, "restore");
  restic("restore", "latest", "--tag", "rustdesk", "--target", target);
  const listing = spawnSync("tar", ["tzf", path.join(target, archive)], { encoding: "utf8" });
  assert.equal(listing.status, 0, listing.stderr);
  assert.match(listing.stdout, /^\.\/id_ed25519$/m);
});

// restore-test-rustdesk.sh. Each key pair is a real Ed25519 pair, written as hbbs writes the pair.
function keyPair() {
  const jwk = crypto.generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" });
  const seed = Buffer.from(jwk.d, "base64url"), pub = Buffer.from(jwk.x, "base64url");
  return { secret: Buffer.concat([seed, pub]).toString("base64"), public: pub.toString("base64") };
}

test("the restore test runs one hour after the backup", () => {
  assert.equal(restoreTestTime("03:30"), "04:30");
  assert.equal(restoreTestTime("23:05"), "00:05");
});

test("the key checks give a fingerprint or a reason, never a key", () => {
  const a = keyPair(), b = keyPair();
  assert.match(keyFingerprint(a.public), /^SHA256:[0-9a-f]{16}$/);
  assert.equal(keyFingerprint(`${a.public}\n`), keyFingerprint(a.public));
  assert.notEqual(keyFingerprint(a.public), keyFingerprint(b.public));
  assert.equal(keyFingerprint("not a key"), null);
  assert.equal(keyFingerprint(a.secret), null, "a secret key is no public key");
  assert.equal(keyPairProblem(a.secret, a.public), null);
  assert.equal(keyPairProblem(a.secret, b.public), "id_ed25519.pub is not the public key of id_ed25519");
  assert.equal(keyPairProblem("", a.public), "id_ed25519 holds no Ed25519 secret key");
  assert.equal(keyPairProblem(a.secret, ""), "id_ed25519.pub holds no Ed25519 public key");
});

test("the newest snapshot is the latest by time, with its age in hours", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");
  const n = newestSnapshot([{ id: "old", time: "2026-11-20T03:30:00Z" }, { id: "new", time: "2026-11-22T03:30:12.5-00:00" }, { id: "mid", time: "2026-11-21T03:30:00Z" }], now);
  assert.deepEqual(n, { id: "new", date: "2026-11-22 03:30", ageHours: 8 });
  assert.equal(newestSnapshot([], now), null);
  assert.equal(newestSnapshot(null, now), null);
});

// The restore test with stand-ins for restic, docker, id and the cluster's Slack post.
function restoreRun({ ageHours = 5, withDb = true, live = null, pair = null, root = true, snapshots = true, running = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-restore-"));
  const bin = path.join(tmp, "bin"), data = path.join(tmp, "data"), work = path.join(tmp, "work"), log = path.join(tmp, "calls.log");
  const kit = path.join(tmp, "kit"), posts = path.join(tmp, "posts.log");
  for (const d of [bin, data, work, path.join(kit, "circlechat", "cluster")]) fs.mkdirSync(d, { recursive: true });
  const keys = keyPair();
  const restoredPair = pair ?? keys;
  fs.writeFileSync(path.join(data, "id_ed25519"), restoredPair.secret);
  fs.writeFileSync(path.join(data, "id_ed25519.pub"), restoredPair.public);
  if (withDb) fs.writeFileSync(path.join(data, "db_v2.sqlite3"), Buffer.concat([Buffer.from("SQLite format 3\0"), Buffer.alloc(100)]));
  const fixture = path.join(tmp, "fixture.tgz");
  assert.equal(spawnSync("tar", ["czf", fixture, "-C", data, "."]).status, 0);
  const livePub = path.join(tmp, "live.pub");
  fs.writeFileSync(livePub, (live ?? keys).public);
  const time = new Date(Date.now() - ageHours * 3600_000).toISOString();
  fs.writeFileSync(path.join(tmp, "snapshots.json"), JSON.stringify(snapshots ? [{ id: "abc123", time }] : []));
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> ${log}\n${body}\n`, { mode: 0o755 });
  stub("restic", `case "$1" in
  snapshots) cat ${tmp}/snapshots.json ;;
  restore) while [ $# -gt 0 ]; do [ "$1" = --target ] && target="$2"; shift; done
    stat -c 'work folder mode %a' "$(dirname "$target")" >> ${log}
    mkdir -p "$target/var/lib/rustdesk-backup"; cp ${fixture} "$target/var/lib/rustdesk-backup/rustdesk.tgz" ;;
esac`);
  stub("docker", `case "$1" in
  inspect) echo ${running} ;;
  exec) cat ${livePub} ;;
esac`);
  stub("id", `[ "$1" = -u ] && echo ${root ? 0 : 1000}`);
  fs.writeFileSync(path.join(kit, "circlechat", "cluster", "post.mjs"), `import fs from "node:fs";\nfs.appendFileSync(${JSON.stringify(posts)}, process.argv[2] + " " + process.argv[3] + "\\n");\n`);
  const secrets = path.join(tmp, "node.env");
  fs.writeFileSync(secrets, "RUSTDESK_RESTIC_PASSWORD=pw\n");
  const r = spawnSync("bash", [path.join(here, "restore-test-rustdesk.sh")], { encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, OWNER_HOME: tmp, STACK: "cluster", BACKUP_REMOTE: "offsite:backups", SECRETS: secrets, KIT: kit, RUSTDESK_RESTORE_TMP: work } });
  const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
  const out = r.stdout + r.stderr + read(posts);
  const secretsSeen = [keys.secret, keys.public, restoredPair.secret, restoredPair.public, (live ?? keys).public].filter((k) => out.includes(k));
  return { r, posts: read(posts), calls: read(log), left: fs.readdirSync(work), secretsSeen, date: time.slice(0, 16).replace("T", " ") };
}

test("the restore test passes, posts the snapshot's date and the fingerprint, and deletes the restored files", () => {
  const t = restoreRun();
  assert.equal(t.r.status, 0, t.r.stdout + t.r.stderr);
  assert.match(t.posts, new RegExp(`^info :white_check_mark: Test restore of the RustDesk server's backup passed on \\S+\\. Newest snapshot: ${t.date} UTC\\. .*matches the running server's public key, SHA256:[0-9a-f]{16}\\.$`, "m"));
  assert.match(t.calls, /^restic restore abc123 --target /m);
  assert.match(t.calls, /^work folder mode 700$/m);
  assert.match(t.calls, /^docker exec rustdesk-hbbs cat \/root\/id_ed25519\.pub$/m);
  assert.doesNotMatch(t.calls, /^restic (forget|prune|backup|init|unlock)/m, "the test only reads the backup repository");
  assert.deepEqual(t.left, []);
  assert.deepEqual(t.secretsSeen, []);
});

test("the restore test fails on each check, posts the snapshot's date, and still deletes the restored files", () => {
  const cases = [
    [{ withDb: false }, /rustdesk\.tgz holds no database/],
    [{ pair: { ...keyPair(), public: keyPair().public } }, /id_ed25519\.pub is not the public key of id_ed25519/],
    [{ live: keyPair() }, /the restored public key, SHA256:[0-9a-f]{16}, is not the running server's public key, SHA256:[0-9a-f]{16}/],
    [{ running: false }, /the server's container, rustdesk-hbbs, is not running/],
    [{ ageHours: 50 }, /the newest snapshot is 50 hours old, and the limit is 48 hours/],
  ];
  for (const [opts, why] of cases) {
    const t = restoreRun(opts);
    assert.equal(t.r.status, 1, JSON.stringify(opts));
    assert.match(t.posts, /^info :x: Test restore of the RustDesk server's backup failed on \S+: /m);
    assert.match(t.posts, why);
    assert.ok(t.posts.includes(`Newest snapshot: ${t.date} UTC.`), t.posts);
    assert.deepEqual(t.left, [], `the restored files are gone after: ${why}`);
    assert.deepEqual(t.secretsSeen, [], `no key in the output after: ${why}`);
  }
});

test("the restore test stops without root or without a snapshot", () => {
  let t = restoreRun({ root: false });
  assert.equal(t.r.status, 1);
  assert.match(t.posts, /failed on \S+: the test must run as root\. Newest snapshot: unknown UTC\./);
  assert.doesNotMatch(t.calls, /^restic /m);
  t = restoreRun({ snapshots: false });
  assert.equal(t.r.status, 1);
  assert.match(t.posts, /the backup repository holds no snapshot/);
  assert.deepEqual(t.left, []);
});

test("the restore test passes on a snapshot from the real backup, with the real restic", { skip: !realRestic && !process.env.RUSTDESK_RESTIC_REQUIRED, timeout: 180_000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rustdesk-restic-restore-"));
  const bin = path.join(tmp, "bin"), data = path.join(tmp, "data"), work = path.join(tmp, "work");
  for (const d of [bin, data, work]) fs.mkdirSync(d);
  const keys = keyPair();
  fs.writeFileSync(path.join(data, "id_ed25519"), keys.secret);
  fs.writeFileSync(path.join(data, "id_ed25519.pub"), keys.public);
  fs.writeFileSync(path.join(data, "db_v2.sqlite3"), Buffer.concat([Buffer.from("SQLite format 3\0"), Buffer.alloc(100)]));
  const fixture = path.join(tmp, "fixture.tgz");
  assert.equal(spawnSync("tar", ["czf", fixture, "-C", data, "."]).status, 0);
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash
case "$1" in
  run) for a in "$@"; do case "$a" in *:/out) out="\${a%%:/out}" ;; esac; done; cp ${fixture} "$out/rustdesk.tgz" ;;
  inspect) echo true ;;
  exec) cat ${path.join(data, "id_ed25519.pub")} ;;
esac; exit 0
`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "id"), `#!/usr/bin/env bash\n[ "$1" = -u ] && echo 0\n`, { mode: 0o755 });
  const rcloneConf = path.join(tmp, "rclone.conf");
  fs.writeFileSync(rcloneConf, "[offsite]\ntype = local\n");
  const secrets = path.join(tmp, "node.env");
  fs.writeFileSync(secrets, "RUSTDESK_RESTIC_PASSWORD=pw\n");
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, OWNER_HOME: tmp, STACK: "cluster", BACKUP_REMOTE: `offsite:${tmp}/remote`,
    SECRETS: secrets, KIT: "", RUSTDESK_STAGE: path.join(tmp, "stage"), RUSTDESK_RESTORE_TMP: work, RCLONE_CONFIG: rcloneConf, RESTIC_CACHE_DIR: path.join(tmp, "cache") };
  const backup = spawnSync("bash", [path.join(here, "backup-rustdesk.sh")], { encoding: "utf8", env });
  assert.equal(backup.status, 0, backup.stdout + backup.stderr);
  const r = spawnSync("bash", [path.join(here, "restore-test-rustdesk.sh")], { encoding: "utf8", env });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /passed on \S+\. Newest snapshot: \d{4}-\d\d-\d\d \d\d:\d\d UTC\. .*public key, SHA256:[0-9a-f]{16}\.$/m);
  assert.ok(!(r.stdout + r.stderr).includes(keys.secret) && !(r.stdout + r.stderr).includes(keys.public), "the test prints no key");
  assert.deepEqual(fs.readdirSync(work), []);
});
