#!/usr/bin/env node
// Summarises how a prototype was built, from the Claude Code session transcripts on
// this machine: tokens, time, models, MCP servers, skills and agents. Not scored.
// Usage: node build-info.mjs <repo-root> [--include <folder>]... [--out file.json]
//
// A "build session" is any session (or one of its subagents) that wrote or edited a
// file inside the prototype, outside audits/. The prototype is the --include folders
// (relative to the repo root, repeat the flag for each), or the whole repo root if
// none is given. On macOS and Windows paths are compared ignoring case, because the
// same folder can appear in transcripts as ~/Developer and ~/developer. Transcripts live in
// ~/.claude/projects (or $CLAUDE_CONFIG_DIR/projects). Claude Code deletes old
// transcripts after a while (30 days by default), so run this soon after the build.
//
// Measuring stops where the audit starts. If the prototype-audit skill was started in
// a build session, everything from the prompt that started it onwards (time, tokens,
// prompts, MCP calls, skills, agents and design reviews) is left out, so the audit
// isn't counted as part of the build. What was left out is reported under
// leftOutAfterAudit.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const FLAGS_WITH_VALUE = new Set(["--out", "--include"]);
const flagValues = (flag) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));
const outFile = flagValues("--out")[0] ?? null;
const root = path.resolve(args.find((a, i) => !a.startsWith("--") && !FLAGS_WITH_VALUE.has(args[i - 1])) ?? ".");
const include = flagValues("--include").map((d) => path.resolve(root, d));
// The folders that make up the prototype, as absolute paths.
const prototypeDirs = include.length ? include : [root];
const caseInsensitive = process.platform === "darwin" || process.platform === "win32";
const norm = (p) => (caseInsensitive ? p.toLowerCase() : p);
const projectsDir = path.join(process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude"), "projects");

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
// A break longer than this starts a new work period. Active time is the length of
// all work periods added up, so a session reopened days later isn't counted as days.
const PERIOD_GAP_MINUTES = 30;

const inPrototype = (p) => {
  if (typeof p !== "string") return false;
  const f = norm(p);
  if (f.startsWith(norm(`${root}/audits/`))) return false;
  return prototypeDirs.some((d) => f.startsWith(norm(`${d}/`)) && !f.startsWith(norm(`${d}/audits/`)));
};

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

function toolUses(rec) {
  const content = rec?.message?.content;
  return Array.isArray(content) ? content.filter((c) => c && c.type === "tool_use") : [];
}

// Signs that the prototype-audit skill started: its slash command, the skill being
// loaded, the Skill tool, or one of its scripts being run.
const AUDIT_TEXT = /<command-name>\/?(?:[\w-]+:)?prototype-audit<\/command-name>|Base directory for this skill: \S*prototype-audit\b/;
function startsAudit(rec) {
  const c = rec?.message?.content;
  const texts = typeof c === "string" ? [c] : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text) : [];
  if (rec.type === "user" && texts.some((t) => AUDIT_TEXT.test(t))) return true;
  return toolUses(rec).some(
    (t) =>
      (t.name === "Skill" && /(^|:)prototype-audit$/.test(t.input?.skill ?? "")) ||
      (t.name === "Bash" && /prototype-audit\/scripts\//.test(t.input?.command ?? "")),
  );
}

// When measuring stops in a session: the person's prompt that started the audit, or
// the first sign of the audit if no prompt came just before it. Null if no audit ran.
function auditCutoff(files) {
  let cutoff = null;
  for (const p of [files.main, ...files.subs]) {
    let lastPrompt = null;
    for (const rec of records(p)) {
      if (!rec.timestamp) continue;
      const at = Date.parse(rec.timestamp);
      if (startsAudit(rec)) {
        const start = lastPrompt ?? at;
        if (cutoff === null || start < cutoff) cutoff = start;
        break;
      }
      if (p === files.main && promptText(rec)) lastPrompt = at;
      else if (rec.type === "assistant") lastPrompt = null;
    }
  }
  return cutoff;
}

function sessionFiles(dir, id) {
  const main = path.join(dir, `${id}.jsonl`);
  const subDir = path.join(dir, id, "subagents");
  const subs = fs.existsSync(subDir) ? fs.readdirSync(subDir).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(subDir, f)) : [];
  return { main, subs };
}

// 1. Find build sessions. A cheap text check comes first, so most files are never parsed.
const sessions = [];
if (fs.existsSync(projectsDir)) {
  for (const proj of fs.readdirSync(projectsDir)) {
    const dir = path.join(projectsDir, proj);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jsonl"))) {
      const id = f.replace(/\.jsonl$/, "");
      const files = sessionFiles(dir, id);
      const all = [files.main, ...files.subs];
      if (!all.some((p) => prototypeDirs.some((d) => norm(fs.readFileSync(p, "utf8")).includes(norm(d))))) continue;
      const cutoff = auditCutoff(files);
      let writes = 0;
      for (const p of all) {
        for (const rec of records(p)) {
          if (cutoff !== null && rec.timestamp && Date.parse(rec.timestamp) >= cutoff) break;
          for (const t of toolUses(rec)) if (WRITE_TOOLS.has(t.name) && inPrototype(t.input?.file_path ?? t.input?.notebook_path)) writes += 1;
        }
      }
      if (writes > 0) sessions.push({ id, dir, files, writes, cutoff });
    }
  }
}

// 2. Summarise each build session across the main transcript and all its subagents.
const emptyTokens = () => ({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });

function workPeriods(stamps) {
  const periods = [];
  for (const t of stamps) {
    const last = periods.at(-1);
    if (last && t - last.end <= PERIOD_GAP_MINUTES * 60000) last.end = t;
    else periods.push({ start: t, end: t });
  }
  return periods.map((p) => ({
    start: new Date(p.start).toISOString(),
    end: new Date(p.end).toISOString(),
    minutes: Math.round((p.end - p.start) / 60000),
  }));
}

// The text a person typed, or null for records that aren't a person's prompt
// (tool results, command wrappers, system notices, interruptions).
function promptText(rec) {
  if (rec.type !== "user" || rec.isMeta || rec.isCompactSummary) return null;
  const c = rec.message?.content;
  const parts = typeof c === "string" ? [c] : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text) : [];
  const text = parts.join("\n").trim();
  if (!text || text.startsWith("<") || text.startsWith("[Request interrupted")) return null;
  return text;
}

// The findings Barb handed back: numbered items under the "Violations" heading.
function barbReport(file) {
  let report = null;
  for (const rec of records(file)) {
    if (rec.type !== "assistant") continue;
    for (const t of toolUses(rec)) if (t.name === "SubagentHandback" && t.input?.message) report = t.input.message;
  }
  if (!report) return { violations: null, report: null };
  let inViolations = false;
  let violations = 0;
  for (const line of report.split("\n")) {
    if (line.startsWith("#")) inViolations = /violations/i.test(line);
    else if (inViolations && /^\d+\.\s/.test(line)) violations += 1;
  }
  return { violations, report };
}

function summarise(s) {
  const seen = new Set();
  const tokens = emptyTokens();
  const tokensByAgent = {};
  const prompts = [];
  const designReviews = [];
  const models = {};
  const mcp = {};
  const skills = {};
  const agents = {};
  const otherFolders = {};
  const stamps = [];
  // What happened after the audit started, left out of everything above.
  const leftOut = { tokens: emptyTokens(), stamps: [], prompts: 0, agents: 0 };
  const afterAudit = (at) => s.cutoff !== null && at !== null && at >= s.cutoff;
  let title = null;
  let maxDepth = 0;

  for (const p of [s.files.main, ...s.files.subs]) {
    const meta = p.replace(/\.jsonl$/, ".meta.json");
    let agentType = p === s.files.main ? "main session" : "general-purpose";
    const firstAt = Date.parse(records(p).next().value?.timestamp ?? "") || null;
    if (p !== s.files.main && afterAudit(firstAt)) leftOut.agents += 1;
    else if (fs.existsSync(meta)) {
      const m = JSON.parse(fs.readFileSync(meta, "utf8"));
      agentType = m.agentType ?? "general-purpose";
      agents[agentType] = (agents[agentType] ?? 0) + 1;
      maxDepth = Math.max(maxDepth, m.spawnDepth ?? 1);
      if (agentType === "barb") {
        const first = records(p).next().value;
        designReviews.push({ start: first?.timestamp ?? null, description: m.description ?? null, ...barbReport(p) });
      }
    }
    tokensByAgent[agentType] ??= emptyTokens();
    let at = null;
    let stopped = false;
    for (const rec of records(p)) {
      if (rec.type === "ai-title" && !title) title = rec.title ?? rec.aiTitle ?? null;
      // A record without a time belongs with the one before it.
      if (rec.timestamp) at = Date.parse(rec.timestamp);
      // Once the audit has started, everything after it in the file is left out, even
      // a record stamped a moment earlier but written after it.
      if (afterAudit(at)) stopped = true;
      if (stopped) {
        if (rec.timestamp) leftOut.stamps.push(at);
        if (p === s.files.main && promptText(rec)) leftOut.prompts += 1;
        const key = `${rec.message?.id}|${rec.requestId}`;
        if (rec.type === "assistant" && !seen.has(key)) {
          seen.add(key);
          const u = rec.message?.usage ?? {};
          leftOut.tokens.input += u.input_tokens ?? 0;
          leftOut.tokens.cacheWrite += u.cache_creation_input_tokens ?? 0;
          leftOut.tokens.cacheRead += u.cache_read_input_tokens ?? 0;
          leftOut.tokens.output += u.output_tokens ?? 0;
        }
        continue;
      }
      if (p === s.files.main) {
        const text = promptText(rec);
        if (text) prompts.push({ at: rec.timestamp, text });
      }
      if (rec.timestamp) stamps.push(at);
      if (rec.type !== "assistant") continue;
      for (const t of toolUses(rec)) {
        if (t.name.startsWith("mcp__")) {
          const [, server, tool] = t.name.split("__");
          mcp[server] ??= { calls: 0, tools: {} };
          mcp[server].calls += 1;
          mcp[server].tools[tool] = (mcp[server].tools[tool] ?? 0) + 1;
        }
        if (t.name === "Skill" && t.input?.skill) skills[t.input.skill] = (skills[t.input.skill] ?? 0) + 1;
        const fp = t.input?.file_path;
        if (WRITE_TOOLS.has(t.name) && typeof fp === "string" && !inPrototype(fp)) {
          const folder = path.dirname(fp).split(path.sep).slice(0, 7).join(path.sep);
          otherFolders[folder] = (otherFolders[folder] ?? 0) + 1;
        }
      }
      // One API response can be split over several records; count its usage once.
      const key = `${rec.message?.id}|${rec.requestId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const u = rec.message?.usage ?? {};
      for (const bucket of [tokens, tokensByAgent[agentType]]) {
        bucket.input += u.input_tokens ?? 0;
        bucket.cacheWrite += u.cache_creation_input_tokens ?? 0;
        bucket.cacheRead += u.cache_read_input_tokens ?? 0;
        bucket.output += u.output_tokens ?? 0;
      }
      const model = rec.message?.model;
      if (model && model !== "<synthetic>") models[model] = (models[model] ?? 0) + 1;
    }
  }

  stamps.sort((a, b) => a - b);
  const periods = workPeriods(stamps);
  return {
    sessionId: s.id,
    transcriptFolder: s.dir,
    title,
    workPeriods: periods,
    activeMinutes: periods.reduce((n, p) => n + p.minutes, 0),
    // Null if the audit was never started in this session, so nothing was left out.
    measuredUntil: s.cutoff === null ? null : new Date(s.cutoff).toISOString(),
    leftOutAfterAudit:
      s.cutoff === null
        ? null
        : (() => {
            leftOut.stamps.sort((a, b) => a - b);
            const p = workPeriods(leftOut.stamps);
            return {
              activeMinutes: p.reduce((n, x) => n + x.minutes, 0),
              workPeriods: p,
              tokens: leftOut.tokens,
              prompts: leftOut.prompts,
              subagents: leftOut.agents,
            };
          })(),
    filesWrittenInPrototype: s.writes,
    alsoWroteOutsidePrototype: otherFolders,
    // The first prompt is the request itself. The ones after it are what the rubric
    // labels as correction, answer or other.
    firstPrompt: prompts[0] ?? null,
    laterPrompts: prompts.slice(1),
    // In order. The rubric checks whether the last round found nothing.
    designReviews: designReviews.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")).map((r, i) => ({ round: i + 1, ...r })),
    tokens,
    tokensByAgent,
    models,
    mcp,
    skills,
    agents,
    subagentCount: s.files.subs.length,
    deepestAgentNesting: maxDepth,
  };
}

const perSession = sessions
  .map(summarise)
  .sort((a, b) => (a.workPeriods[0]?.start ?? "").localeCompare(b.workPeriods[0]?.start ?? ""));

const sum = (pick) => perSession.reduce((n, s) => n + pick(s), 0);
const merge = (pick) => {
  const out = {};
  for (const s of perSession) for (const [k, v] of Object.entries(pick(s))) out[k] = (out[k] ?? 0) + (typeof v === "number" ? v : v.calls);
  return out;
};

const result = {
  prototype: root,
  include: prototypeDirs,
  transcriptsSearched: projectsDir,
  found: perSession.length > 0,
  note:
    perSession.length > 0
      ? "Sessions that wrote files inside the prototype. A session that also wrote elsewhere is listed under alsoWroteOutsidePrototype, and its totals include that other work."
      : "No Claude Code session on this machine wrote files in this prototype. It may have been built elsewhere, in a cloud session, or its transcripts may have been cleaned up.",
  definitions: {
    measuredUntil:
      "Measuring stops where the prototype-audit skill was started in a build session: at the prompt that started it, or at its slash command. Time, tokens, prompts, MCP calls, skills, agents and design reviews after that point aren't part of the build, and are left out of every number here. What was left out is listed under leftOutAfterAudit.",
    workPeriod: `A stretch of work with no break longer than ${PERIOD_GAP_MINUTES} minutes.`,
    activeMinutes: "The length of all work periods added up.",
    tokens: {
      input: "New input the model read, not from the cache.",
      cacheWrite: "Input stored in the cache so later requests can reuse it.",
      cacheRead: "Input reused from the cache. Usually most of the volume, and much cheaper than new input.",
      output: "Text the model wrote, including its thinking and the code it wrote.",
    },
  },
  totals: {
    sessions: perSession.length,
    // Sessions where the audit was started, so measuring stopped there.
    measuringStoppedAtAudit: perSession
      .filter((s) => s.measuredUntil)
      .map((s) => ({ sessionId: s.sessionId, measuredUntil: s.measuredUntil, leftOut: s.leftOutAfterAudit })),
    activeMinutes: sum((s) => s.activeMinutes),
    workPeriods: perSession.flatMap((s) => s.workPeriods),
    tokens: {
      input: sum((s) => s.tokens.input),
      cacheWrite: sum((s) => s.tokens.cacheWrite),
      cacheRead: sum((s) => s.tokens.cacheRead),
      output: sum((s) => s.tokens.output),
    },
    tokensByAgent: (() => {
      const out = {};
      for (const s of perSession) {
        for (const [agent, t] of Object.entries(s.tokensByAgent)) {
          out[agent] ??= emptyTokens();
          for (const k of Object.keys(t)) out[agent][k] += t[k];
        }
      }
      return out;
    })(),
    models: merge((s) => s.models),
    mcpCallsByServer: merge((s) => s.mcp),
    skills: merge((s) => s.skills),
    agents: merge((s) => s.agents),
    // Every review round across all sessions, in order, renumbered from 1.
    designReviews: (() => {
      const rounds = perSession
        .flatMap((s) => s.designReviews)
        .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
        .map((r, i) => ({ round: i + 1, start: r.start, violations: r.violations }));
      return {
        rounds: rounds.length,
        violationsInAll: rounds.reduce((n, r) => n + (r.violations ?? 0), 0),
        lastRoundViolations: rounds.at(-1)?.violations ?? null,
        byRound: rounds,
      };
    })(),
  },
  sessions: perSession,
};

const json = JSON.stringify(result, null, 2);
if (outFile) fs.writeFileSync(outFile, json);
else process.stdout.write(`${json}\n`);
