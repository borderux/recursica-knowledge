// A first pass, not a review. It finds leads fast and cheaply so the builder can fix them before
// full Barb runs. It never decides a screen is clean — only full Barb's two quiet rounds do that.
import path from "node:path";
import { config } from "./config.mjs";
import { lineCount, readScreen, units, whole } from "./chunks.mjs";
import {
  APPLIES_GUIDE, appliesHere, breaksHere, CHUNK_GUIDE, checkableFromSource,
  createEngine, missingOnScreen, SCREEN_GUIDE,
} from "./engine.mjs";
import { runManifest } from "./manifest.mjs";
import { pool } from "./pool.mjs";
import { brief, loadSkill } from "./skill.mjs";

const qid = (i) => `item_${i}`;
const hasMarkup = (u) => /<[A-Za-z][\w.]*[\s/>]/.test(u.text);

export async function triage(screenFiles, { root } = {}) {
  const started = Date.now();
  const m = runManifest(config.knowledgeDir, screenFiles);
  const displayRoot = root ?? path.dirname(m.entries[0] ?? process.cwd());
  const screen = readScreen(m.files, displayRoot);
  const allUnits = units(screen, config.fileMaxLines, config.chunkLines, config.chunkOverlap);
  const uiUnits = config.jsxOnly ? allUnits.filter(hasMarkup) : allUnits;
  const screenFits = lineCount(screen) <= config.screenMaxLines;
  const screenState = screenFits ? whole(screen) : null;
  const engine = createEngine();
  const skills = m.skills.map(loadSkill);

  // 1. Which design-rules skills does this screen actually touch? Component skills were matched
  //    by an import, so they always apply. Everything else is asked once per unit, all skills in
  //    one request, and kept if any unit says yes.
  const always = (process.env.KEV_ALWAYS ?? "defaults,responsive-behavior,working-memory,system-conventions,screen-priority,naming-terminology,typography-semantics").split(",").map((x) => `recursica-skill-${x.trim()}`);
  const gated = skills.filter((s) => !m.componentsFor[s.slug]?.length && !always.includes(s.slug));
  const applies = Object.fromEntries(skills.map((s) => [s.slug, 1]));
  if (gated.length) {
    const qs = Object.fromEntries(gated.map((s, i) => [`skill_${i}`, appliesHere(s)]));
    const answers = await pool(
      uiUnits.map((u) => () =>
        engine.nouls({ how_to_judge: APPLIES_GUIDE, code: { file: u.file, lines: `${u.from}-${u.to}`, text: u.text } }, qs),
      ),
      config.concurrency,
    );
    gated.forEach((s, i) => { applies[s.slug] = Math.max(0, ...answers.map((a) => a[`skill_${i}`])); });
  }
  const active = skills.filter((s) => applies[s.slug] >= config.applies);
  const skipped = skills.filter((s) => applies[s.slug] < config.applies).map((s) => s.slug);

  // Which units can bear on a skill: a component skill only sees units that name its component.
  function unitsFor(skill) {
    const names = m.componentsFor[skill.slug];
    if (!names?.length) return uiUnits;
    const re = new RegExp(`\\b(${names.join("|")})\\b`);
    return uiUnits.filter((u) => re.test(u.text));
  }

  const perSkill = await pool(
    active.map((skill) => async () => {
      if (!skill.items.length) {
        return { skill, items: [], error: "no pre-flight checklist — a gap in the corpus, not a pass" };
      }
      const questions = (make, idx) => Object.fromEntries(idx.map((i) => [qid(i), make(skill.items[i])]));
      const allIdx = skill.items.map((_, i) => i);

      // 2. Set aside items code can't decide (browser-only, or about process). Depends only on
      //    the item text, so it caches across every screen.
      const checkP = await engine.nouls({ skill: skill.slug }, questions(checkableFromSource, allIdx));
      const codeIdx = allIdx.filter((i) => checkP[qid(i)] >= config.checkable);

      // 3. Does any unit break the item? Keep the worst unit as the citation.
      const mine = unitsFor(skill);
      const skillBrief = brief(skill.text, config.skillSections, config.skillChars);
      const breakQs = questions(breaksHere, codeIdx);
      const unitAnswers = codeIdx.length
        ? await pool(
            mine.map((u) => () =>
              engine.nouls({ how_to_judge: CHUNK_GUIDE, skill: skillBrief, code: { file: u.file, lines: `${u.from}-${u.to}`, text: u.text } }, breakQs),
            ),
            config.concurrency,
          )
        : [];

      // 4. Is something required missing from the screen as a whole?
      const missingP = screenState && codeIdx.length
        ? await engine.nouls({ how_to_judge: SCREEN_GUIDE, skill: skillBrief, screen: screenState }, questions(missingOnScreen, codeIdx))
        : null;

      const items = skill.items.map((text, i) => {
        if (!codeIdx.includes(i)) {
          return { item: text, status: "not-checkable", kind: null, p: null, where: null };
        }
        let pBreak = 0;
        let where = null;
        unitAnswers.forEach((a, ui) => {
          if (a[qid(i)] > pBreak) { pBreak = a[qid(i)]; where = mine[ui]; }
        });
        const pMissing = missingP ? missingP[qid(i)] : null;
        const top = Math.max(pBreak, pMissing ?? 0);
        const status = top >= config.flag ? "lead" : top >= config.pass ? "unsure" : "clear";
        const kind = pMissing !== null && pMissing > pBreak ? "missing" : "breaks";
        return {
          item: text,
          status,
          kind,
          p: Number(top.toFixed(3)),
          where: kind === "breaks" && where ? `${where.file}:${where.from}-${where.to}` : null,
        };
      });
      return { skill, items };
    }),
    config.concurrency,
  );

  engine.cache.save();

  return {
    model: engine.model,
    mock: config.mock,
    entries: m.entries.map((f) => path.relative(displayRoot, f) || f),
    files: screen.map((f) => f.rel),
    uncovered: m.uncovered,
    screenFits,
    thresholds: { flag: config.flag, pass: config.pass, applies: config.applies, checkable: config.checkable },
    skipped: skipped.map((slug) => ({ slug, p: Number(applies[slug].toFixed(3)) })),
    skills: perSkill.map(({ skill, items, error }) => ({ slug: skill.slug, error: error ?? null, items })),
    usage: { ...engine.usage, cacheHits: engine.cache.hits },
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
}
