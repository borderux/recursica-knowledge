// firewall/nft-load.sh, with a stand-in for nft in a scratch folder, so nothing here touches a
// firewall. The rules delete the agentguard table and make the table again, which empties the sets,
// so nft-load.sh adds each set's addresses back in the same nft -f as the rules. kit.yml's
// circlechat/ci/nft-check.sh runs the same load with real nftables.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const script = path.join(here, "firewall/nft-load.sh");

// nft list set prints a set from <state>/set-<name>, or fails when the file is missing, as for a table
// that doesn't exist yet. nft -f copies the file it loads to <state>/loaded.nft.
const NFT = `#!/bin/bash
d="$STANDIN_DIR"; echo "nft $*" >>"$d/calls"
if [ "$1 $2" = "list set" ]; then [ -f "$d/set-$5" ] || { echo "Error: No such file or directory" >&2; exit 1; }; cat "$d/set-$5"; exit 0; fi
if [ "$1" = -f ]; then [ -e "$d/fail" ] && { echo "Error: syntax error" >&2; exit 1; }; cp "$2" "$d/loaded.nft"; exit 0; fi
exit 2
`;
const printed = (name, type, elements) => `table inet agentguard {\n\tset ${name} {\n\t\ttype ${type}\n${elements ? `\t\telements = { ${elements} }\n` : ""}\t}\n}\n`;
const RULES = "table inet agentguard\ndelete table inet agentguard\ntable inet agentguard {\n  set blocked4 { type ipv4_addr; }\n  set blocked6 { type ipv6_addr; }\n  set allowed4 { type ipv4_addr; }\n  set allowed6 { type ipv6_addr; }\n}\n";

function setup() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nft-load-"));
  const bin = path.join(tmp, "bin"), state = path.join(tmp, "state");
  fs.mkdirSync(bin); fs.mkdirSync(state);
  fs.writeFileSync(path.join(bin, "nft"), NFT, { mode: 0o755 });
  fs.writeFileSync(path.join(tmp, "agentguard.nft"), RULES);
  const run = (rules = path.join(tmp, "agentguard.nft")) => spawnSync("bash", [script, rules], { env: { PATH: `${bin}:/usr/bin:/bin`, STANDIN_DIR: state, TMPDIR: tmp }, encoding: "utf8" });
  const set = (name, type, elements) => fs.writeFileSync(path.join(state, `set-${name}`), printed(name, type, elements));
  const loaded = () => fs.readFileSync(path.join(state, "loaded.nft"), "utf8");
  return { tmp, state, run, set, loaded, calls: () => fs.readFileSync(path.join(state, "calls"), "utf8").trim().split("\n") };
}

test("a rerun loads the rules and adds every set's addresses back in the same nft -f", () => {
  const s = setup();
  s.set("blocked4", "ipv4_addr", "192.0.2.10, 192.0.2.11,\n\t\t\t     192.0.2.12");
  s.set("blocked6", "ipv6_addr", "2001:db8::10");
  s.set("allowed4", "ipv4_addr", "198.51.100.11");
  s.set("allowed6", "ipv6_addr", "");
  const r = s.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(s.loaded(), `${RULES}\n` +
    "add element inet agentguard blocked4 { 192.0.2.10, 192.0.2.11, 192.0.2.12 }\n" +
    "add element inet agentguard blocked6 { 2001:db8::10 }\n" +
    "add element inet agentguard allowed4 { 198.51.100.11 }\n", "the rules first, then one line for each set that holds addresses");
  const calls = s.calls();
  assert.equal(calls.filter((c) => c.startsWith("nft -f ")).length, 1, "one transaction");
  assert.ok(calls.findIndex((c) => c.startsWith("nft -f ")) > calls.findIndex((c) => c.startsWith("nft list set")), "the sets are read before the load");
  assert.deepEqual(fs.readdirSync(s.tmp).filter((f) => f.startsWith("tmp")), [], "no temporary file left");
});

test("the first load, with no table yet, loads the rules alone", () => {
  const s = setup();
  const r = s.run();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(s.loaded(), `${RULES}\n`);
});

test("a set the new rules no longer make gets no addresses, so the load still works", () => {
  const s = setup();
  s.set("blocked4", "ipv4_addr", "192.0.2.10");
  s.set("allowed6", "ipv6_addr", "2001:db8::11");
  fs.writeFileSync(path.join(s.tmp, "agentguard.nft"), RULES.replace("  set allowed6 { type ipv6_addr; }\n", ""));
  assert.equal(s.run().status, 0);
  assert.match(s.loaded(), /^add element inet agentguard blocked4 \{ 192\.0\.2\.10 \}$/m);
  assert.doesNotMatch(s.loaded(), /allowed6 \{/);
});

test("a failed load fails the script, and a missing rules file loads nothing", () => {
  const s = setup();
  fs.writeFileSync(path.join(s.state, "fail"), "");
  const r = s.run();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /syntax error/);
  const missing = setup().run("/nonexistent/agentguard.nft");
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /^nft-load\.sh: no rules file \/nonexistent\/agentguard\.nft$/m);
});
