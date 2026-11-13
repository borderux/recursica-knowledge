#!/usr/bin/env node
// Checks whether a prototype builds, for the "It builds" dimension of the rubric.
// Usage: node build-check.mjs <repo-root> [--out file.json]
//
// Runs the repo's own `npm run typecheck`, `npm run build` and `npm run dev` (for up
// to 30 seconds, to see whether the dev server starts). Each check is scored 1 (yes)
// or 0 (no).
//
// Everything runs in a temporary copy of the repo, never in the repo itself, because
// some build scripts change source files (for example `prettier --write` or
// `eslint --fix` before compiling). The copy links to the repo's node_modules and
// leaves out .git, dist and audits. Files the build changed in the copy are listed
// under buildChangedFiles, and the copy is deleted afterwards.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const repo = path.resolve(args.find((a, i) => !a.startsWith("--") && (outIdx < 0 || i !== outIdx + 1)) ?? ".");

// Folder names never copied, at any depth, and folders left out only at the top.
const SKIP_ANYWHERE = new Set(["node_modules", ".git", "dist"]);
const SKIP_AT_TOP = new Set(["audits"]);
let root = repo;

function makeCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prototype-audit-build-"));
  fs.cpSync(repo, dir, {
    recursive: true,
    filter: (src) => {
      const relPath = path.relative(repo, src);
      if (!relPath) return true;
      const parts = relPath.split(path.sep);
      if (parts.some((p) => SKIP_ANYWHERE.has(p))) return false;
      return !(parts.length === 1 && SKIP_AT_TOP.has(parts[0]));
    },
  });
  fs.symlinkSync(path.join(repo, "node_modules"), path.join(dir, "node_modules"), "dir");
  return dir;
}

// Files in the copy that differ from the repo after the build, or are new.
function changedFiles(copy) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_ANYWHERE.has(e.name) || e.name.endsWith(".tsbuildinfo")) continue;
      const p = path.join(dir, e.name);
      const relPath = path.relative(copy, p);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const original = path.join(repo, relPath);
        if (!fs.existsSync(original)) out.push({ file: relPath, change: "added" });
        else if (!fs.readFileSync(original).equals(fs.readFileSync(p))) out.push({ file: relPath, change: "changed" });
      }
    }
  };
  walk(copy);
  return out;
}

// A warning is a line that starts with a warning marker: Vite's "(!)", or "warning",
// "WARN" or "[warn]". Lines that only mention the word, such as a warning's advice
// on how to silence it, are not counted again.
const WARNING_RE = /^\s*(\(!\)|warn(ing)?\b|\[warn(ing)?\])/i;
const NOT_A_WARNING_RE = /\b0 warnings?\b|no warnings?/i;

function run(script) {
  const started = Date.now();
  const r = spawnSync("npm", ["run", script], { cwd: root, encoding: "utf8", timeout: 5 * 60 * 1000 });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  return {
    command: `npm run ${script}`,
    exitCode: r.status,
    seconds: Math.round((Date.now() - started) / 1000),
    warnings: output.split("\n").filter((l) => WARNING_RE.test(l) && !NOT_A_WARNING_RE.test(l)).map((l) => l.trim()),
    outputTail: output.split("\n").slice(-30).join("\n"),
  };
}

function devServerStarts() {
  return new Promise((resolve) => {
    const child = spawn("npm", ["run", "dev"], { cwd: root, detached: true });
    let output = "";
    const finish = (ok) => {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // already exited
      }
      resolve({ starts: ok, outputTail: output.split("\n").slice(-15).join("\n") });
    };
    const timer = setTimeout(() => finish(false), 30_000);
    const onData = (d) => {
      output += d;
      if (/Local:|ready in|listening on|started server/i.test(output)) {
        clearTimeout(timer);
        finish(true);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", () => {
      clearTimeout(timer);
      finish(false);
    });
  });
}

const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};
const bit = (ok) => (ok ? 1 : 0);
const result = {
  prototype: repo,
  ranInCopy: true,
  checks: null,
  runs: [],
  devServer: null,
  // Source files the build would have changed in the repo. Not scored.
  buildChangedFiles: [],
  notScoredReason: null,
};

if (!fs.existsSync(path.join(repo, "node_modules"))) {
  result.notScoredReason = "node_modules is missing. Run `npm install` in the repo, then run this again.";
} else {
  root = makeCopy();
  try {
    const missing = (script) => ({ command: `npm run ${script}`, exitCode: null, warnings: [], outputTail: `There is no ${script} script in package.json.` });
    const typecheck = scripts.typecheck ? run("typecheck") : missing("typecheck");
    const build = scripts.build ? run("build") : missing("build");
    result.runs.push(typecheck, build);
    result.devServer = scripts.dev ? await devServerStarts() : { starts: false, outputTail: "There is no dev script in package.json." };
    result.checks = {
      typecheckPasses: bit(typecheck.exitCode === 0),
      buildPasses: bit(build.exitCode === 0),
      noWarnings: bit(result.runs.every((r) => r.exitCode !== null && r.warnings.length === 0)),
      devServerStarts: bit(result.devServer.starts),
    };
    result.buildChangedFiles = changedFiles(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const json = JSON.stringify(result, null, 2);
if (outFile) fs.writeFileSync(outFile, json);
else process.stdout.write(`${json}\n`);
