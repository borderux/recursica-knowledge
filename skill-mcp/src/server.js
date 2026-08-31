#!/usr/bin/env node
/**
 * recursica-skill-mcp — stdio MCP server for recursica-knowledge skills.
 *
 * Serves a compact catalog, full skills, condensed rule cards, and keyword
 * search over a local clone of github.com/borderux/recursica-knowledge.
 *
 * Buzz integration:
 *   BUZZ_ACP_MCP_COMMAND=recursica-skill-mcp
 *   MCP_HOOK_SERVERS=recursica-skill-mcp   (enables the _PostCompact hook)
 *
 * Env:
 *   RECURSICA_SKILLS_DIR  path to a skills/ folder
 *                         (default: this repo's own skills/)
 *   RECURSICA_CARDS_DIR   path to pre-built rule cards
 *                         (default: <skills dir>/../.rule-cards)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// This server lives inside the knowledge repo, so the skills it serves are two
// levels up from src/ — resolved from the module's own location, which survives
// `npm link` (the symlink resolves back to the checkout). The env var still wins,
// for an operator serving a clone kept somewhere else.
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const SKILLS_DIR =
  process.env.RECURSICA_SKILLS_DIR || path.join(REPO_ROOT, "skills");
const CARDS_DIR =
  process.env.RECURSICA_CARDS_DIR ||
  path.join(path.dirname(SKILLS_DIR), ".rule-cards");

// ---------- index ----------

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function shortName(name) {
  return name.replace(/^recursica-skill-/, "");
}

function firstSentence(s) {
  if (!s) return "";
  const i = s.search(/[.!?](\s|$)/);
  let out = i === -1 ? s : s.slice(0, i + 1);
  if (out.length > 140) out = out.slice(0, 137).replace(/\s+\S*$/, "") + "...";
  return out;
}

function buildIndex() {
  const index = new Map(); // shortName -> entry
  if (!fs.existsSync(SKILLS_DIR)) {
    throw new Error(`Skills dir not found: ${SKILLS_DIR}`);
  }
  for (const category of fs.readdirSync(SKILLS_DIR)) {
    const catPath = path.join(SKILLS_DIR, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    for (const dir of fs.readdirSync(catPath)) {
      const skillFile = path.join(catPath, dir, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;
      const text = fs.readFileSync(skillFile, "utf8");
      const fm = parseFrontmatter(text);
      const name = fm.name || dir;
      const key = shortName(name);
      index.set(key, {
        name,
        short: key,
        category,
        file: skillFile,
        description: fm.description || "",
        oneLiner: firstSentence(fm.description || ""),
      });
    }
  }
  return index;
}

let INDEX = buildIndex();

function catalogText() {
  const byCat = {};
  for (const e of INDEX.values()) {
    (byCat[e.category] ||= []).push(e);
  }
  const lines = [
    `Recursica skill catalog (${INDEX.size} skills). Fetch with get_skill(name) or get_rule_cards(names). Use the short name.`,
  ];
  for (const cat of Object.keys(byCat).sort()) {
    lines.push(`\n[${cat}]`);
    for (const e of byCat[cat].sort((a, b) => a.short.localeCompare(b.short))) {
      lines.push(`- ${e.short}: ${e.oneLiner}`);
    }
  }
  return lines.join("\n");
}

function readCard(entry) {
  const cardFile = path.join(CARDS_DIR, `${entry.short}.md`);
  return fs.existsSync(cardFile) ? fs.readFileSync(cardFile, "utf8") : null;
}

function resolve(nameRaw) {
  const key = shortName(String(nameRaw).trim());
  return INDEX.get(key) || null;
}

// ---------- server ----------

const server = new McpServer({
  name: "recursica-skill-mcp",
  version: "0.1.0",
});

server.registerTool(
  "list_skills",
  {
    description:
      "Compact catalog of all recursica skills: short name + one-line description, grouped by category. Load this once, then fetch only what the task needs.",
    inputSchema: {},
  },
  async () => ({ content: [{ type: "text", text: catalogText() }] })
);

server.registerTool(
  "search_skills",
  {
    description:
      "Keyword search over skill names and full frontmatter descriptions (which include trigger phrases). Returns matching skills with their full descriptions. Use before get_skill when unsure which skill applies.",
    inputSchema: { query: z.string().describe("keywords, e.g. 'filter date range'") },
  },
  async ({ query }) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = [];
    for (const e of INDEX.values()) {
      const hay = `${e.short} ${e.category} ${e.description}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      if (score > 0) scored.push([score, e]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    const top = scored.slice(0, 8).map(([, e]) => `## ${e.short} (${e.category})\n${e.description}`);
    return {
      content: [
        {
          type: "text",
          text: top.length ? top.join("\n\n") : "No skills matched. Try list_skills.",
        },
      ],
    };
  }
);

server.registerTool(
  "get_skill",
  {
    description:
      "Fetch the FULL text of one skill by short name (e.g. 'filters', 'tables', 'button'). Full skills are ~3k tokens — prefer get_rule_cards for building; use this for review passes or when a rule card is ambiguous.",
    inputSchema: { name: z.string().describe("short skill name from list_skills") },
  },
  async ({ name }) => {
    const e = resolve(name);
    if (!e)
      return {
        content: [{ type: "text", text: `Unknown skill '${name}'. Call list_skills.` }],
        isError: true,
      };
    return { content: [{ type: "text", text: fs.readFileSync(e.file, "utf8") }] };
  }
);

server.registerTool(
  "get_rule_cards",
  {
    description:
      "Fetch condensed rule cards (~300 tokens each) for one or more skills by short name. This is the default way to load skills for build work — batch all skills for your subtask in ONE call. Falls back to the full skill if no card exists.",
    inputSchema: {
      names: z.array(z.string()).describe("short skill names, e.g. ['filters','tables']"),
    },
  },
  async ({ names }) => {
    const parts = [];
    const missing = [];
    for (const n of names) {
      const e = resolve(n);
      if (!e) {
        missing.push(n);
        continue;
      }
      const card = readCard(e);
      parts.push(
        card
          ? `# CARD: ${e.short}\n${card}`
          : `# FULL (no card built): ${e.short}\n${fs.readFileSync(e.file, "utf8")}`
      );
    }
    if (missing.length) parts.push(`Unknown skills: ${missing.join(", ")}. Call list_skills.`);
    return { content: [{ type: "text", text: parts.join("\n\n---\n\n") }] };
  }
);

server.registerTool(
  "refresh_index",
  {
    description:
      "Re-scan the skills directory (after a git pull). Returns the new skill count.",
    inputSchema: {},
  },
  async () => {
    INDEX = buildIndex();
    return { content: [{ type: "text", text: `Re-indexed ${INDEX.size} skills.` }] };
  }
);

// ---------- buzz lifecycle hook ----------
// _PostCompact: after buzz-agent compacts history, re-inject the catalog so
// the agent keeps knowing what skills exist. Hidden from the LLM tool list
// by buzz-agent; called by the agent loop. Output is plain text (buzz
// JSON-encodes tool results itself for injection safety).

server.registerTool(
  "_PostCompact",
  {
    description: "Buzz lifecycle hook: re-inject the skill catalog after context compaction.",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text:
          "Context was compacted. Skill catalog reminder:\n\n" +
          catalogText() +
          "\n\nRe-fetch rule cards for the skills your current subtask needs before continuing.",
      },
    ],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `recursica-skill-mcp: serving ${INDEX.size} skills from ${SKILLS_DIR}` +
    (fs.existsSync(CARDS_DIR) ? ` (cards: ${CARDS_DIR})` : " (no rule cards built yet)")
);
