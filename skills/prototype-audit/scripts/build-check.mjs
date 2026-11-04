#!/usr/bin/env node
// Checks whether a prototype builds, for the "It builds" dimension of the rubric.
// Usage: node build-check.mjs <prototype-root> [--out file.json]
//
// Runs the prototype's own `npm run typecheck`, `npm run build` and `npm run dev`
// (for up to 30 seconds, to see whether the dev server starts). Each check is scored
// 1 (yes) or 0 (no). The build writes to dist/, which prototypes ignore in git. It
// changes no source file.

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const root = path.resolve(args.find((a, i) => !a.startsWith("--") && (outIdx < 0 || i !== outIdx + 1)) ?? ".");

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

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};
const bit = (ok) => (ok ? 1 : 0);
const result = { prototype: root, checks: null, runs: [], devServer: null, notScoredReason: null };

if (!fs.existsSync(path.join(root, "node_modules"))) {
  result.notScoredReason = "node_modules is missing. Run `npm install` in the prototype, then run this again.";
} else {
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
}

const json = JSON.stringify(result, null, 2);
if (outFile) fs.writeFileSync(outFile, json);
else process.stdout.write(`${json}\n`);
