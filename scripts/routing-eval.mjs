#!/usr/bin/env node
/**
 * Does each skill's description still get it chosen for the right requests?
 *
 * A description is how a host decides which skill to load. Claude Code lists every description
 * in every session; an MCP client reads them through list_skills; other hosts do their own
 * matching. Shortening them saved about 10,000 tokens, and the risk of that is a skill that stops
 * being picked. This is the test for it, and it works with any model on any platform: it writes a
 * routing prompt from the descriptions on disk, you give the prompt to the model you care about,
 * and it scores the answer against `fixtures/routing-requests.json`.
 *
 *   node scripts/routing-eval.mjs prompt > prompt.txt     # give prompt.txt to a model
 *   node scripts/routing-eval.mjs score answer.json       # exit 1 below 100%
 *
 * When the descriptions were shortened from about 950 characters to about 350, a small model
 * routed all 52 requests correctly with both the old and the new set — after one fix, where the
 * new label description had started to sound like it owned the forms skill's required-field
 * policy. The requests include near-sibling traps on purpose: badge and chip, file input and
 * file upload, panel and the panels-and-modals rules.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { listSkills } from "./check-skill-structure.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REQUESTS = path.join(HERE, "fixtures", "routing-requests.json");

export function descriptions() {
  return Object.fromEntries(
    listSkills().map(({ slug, file }) => [
      slug,
      YAML.parse(
        fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)[1],
      ).description,
    ]),
  );
}

export function prompt(
  requests = JSON.parse(fs.readFileSync(REQUESTS, "utf8")),
  skills = descriptions(),
) {
  return [
    "You are routing requests to skills. Below is a list of skills, each with a name and a description, then a numbered list of requests. For each request, choose the ONE skill whose description best says it should handle that request.",
    "",
    'Do not use any tools. Do not explain. Reply with only a JSON object mapping each request number to the chosen skill name, exactly as written, for example {"1": "recursica-skill-x"}. Every request must have an answer.',
    "",
    "SKILLS:",
    ...Object.entries(skills).map(([slug, d]) => `- ${slug}: ${d}`),
    "",
    "REQUESTS:",
    ...requests.map((r, i) => `${i + 1}. ${r.request}`),
  ].join("\n");
}

/** Score a model's answer: `{ correct, total, misses: [{ n, request, expected, got }] }`. */
export function score(
  answer,
  requests = JSON.parse(fs.readFileSync(REQUESTS, "utf8")),
) {
  const misses = [];
  requests.forEach((r, i) => {
    const got = answer[String(i + 1)] ?? null;
    if (got !== r.skill)
      misses.push({ n: i + 1, request: r.request, expected: r.skill, got });
  });
  return {
    correct: requests.length - misses.length,
    total: requests.length,
    misses,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [cmd, file] = process.argv.slice(2);
  if (cmd === "prompt") {
    process.stdout.write(prompt() + "\n");
  } else if (cmd === "score" && file) {
    const raw = fs.readFileSync(file, "utf8");
    const json = JSON.parse(
      raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
    );
    const { correct, total, misses } = score(json);
    for (const m of misses)
      console.log(
        `${m.n}. ${m.request}\n    expected ${m.expected}, got ${m.got}`,
      );
    console.log(
      `${correct === total ? "✓" : "✗"} ${correct} of ${total} requests routed to the expected skill.`,
    );
    process.exit(correct === total ? 0 : 1);
  } else {
    console.error(
      "usage: routing-eval.mjs prompt | routing-eval.mjs score <answer.json>",
    );
    process.exit(2);
  }
}
