// Every knob in one place. All are env vars so the CircleChat agent and the CLI share them.
import { INVENTORY } from "./skill.mjs";
const num = (name, fallback) => {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : Number(v);
};

export const config = {
  // The recursica-knowledge checkout: the directory holding scripts/screen-skill-manifest.mjs.
  knowledgeDir: process.env.KNOWLEDGE_DIR ?? "",
  // Where relative screen paths in a chat message resolve from.
  appRoot: process.env.APP_ROOT ?? process.cwd(),
  // Kev-engine: the local model server. Any System One-compatible server works here.
  engineUrl: process.env.KEV_ENGINE_URL ?? "http://localhost:8009",
  engineKey: process.env.KEV_ENGINE_KEY ?? "local",
  model: process.env.KEV_ENGINE_MODEL ?? "kev-latest",
  mock: process.env.KEV_MOCK === "1",

  // Thresholds on a Noul (probability of "yes, this is broken").
  // At or above FLAG: a lead. Between PASS and FLAG: unsure. Below PASS: clear.
  // Deliberately low PASS: a false "clear" is the expensive mistake here.
  flag: num("KEV_FLAG", 0.5),
  pass: num("KEV_PASS", 0.15),

  // A file up to this many lines is judged whole; longer files are chunked.
  // Kev caps state at ~8k tokens; ~250 numbered lines plus the skill brief fits.
  fileMaxLines: num("KEV_FILE_MAX_LINES", 250),
  // A design-rules skill is dropped when no unit scores at least this on "does this screen do
  // what the skill covers". Lenient on purpose: dropping a skill that applied is a miss.
  applies: num("KEV_APPLIES", 0.3),
  // An item is set aside as not checkable from source (needs a browser, or is about the
  // designer's process) below this probability of being checkable. Low on purpose.
  checkable: num("KEV_CHECKABLE", 0.2),

  chunkLines: num("KEV_CHUNK_LINES", 60),
  chunkOverlap: num("KEV_CHUNK_OVERLAP", 10),
  // Largest screen (all files, in lines) that fits one state for the "is something missing" pass.
  screenMaxLines: num("KEV_SCREEN_MAX_LINES", 1500),
  // Questions per engine request. Unknown server limit, so keep it modest and adjustable.
  batch: num("KEV_BATCH", 25),
  concurrency: num("KEV_CONCURRENCY", 8),
  timeoutMs: num("KEV_TIMEOUT_MS", 30000),

  // Skill text sent with each chunk: these sections only, capped. The checklist item itself
  // always goes in full. Lower = cheaper; too low and items like "outside the inventory above"
  // lose their referent.
  // "Accessibility baseline for every component" is in recursica-skill-system-conventions: the
  // rules each component's own Accessibility section used to repeat, now stated once. Without
  // it here, that skill's brief falls back to its first skillChars characters and the baseline,
  // near its end, is cut off.
  // A component skill's inventory and rules headings name the component, so they are found by
  // INVENTORY is the section headed "Variants" (see skill.mjs).
  skillSections: [INVENTORY, /^Rules for .+/, "Rules", "Accessibility", "Accessibility baseline for every component"],
  skillChars: num("KEV_SKILL_CHARS", 6000),
  // Skip chunks with no markup in the per-chunk pass. The whole-screen pass still sees them.
  jsxOnly: process.env.KEV_JSX_ONLY !== "0",

  cachePath: process.env.KEV_CACHE ?? ".kev-cache.json",
};
