// sync-skills.sh and setup-agent.sh write into places an agent can change: the shared workspace and
// each agent's Hermes home. Each test plants a symlink at a destination, runs the real scripts
// from a copy of the kit, and checks that no file outside the workspace and the homes changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const me = os.userInfo().username;
const MARK = "<!-- recursica-circlechat -->";

// A docker stand-in. A script the kit runs with node in a small container as the agent's account
// (kit/lib.sh as_agent and give_home) runs with this computer's node: the container mounts each path
// at its own path, so the paths are the same. <more> handles every other docker command.
const dockerStub = (log, more = "") => `#!/usr/bin/env bash
echo "docker $*" >> "${log}"
for ((i = 1; i < $#; i++)); do
  j=$((i + 1))
  if [ "\${!i}" = --entrypoint ] && [ "\${!j}" = node ]; then shift $((i + 2)); exec node "$@"; fi
done
case "$*" in
  "image inspect"*) echo "node@sha256:feed" ;;
${more}
esac
exit 0
`;

// A kit checkout outside the workspace, with the real scripts and a small skills tree; a home with
// the workspace and the agents' homes; and a folder outside both, which every symlink names.
function sandbox(agents) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-files-"));
  const kit = path.join(root, "kit"), home = path.join(root, "home"), outside = path.join(root, "outside");
  fs.cpSync(here, path.join(kit, "circlechat"), { recursive: true, filter: (src) => !src.includes("node_modules") });
  const put = (f, text) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  put(path.join(kit, "skills/components/recursica-skill-button/SKILL.md"), "button skill from the kit\n");
  put(path.join(kit, "skills/meta/GLOSSARY.md"), "glossary from the kit\n");
  for (const a of ["alan", "betty", "loki"]) put(path.join(kit, `portable/circlechat/agents/${a}/SOUL.md`), `Persona of ${a} from the kit.\n`);
  for (const s of ["checker", "feisty"]) put(path.join(kit, `agents/barb/subagents/${s}/SKILL.md`), `${s} from the kit\n`);
  put(path.join(kit, "tools/kev/index.mjs"), "kev from the kit\n");
  put(path.join(kit, "tools/knowledge-mcp/server.mjs"), "knowledge server from the kit\n");
  put(path.join(kit, "scripts/screen-skill-manifest.mjs"), "manifest from the kit\n");
  put(path.join(kit, "scripts/lib/skill-sections.mjs"), "sections from the kit\n");
  const ws = path.join(home, "circlechat-workspace"), cc = path.join(home, "circlechat");
  // The workspace's own checkout, which an agent changed: never a source.
  put(path.join(ws, "recursica-knowledge/skills/components/recursica-skill-button/SKILL.md"), "changed by an agent\n");
  put(path.join(ws, "recursica-knowledge/portable/circlechat/agents/alan/SOUL.md"), "persona changed by an agent\n");
  put(path.join(ws, "recursica-knowledge/tools/knowledge-mcp/server.mjs"), "server changed by an agent\n");
  fs.mkdirSync(path.join(ws, "kev"), { recursive: true });
  for (const a of agents) fs.mkdirSync(path.join(cc, `hermes-homes/.hermes-${a}`), { recursive: true });
  put(path.join(outside, "target.txt"), "outside\n");
  fs.mkdirSync(path.join(outside, "dir"));
  put(path.join(outside, "dir/keep.txt"), "outside folder\n");
  fs.chmodSync(path.join(outside, "target.txt"), 0o600);
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "docker"), dockerStub(path.join(root, "docker.log")), { mode: 0o755 });
  // The agent's account and bridge-config.json's owner: the tests' own, which is the only account a
  // test can give a file to.
  const env = { ...process.env, HOME: home, OWNER: me, OWNER_HOME: home, PATH: `${bin}:${process.env.PATH}`, AGENT_IDS: `${process.getuid()}:${process.getgid()}`, BRIDGE_CONFIG_IDS: `${process.getuid()}:${process.getgid()}` };
  for (const k of ["CC_DIR", "WS", "TENANT", "SITE"]) delete env[k];
  const run = (script, ...args) => spawnSync("bash", [path.join(kit, "circlechat", script), ...args], { env, encoding: "utf8", cwd: home });
  const h = (a, f = "") => path.join(cc, `hermes-homes/.hermes-${a}`, f);
  return { root, kit, home, ws, cc, outside, bin, env, run, h, put };
}
// Every file and folder outside the workspace and the homes: its path, text and mode.
const snapshot = (dir) => fs.readdirSync(dir, { recursive: true }).sort().map((f) => {
  const p = path.join(dir, f), st = fs.lstatSync(p);
  return [f, st.isFile() ? fs.readFileSync(p, "utf8") : "", st.mode];
});
const link = (target, at) => { fs.mkdirSync(path.dirname(at), { recursive: true }); fs.symlinkSync(target, at); };
const isLink = (p) => fs.lstatSync(p).isSymbolicLink();

test("sync-skills.sh copies from the kit's checkout, replaces a symlinked file, refuses a symlinked folder, and changes nothing outside", () => {
  const s = sandbox(["alan", "betty", "barb", "loki"]);
  const target = path.join(s.outside, "target.txt"), dir = path.join(s.outside, "dir");
  link(target, s.h("alan", "SOUL.md"));                                          // a file: the persona
  link(target, s.h("loki", "skills/recursica-skill-button/SKILL.md"));          // a file: a skill
  link(dir, s.h("betty", "skills/recursica-skill-button"));                      // a folder: one skill
  link(dir, s.h("barb", "skills"));                                              // a folder: every skill
  link(target, path.join(s.ws, "kev/index.mjs"));                                // a file in the workspace
  const before = snapshot(s.outside);
  const r = s.run("sync-skills.sh");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.deepEqual(snapshot(s.outside), before, "no file outside changed");
  // The refused folders: still symlinks, and the scripts name each one.
  assert.match(r.stderr, /Refused: .*\.hermes-betty\/skills\/recursica-skill-button is a symlink/);
  assert.match(r.stderr, /Refused: .*\.hermes-barb\/skills is a symlink/);
  assert.ok(isLink(s.h("betty", "skills/recursica-skill-button")) && isLink(s.h("barb", "skills")));
  // The symlinked files: replaced with the kit's files, never the workspace's copy.
  assert.ok(!isLink(s.h("alan", "SOUL.md")));
  assert.equal(fs.readFileSync(s.h("alan", "SOUL.md"), "utf8"), `${MARK}\nPersona of alan from the kit.\n`);
  assert.equal(fs.readFileSync(s.h("alan", "skills/recursica-skill-button/SKILL.md"), "utf8"), "button skill from the kit\n");
  assert.equal(fs.readFileSync(s.h("alan", "skills/GLOSSARY.md"), "utf8"), "glossary from the kit\n");
  assert.ok(!isLink(s.h("loki", "skills/recursica-skill-button/SKILL.md")));
  assert.equal(fs.readFileSync(s.h("loki", "skills/recursica-skill-button/SKILL.md"), "utf8"), "button skill from the kit\n");
  assert.ok(!isLink(path.join(s.ws, "kev/index.mjs")));
  assert.equal(fs.readFileSync(path.join(s.ws, "kev/index.mjs"), "utf8"), "kev from the kit\n");
});

test("Betty and Barb get the knowledge server's copy in their own home, from the kit's checkout only", () => {
  const s = sandbox(["betty", "barb", "alan"]);
  const r = s.run("sync-skills.sh");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const a of ["betty", "barb"]) {
    const km = (f) => s.h(a, `knowledge-mcp/${f}`);
    assert.equal(fs.readFileSync(km("tools/knowledge-mcp/server.mjs"), "utf8"), "knowledge server from the kit\n", a);
    assert.equal(fs.readFileSync(km("skills/components/recursica-skill-button/SKILL.md"), "utf8"), "button skill from the kit\n", a);
    assert.equal(fs.readFileSync(km("scripts/screen-skill-manifest.mjs"), "utf8"), "manifest from the kit\n", a);
    assert.equal(fs.readFileSync(km("scripts/lib/skill-sections.mjs"), "utf8"), "sections from the kit\n", a);
  }
  assert.ok(!fs.existsSync(s.h("alan", "knowledge-mcp")), "an agent the server is not for gets no copy");
  // A symlinked folder in an agent's copy is refused, and the folder it names stays as it was.
  fs.rmSync(s.h("betty", "knowledge-mcp/tools"), { recursive: true });
  link(path.join(s.outside, "dir"), s.h("betty", "knowledge-mcp/tools"));
  const before = snapshot(s.outside);
  const again = s.run("sync-skills.sh");
  assert.equal(again.status, 1, again.stdout + again.stderr);
  assert.match(again.stderr, /Refused: .*\.hermes-betty\/knowledge-mcp\/tools is a symlink/);
  assert.deepEqual(snapshot(s.outside), before);
});

test("sync-skills.sh refuses a symlinked Kev folder in the workspace", () => {
  const s = sandbox(["alan"]);
  fs.rmSync(path.join(s.ws, "kev"), { recursive: true });
  link(path.join(s.outside, "dir"), path.join(s.ws, "kev"));
  const before = snapshot(s.outside);
  const r = s.run("sync-skills.sh");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Refused: .*circlechat-workspace\/kev is a symlink/);
  assert.deepEqual(snapshot(s.outside), before);
});

test("sync-skills.sh and setup-agent.sh never run as root", () => {
  const s = sandbox(["alan"]);
  fs.writeFileSync(path.join(s.bin, "id"), `#!/usr/bin/env bash\n[ "$1" = -u ] && { echo 0; exit 0; }\nexec /usr/bin/id "$@"\n`, { mode: 0o755 });
  link(path.join(s.outside, "target.txt"), s.h("alan", "SOUL.md"));
  for (const args of [["sync-skills.sh"], ["setup-agent.sh", "alan"], ["setup-agent.sh", "--sync", "alan"]]) {
    const r = s.run(...args);
    assert.equal(r.status, 1, args.join(" "));
    assert.match(r.stdout, /never as root/);
  }
  assert.ok(isLink(s.h("alan", "SOUL.md")), "nothing was written");
});

// setup-agent.sh without --sync: a stand-in for sudo runs each command as this account, the stack's
// kit-out comes from the example site.json, and CircleChat's bridge-config.json lists each home.
function fullSetup(s) {
  fs.writeFileSync(path.join(s.bin, "sudo"), `#!/usr/bin/env bash\nexec "$@"\n`, { mode: 0o755 });
  const r = spawnSync(process.execPath, [path.join(s.kit, "circlechat/kit/render.mjs"), path.join(s.kit, "circlechat/site.example.json"), path.join(s.cc, "kit-out")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  fs.mkdirSync(path.join(s.cc, "gateway-state"), { recursive: true });
  fs.writeFileSync(path.join(s.cc, ".env"), "JOBD_TOKEN=t\nCC_HERMES_IMAGE=nousresearch/hermes-agent@sha256:0123abcd\n");
  const homes = fs.readdirSync(path.join(s.cc, "hermes-homes")).filter((n) => n.startsWith(".hermes-"));
  fs.writeFileSync(path.join(s.cc, "hermes-homes/bridge-config.json"), JSON.stringify(homes.map((n) => ({ handle: n.slice(8), token: `bot-${n.slice(8)}`, hermesHome: path.join(s.cc, "hermes-homes", n) }))));
  fs.mkdirSync(path.join(s.ws, "loki"), { recursive: true });
  // docker answers the test turn at the end of setup-agent.sh (kit/hermes-turn.sh) as Hermes does,
  // or, with FAKE_TURN=refuse, refuses the session with the refusal detail hook's line.
  fs.writeFileSync(path.join(s.bin, "docker"), dockerStub(path.join(s.root, "docker.log"), `  *"--entrypoint sh"*) echo /opt/hermes/.venv/lib/python3.14/site-packages ;;
  *" chat -q "*) if [ "\${FAKE_TURN:-}" = refuse ]; then
      echo "hermes refusal: invalid_params {'reason': 'invalid_params', 'fields': ['source']}" >&2
      echo "Hermes couldn't start the model connection: invalid_params."; exit 1
    fi
    echo ready; echo "session_id: local-1" >&2 ;;`), { mode: 0o755 });
}
const turns = (s) => (fs.existsSync(path.join(s.root, "docker.log")) ? fs.readFileSync(path.join(s.root, "docker.log"), "utf8") : "").split("\n").filter((l) => l.includes(" chat -q "));
const config = "model:\n  default: x\nagent:\n  reasoning_effort: high\ncustom_providers: []\n";

test("setup-agent.sh refuses a symlinked config.yaml, .env or workspace folder, and changes nothing outside", () => {
  for (const plant of [
    (s) => link(path.join(s.outside, "target.txt"), s.h("loki", "config.yaml")),
    (s) => { fs.writeFileSync(s.h("loki", "config.yaml"), config); link(path.join(s.outside, "target.txt"), s.h("loki", ".env")); },
    (s) => { fs.writeFileSync(s.h("loki", "config.yaml"), config); fs.rmSync(path.join(s.ws, "loki"), { recursive: true }); link(path.join(s.outside, "dir"), path.join(s.ws, "loki")); },
  ]) {
    const s = sandbox(["loki"]);
    fullSetup(s);
    plant(s);
    const before = snapshot(s.outside);
    const r = s.run("setup-agent.sh", "loki");
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /Refused: .* is a symlink/);
    assert.deepEqual(snapshot(s.outside), before);
  }
});

test("setup-agent.sh replaces a symlinked backup, gives the home to the agent's account with mode 700, and leaves the file a symlink names alone", () => {
  const s = sandbox(["loki"]);
  fullSetup(s);
  fs.writeFileSync(s.h("loki", "config.yaml"), config);
  fs.writeFileSync(s.h("loki", "SOUL.md"), "A persona written whole by an older sync.\n");
  link(path.join(s.outside, "target.txt"), s.h("loki", "SOUL.md.premark.bak"));
  link(path.join(s.outside, "target.txt"), s.h("loki", "link-to-outside"));
  const before = snapshot(s.outside);
  const r = s.run("setup-agent.sh", "loki");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(snapshot(s.outside), before, "no file outside changed, its mode included");
  assert.equal(fs.readFileSync(s.h("loki", "SOUL.md.premark.bak"), "utf8"), "A persona written whole by an older sync.\n");
  assert.equal(fs.readFileSync(s.h("loki", "SOUL.md"), "utf8"), `${MARK}\nPersona of loki from the kit.\n`);
  const cfg = fs.readFileSync(s.h("loki", "config.yaml"), "utf8");
  assert.match(cfg, /reasoning_effort: medium/);
  assert.match(cfg, /^ {2}context_length: 131072$/m);
  assert.match(cfg, /^auxiliary:\n {2}compression:\n {4}context_length: 131072$/m);
  const mode = (f) => fs.lstatSync(s.h("loki", f)).mode & 0o777;
  assert.equal(fs.statSync(path.join(s.cc, "hermes-homes/bridge-config.json")).mode & 0o777, 0o600, "every bot token: root's, mode 600");
  assert.equal(mode(""), 0o700);
  assert.equal(mode(".env"), 0o600);
  for (const f of ["config.yaml", "SOUL.md", "skills", "skills/recursica-skill-button/SKILL.md"]) assert.equal(mode(f) & 0o022, 0, `${f}: no write for the group or others`);
  // Every read and write in the home ran as the agent's account, with no sudo: sudo only reads the
  // gateway's state and writes the shared workspace.
  const log = fs.readFileSync(path.join(s.root, "docker.log"), "utf8");
  assert.match(log, new RegExp(`--user ${process.getuid()}:${process.getgid()} -v ${s.h("loki")}:${s.h("loki")} -v ${s.kit}:${s.kit}:ro --entrypoint node `));
  assert.match(log, /--cap-drop ALL --cap-add CHOWN --cap-add FOWNER --cap-add DAC_OVERRIDE --cap-add DAC_READ_SEARCH --security-opt no-new-privileges --user 0:0 .* own /);
});

test("a symlinked bridge-config.json stops setup-agent.sh and sync-skills.sh, and the file it names keeps its mode", () => {
  const s = sandbox(["loki"]);
  fullSetup(s);
  fs.writeFileSync(s.h("loki", "config.yaml"), config);
  fs.rmSync(path.join(s.cc, "hermes-homes/bridge-config.json"));
  link(path.join(s.outside, "target.txt"), path.join(s.cc, "hermes-homes/bridge-config.json"));
  const before = snapshot(s.outside);
  for (const args of [["setup-agent.sh", "loki"], ["sync-skills.sh"]]) {
    const r = s.run(...args);
    assert.notEqual(r.status, 0, args.join(" "));
    assert.match(r.stderr, /Refused: .*bridge-config\.json is a symlink/);
  }
  assert.deepEqual(snapshot(s.outside), before);
});

test("setup-agent.sh ends with one test turn in the agent's home, and stops with Hermes's refusal detail when Hermes refuses the turn", () => {
  const s = sandbox(["loki"]);
  fullSetup(s);
  fs.writeFileSync(s.h("loki", "config.yaml"), config);
  const r = s.run("setup-agent.sh", "loki");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /loki: test turn answered\.\nloki set up\./);
  assert.equal(turns(s).length, 1);
  assert.ok(turns(s)[0].endsWith(` -v ${s.h("loki").replace(/\/$/, "")}:/opt/data -e CC_API_BASE=http://localhost:8080/api -e CC_BOT_TOKEN nousresearch/hermes-agent@sha256:0123abcd chat -q Reply with the single word: ready -Q --yolo --source tool`), turns(s)[0]);
  s.env.FAKE_TURN = "refuse";
  const refused = s.run("setup-agent.sh", "loki");
  assert.equal(refused.status, 1);
  assert.match(refused.stdout, /hermes refusal: invalid_params \{'reason': 'invalid_params', 'fields': \['source'\]\}/);
  assert.doesNotMatch(refused.stdout, /loki set up\./);
});

const KNOWLEDGE_ENTRY = /^mcp_servers:\n(?: {2}\S.*\n(?: {4,}.*\n)*)* {2}recursica-knowledge:\n {4}command: node\n {4}args:\n {6}- "\/opt\/data\/knowledge-mcp\/tools\/knowledge-mcp\/server\.mjs"\n {4}enabled: true\n {4}timeout: 30$/m;

test("setup-agent.sh writes the knowledge server's entry for Betty and Barb, keeps CircleChat's own server, and lists the server where the cli list is an allowlist", () => {
  const s = sandbox(["betty", "barb", "loki"]);
  fullSetup(s);
  s.put(path.join(s.kit, "portable/circlechat/agents/barb/SOUL.md"), "Persona of barb from the kit.\n");
  fs.writeFileSync(s.h("betty", "config.yaml"), config);
  // Barb as CircleChat's Re-equip leaves her with CC_MCP_TOOLS on: CircleChat's own server, listed
  // in the cli toolsets.
  fs.writeFileSync(s.h("barb", "config.yaml"), `${config}platform_toolsets:\n  cli:\n    - hermes-cli\n    - mcp-circlechat\nmcp_servers:\n  circlechat:\n    command: node\n    args:\n      - /opt/data/circlechat-mcp.mjs\n    enabled: true\n`);
  fs.writeFileSync(s.h("loki", "config.yaml"), config);
  for (const a of ["betty", "barb", "loki"]) {
    const r = s.run("setup-agent.sh", a);
    assert.equal(r.status, 0, `${a}: ${r.stdout}${r.stderr}`);
  }
  const betty = fs.readFileSync(s.h("betty", "config.yaml"), "utf8");
  assert.match(betty, KNOWLEDGE_ENTRY);
  const barb = fs.readFileSync(s.h("barb", "config.yaml"), "utf8");
  assert.match(barb, KNOWLEDGE_ENTRY);
  assert.match(barb, /^mcp_servers:\n {2}circlechat:\n {4}command: node\n {4}args:\n {6}- \/opt\/data\/circlechat-mcp\.mjs\n {4}enabled: true\n/m, "CircleChat's own server stays");
  assert.match(barb, /^ {2}cli:\n {4}- hermes-cli\n {4}- mcp-circlechat\n {4}- mcp-recursica-knowledge\n/m);
  assert.doesNotMatch(fs.readFileSync(s.h("loki", "config.yaml"), "utf8"), /mcp_servers|recursica-knowledge/, "Loki has no tool servers");
  // A second run writes the entry, and the cli listing, once.
  for (const a of ["betty", "barb"]) assert.equal(s.run("setup-agent.sh", a).status, 0);
  for (const a of ["betty", "barb"]) {
    const again = fs.readFileSync(s.h(a, "config.yaml"), "utf8");
    assert.match(again, KNOWLEDGE_ENTRY, a);
    assert.equal(again.match(/^ {2}recursica-knowledge:$/gm).length, 1, a);
  }
  assert.equal(fs.readFileSync(s.h("barb", "config.yaml"), "utf8").match(/mcp-recursica-knowledge/g).length, 1);
});

test("setup-agent.sh refuses Betty's or Barb's symlinked config.yaml, and writes no server entry through the symlink", () => {
  for (const a of ["betty", "barb"]) {
    const s = sandbox([a]);
    fullSetup(s);
    s.put(path.join(s.kit, "portable/circlechat/agents/barb/SOUL.md"), "Persona of barb from the kit.\n");
    link(path.join(s.outside, "target.txt"), s.h(a, "config.yaml"));
    const before = snapshot(s.outside);
    const r = s.run("setup-agent.sh", a);
    assert.notEqual(r.status, 0, `${a}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout + r.stderr, /Refused: .* is a symlink/, a);
    assert.deepEqual(snapshot(s.outside), before, `${a}: no file outside changed`);
    assert.equal(fs.readFileSync(path.join(s.outside, "target.txt"), "utf8"), "outside\n");
    assert.ok(isLink(s.h(a, "config.yaml")), `${a}: the symlink is left as it was`);
  }
});

test("sync-skills.sh never runs git, and the agents' checkouts in the workspace stay as the agents left them", () => {
  const s = sandbox(["alan"]);
  const log = path.join(s.root, "git.log");
  fs.writeFileSync(path.join(s.bin, "git"), `#!/usr/bin/env bash\necho "git $*" >> "${log}"\nexit 0\n`, { mode: 0o755 });
  fs.mkdirSync(path.join(s.ws, "recursica-knowledge/.git"), { recursive: true });
  fs.mkdirSync(path.join(s.ws, "kb-proposals/.git"), { recursive: true });
  const r = s.run("sync-skills.sh");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(log), "no git command ran");
  assert.equal(fs.readFileSync(path.join(s.ws, "recursica-knowledge/skills/components/recursica-skill-button/SKILL.md"), "utf8"), "changed by an agent\n");
});

// Every git command in the kit's scripts, outside the tests: each one runs in the kit checkout or
// in CircleChat's own folder, or clones a missing checkout once. None runs in the workspace.
test("no kit script runs git in the workspace", () => {
  const files = fs.readdirSync(here, { recursive: true }).filter((f) => /\.(sh|mjs)$/.test(f) && !/\.test\.mjs$/.test(f) && !f.includes("node_modules"));
  const allowed = [
    /^clone_once\(\) \{ \[ -e "\$2" \] \|\| \[ -L "\$2" \] \|\| git clone "\$\{@:3\}" "\$1" "\$2"; \}$/,   // setup-host.sh: a missing checkout, once
    /execFileSync\("git", \["-C", ccDir, \.\.\.a\]/,                                                        // kit/upgrade.mjs: CircleChat's own folder
    /execFileSync\("git", \["-C", kit, \.\.\.a\]/,                                                          // kit/upgrade.mjs: the kit checkout
  ];
  const offenders = [];
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(here, f), "utf8").split("\n")) {
      const code = line.replace(/^\s*(#|\/\/).*$/, "").trim();
      if (!/(^|[\s;|&(`"'])git\s|"git"/.test(code)) continue;
      if (!allowed.some((re) => re.test(code))) offenders.push(`${f}: ${code}`);
    }
  }
  assert.deepEqual(offenders.filter((o) => /WS|workspace|kb-proposals|recursica-knowledge|\bws\b|\$K\b/.test(o)), [], "a git command names the workspace");
  assert.ok(!offenders.some((o) => o.startsWith("kit/upgrade.mjs")), offenders.join("\n"));
});

test("the Kev data push never publishes a file a symlink in the workspace names", () => {
  const s = sandbox([]);
  const secret = path.join(s.outside, "target.txt");
  s.put(path.join(s.cc, "site.json"), JSON.stringify({ repos: { knowledge: "https://github.com/acme/kb" }, data: { repo: "acme/kev-data" } }));
  const log = path.join(s.root, "git.log");
  // A stand-in for git that records every call. The push itself is tested in kit/kev-data.test.mjs.
  fs.writeFileSync(path.join(s.bin, "git"), `#!/usr/bin/env bash\necho "git $*" >> "${log}"\nexit 0\n`, { mode: 0o755 });
  const push = () => spawnSync("bash", [path.join(s.kit, "circlechat/kit/push-data.sh")], { env: { ...s.env, CC_DIR: s.cc, WS: s.ws, KEV_DATA_GITHUB_PAT: "ghp_test" }, encoding: "utf8", cwd: s.home });
  link(secret, path.join(s.ws, "reviews/kev-disagreements.md"));
  const r = push();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /Refused: .*kev-disagreements\.md is a symlink/);
  assert.ok(!fs.existsSync(log), "git never ran");
  // A symlinked reviews folder: refused the same way.
  fs.rmSync(path.join(s.ws, "reviews"), { recursive: true });
  link(path.join(s.outside, "dir"), path.join(s.ws, "reviews"));
  fs.writeFileSync(path.join(s.outside, "dir", "kev-disagreements.md"), "outside notes\n");
  assert.equal(push().status, 1);
  assert.ok(!fs.existsSync(log), "git never ran");
});
