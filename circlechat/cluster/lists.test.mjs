// lists.mjs: the guard's blocked and allowed addresses on disk, and the start-up job's load of both
// into the firewall. Stand-ins take the place of pfctl and nft, so nothing here touches a firewall.
// kit.yml's circlechat/ci/lists-load.sh runs the same load with real pf and nftables.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { LIST_FILES, listCommands, loadLists, readList, writeList } from "./lists.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "lists-"));
const mode = (f) => fs.statSync(f).mode & 0o777;

test("a list is written whole, root-only, each address once", () => {
  const dir = tmp(), file = path.join(dir, LIST_FILES.blocked);
  fs.writeFileSync(file, "[]\n", { mode: 0o644 });
  writeList(file, ["192.0.2.10", "2001:db8::10", "192.0.2.10"]);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), ["192.0.2.10", "2001:db8::10"]);
  assert.equal(mode(file), 0o600, "root-only, though the old file was not");
  assert.deepEqual(fs.readdirSync(dir), [LIST_FILES.blocked], "no temporary file left");
});

test("a missing or empty file is an empty list; an entry that isn't an address is skipped and logged", () => {
  const dir = tmp(), log = [];
  assert.deepEqual(readList(path.join(dir, "missing.json"), (l) => log.push(l)), []);
  fs.writeFileSync(path.join(dir, "empty.json"), "\n");
  assert.deepEqual(readList(path.join(dir, "empty.json"), (l) => log.push(l)), []);
  assert.deepEqual(log, [], "nothing to log");
  fs.writeFileSync(path.join(dir, "mixed.json"), JSON.stringify(["192.0.2.10", "192.0.2.300", 7, "2001:db8::10", "192.0.2.10"]));
  assert.deepEqual(readList(path.join(dir, "mixed.json"), (l) => log.push(l)), ["192.0.2.10", "2001:db8::10"]);
  assert.equal(log.length, 2);
  assert.match(log[0], /mixed\.json: skipped "192\.0\.2\.300", not an address$/);
  assert.match(log[1], /mixed\.json: skipped 7, not an address$/);
});

test("a file cut short is read line by line, and each good line still loads", () => {
  const dir = tmp(), log = [];
  fs.writeFileSync(path.join(dir, "cut.json"), '[\n  "192.0.2.10",\n  "garbage line",\n  "2001:db8::10",\n  "198.51');
  assert.deepEqual(readList(path.join(dir, "cut.json"), (l) => log.push(l)), ["192.0.2.10", "2001:db8::10"]);
  assert.match(log[0], /cut\.json is not a JSON list .*, so each line is read as one address$/);
  assert.ok(log.some((l) => /skipped "garbage line"/.test(l)));
  assert.ok(log.some((l) => /skipped "198\.51"/.test(l)));
});

test("the commands: one pfctl add per table on macOS, one nft add per set and family on Linux", () => {
  const ips = ["192.0.2.10", "2001:db8::10", "192.0.2.11"];
  assert.deepEqual(listCommands("darwin", "blocked", ips), [["pfctl", ["-a", "agentguard", "-t", "blocked", "-T", "add", ...ips]]]);
  assert.deepEqual(listCommands("linux", "allowed", ips), [
    ["nft", ["add", "element", "inet", "agentguard", "allowed4", "{ 192.0.2.10, 192.0.2.11 }"]],
    ["nft", ["add", "element", "inet", "agentguard", "allowed6", "{ 2001:db8::10 }"]],
  ]);
  assert.deepEqual(listCommands("linux", "blocked", ["192.0.2.10"]), [["nft", ["add", "element", "inet", "agentguard", "blocked4", "{ 192.0.2.10 }"]]]);
  assert.deepEqual(listCommands("darwin", "blocked", []), [], "an empty list runs nothing");
});

test("the load adds the blocked list, then the allowed list; a failed command doesn't stop the other list", async () => {
  const dir = tmp();
  writeList(path.join(dir, LIST_FILES.blocked), ["192.0.2.10"]);
  fs.writeFileSync(path.join(dir, LIST_FILES.allowed), JSON.stringify(["bad", "198.51.100.11"]));
  const calls = [], log = [];
  let ok = await loadLists({ stateDir: dir, platform: "darwin", run: async (cmd, args) => (calls.push([cmd, ...args].join(" ")), { code: 0 }), log: (l) => log.push(l) });
  assert.equal(ok, true);
  assert.deepEqual(calls, ["pfctl -a agentguard -t blocked -T add 192.0.2.10", "pfctl -a agentguard -t allowed -T add 198.51.100.11"]);
  assert.ok(log.some((l) => /skipped "bad"/.test(l)));
  assert.ok(log.includes("1 blocked address from blocked-sources.json") && log.includes("1 allowed address from allowed-sources.json"));
  calls.length = 0;
  ok = await loadLists({ stateDir: dir, platform: "darwin", log: (l) => log.push(l),
    run: async (cmd, args) => (calls.push(args[2]), args[2] === "blocked" ? { code: 1, stderr: "pfctl: Table does not exist.\n" } : { code: 0 }) });
  assert.equal(ok, false);
  assert.deepEqual(calls, ["blocked", "allowed"]);
  assert.ok(log.some((l) => /^pfctl -a agentguard -t blocked -T add .*failed: pfctl: Table does not exist\.$/.test(l)));
  assert.equal(await loadLists({ stateDir: tmp(), run: async () => assert.fail("no file, no command") }), true, "no files: nothing to load");
});

// The start-up job runs a root-owned copy of lists.mjs, alone in /var/lib/agent-cluster, so the
// test runs a copy alone in a folder of its own.
test("node lists.mjs load, run from a lone copy, runs the platform's command from the files", () => {
  const dir = tmp(), bin = tmp(), copy = tmp(), out = path.join(bin, "calls");
  for (const cmd of ["pfctl", "nft"]) fs.writeFileSync(path.join(bin, cmd), `#!/bin/bash\necho "${cmd} $*" >>"${out}"\n`, { mode: 0o755 });
  writeList(path.join(dir, LIST_FILES.blocked), ["192.0.2.10"]);
  fs.copyFileSync(path.join(here, "lists.mjs"), path.join(copy, "lists.mjs"));
  const r = spawnSync(process.execPath, [path.join(copy, "lists.mjs"), "load", dir], { env: { PATH: `${bin}:/usr/bin:/bin` }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const want = process.platform === "darwin" ? "pfctl -a agentguard -t blocked -T add 192.0.2.10" : "nft add element inet agentguard blocked4 { 192.0.2.10 }";
  assert.equal(fs.readFileSync(out, "utf8"), `${want}\n`);
  assert.match(r.stdout, /^agentguard lists: 1 blocked address from blocked-sources\.json$/m);
});

// install-cluster.sh copies lists.mjs alone, so the file imports only node's own modules.
test("lists.mjs imports only node: modules, so a copy of the one file runs", () => {
  const src = fs.readFileSync(path.join(here, "lists.mjs"), "utf8");
  const specs = [...src.matchAll(/^\s*import\b[^;]*?\bfrom\s+["']([^"']+)["']/gm), ...src.matchAll(/\bimport\s*\(\s*["'`]([^"'`]+)["'`]/g), ...src.matchAll(/\brequire\s*\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  assert.ok(specs.length > 0, "the source has imports");
  for (const s of specs) assert.match(s, /^node:/, `lists.mjs imports ${s}`);
  assert.doesNotMatch(src, /\bimport\s*\(\s*[^"'`\s]/, "no import of a computed name");
});

// The firewall keeps its lists in memory only, so the start-up job loads both files after the rules,
// on macOS and on Linux, and install-cluster.sh does the same after it loads the rules itself. Both run
// the root-owned copy in /var/lib/agent-cluster, never the kit checkout's file, and the copy and the
// loads sit in the held firewall step.
test("the start-up job and install-cluster.sh load the lists after the rules, from the root-owned copy", () => {
  const install = fs.readFileSync(path.join(here, "install-cluster.sh"), "utf8");
  const copy = 'sudo install -m 644 -o root "$HERE/lists.mjs" /var/lib/agent-cluster/lists.mjs';
  const load = 'sudo "$NODE_BIN" /var/lib/agent-cluster/lists.mjs load';
  const units = install.split("\n").filter((l) => l.includes("install_unit agentguard-firewall"));
  assert.equal(units.length, 2);
  assert.match(units.find((l) => l.includes("nft-load.sh")), /"bash \/var\/lib\/agent-cluster\/nft-load\.sh \/etc\/agentguard\.nft; \$NODE_BIN \/var\/lib\/agent-cluster\/lists\.mjs load" \/ root boot$/);
  assert.match(units.find((l) => l.includes("pfctl")), /; pfctl -a agentguard -f \/var\/lib\/agent-cluster\/pf-base\.conf; \$NODE_BIN \/var\/lib\/agent-cluster\/lists\.mjs load" \/ root boot$/);
  assert.ok(!install.includes("$HERE/lists.mjs load") && !install.includes('$HERE/lists.mjs" load'), "nothing runs the kit checkout's lists.mjs");
  const lines = install.split("\n").map((l) => l.trim());
  assert.equal(lines.filter((l) => l === copy).length, 2, "a root-owned copy on Linux and on macOS");
  assert.equal(lines.filter((l) => l === load).length, 2);
  const linuxRules = lines.indexOf("sudo bash /var/lib/agent-cluster/nft-load.sh /etc/agentguard.nft");
  assert.ok(linuxRules > lines.indexOf(copy), "Linux: the copy before the load");
  assert.equal(lines[linuxRules + 1], load, "Linux: the lists right after the rules");
  const macUnit = lines.findIndex((l) => l.includes("install_unit agentguard-firewall") && l.includes("pfctl"));
  assert.ok(lines.lastIndexOf(copy) < macUnit, "macOS: the copy before the start-up job");
  assert.equal(lines[macUnit + 1], load, "macOS: the lists after the start-up job loads the rules");
  const begin = install.indexOf("# network-step begin: the firewall rules"), end = install.indexOf("# network-step end", begin);
  const held = install.indexOf("network_held", begin);
  assert.ok(begin >= 0 && held > begin && held < end);
  for (const l of [copy, load, "/var/lib/agent-cluster/lists.mjs load\" / root boot"]) {
    for (let i = install.indexOf(l); i >= 0; i = install.indexOf(l, i + 1)) assert.ok(i > held && i < end, `${l} sits in the held firewall step`);
  }
});
