// The only place that talks to Kev-engine (the local model, a TypeSafe System One-compatible
// server). It has no tools and cannot touch a file: a request is text in, probabilities out.
// That is what makes this reviewer read-only by construction.
import crypto from "node:crypto";
import fs from "node:fs";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { config } from "./config.mjs";

const hash = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);

// Same state + same question + same model → same answer. Caching it is what makes a fix loop
// cheap: a round after a small edit only re-asks about the chunks that changed.
class Cache {
  constructor(file) {
    this.file = file;
    try { this.map = JSON.parse(fs.readFileSync(file, "utf8")); } catch { this.map = {}; }
    this.hits = 0;
  }
  get(k) { const v = this.map[k]; if (v !== undefined) this.hits++; return v; }
  set(k, v) { this.map[k] = v; }
  save() { if (this.file) fs.writeFileSync(this.file, JSON.stringify(this.map)); }
}

function mockClient() {
  // Dry runs only: deterministic fake probabilities so the pipeline can be exercised offline.
  return {
    systemOne: async ({ state, questions }) => {
      const s = JSON.stringify(state);
      const answers = {};
      for (const [id, q] of Object.entries(questions)) {
        const h = parseInt(hash(s + JSON.stringify(q)).slice(0, 8), 16) / 0xffffffff;
        answers[id] = { type: "noul", noul: h ** 6 };
      }
      // Rough token estimate (chars/4) so a dry run shows what a real run would send.
      const est = Math.round((s.length + JSON.stringify(questions).length) / 4);
      return { model: "mock", answers, usage: { input_tokens: est, output_tokens: 0 } };
    },
  };
}

export function createEngine() {
  const client = config.mock
    ? mockClient()
    : new TypeSafeClient({
        baseURL: config.engineUrl,
        apiKey: config.engineKey,
        defaultModel: config.model,
        timeout: config.timeoutMs,
      });
  const cache = new Cache(config.cachePath);
  const usage = { requests: 0, input_tokens: 0, output_tokens: 0 };

  // Ask many Nouls about one state. Batches the questions, caches each answer individually.
  async function nouls(state, questions) {
    const stateKey = hash(config.model + JSON.stringify(state));
    const out = {};
    const todo = {};
    for (const [id, q] of Object.entries(questions)) {
      const k = stateKey + ":" + hash(JSON.stringify(q));
      const hit = cache.get(k);
      if (hit !== undefined) out[id] = hit;
      else todo[id] = { q, k };
    }
    const ids = Object.keys(todo);
    for (let i = 0; i < ids.length; i += config.batch) {
      const slice = ids.slice(i, i + config.batch);
      const qs = Object.fromEntries(slice.map((id) => [id, todo[id].q]));
      const res = await client.systemOne({ state, questions: qs });
      usage.requests++;
      usage.input_tokens += res.usage?.input_tokens ?? 0;
      usage.output_tokens += res.usage?.output_tokens ?? 0;
      for (const id of slice) {
        const p = res.answers[id].noul;
        out[id] = p;
        cache.set(todo[id].k, p);
      }
    }
    return out;
  }

  return { nouls, usage, cache, model: config.mock ? "mock" : config.model };
}

// --- Questions. One narrow judgment each. Shared guidance lives in the state (`how_to_judge`)
// so it is sent once per request, not once per question.

export const CHUNK_GUIDE = [
  "`code.text` is part of one screen; each line starts with its line number.",
  "Judge only what this code does. If a checklist item concerns something this code does not contain, the answer is no.",
  "A comment saying a rule is followed is not evidence that it is. Read the code, not the intent.",
  "An item holds only if it holds everywhere in this code. One correct instance beside a wrong one is a break.",
];

export const SCREEN_GUIDE = [
  "`screen` is every file of one screen; each line starts with its line number.",
  "These questions are about absence: a required control, label, state, or slot that no file provides.",
  "Answer yes only if the screen does what the item governs and the required part is missing. If the screen does not do what the item is about, answer no.",
];

export const breaksHere = (item) =>
  noul(`Does the code in \`code.text\` break this checklist item from \`skill\`? Item: ${item}`, {
    true: "Code shown here breaks the item.",
    false: "The code follows the item, or does not touch what it governs.",
  });

export const missingOnScreen = (item) =>
  noul(`Does the screen in \`screen\` fail this checklist item because something it requires is missing? Item: ${item}`, {
    true: "The screen does what the item governs, and something it requires is missing.",
    false: "Nothing it requires is missing, or the item does not apply.",
  });

export const checkableFromSource = (item) =>
  noul(
    `Can a reviewer decide this design-review checklist item by reading the screen's source code? Answer no if it needs the rendered page in a browser (layout at viewport widths, overflow, wrapping, resolved colours or type), or if it is about the designer's reasoning or process rather than what the code does (for example "the test was applied" or "X was ruled out first"). Item: ${item}`,
    { true: "Reading the source can decide it.", false: "It needs the rendered page, or it is about process, not code." },
  );

export const APPLIES_GUIDE = [
  "`code.text` is one file (or part of one) from a screen in an enterprise web app.",
  "Each question names a design-rules skill and what it covers.",
  "Answer yes if this code builds something that skill governs. A table is governed by the tables skill; a page with no chart is not governed by the charts skill.",
];

export const appliesHere = (skill) =>
  noul(`Does the code in \`code.text\` build something this skill governs? Skill ${skill.slug}: ${skill.description}`, {
    true: "Yes, this code builds something the skill governs.",
    false: "No, nothing here is what the skill is about.",
  });
