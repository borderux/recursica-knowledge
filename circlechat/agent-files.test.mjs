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
  const ws = path.join(home, "circlechat-workspace"), cc = path.join(home, "circlechat");
  // The workspace's own checkout, which an agent changed: never a source.
  put(path.join(ws, "recursica-knowledge/skills/components/recursica-skill-button/SKILL.md"), "changed by an agent\n");
  put(path.join(ws, "recursica-knowledge/portable/circlechat/agents/alan/SOUL.md"), "persona changed by an agent\n");
  fs.mkdirSync(path.join(ws, "kev"), { recursive: true });
  for (const a of agents) fs.mkdirSync(path.join(cc, `hermes-homes/.hermes-${a}`), { recursive: true });
  put(path.join(outside, "target.txt"), "outside\n");
  fs.mkdirSync(path.join(outside, "dir"));
  put(path.join(outside, "dir/keep.txt"), "outside folder\n");
  fs.chmodSync(path.join(outside, "target.txt"), 0o600);
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  const env = { ...process.env, HOME: home, OWNER: me, OWNER_HOME: home, NO_PULL: "1", PATH: `${bin}:${process.env.PATH}` };
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

// setup-agent.sh without --sync: a stand-in for sudo runs each command as this account, and the
// stack's kit-out comes from the example site.json.
function fullSetup(s) {
  fs.writeFileSync(path.join(s.bin, "sudo"), `#!/usr/bin/env bash\nexec "$@"\n`, { mode: 0o755 });
  const r = spawnSync(process.execPath, [path.join(s.kit, "circlechat/kit/render.mjs"), path.join(s.kit, "circlechat/site.example.json"), path.join(s.cc, "kit-out")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  fs.mkdirSync(path.join(s.cc, "gateway-state"), { recursive: true });
  fs.writeFileSync(path.join(s.cc, ".env"), "JOBD_TOKEN=t\n");
  fs.mkdirSync(path.join(s.ws, "loki"), { recursive: true });
}
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

test("setup-agent.sh replaces a symlinked backup, and its chmod leaves the file a symlink names alone", () => {
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
  assert.equal(fs.statSync(s.h("loki", "config.yaml")).mode & 0o777, 0o777);
});
