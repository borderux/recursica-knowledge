// install-cluster.sh with KIT_HOLD_NETWORK=1 and without, run with stand-ins. The sudo stand-in
// records each call and runs nothing, so no test loads a firewall rule or installs a service.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { NFT_LOCKDOWN, nftLockdownFile } from "./platform.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const kitRoot = path.join(here, "../..");
const example = JSON.parse(fs.readFileSync(path.join(here, "../site.example.json"), "utf8"));
const SHA = "0123456789abcdef0123456789abcdef01234567";

// A copy of the kit files install-cluster.sh reads, a home folder with site.json, and a stand-in for
// each outside command. The copy sits outside the repository, so the kit check (kit/check-kit.sh)
// reads only the copy.
function sandbox(system, site = example) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "install-cluster-"));
  const kit = path.join(dir, "kit"), home = path.join(dir, "home"), bin = path.join(dir, "bin"), log = path.join(dir, "calls.log");
  for (const d of ["circlechat/kit", "circlechat/cluster/firewall"]) fs.cpSync(path.join(kitRoot, d), path.join(kit, d), { recursive: true });
  for (const f of ["install-cluster.sh", "kit-repo.mjs", "notice.mjs"]) fs.copyFileSync(path.join(here, f), path.join(kit, "circlechat/cluster", f));
  fs.mkdirSync(path.join(home, "circlechat"), { recursive: true });
  fs.writeFileSync(path.join(home, "circlechat/site.json"), JSON.stringify(site));
  fs.mkdirSync(bin);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  // sudo runs nothing. tee and install read their input, as the real commands do, and cat finds no file.
  stub("sudo", `case "$1" in tee) cat > "${dir}/tee-$(basename "$2")" ;; cat) exit 1 ;; esac; exit 0`);
  for (const t of ["nft", "pfctl", "launchctl", "systemctl", "tcpdump", "age"]) stub(t, "exit 0");
  stub("tailscale", `[ "$1 $2" = "ip -4" ] && echo 100.64.0.1; exit 0`);
  stub("git", `[ "$3" = rev-parse ] && echo ${SHA}; exit 0`);
  stub("uname", `echo ${system}`);
  const run = (env = {}, node = example.nodes[0].name) => spawnSync("bash", [path.join(kit, "circlechat/cluster/install-cluster.sh"), node], {
    env: { ...process.env, HOME: home, PATH: `${bin}:${path.dirname(process.execPath)}:/usr/bin:/bin`, SYSTEMD_UNIT_DIR: path.join(dir, "units"), LAUNCHD_DIR: path.join(dir, "daemons"), ...env },
    encoding: "utf8", cwd: home,
  });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  const marker = path.join(home, ".recursica-kit/network-applied/install-cluster.sh");
  const written = (name) => { try { return fs.readFileSync(path.join(dir, `tee-${name}`), "utf8"); } catch { return ""; } };
  return { run, calls, marker, written, home };
}

// The calls that change the firewall: a rule load, a write to pf.conf or the rule files, and the
// start-up job that loads the rules.
const FIREWALL = /nft -f|pfctl|\/etc\/pf\.conf|\/etc\/agentguard\.nft|pf-(base|lockdown|main)\.conf|nft-lockdown\.nft|agentguard-firewall/;

test("with KIT_HOLD_NETWORK=1, install-cluster.sh changes no firewall rule, and installs every other service", () => {
  for (const system of ["Linux", "Darwin"]) {
    const s = sandbox(system);
    const r = s.run({ KIT_HOLD_NETWORK: "1" });
    assert.equal(r.status, 0, `${system}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /^Held for a person, with KIT_HOLD_NETWORK=1: the firewall rules, pf\.conf and the agentguard-firewall start-up job\.$/m, system);
    const calls = s.calls().split("\n");
    assert.deepEqual(calls.filter((l) => FIREWALL.test(l)), [], system);
    assert.ok(!calls.some((l) => /^(nft|pfctl) /.test(l)), `${system}: no firewall command runs`);
    for (const unit of ["opencanary", "cluster-agent", "cluster-updater"]) assert.ok(calls.some((l) => l.startsWith("sudo tee") && l.includes(unit)), `${system}: ${unit}`);
    assert.ok(calls.some((l) => l.startsWith("sudo tee /etc/agent-cluster.conf")), system);
    assert.equal(fs.existsSync(s.marker), false, `${system}: a held run records no applied commit`);
  }
});

test("without KIT_HOLD_NETWORK, install-cluster.sh loads the Linux firewall rules and records the kit commit it applied", () => {
  const s = sandbox("Linux");
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /Held for a person/);
  const calls = s.calls();
  assert.match(calls, /^sudo tee \/etc\/agentguard\.nft$/m);
  assert.match(calls, /^sudo install -m 755 -o root \S+\/firewall\/nft-load\.sh \/var\/lib\/agent-cluster\/nft-load\.sh$/m);
  assert.match(calls, /^sudo bash \/var\/lib\/agent-cluster\/nft-load\.sh \/etc\/agentguard\.nft$/m);
  assert.doesNotMatch(calls, /^sudo nft -f \/etc\/agentguard\.nft$/m);
  assert.match(calls, /^sudo install -m 644 -o root \S+\/firewall\/nft-lockdown\.nft \/var\/lib\/agent-cluster\/nft-lockdown\.nft$/m);
  assert.match(calls, /^sudo tee \S+\/agentguard-firewall\.service$/m);
  assert.equal(fs.readFileSync(s.marker, "utf8"), `${SHA}\n`);
});

test("the guard loads the installed Linux lockdown rules, or the kit's own file on a computer without the copy", () => {
  assert.equal(NFT_LOCKDOWN, "/var/lib/agent-cluster/nft-lockdown.nft");
  assert.equal(nftLockdownFile(() => true), NFT_LOCKDOWN);
  assert.equal(nftLockdownFile(() => false), path.join(here, "firewall/nft-lockdown.nft"));
});

test("install-cluster.sh writes each computer's cluster agent at the computer's Tailscale address", () => {
  const s = sandbox("Linux");
  const r = s.run({ KIT_HOLD_NETWORK: "1" }, example.nodes[1].name);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(s.written("agent-cluster.conf"), new RegExp(`^AGENTS=${example.nodes[0].name}=http://${example.nodes[0].tailnet_address}:7500,${example.nodes[1].name}=http://127\\.0\\.0\\.1:7500$`, "m"));
  assert.doesNotMatch(s.written("agent-cluster.conf"), /host\.docker\.internal/);
});

test("install-cluster.sh writes the kit's GitHub repo as root, from site.json's repos.knowledge", () => {
  const cases = [
    [example.repos.knowledge, "borderux/recursica-knowledge"],
    ["https://github.com/acme/kit-fork", "acme/kit-fork"],
    [undefined, "borderux/recursica-knowledge"],
    ["https://git.acme.com/acme/kit.git", ""],
  ];
  for (const [knowledge, repo] of cases) {
    const site = structuredClone(example);
    if (knowledge === undefined) delete site.repos.knowledge; else site.repos.knowledge = knowledge;
    const s = sandbox("Linux", site);
    const r = s.run({ KIT_HOLD_NETWORK: "1" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    // sudo tee writes the file, so root owns the file.
    assert.match(s.calls(), /^sudo tee \/etc\/agent-cluster\.conf$/m);
    assert.match(s.written("agent-cluster.conf"), new RegExp(`^KIT_REPO=${repo.replace("/", "\\/")}$`, "m"), String(knowledge));
    assert.equal((s.written("agent-cluster.conf").match(/^KIT_REPO=/gm) ?? []).length, 1);
    if (!repo) assert.match(r.stdout, /repos\.knowledge in site\.json is off GitHub/);
  }
});
