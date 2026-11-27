// The firewall rules and the outgoing filter's config, checked by the tools that load them. Each
// test skips when its tool is missing; CI installs nftables and Squid.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { render } from "../kit/render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const has = (cmd) => spawnSync("bash", ["-c", `command -v ${cmd}`]).status === 0;
const asRoot = (args) => (process.getuid?.() === 0 ? args : ["sudo", "-n", ...args]);

// The direct-address rule install-cluster.sh puts in place of @RUSTDESK_DIRECT@ (firewall/rules.sh).
const directRule = (name, file = "firewall/rules.sh") => new RegExp(`^  ${name}='(.*)'$`, "m").exec(fs.readFileSync(path.join(here, file), "utf8"))[1];

test("the Linux firewall rules parse", { skip: !has("nft") && "nftables is not installed" }, (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nft-"));
  // Both ways install-cluster.sh fills @RUSTDESK_DIRECT@: empty, and the rule that refuses
  // RustDesk's direct-address ports (remote_access.direct_ip false).
  // And both ways it fills @TAILNET_IF@: the tailscale0 rules on Linux, empty in WSL.
  const base = fs.readFileSync(path.join(here, "firewall/nft-base.nft"), "utf8").replaceAll("@CANARY_PORTS@", "2222, 2121, 8088");
  const tailnet = directRule("NFT_TAILNET", "install-cluster.sh").replaceAll("\\n", "\n");
  const files = [path.join(here, "firewall/nft-lockdown.nft")];
  for (const [name, direct, tailscale0] of [["base", "", tailnet], ["base-direct-off", directRule("NFT_DIRECT").replaceAll("\\n", "\n"), tailnet], ["base-wsl", "", ""]]) {
    fs.writeFileSync(path.join(tmp, `${name}.nft`), base.replace(/^@RUSTDESK_DIRECT@$/m, direct).replace(/^@TAILNET_IF@$/gm, tailscale0));
    files.push(path.join(tmp, `${name}.nft`));
  }
  for (const f of files) {
    const [cmd, ...args] = asRoot(["nft", "-c", "-f", f]);
    const r = spawnSync(cmd, args, { encoding: "utf8" });
    if (/Operation not permitted|password is required/.test(r.stderr)) return t.skip("nft -c needs root here");
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

const example = JSON.parse(fs.readFileSync(path.join(here, "../site.example.json"), "utf8"));
function squidFiles() {
  const r = render(example);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "squid-"));
  fs.chmodSync(dir, 0o755);   // Squid reads the files as its own account, after dropping root
  fs.mkdirSync(path.join(dir, "log"));
  fs.chmodSync(path.join(dir, "log"), 0o777);
  fs.writeFileSync(path.join(dir, "allow.txt"), r.egress.allow);
  fs.writeFileSync(path.join(dir, "allow-once.txt"), "nothing.invalid\n");
  fs.writeFileSync(path.join(dir, "allow-ips.txt"), r.egress.allowIps);
  return { dir, conf: r.egress.conf.replaceAll("/etc/egress", dir).replace("/var/log/egress", path.join(dir, "log")).replace("deny_info ERR_EGRESS_BLOCKED all", "deny_info ERR_ACCESS_DENIED all") };
}

test("the outgoing filter's config parses", { skip: !has("squid") && "Squid is not installed" }, () => {
  const { dir, conf } = squidFiles();
  fs.writeFileSync(path.join(dir, "squid.conf"), conf);
  const r = spawnSync("squid", ["-k", "parse", "-f", path.join(dir, "squid.conf")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /ERROR|FATAL/);
});

test("the running filter refuses a site that is not on the list, and logs the refusal", { skip: !has("squid") && "Squid is not installed" }, async () => {
  const { dir, conf } = squidFiles();
  const port = await new Promise((resolve) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  fs.writeFileSync(path.join(dir, "squid.conf"), conf.replace("http_port 3128", `http_port 127.0.0.1:${port}`));
  const squid = spawn("squid", ["-N", "-f", path.join(dir, "squid.conf")], { stdio: ["ignore", "ignore", "pipe"] });
  let err = ""; squid.stderr.on("data", (d) => (err += d));
  try {
    let status = 0;
    for (let i = 0; i < 120 && !status; i++) {
      await new Promise((r) => setTimeout(r, 250));
      status = await new Promise((resolve) => {
        const req = http.request({ host: "127.0.0.1", port, method: "GET", path: "http://blocked.example.invalid/" }, (res) => { res.resume(); resolve(res.statusCode); });
        req.on("error", () => resolve(0)); req.end();
      });
    }
    assert.equal(status, 403, `Squid did not answer: ${err.slice(-500)}`);
    await new Promise((r) => setTimeout(r, 500));
    assert.match(fs.readFileSync(path.join(dir, "log/access.log"), "utf8"), /blocked\.example\.invalid\/ 403 TCP_DENIED/);
  } finally { squid.kill("SIGKILL"); }
});

// The rules' text: tools that load the pf and Windows rules run only on macOS and Windows.
const rules = (f) => fs.readFileSync(path.join(here, f), "utf8").split("\n").filter((l) => l && !l.startsWith("#"));

test("pf never filters loopback: no pf rule names lo0, and the main rules skip lo0 before the anchor", () => {
  for (const f of ["firewall/pf-base.conf", "firewall/pf-lockdown.conf"]) assert.ok(!rules(f).some((l) => /\blo0\b/.test(l)), f);
  const apple = 'scrub-anchor "com.apple/*"\nanchor "com.apple/*"\nload anchor "com.apple" from "/etc/pf.anchors/com.apple"\n';
  const main = spawnSync("bash", [path.join(here, "firewall/pf-main.sh")], { input: apple, encoding: "utf8" });
  assert.equal(main.status, 0, main.stderr);
  assert.equal(main.stdout, `set skip on lo0\n${apple}anchor "agentguard"\n`);
  const again = spawnSync("bash", [path.join(here, "firewall/pf-main.sh")], { input: main.stdout, encoding: "utf8" });
  assert.equal(again.stdout, main.stdout, "a second run changes nothing");
});

// Tailscale takes the first free utun number at each start, so the Tailscale passes name no
// interface: a rule for named utun interfaces can miss Tailscale's interface after a restart. A
// packet that claims a Tailscale address on a physical interface (en, bridge, and Wi-Fi's awdl0,
// llw0 and ap1) is refused before the passes, so a forged source never reaches them.
test("pf refuses a Tailscale source on a physical interface, then passes Tailscale's addresses on any other interface", () => {
  for (const f of ["firewall/pf-base.conf", "firewall/pf-lockdown.conf"]) {
    const r = rules(f);
    assert.ok(!r.some((l) => /tailscale_if|\butun/.test(l)), `${f}: no rule names a utun interface`);
    const macro = r.find((l) => l.startsWith("physical_if = "));
    const names = /^physical_if = "\{ (.*) \}"$/.exec(macro)?.[1].split(" ");
    assert.ok(names?.length, `${f}: the physical_if macro`);
    const radios = ["awdl0", "llw0", "ap1"];
    for (const n of names) assert.ok(/^(en|bridge)\d+$/.test(n) || radios.includes(n), `${f}: ${n} is an en or bridge interface, or awdl0, llw0 or ap1`);
    for (const n of ["en0", "en13", "en31", "bridge0", "bridge100", ...radios]) assert.ok(names.includes(n), `${f}: ${n}`);
    assert.equal(new Set(names).size, names.length, `${f}: each name once`);
    const spoof4 = r.indexOf("block in log quick on $physical_if inet from 100.64.0.0/10");
    const spoof6 = r.indexOf("block in log quick on $physical_if inet6 from fd7a:115c:a1e0::/48");
    const v4 = r.indexOf("pass in quick inet from 100.64.0.0/10"), v6 = r.indexOf("pass in quick inet6 from fd7a:115c:a1e0::/48");
    assert.ok(spoof4 > 0 && spoof6 > 0, `${f}: the refusals for both families`);
    assert.ok(spoof4 < v4 && spoof6 < v4 && v4 < v6, `${f}: the refusals come before the Tailscale passes`);
    for (const l of r.filter((x) => /^pass .*(100\.64\.0\.0\/10|fd7a:115c:a1e0::\/48)/.test(x))) assert.doesNotMatch(l, /\son\s/, `${f}: ${l}`);
    const blocked = r.indexOf("block in log quick from <blocked>");
    assert.equal(blocked, r.findIndex((l) => /^(pass|block) /.test(l)), `${f}: the blocked table comes first`);
    assert.ok(blocked < spoof4 && blocked < spoof6, `${f}: the refusals come after the blocked table`);
    const lastIn = r.findLastIndex((l) => /^(pass|block) in /.test(l)), firstOut = r.findIndex((l) => /^(pass|block) out /.test(l));
    assert.equal(r[lastIn], "block in log all", `${f}: block in log all is the last incoming rule`);
    assert.ok(firstOut > lastIn, `${f}: before the outgoing rules`);
  }
  const base = rules("firewall/pf-base.conf");
  assert.ok(base.indexOf("@RUSTDESK_DIRECT@") > base.indexOf("block in log quick from <blocked>"));
  assert.ok(base.indexOf("@RUSTDESK_DIRECT@") < base.indexOf("block in log quick on $physical_if inet from 100.64.0.0/10"), "the direct-address rule, then the refusals");
  assert.equal(base.at(-1), "pass out all keep state");
  const lockdown = rules("firewall/pf-lockdown.conf");
  assert.ok(lockdown.includes("pass out quick inet to 100.64.0.0/10 keep state") && lockdown.includes("pass out quick inet6 to fd7a:115c:a1e0::/48 keep state"));
  assert.equal(lockdown.at(-1), "block out log all");
  assert.equal(rules("firewall/pf-base.conf").find((l) => l.startsWith("physical_if")), lockdown.find((l) => l.startsWith("physical_if")), "one list in both files");
});

// install-cluster.sh and pf-apply-tailnet.sh render the pf rules with one function, pf_rules in
// firewall/rules.sh, so the two never drift.
test("install-cluster.sh and the apply script render the pf rules with rules.sh", () => {
  const install = fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8");
  assert.match(install, /^\. "\$HERE\/firewall\/rules\.sh" "\$SITE"$/m);
  assert.match(install, /^    pf_rules "\$f" \| sudo tee "\/var\/lib\/agent-cluster\/pf-\$f\.conf" >\/dev\/null$/m);
  assert.doesNotMatch(install, /^.*@CANARY_PORTS@.*pf-.*$/m, "no second copy of the pf rendering");
  const apply = fs.readFileSync(path.join(here, "firewall/pf-apply-tailnet.sh"), "utf8");
  assert.match(apply, /^  \. "\$HERE\/rules\.sh" "\$site"$/m);
  assert.match(apply, /^  pf_rules base >"\$tmp\/new-base\.conf"$/m);
});

test("RustDesk's server ports take only Tailscale and loopback, before any wider rule, and the direct-address rule comes before Tailscale's pass", () => {
  const nft = rules("firewall/nft-base.nft").map((l) => l.trim());
  const at = (re) => nft.findIndex((l) => re.test(l));
  const input = at(/^tcp dport 21114-21119 ip saddr != \{ 100\.64\.0\.0\/10, 127\.0\.0\.0\/8 \} drop comment "rustdesk"$/);
  assert.ok(at(/^udp dport 21116 ip saddr != \{ 100\.64\.0\.0\/10, 127\.0\.0\.0\/8 \} drop comment "rustdesk"$/) > 0);
  assert.ok(input > 0 && input < at(/^ip saddr \{ 100\.64\.0\.0\/10, 172\.16\.0\.0\/12 \} accept$/), "before Docker's networks and allowed sources pass");
  assert.ok(at(/^@RUSTDESK_DIRECT@$/) < at(/^ip saddr \{ 100\.64\.0\.0\/10, 172\.16\.0\.0\/12 \} accept$/));
  const forward = at(/^tcp dport 21114-21119 ip saddr != 100\.64\.0\.0\/10 drop comment "rustdesk"$/);
  assert.ok(at(/^udp dport 21116 ip saddr != 100\.64\.0\.0\/10 drop comment "rustdesk"$/) > forward);
  assert.ok(forward > 0 && forward < at(/^ct state new ip saddr !=/), "forwarded connections to the server's ports come from Tailscale only");
  assert.match(directRule("NFT_DIRECT"), /^    tcp dport \{ 21118, 21119 \} drop .*\\n    udp dport \{ 21118, 21119 \} drop /);
  const pf = rules("firewall/pf-base.conf");
  assert.ok(pf.indexOf("@RUSTDESK_DIRECT@") >= 0 && pf.indexOf("@RUSTDESK_DIRECT@") < pf.indexOf("pass in quick inet from 100.64.0.0/10"));
  assert.equal(directRule("PF_DIRECT"), "block in quick proto { tcp udp } to port { 21118 21119 }");
});

// On Linux, Tailscale's addresses pass only from tailscale0; in WSL, where Tailscale runs on Windows,
// the rules check only the address. A rerun of install-cluster.sh and the start-up job load the rules
// with nft-load.sh, which keeps the sets' addresses.
test("the nftables rules refuse a Tailscale source off tailscale0, outside WSL, and load with nft-load.sh", () => {
  const install = fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8");
  assert.equal(directRule("NFT_TAILNET", "install-cluster.sh"), '    iifname != "tailscale0" ip saddr 100.64.0.0/10 drop comment "tailnet only on tailscale0"\\n    iifname != "tailscale0" ip6 saddr fd7a:115c:a1e0::/48 drop comment "tailnet only on tailscale0"');
  assert.match(install, /^if \[ "\$OS" = Linux \] && ! grep -qi microsoft \/proc\/version; then\n  NFT_TAILNET=/m, "empty in WSL");
  assert.match(install, /s\|\^@TAILNET_IF@\\\$\|\$NFT_TAILNET\|/, "sed fills every @TAILNET_IF@ line, with | as the separator, since the rules hold a /");
  const nft = rules("firewall/nft-base.nft").map((l) => l.trim());
  const input = nft.slice(nft.indexOf("chain input {"), nft.indexOf("chain forward {"));
  assert.ok(input.indexOf("@TAILNET_IF@") === input.indexOf("@RUSTDESK_DIRECT@") + 1, "right after the direct-address rule");
  assert.equal(input[input.indexOf("@TAILNET_IF@") + 1], "ip saddr { 100.64.0.0/10, 172.16.0.0/12 } accept");
  const forward = nft.slice(nft.indexOf("chain forward {"));
  assert.equal(forward[forward.indexOf("@TAILNET_IF@") - 1], "ct state established,related accept");
  assert.equal(nft.filter((l) => l === "@TAILNET_IF@").length, 2);
  const lines = install.split("\n").map((l) => l.trim());
  assert.ok(lines.includes('sudo install -m 755 -o root "$HERE/firewall/nft-load.sh" /var/lib/agent-cluster/nft-load.sh'), "a root-owned copy, inside the held firewall step");
  assert.ok(lines.includes("sudo bash /var/lib/agent-cluster/nft-load.sh /etc/agentguard.nft"), "install-cluster.sh loads the rules with nft-load.sh");
  assert.ok(!lines.includes("sudo nft -f /etc/agentguard.nft"), "never with nft -f alone, which empties the sets");
  assert.ok(lines.includes('install_unit agentguard-firewall "bash /var/lib/agent-cluster/nft-load.sh /etc/agentguard.nft; $NODE_BIN /var/lib/agent-cluster/lists.mjs load" / root boot'), "the start-up job runs the copies, never the kit checkout's files");
  assert.ok(!install.includes("$HERE/firewall/nft-load.sh /etc/agentguard.nft"), "nothing loads the kit checkout's nft-load.sh");
  const step = install.slice(install.indexOf("# network-step begin: the firewall rules"), install.indexOf("# network-step end", install.indexOf("# network-step begin: the firewall rules")));
  for (const l of ['nft-load.sh" /var/lib/agent-cluster/nft-load.sh', "sudo bash /var/lib/agent-cluster/nft-load.sh", "install_unit agentguard-firewall"]) assert.ok(step.includes(l), `${l} is inside the held firewall step`);
});

test("Windows passes Tailscale's addresses only on the Tailscale adapter, and WSL only to the computer's Tailscale addresses", () => {
  const ps = fs.readFileSync(path.join(here, "windows/install-windows-guard.ps1"), "utf8");
  const peers = ps.split("\n").find((l) => l.startsWith('New-NetFirewallRule -DisplayName "AgentGuard: Tailscale peers"'));
  assert.match(peers, /-InterfaceAlias "Tailscale" -RemoteAddress 100\.64\.0\.0\/10,fd7a:115c:a1e0::\/48 -Action Allow/);
  assert.match(ps, /Get-NetFirewallRule -DisplayName "AgentGuard: Tailscale peers" -ErrorAction SilentlyContinue \| Remove-NetFirewallRule\nNew-NetFirewallRule/, "an earlier rule for every adapter goes first");
  const wsl = ps.split("\n").find((l) => l.startsWith('New-NetFirewallHyperVRule -Name "AgentGuard-Tailscale"'));
  assert.match(wsl, /-LocalAddresses \$tsAddresses -RemoteAddresses 100\.64\.0\.0\/10,fd7a:115c:a1e0::\/48/);
  assert.match(ps, /Remove-NetFirewallHyperVRule -Name "AgentGuard-Tailscale"/);
});

// A macOS update replaces /etc/pf.conf with Apple's own, which doesn't use the agentguard anchor. So the
// firewall's start-up job builds the main rules again from it, with pf-main.sh, at each start-up.
test("each start-up builds the main pf rules again from /etc/pf.conf, with the agentguard anchor", () => {
  const install = fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8");
  const unit = install.split("\n").find((l) => l.includes("install_unit agentguard-firewall") && l.includes("pfctl -E"));
  assert.ok(unit, "the macOS start-up job");
  assert.match(unit, /bash \/var\/lib\/agent-cluster\/pf-main\.sh < \/etc\/pf\.conf > \$PF_BOOT\.new && mv \$PF_BOOT\.new \$PF_BOOT; pfctl -E -f \$PF_BOOT; pfctl -a agentguard -f \/var\/lib\/agent-cluster\/pf-base\.conf/);
  assert.match(install, /install -m 644 -o root "\$HERE\/firewall\/pf-main\.sh" \/var\/lib\/agent-cluster\/pf-main\.sh/);
  // what the start-up job builds from Apple's own /etc/pf.conf, as a macOS update leaves it
  const apple = 'scrub-anchor "com.apple/*"\nnat-anchor "com.apple/*"\nrdr-anchor "com.apple/*"\ndummynet-anchor "com.apple/*"\nanchor "com.apple/*"\nload anchor "com.apple" from "/etc/pf.anchors/com.apple"\n';
  const built = spawnSync("bash", [path.join(here, "firewall/pf-main.sh")], { input: apple, encoding: "utf8" }).stdout;
  assert.match(built, /^set skip on lo0\n/);
  assert.match(built, /\nanchor "agentguard"\n$/);
});
