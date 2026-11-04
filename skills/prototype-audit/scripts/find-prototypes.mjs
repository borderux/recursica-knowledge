#!/usr/bin/env node
// Finds the prototypes an audit could be about, so the audit never scores the wrong
// one. Run it before anything else.
// Usage: node find-prototypes.mjs <any folder in the repo> [--out file.json]
//
// A prototype isn't always in the folder the audit starts from. Builders often work
// in a separate git worktree next to the repository (for example
// `<repo>-business-dashboard` on branch `prototype/business-dashboard`), and the
// prototype's files may not be committed yet. So this script:
//   1. lists every git worktree of the repository;
//   2. lists the prototypes in each one: every `src/routes/prototypes/<slug>/` folder,
//      or, in a repository that is one prototype, the worktree itself;
//   3. reads the Claude Code transcripts on this machine (main sessions and their
//      subagents) and finds the sessions that wrote files in each worktree, with
//      their title, so a person can recognise "Fixpoint PRD prototype";
//   4. gives each prototype the folders its build sessions wrote, as suggested
//      --include folders for measure.mjs and build-info.mjs.
// It only reads. On macOS and Windows paths are compared ignoring case.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
const start = path.resolve(args.find((a, i) => !a.startsWith("--") && i !== outIdx + 1) ?? ".");
const caseInsensitive = process.platform === "darwin" || process.platform === "win32";
const norm = (p) => (caseInsensitive ? p.toLowerCase() : p);
const projectsDir = path.join(process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"), "projects");
const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const PROTOTYPES_DIR = "src/routes/prototypes";

const git = (cwd, ...a) => {
  try {
    return execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

// 1. Worktrees.
const toplevel = git(start, "rev-parse", "--show-toplevel") ?? start;
const worktrees = [];
const porcelain = git(toplevel, "worktree", "list", "--porcelain");
if (porcelain) {
  let cur = null;
  for (const line of porcelain.split("\n")) {
    if (line.startsWith("worktree ")) worktrees.push((cur = { path: line.slice(9), branch: null, head: null }));
    else if (cur && line.startsWith("HEAD ")) cur.head = line.slice(5, 12);
    else if (cur && line.startsWith("branch ")) cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
  }
}
if (!worktrees.length) worktrees.push({ path: toplevel, branch: git(toplevel, "branch", "--show-current"), head: git(toplevel, "rev-parse", "--short", "HEAD") });

// 2. Prototypes in each worktree.
const prototypes = [];
for (const wt of worktrees) {
  const protoRoot = path.join(wt.path, PROTOTYPES_DIR);
  const folders = fs.existsSync(protoRoot)
    ? fs
        .readdirSync(protoRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(protoRoot, e.name, "index.tsx")))
        .map((e) => ({ slug: e.name, folder: `${PROTOTYPES_DIR}/${e.name}` }))
    : [{ slug: readName(wt.path), folder: null }];
  for (const { slug, folder } of folders) {
    const status = git(wt.path, "status", "--porcelain", "--untracked-files=all", "--", folder ?? ".") ?? "";
    const lastCommit = git(wt.path, "log", "-1", "--format=%h %ad %an: %s", "--date=short", "--", folder ?? ".");
    prototypes.push({
      slug,
      worktree: wt.path,
      branch: wt.branch,
      head: wt.head,
      startedHere: norm(wt.path) === norm(toplevel),
      folder,
      uncommittedFiles: status ? status.split("\n").length : 0,
      lastCommit: lastCommit || null,
      sessions: [],
      suggestedIncludes: [],
    });
  }
}

function readName(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).name ?? path.basename(dir);
  } catch {
    return path.basename(dir);
  }
}

// 3. Sessions that wrote files in any worktree.
function* records(file) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // a partly written last line; skip it
    }
  }
}

const wtPaths = worktrees.map((w) => w.path);
const sessions = [];
if (fs.existsSync(projectsDir)) {
  for (const proj of fs.readdirSync(projectsDir)) {
    const dir = path.join(projectsDir, proj);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jsonl"))) {
      const id = f.replace(/\.jsonl$/, "");
      const main = path.join(dir, f);
      const subDir = path.join(dir, id, "subagents");
      const subs = fs.existsSync(subDir) ? fs.readdirSync(subDir).filter((x) => x.endsWith(".jsonl")).map((x) => path.join(subDir, x)) : [];
      const all = [main, ...subs];
      // Cheap text check first, so most transcripts are never parsed.
      if (!all.some((p) => wtPaths.some((w) => norm(fs.readFileSync(p, "utf8")).includes(norm(w))))) continue;
      let title = null;
      let cwd = null;
      let firstAt = null;
      let lastWriteAt = null;
      const written = new Map(); // worktree -> Set of relative paths
      for (const p of all) {
        for (const rec of records(p)) {
          if (p === main && rec.type === "ai-title" && !title) title = rec.aiTitle ?? rec.title ?? null;
          if (p === main && rec.type === "custom-title") title = rec.customTitle ?? rec.title ?? title;
          if (p === main && !cwd && rec.cwd) cwd = rec.cwd;
          if (rec.timestamp && (!firstAt || rec.timestamp < firstAt)) firstAt = rec.timestamp;
          const content = rec?.message?.content;
          if (!Array.isArray(content)) continue;
          for (const t of content) {
            if (t?.type !== "tool_use" || !WRITE_TOOLS.has(t.name)) continue;
            const fp = t.input?.file_path ?? t.input?.notebook_path;
            if (typeof fp !== "string") continue;
            // The longest worktree path that contains the file, since worktrees can share a prefix.
            const wt = wtPaths.filter((w) => norm(fp).startsWith(norm(`${w}/`))).sort((a, b) => b.length - a.length)[0];
            if (!wt) continue;
            const rel = fp.slice(wt.length + 1);
            if (/^(audits|node_modules|dist)\//.test(rel)) continue;
            if (!written.has(wt)) written.set(wt, new Set());
            written.get(wt).add(rel);
            if (rec.timestamp && (!lastWriteAt || rec.timestamp > lastWriteAt)) lastWriteAt = rec.timestamp;
          }
        }
      }
      if (written.size) sessions.push({ id, title, cwd, firstAt, lastWriteAt, subagents: subs.length, written });
    }
  }
}

// 4. Match sessions to prototypes, and suggest the --include folders.
// A prototype's own folders: its screens' folder, and src/data/<name> or
// src/api/<name> folders its sessions wrote. Anything else is the shared shell.
const ownFolder = (rel) =>
  rel.match(/^(src\/routes\/prototypes\/[^/]+)\//)?.[1] ?? rel.match(/^(src\/(?:data|api|components)\/[^/]+)\//)?.[1] ?? null;
for (const proto of prototypes) {
  const includes = new Set();
  const shell = new Set();
  for (const s of sessions) {
    const files = s.written.get(proto.worktree);
    if (!files) continue;
    const mine = [...files].filter((r) => (proto.folder ? r.startsWith(`${proto.folder}/`) : true));
    if (!mine.length) continue;
    proto.sessions.push({ id: s.id, title: s.title, startedFrom: s.cwd, firstAt: s.firstAt, lastWriteAt: s.lastWriteAt, subagents: s.subagents, filesWritten: mine.length });
    if (!proto.folder) continue;
    for (const r of files) {
      const own = ownFolder(r);
      // Another prototype's screens aren't this prototype's, even if the same session wrote them.
      if (own && (!own.startsWith(`${PROTOTYPES_DIR}/`) || own === proto.folder)) includes.add(own);
      else if (!own) shell.add(r);
    }
  }
  if (proto.folder) {
    includes.add(proto.folder);
    proto.suggestedIncludes = [...includes].sort();
    proto.shellFilesWrittenByItsSessions = [...shell].sort();
  }
}

prototypes.sort((a, b) => (b.sessions.at(-1)?.lastWriteAt ?? "").localeCompare(a.sessions.at(-1)?.lastWriteAt ?? ""));
const builtInSessions = prototypes.filter((p) => p.sessions.length);
const result = {
  startedFrom: start,
  repository: toplevel,
  worktrees,
  transcriptsSearched: projectsDir,
  prototypes,
  summary: {
    prototypes: prototypes.length,
    withBuildSessions: builtInSessions.length,
    inOtherWorktrees: prototypes.filter((p) => !p.startedHere).length,
    note:
      builtInSessions.length === 1
        ? `One prototype has build sessions: ${builtInSessions[0].slug} in ${builtInSessions[0].worktree}.`
        : builtInSessions.length > 1
          ? "Several prototypes have build sessions: ask which one to audit."
          : "No prototype has build sessions on this machine: ask which one to audit.",
  },
};

const json = JSON.stringify(result, null, 2);
if (outFile) fs.writeFileSync(outFile, json + "\n");
console.log(json);
