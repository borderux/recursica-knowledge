// INSTALL.md stays in step with the kit: every setting the config check reads, and every file the
// guide names, must match.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(here, "..");
const guide = fs.readFileSync(path.join(here, "INSTALL.md"), "utf8");
const example = JSON.parse(fs.readFileSync(path.join(here, "site.example.json"), "utf8"));
const render = fs.readFileSync(path.join(here, "kit/render.mjs"), "utf8");

test("every setting in site.example.json and in the config check appears in INSTALL.md", () => {
  const names = new Set(Object.keys(example).filter((k) => !["$comment", "site", "repos"].includes(k)));
  for (const k of Object.keys(example.site)) names.add(`site.${k}`);
  for (const k of Object.keys(example.repos)) names.add(`repos.${k}`);
  for (const m of render.matchAll(/\bsite\.site\?\.([a-z_]+)/g)) names.add(`site.${m[1]}`);
  for (const m of render.matchAll(/\bt\.([a-z_]+)\b/g)) if (/^(tenant|kind|docker_context|port|preview_port|gateway_port|cloud_models|slack_channel_id|proxy)$/.test(m[1])) names.add(`site.${m[1]}`);
  for (const m of render.matchAll(/\bsite\.(backup|security|egress|privacy|git|upgrade)\b/g)) names.add(m[1]);
  for (const m of render.matchAll(/\bsite\.repos\?\.([a-z_]+)/g)) names.add(`repos.${m[1]}`);
  const missing = [...names].filter((n) => !guide.includes(`\`${n}\``));
  assert.deepEqual(missing, [], `INSTALL.md is missing: ${missing.join(", ")}`);
});

test("every circlechat/ file INSTALL.md names exists", () => {
  const files = [...guide.matchAll(/`(circlechat\/[A-Za-z0-9_./-]+)`/g)].map((m) => m[1]);
  const missing = files.filter((f) => !fs.existsSync(path.join(root, f)));
  assert.deepEqual(missing, [], `INSTALL.md names files that do not exist: ${missing.join(", ")}`);
});

test("no kit file is ignored by git, so every file the docs name ships in the repo", () => {
  const r = spawnSync("git", ["status", "--ignored", "--porcelain", "circlechat", ".github"], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return;   // not a git checkout, such as an unpacked release
  const ignored = r.stdout.split("\n").filter((l) => l.startsWith("!! ") && !l.includes("node_modules"));
  assert.deepEqual(ignored, [], `git ignores kit files: ${ignored.join(", ")}`);
});
