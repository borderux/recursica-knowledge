// Step 1 is unchanged from Barb: which skills apply is computed by the manifest, never judged. The
// knowledge MCP server computes it (skills_for_screen), from the screen's files, sent as contents.
import fs from "node:fs";
import path from "node:path";
import { KnowledgeError } from "./knowledge.mjs";
import { pool } from "./pool.mjs";

// The relative imports of one source file, and the files each can name, in the order they are
// tried. The same rule as scripts/screen-skill-manifest.mjs, which Kev does not import.
const LOCAL_IMPORT = /(?:from|import)\s*["'](\.[^"']+)["']/g;
const candidates = (t) => [t, `${t}.jsx`, `${t}.tsx`, `${t}.js`, `${t}.ts`,
  path.join(t, "index.jsx"), path.join(t, "index.tsx"), path.join(t, "index.js"), path.join(t, "index.ts")];

/** The screen's files and every local file they reach, as { path, text }, with absolute paths. */
export function screenSources(screenFiles) {
  const out = new Map();
  const walk = (abs) => {
    if (out.has(abs)) return;
    const text = fs.readFileSync(abs, "utf8");
    out.set(abs, text);
    for (const m of text.matchAll(LOCAL_IMPORT)) {
      const target = path.resolve(path.dirname(abs), m[1]);
      const hit = candidates(target).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (hit) walk(hit);
    }
  };
  for (const f of screenFiles) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) throw new KnowledgeError(`no screen file at ${abs}. A missing screen is a failed run, not a clean screen.`);
    walk(abs);
  }
  return [...out].map(([p, text]) => ({ path: p, text }));
}

/** The manifest, from the server's answer: absolute paths, and each component skill's imports. */
function fromAnswer(m) {
  return {
    entries: m.entries,
    files: m.files,
    skills: m.skills.map((s) => ({ slug: s.slug, path: s.path })),
    uncovered: m.uncovered,
    // skill slug → adapter component names imported directly for it (component skills only).
    componentsFor: m.imports.reduce((acc, i) => {
      for (const slug of i.skills ?? []) (acc[slug] ??= []).push(i.name);
      return acc;
    }, {}),
  };
}

/**
 * The manifest and the text of every skill it names, all from one knowledge commit. The server
 * moves to a new commit when the knowledge repo's main changes. When the answers of one run name
 * different commits, the run asks for all of them again, once, on the new commit; a second switch
 * fails the run plainly.
 *   knowledge: knowledgeClient(); returns { manifest, skills: [{ slug, path, text }], commit }
 */
export async function loadKnowledge(knowledge, screenFiles, { concurrency = 4 } = {}) {
  const sources = screenSources(screenFiles);
  for (let attempt = 1; ; attempt++) {
    const m = await knowledge.call("skills_for_screen", { sources });
    const texts = await pool(m.skills.map((s) => () => knowledge.call("skill_text", { slug: s.slug })), concurrency);
    const commits = [...new Set([m.commit, ...texts.map((t) => t.commit)])];
    if (commits.length === 1) {
      return {
        manifest: fromAnswer(m),
        skills: texts.map((t) => ({ slug: t.slug, path: t.path, text: t.text })),
        commit: m.commit,
      };
    }
    if (attempt === 2) throw new KnowledgeError(`the knowledge server moved to a new commit twice during one run (${commits.map((c) => c.slice(0, 7)).join(", ")}). Run Kev again.`);
    console.error(`kev: the knowledge server moved from ${m.commit.slice(0, 7)} during the run; reading every skill again on the new commit`);
  }
}
