// rc-skills.mjs: which of a Hermes agent's bundled skills go, from its kit settings. The skill
// names below are Hermes's own bundled ones and invented agents' own; no real agent is named.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { allowedSkills, hermesVolume, manifestNames, plan, toRemove, ESSENTIAL } from "./rc-skills.mjs";

const MANIFEST = ["apple-notes:3f2a", "email-triage:9b1c", "github:77aa", "hermes-agent:0001", "obsidian:5e5e", "ascii-video:c0de"].join("\n") + "\n";
const FILES = [
  "./apple/apple-notes/SKILL.md",
  "./email/email-triage/SKILL.md",
  "./software-development/github/SKILL.md",
  "./hermes-agent/SKILL.md",
  "./note-taking/obsidian/SKILL.md",
  "./creative/ascii-video/SKILL.md",
  "./synthetic-interview-transcripts/SKILL.md",
];

test("every bundled skill goes but the ones the settings name and Hermes's essential one; a learned skill stays", () => {
  assert.deepEqual(toRemove(MANIFEST, FILES, []), ["./apple/apple-notes", "./creative/ascii-video", "./email/email-triage", "./note-taking/obsidian", "./software-development/github"]);
  assert.deepEqual(toRemove(MANIFEST, FILES, ["github"]), ["./apple/apple-notes", "./creative/ascii-video", "./email/email-triage", "./note-taking/obsidian"]);
  assert.ok(!toRemove(MANIFEST, FILES, []).some((d) => d.endsWith("/synthetic-interview-transcripts")), "not bundled: the agent's own");
  assert.ok(ESSENTIAL.has("hermes-agent"));
  assert.ok(!toRemove(MANIFEST, FILES, []).includes("./hermes-agent"), "Hermes never lets it be disabled");
  // nothing left to remove: nothing to do
  assert.deepEqual(toRemove(MANIFEST, ["./hermes-agent/SKILL.md", "./synthetic-interview-transcripts/SKILL.md"], []), []);
});

test("a path that isn't a plain path to a SKILL.md inside the skills folder is never removed", () => {
  const bad = ["../outside/apple-notes/SKILL.md", "./apple/../../apple-notes/SKILL.md", "/abs/apple-notes/SKILL.md", "./apple notes/SKILL.md", "./apple-notes/README.md", "./$(rm)/apple-notes/SKILL.md"];
  assert.deepEqual(toRemove(MANIFEST, bad, []), []);
});

test("the manifest: name:hash lines, and Hermes's older plain names", () => {
  assert.deepEqual([...manifestNames("github:77aa\nobsidian\n\n  email-triage:9b1c  \nBad Name:1\n")].sort(), ["email-triage", "github", "obsidian"]);
});

test("an agent's allowed skills: none by default, a checked list when set", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rc-skills-"));
  const write = (handle, json) => {
    fs.mkdirSync(path.join(root, "agents", handle, "runtime"), { recursive: true });
    fs.writeFileSync(path.join(root, "agents", handle, "runtime", "recursicachat.json"), JSON.stringify(json));
  };
  write("writer", { autonomy: "ask", sandbox: "docker" });
  write("designer", { autonomy: "ask", sandbox: "docker", skills: ["github"] });
  write("broken", { autonomy: "ask", sandbox: "docker", skills: ["../x"] });
  assert.deepEqual(allowedSkills("writer", root), []);
  assert.deepEqual(allowedSkills("designer", root), ["github"]);
  assert.deepEqual(allowedSkills("missing", root), []);
  assert.throws(() => allowedSkills("broken", root), /"skills" must be a list of skill names/);
});

test("the volume is named after the agent's id, as the server names it", () => {
  assert.equal(hermesVolume("a_Xy7Example_1"), "cc-axy7example1-hermes");
});

test("the plan: each of the site's RecursicaChat agents that runs Hermes in a Docker sandbox, read-only from the server's database", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rc-skills-"));
  const dbFile = path.join(root, "circlechat.db");
  const db = new DatabaseSync(dbFile);
  db.exec("CREATE TABLE agents (id TEXT PRIMARY KEY, handle TEXT, engine TEXT, sandbox TEXT, archived INTEGER NOT NULL DEFAULT 0)");
  db.exec(`INSERT INTO agents VALUES ('a_Writer1', 'writer', 'hermes', 'docker', 0), ('a_Local2', 'designer', 'hermes', 'local', 0),
    ('a_Codex3', 'coder', 'codex', 'docker', 0), ('a_Old4', 'old', 'hermes', 'docker', 1), ('a_Other5', 'other', 'hermes', 'docker', 0)`);
  db.close();
  const before = fs.readFileSync(dbFile);
  const site = path.join(root, "site.json");
  fs.writeFileSync(site, JSON.stringify({ agents: { writer: { recursicachat: { model: "local" } }, designer: { recursicachat: { model: "local" } }, coder: { recursicachat: { model: "local" } }, old: { recursicachat: { model: "local" } }, other: {} } }));
  fs.mkdirSync(path.join(root, "agents", "writer", "runtime"), { recursive: true });
  fs.writeFileSync(path.join(root, "agents", "writer", "runtime", "recursicachat.json"), JSON.stringify({ autonomy: "ask", sandbox: "docker", skills: ["github"] }));
  assert.deepEqual(await plan(dbFile, site, root), [{ handle: "writer", volume: "cc-awriter1-hermes", allowed: ["github"] }]);
  assert.deepEqual(fs.readFileSync(dbFile), before, "read-only");
});
