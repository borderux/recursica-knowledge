// protect-repo.sh, run with a stand-in for gh that keeps each repo's settings in a file, and
// protect-repo.mjs's rulesets and dependabot.yml.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { RULESETS, dependabotYaml, ecosystems } from "./protect-repo.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const TOKEN = "tok-one-day-123";

test("finds each package system and its folders, and skips node_modules and hidden folders", () => {
  const list = ecosystems([
    "package.json", "package-lock.json", "web/package.json", "web/package-lock.json",
    "node_modules/x/package-lock.json", ".cache/y/package-lock.json",
    ".github/workflows/ci.yml", ".github/workflows/notes.md",
    "Dockerfile", "jobs/runner/Dockerfile", "tools/py/requirements.txt", "README.md",
  ]);
  assert.deepEqual(list, [
    { ecosystem: "docker", directories: ["/", "/jobs/runner"] },
    { ecosystem: "github-actions", directories: ["/"] },
    { ecosystem: "npm", directories: ["/", "/web"] },
    { ecosystem: "pip", directories: ["/tools/py"] },
  ]);
  assert.deepEqual(ecosystems(["lib/package.json"]), [{ ecosystem: "npm", directories: ["/lib"] }], "package.json with no lock file");
  assert.deepEqual(ecosystems(["README.md"]), []);
});

test("the dependabot.yml checks daily, with a 7-day cooldown and one group for each package system", () => {
  const yaml = dependabotYaml([{ ecosystem: "github-actions", directories: ["/"] }, { ecosystem: "npm", directories: ["/", "/web"] }]);
  assert.equal(yaml, `# Dependabot version updates: daily, with a 7-day cooldown, one pull request per package system.
# Security updates skip the cooldown.
version: 2
updates:
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: daily
    cooldown:
      default-days: 7
    groups:
      github-actions:
        patterns: ["*"]
  - package-ecosystem: npm
    directories:
      - "/"
      - "/web"
    schedule:
      interval: daily
    cooldown:
      default-days: 7
    groups:
      npm:
        patterns: ["*"]
`);
  assert.equal(dependabotYaml([]), "");
});

test("the two rulesets protect the default branch, and only a repo admin merges", () => {
  const pm = RULESETS["Protect main"], oam = RULESETS["Only admins merge"];
  for (const r of [pm, oam]) {
    assert.equal(r.enforcement, "active");
    assert.deepEqual(r.conditions.ref_name.include, ["~DEFAULT_BRANCH"]);
  }
  assert.deepEqual(pm.rules.map((x) => x.type), ["deletion", "non_fast_forward", "pull_request"]);
  assert.deepEqual(pm.bypass_actors, []);
  assert.deepEqual(oam.rules, [{ type: "update" }]);
  assert.deepEqual(oam.bypass_actors, [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "pull_request" }]);
});

// The stand-in for gh: each repo's settings in state.json, and each call in calls.jsonl.
const FAKE_GH = String.raw`#!/usr/bin/env node
const fs = require("fs"), { execFileSync } = require("child_process");
const dir = process.env.FAKE_GH_DIR, stateFile = dir + "/state.json";
const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const args = process.argv.slice(2);
fs.appendFileSync(dir + "/calls.jsonl", JSON.stringify({ args, token: process.env.GH_TOKEN, config: process.env.GH_CONFIG_DIR }) + "\n");
if (args[0] !== "api") process.exit(1);
let method = "GET", url = "", jq = null, silent = false, input = null; const fields = {};
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === "-X") method = args[++i];
  else if (a === "--jq") jq = args[++i];
  else if (a === "--silent") silent = true;
  else if (a === "--paginate") {}
  else if (a === "--input") { i++; input = JSON.parse(fs.readFileSync(0, "utf8")); }
  else if (a === "-f" || a === "-F") { const [k, ...v] = args[++i].split("="); let val = v.join("="); if (a === "-F") val = val === "true" ? true : val === "false" ? false : val; fields[k] = val; }
  else url = a;
}
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state));
const out = (body, code = 0) => {
  if (code) { process.stderr.write("gh: " + body.message + " (HTTP " + code + ")\n"); process.exit(1); }
  if (silent || body === undefined) process.exit(0);
  let text = JSON.stringify(body);
  if (jq) text = execFileSync("jq", ["-r", jq], { input: text, encoding: "utf8" }).replace(/\n$/, "");
  process.stdout.write(text + "\n"); process.exit(0);
};
if (url === "user") out({ login: "tester" });
const m = url.match(/^repos\/([^/]+\/[^/?]+)(\/[^?]*)?(\?.*)?$/);
if (!m) out({ message: "Not Found" }, 404);
const r = state.repos[m[1]]; const sub = m[2] ?? "";
if (!r) out({ message: "Not Found" }, 404);
if (r.refuse && r.refuse[method + " " + sub + (input?.security_and_analysis ? " security" : "")]) out({ message: r.refuse[method + " " + sub + (input?.security_and_analysis ? " security" : "")] }, 422);
const repoJson = () => ({ default_branch: r.default_branch, private: r.private, allow_forking: r.allow_forking, delete_branch_on_merge: r.delete_branch_on_merge, security_and_analysis: r.security_and_analysis });
if (sub === "" && method === "GET") out(repoJson());
if (sub === "" && method === "PATCH") {
  if (input?.security_and_analysis) r.security_and_analysis = { ...r.security_and_analysis, ...input.security_and_analysis };
  for (const k of ["allow_forking", "delete_branch_on_merge"]) if (k in fields) r[k] = fields[k];
  save(); out(repoJson());
}
if (sub === "/rulesets" && method === "GET") out(r.rulesets.map(({ id, name, enforcement }) => ({ id, name, enforcement })));
if (sub === "/rulesets" && method === "POST") { const id = 100 + r.rulesets.length; r.rulesets.push({ id, ...input }); save(); out({ id }); }
const rs = sub.match(/^\/rulesets\/(\d+)$/);
if (rs && method === "PUT") { const i = r.rulesets.findIndex((x) => x.id === Number(rs[1])); r.rulesets[i] = { id: r.rulesets[i].id, ...input }; save(); out({ id: r.rulesets[i].id }); }
if (sub === "/vulnerability-alerts") { if (method === "PUT") { r.alerts = true; save(); out(undefined); } out(r.alerts ? undefined : { message: "Not Found" }, r.alerts ? 0 : 404); }
if (sub === "/automated-security-fixes") { if (method === "PUT") { r.fixes = true; save(); out(undefined); } out({ enabled: r.fixes, paused: false }); }
if (sub === "/actions/permissions/workflow") { if (method === "PUT") { r.workflow = { ...fields }; save(); out(undefined); } out(r.workflow); }
if (sub === "/contents/.github/dependabot.yml" && method === "GET") out(r.dependabot ? { path: ".github/dependabot.yml" } : { message: "Not Found" }, r.dependabot ? 0 : 404);
if (sub === "/pulls" && method === "GET") out(r.pulls ?? []);
if (sub.startsWith("/git/trees/")) out({ tree: r.files.map((p) => ({ path: p, type: "blob" })) });
if (sub.startsWith("/git/ref/heads/")) out({ object: { sha: "abc123" } });
if (sub === "/git/refs" && method === "POST") { r.branches = [...(r.branches ?? []), fields.ref]; save(); out({ ref: fields.ref }); }
if (sub === "/contents/.github/dependabot.yml" && method === "PUT") { r.written = { ...fields, text: Buffer.from(fields.content, "base64").toString("utf8") }; save(); out({}); }
if (sub === "/pulls" && method === "POST") { r.pulls = [{ ...fields, html_url: "https://github.example/" + m[1] + "/pull/1" }]; save(); out(r.pulls[0]); }
out({ message: "Not Found" }, 404);
`;

function sandbox(repos) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "protect-"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "gh"), FAKE_GH, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({ repos }));
  fs.writeFileSync(path.join(dir, "calls.jsonl"), "");
  const run = (args, input = `${TOKEN}\n`) => spawnSync("bash", [path.join(here, "protect-repo.sh"), ...args], {
    input, encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_GH_DIR: dir, GH_TOKEN: "" },
  });
  const calls = () => fs.readFileSync(path.join(dir, "calls.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const state = () => JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8")).repos;
  return { run, calls, state };
}

const off = () => ({ secret_scanning: { status: "disabled" }, secret_scanning_push_protection: { status: "disabled" } });
const repos = () => ({
  "acme/app": { private: true, default_branch: "main", allow_forking: true, delete_branch_on_merge: false, security_and_analysis: off(),
    rulesets: [{ id: 7, name: "Protect Main", enforcement: "disabled" }], alerts: false, fixes: false,
    workflow: { default_workflow_permissions: "write", can_approve_pull_request_reviews: true },
    files: ["package.json", "package-lock.json", "web/package.json", "web/package-lock.json", ".github/workflows/ci.yml", "Dockerfile"] },
  "acme/site": { private: false, default_branch: "trunk", allow_forking: true, delete_branch_on_merge: false, security_and_analysis: off(),
    rulesets: [], alerts: false, fixes: false, workflow: { default_workflow_permissions: "write", can_approve_pull_request_reviews: false },
    files: ["README.md"], dependabot: true },
  "acme/other": { private: true, default_branch: "main", allow_forking: true, delete_branch_on_merge: false, security_and_analysis: off(),
    rulesets: [], alerts: false, fixes: false, workflow: { default_workflow_permissions: "write", can_approve_pull_request_reviews: true }, files: [] },
});

test("sets up each listed repo, reads each setting back, and changes no other repo", () => {
  const s = sandbox(repos());
  const r = s.run(["acme/app", "acme/site"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const st = s.state();
  const app = st["acme/app"];
  // The ruleset with the same name, in another case, is updated in place, and the other is added.
  assert.deepEqual(app.rulesets.map((x) => [x.id, x.name, x.enforcement]), [[7, "Protect main", "active"], [101, "Only admins merge", "active"]]);
  assert.deepEqual(app.security_and_analysis, { secret_scanning: { status: "enabled" }, secret_scanning_push_protection: { status: "enabled" } });
  assert.equal(app.alerts, true);
  assert.equal(app.fixes, true);
  assert.deepEqual(app.workflow, { default_workflow_permissions: "read", can_approve_pull_request_reviews: false });
  assert.equal(app.delete_branch_on_merge, true);
  assert.equal(app.allow_forking, false, "forking off in a private repo");
  // The dependabot.yml goes in a pull request, on a new branch.
  assert.deepEqual(app.branches, ["refs/heads/add-dependabot-config"]);
  assert.equal(app.written.branch, "add-dependabot-config");
  assert.equal(app.written.message, "Add dependabot.yml for docker, github-actions, npm");
  assert.match(app.written.text, /- package-ecosystem: npm\n {4}directories:\n {6}- "\/"\n {6}- "\/web"\n/);
  assert.deepEqual([app.pulls[0].head, app.pulls[0].base], ["add-dependabot-config", "main"]);
  // A public repo keeps GitHub's forking setting, and a repo with a dependabot.yml gets no pull request.
  const site = st["acme/site"];
  assert.equal(site.allow_forking, true);
  assert.equal(site.pulls, undefined);
  assert.deepEqual(site.rulesets.map((x) => x.name), ["Protect main", "Only admins merge"]);
  // The repo not on the command line is never called.
  assert.deepEqual(st["acme/other"], repos()["acme/other"]);
  const calls = s.calls();
  assert.ok(calls.every((c) => !c.args.join(" ").includes("acme/other")));
  const writes = calls.filter((c) => c.args.includes("-X") && c.args[c.args.indexOf("-X") + 1] !== "GET");
  assert.ok(writes.length > 10);
  assert.ok(writes.every((c) => /^repos\/acme\/(app|site)(\/|$)/.test(c.args.find((a) => a.startsWith("repos/")))), "each change names a listed repo");
  // The token: only in GH_TOKEN, never on a command line, with a gh settings folder of the script's own.
  assert.ok(calls.every((c) => c.token === TOKEN));
  assert.ok(calls.every((c) => !c.args.join(" ").includes(TOKEN)));
  assert.ok(calls.every((c) => c.config && c.config.startsWith(os.tmpdir()) && !fs.existsSync(c.config)), "the settings folder is gone after the run");
  assert.doesNotMatch(r.stdout, new RegExp(TOKEN));
  // The table: each setting, read back from GitHub.
  for (const line of [
    '| acme/app | Ruleset "Protect main" | active | ok |',
    '| acme/app | Ruleset "Only admins merge" | active | ok |',
    "| acme/app | Secret scanning | enabled | ok |",
    "| acme/app | Push protection | enabled | ok |",
    "| acme/app | Dependabot alerts | on | ok |",
    "| acme/app | Dependabot security updates | on | ok |",
    "| acme/app | Workflow token | read, approves pull requests: false | ok |",
    "| acme/app | Delete branch after merge | true | ok |",
    "| acme/app | Forking | off | ok |",
    "| acme/app | dependabot.yml | pull request opened: https://github.example/acme/app/pull/1 | ok |",
    "| acme/site | Forking | public repo: left as is (true) | n/a |",
    "| acme/site | dependabot.yml | already in the repo | ok |",
  ]) assert.ok(r.stdout.includes(line), `${line}\n${r.stdout}`);
  assert.match(r.stdout, /Every setting is in place\. Revoke the token now\./);
});

test("a second run changes nothing it doesn't need to, and reuses the open pull request", () => {
  const s = sandbox(repos());
  assert.equal(s.run(["acme/app"]).status, 0);
  const r = s.run(["acme/app"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const app = s.state()["acme/app"];
  assert.equal(app.rulesets.length, 2, "no second copy of a ruleset");
  assert.match(r.stdout, /\| acme\/app \| dependabot\.yml \| pull request open: https:\/\/github\.example\/acme\/app\/pull\/1 \| ok \|/);
});

test("a setting GitHub refuses shows as FAILED, and the run ends with an error", () => {
  const all = repos();
  all["acme/app"].refuse = { "PATCH  security": "Secret scanning is not available for this repository" };
  const s = sandbox(all);
  const r = s.run(["acme/app"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /secret scanning: gh: Secret scanning is not available for this repository/);
  assert.match(r.stdout, /\| acme\/app \| Secret scanning \| disabled \| FAILED \|/);
  assert.match(r.stdout, /\| acme\/app \| Delete branch after merge \| true \| ok \|/, "the other settings still go in");
  assert.match(r.stdout, /2 setting\(s\) failed\. Revoke the token now\./);
});

test("stops before any call on a bad repo name, and on no token", () => {
  const s = sandbox(repos());
  for (const args of [[], ["app"], ["acme/app", "acme/app;rm"]]) {
    const r = s.run(args);
    assert.equal(r.status, 2, args.join(" "));
  }
  assert.deepEqual(s.calls(), []);
  const r = s.run(["acme/app"], "\n");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /No token given\. Nothing was changed\./);
  assert.deepEqual(s.calls(), []);
});
