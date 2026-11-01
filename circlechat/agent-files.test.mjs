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
  // Barb's limits and HERMES_TIMEOUT come from the real hermes.md (kit/barb-limits.mjs).
  put(path.join(kit, "agents/barb/runtime/hermes.md"), fs.readFileSync(path.join(here, "../agents/barb/runtime/hermes.md"), "utf8"));
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

// Hermes's own default config.yaml has a delegation block, with max_iterations and default_toolsets.
const hermesDefault = `${config}delegation:\n  max_iterations: 50\n  default_toolsets:\n    - terminal\n    - file\n    - web\nplatform_toolsets:\n  cli:\n    - hermes-cli\n`;
const BARB_LIMITS = /^delegation:\n {2}max_iterations: 50\n {2}default_toolsets:\n {4}- terminal\n {4}- file\n {4}- web\n {2}oneshot_max_children: 0\n {2}max_concurrent_children: 3\n/m;

test("setup-agent.sh barb sets her limits inside Hermes's default delegation block, gives her the Kev key from CircleChat's .env, and prints only whether HERMES_TIMEOUT is enough", () => {
  const s = sandbox(["barb"]);
  fullSetup(s);
  s.put(path.join(s.kit, "portable/circlechat/agents/barb/SOUL.md"), "Persona of barb from the kit.\n");
  fs.writeFileSync(s.h("barb", "config.yaml"), hermesDefault);
  fs.writeFileSync(path.join(s.cc, ".env"), "JOBD_TOKEN=t\nCC_HERMES_IMAGE=nousresearch/hermes-agent@sha256:0123abcd\nKEV_ENGINE_KEY=kev-secret-1\nHERMES_TIMEOUT=1200\nSLACK_BOT_TOKEN=xoxb-secret\n");
  const r = s.run("setup-agent.sh", "barb");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const cfg = fs.readFileSync(s.h("barb", "config.yaml"), "utf8");
  assert.match(cfg, BARB_LIMITS, "the limits go inside the existing block, which keeps default_toolsets");
  assert.match(cfg, /^tool_loop_guardrails:\n {2}loop_caps:\n {4}max_subagents: 150$/m);
  assert.equal(cfg.match(/^delegation:/gm).length, 1);
  assert.doesNotMatch(r.stdout + r.stderr, /already has delegation/);
  assert.match(fs.readFileSync(s.h("barb", ".env"), "utf8"), /^KEV_ENGINE_KEY=kev-secret-1$/m);
  const out = r.stdout + r.stderr;
  assert.match(out, /^HERMES_TIMEOUT should be 4000 or more \(agents\/barb\/runtime\/hermes\.md\)\.$/m);
  for (const secret of ["kev-secret-1", "xoxb-secret", "1200"]) assert.ok(!out.includes(secret), `the output never shows ${secret}`);
  // A second run changes nothing, and an enough HERMES_TIMEOUT prints only "HERMES_TIMEOUT ok".
  fs.writeFileSync(path.join(s.cc, ".env"), "JOBD_TOKEN=t\nCC_HERMES_IMAGE=nousresearch/hermes-agent@sha256:0123abcd\nKEV_ENGINE_KEY=kev-secret-1\nHERMES_TIMEOUT=4000\n");
  const again = s.run("setup-agent.sh", "barb");
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.equal(fs.readFileSync(s.h("barb", "config.yaml"), "utf8"), cfg);
  assert.match(again.stdout, /^HERMES_TIMEOUT ok$/m);
  assert.doesNotMatch(again.stdout + again.stderr, /Barb's config\.yaml:/, "no limit changed");
});

// Hermes's own default blocks for the model catalog, update checks and plugins
// (hermes_cli/config_defaults.py).
const hermesLookups = `model_catalog:\n  enabled: true\n  url: https://hermes-agent.nousresearch.com/docs/api/model-catalog.json\n  ttl_minutes: 20\n  providers: {}\nupdates:\n  check: true\n  pre_update_backup: quick\nplugins:\n  clone_timeout_seconds: 300\n  auto_update_check_hours: 24\n  auto_apply: false\n`;

test("setup-agent.sh turns off Hermes's model-catalog refresh and update checks for every agent, keeps every other key, and a second run changes nothing", () => {
  const s = sandbox(["loki", "betty", "barb"]);
  fullSetup(s);
  s.put(path.join(s.kit, "portable/circlechat/agents/barb/SOUL.md"), "Persona of barb from the kit.\n");
  fs.writeFileSync(s.h("loki", "config.yaml"), `${config}${hermesLookups}`);
  fs.writeFileSync(s.h("betty", "config.yaml"), config);
  fs.writeFileSync(s.h("barb", "config.yaml"), hermesDefault);
  const first = {};
  for (const a of ["loki", "betty", "barb"]) {
    const r = s.run("setup-agent.sh", a);
    assert.equal(r.status, 0, `${a}: ${r.stdout}${r.stderr}`);
    for (const key of ["model_catalog.enabled", "updates.check", "plugins.auto_update_check_hours"]) {
      assert.match(r.stderr, new RegExp(`^${a}'s config\\.yaml: set ${key.replace(/\./g, "\\.")}$`, "m"), `${a}: ${key}`);
    }
    first[a] = fs.readFileSync(s.h(a, "config.yaml"), "utf8");
    assert.match(first[a], /^model_catalog:\n(?: {2}.*\n)*? {2}enabled: false$/m, a);
    assert.match(first[a], /^updates:\n(?: {2}.*\n)*? {2}check: false$/m, a);
    assert.match(first[a], /^plugins:\n(?: {2}.*\n)*? {2}auto_update_check_hours: 0$/m, a);
    for (const top of ["model_catalog", "updates", "plugins"]) assert.equal(first[a].match(new RegExp(`^${top}:`, "gm")).length, 1, `${a}: one ${top} block`);
  }
  // Hermes's default blocks keep their other keys, in place.
  assert.match(first.loki, /^model_catalog:\n {2}enabled: false\n {2}url: https:\/\/hermes-agent\.nousresearch\.com\/docs\/api\/model-catalog\.json\n {2}ttl_minutes: 20\n {2}providers: \{\}\nupdates:\n {2}check: false\n {2}pre_update_backup: quick\nplugins:\n {2}clone_timeout_seconds: 300\n {2}auto_update_check_hours: 0\n {2}auto_apply: false\n/m);
  assert.match(first.loki, /^ {2}reasoning_effort: medium$/m);
  assert.match(first.betty, KNOWLEDGE_ENTRY, "Betty keeps her knowledge server");
  assert.match(first.barb, BARB_LIMITS, "Barb keeps her limits");
  // A second run changes none of the three blocks and prints no change. (The gateway step may move
  // Loki's context_length within its own block, which is not this step's.)
  const blocks = (text) => ["model_catalog", "updates", "plugins"].map((top) => new RegExp(`^${top}:\n(?: {2}.*\n)*`, "m").exec(text)[0]);
  for (const a of ["loki", "betty", "barb"]) {
    const again = s.run("setup-agent.sh", a);
    assert.equal(again.status, 0, `${a}: ${again.stdout}${again.stderr}`);
    assert.deepEqual(blocks(fs.readFileSync(s.h(a, "config.yaml"), "utf8")), blocks(first[a]), a);
    assert.doesNotMatch(again.stdout + again.stderr, /config\.yaml: set /, a);
  }
  assert.equal(fs.readFileSync(s.h("betty", "config.yaml"), "utf8"), first.betty, "Betty's whole config is the same");
  assert.equal(fs.readFileSync(s.h("barb", "config.yaml"), "utf8"), first.barb, "Barb's whole config is the same");
});

test("setup-agent.sh refuses a model_catalog block under another key, where Hermes ignores it, and adds no block", () => {
  const s = sandbox(["loki"]);
  fullSetup(s);
  fs.writeFileSync(s.h("loki", "config.yaml"), config.replace("  reasoning_effort: high\n", "  reasoning_effort: medium\n  model_catalog:\n    enabled: false\n"));
  const r = s.run("setup-agent.sh", "loki");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /model_catalog under another key, at line \d+, where Hermes ignores it/);
  const cfg = fs.readFileSync(s.h("loki", "config.yaml"), "utf8");
  assert.match(cfg, /^ {2}model_catalog:\n {4}enabled: false$/m, "the config keeps its text");
  assert.doesNotMatch(cfg, /^(model_catalog|updates|plugins):/m, "no block was added");
  assert.equal(turns(s).length, 0, "no test turn ran");
});

// An agent's file tools could write only inside the agent's home (the Hermes image sets
// HERMES_WRITE_SAFE_ROOT=/opt/data). Asked to build a page in the shared workspace, an agent's
// write_file calls were refused four times; it wrote the page inside its own home and reported it
// done, while the preview stayed blank.
test("setup-agent.sh lets each agent's file tools write to the shared workspace, once, and keeps the rest of the .env", () => {
  const s = sandbox(["betty"]);
  fullSetup(s);
  fs.writeFileSync(s.h("betty", "config.yaml"), hermesDefault);
  fs.writeFileSync(s.h("betty", ".env"), "BETTY_GITHUB_TOKEN=ghs_stand_in\nHERMES_WRITE_SAFE_ROOT=/opt/data\n");
  for (let i = 0; i < 2; i++) {
    const r = s.run("setup-agent.sh", "betty");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const env = fs.readFileSync(s.h("betty", ".env"), "utf8");
    assert.deepEqual(env.match(/^HERMES_WRITE_SAFE_ROOT=.*$/gm), ["HERMES_WRITE_SAFE_ROOT=/opt/data:/workspace"], `run ${i + 1}`);
    assert.match(env, /^BETTY_GITHUB_TOKEN=ghs_stand_in$/m);
    assert.ok(!(r.stdout + r.stderr).includes("ghs_stand_in"), "the output never shows the token");
  }
  assert.equal(fs.statSync(s.h("betty", ".env")).mode & 0o777, 0o600);
});

test("setup-agent.sh leaves the write root alone on a stack with no shared workspace", () => {
  const s = sandbox(["betty"]);
  fullSetup(s);
  fs.writeFileSync(s.h("betty", "config.yaml"), hermesDefault);
  s.env.WS = path.join(s.home, "no-workspace-here");
  const r = s.run("setup-agent.sh", "betty");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const env = fs.existsSync(s.h("betty", ".env")) ? fs.readFileSync(s.h("betty", ".env"), "utf8") : "";
  assert.doesNotMatch(env, /HERMES_WRITE_SAFE_ROOT/);
});

test("setup-agent.sh barb takes a Kev key given on the command line over CircleChat's .env, and says when there is none", () => {
  const s = sandbox(["barb"]);
  fullSetup(s);
  s.put(path.join(s.kit, "portable/circlechat/agents/barb/SOUL.md"), "Persona of barb from the kit.\n");
  fs.writeFileSync(s.h("barb", "config.yaml"), hermesDefault);
  const none = s.run("setup-agent.sh", "barb");
  assert.equal(none.status, 0, none.stdout + none.stderr);
  assert.match(none.stdout, /No KEV_ENGINE_KEY in .*\.env: Barb's Kev pass fails/);
  assert.match(none.stdout, /^HERMES_TIMEOUT should be 4000 or more/m, "a missing HERMES_TIMEOUT is not enough");
  assert.doesNotMatch(fs.existsSync(s.h("barb", ".env")) ? fs.readFileSync(s.h("barb", ".env"), "utf8") : "", /KEV_ENGINE_KEY/);
  fs.appendFileSync(path.join(s.cc, ".env"), "KEV_ENGINE_KEY=from-env-file\n");
  s.env.KEV_ENGINE_KEY = "given";
  const given = s.run("setup-agent.sh", "barb");
  assert.equal(given.status, 0, given.stdout + given.stderr);
  assert.match(fs.readFileSync(s.h("barb", ".env"), "utf8"), /^KEV_ENGINE_KEY=given$/m);
  assert.ok(!(given.stdout + given.stderr).includes("given\n") && !(given.stdout + given.stderr).includes("from-env-file"));
});

test("setup-agent.sh barb refuses tool_loop_guardrails under agent:, where Hermes ignores it, and writes nothing", () => {
  const s = sandbox(["barb"]);
  fullSetup(s);
  s.put(path.join(s.kit, "portable/circlechat/agents/barb/SOUL.md"), "Persona of barb from the kit.\n");
  const wrong = `model:\n  default: x\nagent:\n  reasoning_effort: high\n  tool_loop_guardrails:\n    loop_caps:\n      max_subagents: 150\ncustom_providers: []\n`;
  fs.writeFileSync(s.h("barb", "config.yaml"), wrong);
  const r = s.run("setup-agent.sh", "barb");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /tool_loop_guardrails under another key, at line \d+, where Hermes ignores it/);
  assert.match(fs.readFileSync(s.h("barb", "config.yaml"), "utf8"), /^ {2}tool_loop_guardrails:$/m, "the config keeps its text");
  assert.doesNotMatch(fs.readFileSync(s.h("barb", "config.yaml"), "utf8"), /^delegation:/m);
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
