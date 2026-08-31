#!/usr/bin/env node
/**
 * build-cards — pre-process every skill into a condensed ~300-token rule card.
 *
 * Cards are written to <skills dir>/../.rule-cards/<short-name>.md and served
 * by the MCP server's get_rule_cards tool. Re-run after the repo changes;
 * unchanged skills are skipped (content hash).
 *
 * Works with any endpoint:
 *   Anthropic:            CARDS_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...
 *   Local / OpenAI-compat: CARDS_PROVIDER=openai OPENAI_BASE_URL=http://localhost:8080/v1
 *                          OPENAI_MODEL=qwen3.6-35b [OPENAI_API_KEY=none]
 *
 * Env:
 *   RECURSICA_SKILLS_DIR   (default: this repo's own skills/)
 *   RECURSICA_CARDS_DIR    (default: <skills dir>/../.rule-cards)
 *   CARDS_MODEL            Anthropic model (default claude-sonnet-4-6)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Same resolution as server.js — the two must agree on where cards live, or the
// builder writes to one directory and the server reads from another.
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
const PROVIDER = process.env.CARDS_PROVIDER || "anthropic";

const PROMPT = `You compress a UI design skill document into a rule card for a build agent working under a tight context budget.

Output ONLY the card, in this exact shape:

# <short-name>
USE WHEN: <one line>
RULES:
- <imperative rule, one line each — every MUST/NEVER/ALWAYS from the source>
DEFAULTS: <key defaults, comma-separated>
DON'T: <the explicit anti-patterns, one line>
ESCALATE: fetch full skill if <the genuinely ambiguous areas, one short phrase>

Hard limits: max 350 tokens. No prose, no examples, no rationale — rules only. Preserve exact values (px, counts, names). Drop nothing normative.`;

async function llm(skillText, shortName) {
  if (PROVIDER === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CARDS_MODEL || "claude-sonnet-4-6",
        max_tokens: 600,
        system: PROMPT,
        messages: [
          { role: "user", content: `Short name: ${shortName}\n\n${skillText}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content.map((b) => b.text || "").join("");
  }
  // OpenAI-compatible (FreeToken local endpoint, vLLM, llama.cpp, ...)
  const base = process.env.OPENAI_BASE_URL || "http://localhost:8080/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY || "none"}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "local",
      max_tokens: 600,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: `Short name: ${shortName}\n\n${skillText}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function shortName(dir) {
  return dir.replace(/^recursica-skill-/, "");
}

function hash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

const manifestFile = path.join(CARDS_DIR, ".manifest.json");
fs.mkdirSync(CARDS_DIR, { recursive: true });
const manifest = fs.existsSync(manifestFile)
  ? JSON.parse(fs.readFileSync(manifestFile, "utf8"))
  : {};

const jobs = [];
for (const category of fs.readdirSync(SKILLS_DIR)) {
  const catPath = path.join(SKILLS_DIR, category);
  if (!fs.statSync(catPath).isDirectory()) continue;
  for (const dir of fs.readdirSync(catPath)) {
    const skillFile = path.join(catPath, dir, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;
    jobs.push({ short: shortName(dir), file: skillFile });
  }
}

console.log(`${jobs.length} skills; cards -> ${CARDS_DIR} (provider: ${PROVIDER})`);

let built = 0,
  skipped = 0,
  failed = 0;

// modest concurrency so a local endpoint isn't flooded
const CONCURRENCY = Number(process.env.CARDS_CONCURRENCY || 3);
const queue = [...jobs];

async function worker() {
  while (queue.length) {
    const job = queue.shift();
    const text = fs.readFileSync(job.file, "utf8");
    const h = hash(text);
    const cardFile = path.join(CARDS_DIR, `${job.short}.md`);
    if (manifest[job.short] === h && fs.existsSync(cardFile)) {
      skipped++;
      continue;
    }
    try {
      const card = await llm(text, job.short);
      fs.writeFileSync(cardFile, card.trim() + "\n");
      manifest[job.short] = h;
      built++;
      console.log(`  built ${job.short}`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${job.short}: ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
console.log(`done: ${built} built, ${skipped} unchanged, ${failed} failed`);
