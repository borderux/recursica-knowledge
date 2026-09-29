// Step 1 is unchanged from Barb: which skills apply is computed by the manifest, never judged.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function locateManifestScript(knowledgeDir) {
  const script = path.join(knowledgeDir, "scripts", "screen-skill-manifest.mjs");
  if (!knowledgeDir || !fs.existsSync(script)) {
    throw new Error(
      `No manifest script at ${script || "(KNOWLEDGE_DIR unset)"}. ` +
        "Set KNOWLEDGE_DIR to the recursica-knowledge checkout. " +
        "A missing manifest is a failed run, not a clean screen.",
    );
  }
  return script;
}

export function runManifest(knowledgeDir, screenFiles) {
  const script = locateManifestScript(knowledgeDir);
  const abs = screenFiles.map((f) => path.resolve(f));
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [script, "--json", ...abs], { encoding: "utf8" });
  } catch (err) {
    // Exit 1 means an import matched no skill. The JSON is still printed; keep it.
    if (err.status === 1 && err.stdout) stdout = err.stdout;
    else throw err;
  }
  const m = JSON.parse(stdout);
  const root = knowledgeDir;
  return {
    entries: m.entries.map((f) => path.resolve(root, f)),
    files: m.files.map((f) => path.resolve(root, f)),
    skills: m.skills.map((s) => ({ slug: s.slug, path: path.resolve(root, s.path) })),
    uncovered: m.uncovered,
    // skill slug → adapter component names imported directly for it (component skills only).
    componentsFor: m.imports.reduce((acc, i) => {
      for (const slug of i.skills ?? []) (acc[slug] ??= []).push(i.name);
      return acc;
    }, {}),
  };
}
