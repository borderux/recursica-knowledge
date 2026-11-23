// migrate-off-1x.sh, run with stand-ins for docker, sudo and setup-host.sh: what the script moves,
// what it refuses, and what a dry run leaves alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const kitRoot = path.join(here, "..");
const example = JSON.parse(fs.readFileSync(path.join(here, "site.example.json"), "utf8"));
const CONTROL = example.nodes.find((n) => n.control).name;
const HELPER = example.nodes.find((n) => !n.control).name;

// A copy of the kit files the script reads, with a stand-in setup-host.sh, and a home folder in
// CircleChat 1.x's layout. The copy sits outside the repository, so the kit check reads only the copy.
//   computer: this computer's name in the cluster's settings; quiet: what the quiet check says
//   networks: the Docker networks that exist; containers: the containers that exist
function sandbox({ computer = CONTROL, quiet = "", networks = ["circlechat_default", "circlechat_agents", "circlechat_models"], containers = ["cc-gateway", "cc-litellm", "betty-proto"] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrate-1x-"));
  const kit = path.join(dir, "kit"), home = path.join(dir, "home"), bin = path.join(dir, "bin"), log = path.join(dir, "calls.log");
  fs.cpSync(path.join(kitRoot, "circlechat/kit"), path.join(kit, "circlechat/kit"), { recursive: true });
  fs.copyFileSync(path.join(here, "migrate-off-1x.sh"), path.join(kit, "circlechat/migrate-off-1x.sh"));
  fs.writeFileSync(path.join(kit, "circlechat/setup-host.sh"), `echo "setup-host.sh CC_DIR=$CC_DIR WS=$WS" >> "${log}"\n`);
  const cc = path.join(home, "circlechat"), ws = path.join(home, "circlechat-workspace");
  fs.mkdirSync(path.join(cc, "gateway-state"), { recursive: true });
  fs.mkdirSync(path.join(cc, "kit-out"));
  fs.mkdirSync(path.join(cc, "hermes-homes"));
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify(example));
  fs.writeFileSync(path.join(cc, "compose.yml"), "services: {}\n");
  fs.mkdirSync(path.join(ws, "kev"), { recursive: true });
  const conf = path.join(dir, "agent-cluster.conf");
  fs.writeFileSync(conf, `COMPUTER=${computer}\n`);
  fs.mkdirSync(bin);
  const stub = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> "${log}"\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  // The networks live in a file, so a network the script makes or removes stays made or removed.
  const nets = path.join(dir, "networks"), cons = containers.join(" ");
  fs.writeFileSync(nets, networks.map((n) => `${n}\n`).join(""));
  stub("docker", `case "$1 $2" in
  "network inspect") [ "$3" = -f ] && { echo 0; exit 0; }; grep -qx -- "$3" "${nets}"; exit ;;
  "network create") echo "$3" >> "${nets}" ;;
  "network rm") grep -vx -- "$3" "${nets}" > "${nets}.new"; mv "${nets}.new" "${nets}" ;;
  "container inspect") case " ${cons} " in *" $3 "*) exit 0 ;; esac; exit 1 ;;
esac; exit 0`);
  // sudo stands in for the quiet check, which runs as root: it prints why the server is busy.
  stub("sudo", `printf '%s' "${quiet}"; exit 0`);
  stub("git", "exit 0");
  stub("uname", "echo Linux");
  const run = (...args) => spawnSync("bash", [path.join(kit, "circlechat/migrate-off-1x.sh"), ...args], {
    env: { ...process.env, HOME: home, PATH: `${bin}:${path.dirname(process.execPath)}:/usr/bin:/bin`, AGENT_CLUSTER_CONF: conf },
    encoding: "utf8", cwd: home,
  });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { home, cc, ws, run, calls };
}

test("a dry run prints each step and changes nothing", () => {
  const s = sandbox();
  const r = s.run("--dry-run");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Dry run: nothing changes\./);
  assert.match(r.stdout, /would run: mv .*\/circlechat .*\/recursica-stack/);
  assert.match(r.stdout, /would run: docker network create gateway-models/);
  assert.match(r.stdout, /would run: env CC_DIR=.*\/recursica-stack WS=.*\/recursica-workspace .*setup-host\.sh/);
  assert.ok(fs.lstatSync(s.cc).isDirectory() && !fs.lstatSync(s.cc).isSymbolicLink(), "the folder stays");
  assert.equal(fs.existsSync(path.join(s.home, "recursica-stack")), false);
  assert.doesNotMatch(s.calls(), /^docker (rm|network create|network rm)|^setup-host\.sh/m);
});

test("the script refuses while RecursicaChat 2.0 is busy, and changes nothing", () => {
  const s = sandbox({ quiet: "1 delivery queued" });
  const r = s.run();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /Refused: RecursicaChat 2\.0 is not quiet \(1 delivery queued\)\. Nothing changed\./);
  assert.ok(!fs.lstatSync(s.cc).isSymbolicLink());
  assert.doesNotMatch(s.calls(), /^docker (rm|network create|network rm)|^setup-host\.sh/m);
});

test("on the control computer, the script stops the gateway, moves both folders with a link at each old name, and runs setup-host.sh", () => {
  const s = sandbox();
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const stack = path.join(s.home, "recursica-stack"), ws = path.join(s.home, "recursica-workspace");
  assert.ok(fs.existsSync(path.join(stack, "site.json")));
  assert.ok(fs.existsSync(path.join(ws, "kev")));
  assert.equal(fs.readlinkSync(s.cc), stack);
  assert.equal(fs.readlinkSync(s.ws), ws);
  const calls = s.calls();
  // The containers go before the move, the network comes before the setup, and 1.x's networks go after it.
  assert.match(calls, /^docker rm -f cc-gateway\n(.*\n)*docker network create gateway-models\n(.*\n)*setup-host\.sh CC_DIR=.*\/recursica-stack WS=.*\/recursica-workspace\n(.*\n)*docker network rm circlechat_default\n/m);
  for (const n of ["circlechat_agents", "circlechat_models"]) assert.match(calls, new RegExp(`^docker network rm ${n}$`, "m"));
  assert.match(r.stdout, /CircleChat 1\.x's files are still in the stack's folder: .*compose\.yml/);
  assert.match(r.stdout, /hermes-homes/);
  assert.ok(fs.existsSync(path.join(stack, "compose.yml")), "the script removes no 1.x file");
  // A second run finds nothing to move.
  const again = s.run();
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(again.stdout, /The folders and the gateway's network need no move\./);
});

test("a container still on a 1.x network keeps the network", () => {
  const s = sandbox({ networks: ["gateway-models", "circlechat_default"] });
  fs.renameSync(s.cc, path.join(s.home, "recursica-stack"));
  fs.symlinkSync(path.join(s.home, "recursica-stack"), s.cc);
  fs.renameSync(s.ws, path.join(s.home, "recursica-workspace"));
  const docker = path.join(path.dirname(s.home), "bin", "docker");
  fs.writeFileSync(docker, fs.readFileSync(docker, "utf8").replace('[ "$3" = -f ] && { echo 0; exit 0; }', '[ "$3" = -f ] && { echo 1; exit 0; }'));
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Kept the network circlechat_default: a container still uses it\./);
  assert.doesNotMatch(s.calls(), /^docker network rm|^setup-host\.sh/m);
});

test("on a helper computer, only the folder moves", () => {
  const s = sandbox({ computer: HELPER });
  fs.rmSync(path.join(s.cc, "kit-out"), { recursive: true });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /a helper computer/);
  assert.equal(fs.readlinkSync(s.cc), path.join(s.home, "recursica-stack"));
  assert.doesNotMatch(s.calls(), /^docker (rm|network)|^sudo|^setup-host\.sh/m);
});

test("a real folder at both names stops the script before any change", () => {
  const s = sandbox();
  fs.mkdirSync(path.join(s.home, "recursica-stack"));
  const r = s.run();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /Refused: both .*\/circlechat and .*\/recursica-stack exist/);
  assert.doesNotMatch(s.calls(), /^(docker|sudo|setup-host\.sh)/m);
});
