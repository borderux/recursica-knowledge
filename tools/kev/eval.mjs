#!/usr/bin/env node
// Is Kev safe to lean on? Compare its first pass with full Barb on the same screen.
//
//   node eval.mjs --kev kev.json --barb barb.json
//
// kev.json:  output of `kev --json <screen>`
// barb.json: full Barb's surviving findings (after feisty), as
//            [{ "skill": "recursica-skill-textarea", "checklistItem": "...", "file": "...", "line": 42 }]
//
// The number that matters is "missed": real violations Kev marked clear. Those are the ones a
// first pass would let through. Tune KEV_PASS down until it is zero on your screens.
import fs from "node:fs";

const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const jevPath = arg("--kev") ?? arg("--jev");
const barbPath = arg("--barb");
if (!jevPath || !barbPath) { console.error("usage: eval.mjs --kev kev.json --barb barb.json"); process.exit(2); }

const jev = JSON.parse(fs.readFileSync(jevPath, "utf8"));
const barb = JSON.parse(fs.readFileSync(barbPath, "utf8"));
const norm = (s) => s.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const index = new Map();
for (const s of jev.skills) for (const it of s.items) index.set(`${s.slug}::${norm(it.item)}`, it);

const rows = barb.map((f) => ({ f, it: index.get(`${f.skill}::${norm(f.checklistItem)}`) }));
const unmatched0 = rows.filter((r) => !r.it);
const unmatched = unmatched0.filter((r) => !new Set((jev.skipped ?? []).map((x) => x.slug)).has(r.f.skill));
const caught = rows.filter((r) => r.it && (r.it.status === "lead" || r.it.status === "unsure"));
const missed = rows.filter((r) => r.it && r.it.status === "clear");
const renderOnly = rows.filter((r) => r.it && r.it.status === "not-checkable");
const skippedSlugs = new Set((jev.skipped ?? []).map((x) => x.slug));
const skippedMiss = rows.filter((r) => !r.it && skippedSlugs.has(r.f.skill));
const located = caught.filter(({ f, it }) => {
  if (!it.where || f.line == null) return false;
  const [file, range] = it.where.split(/:(?=\d+-\d+$)/);
  const [a, b] = range.split("-").map(Number);
  return f.file.endsWith(file) && f.line >= a && f.line <= b;
});
const barbKeys = new Set(barb.map((f) => `${f.skill}::${norm(f.checklistItem)}`));
let leads = 0, leadsTrue = 0;
for (const s of jev.skills) for (const it of s.items) if (it.status === "lead") {
  leads++; if (barbKeys.has(`${s.slug}::${norm(it.item)}`)) leadsTrue++;
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "n/a");
console.log(`Full Barb findings:        ${barb.length}`);
console.log(`Caught (lead or unsure):   ${caught.length} (${pct(caught.length, barb.length - unmatched.length)})`);
console.log(`  cited range holds line:  ${located.length}`);
console.log(`MISSED (Kev said clear):   ${missed.length}`);
console.log(`Set aside as not-checkable:${renderOnly.length}`);
console.log(`MISSED (skill skipped):    ${skippedMiss.length}`);
console.log(`Leads that were real:      ${leadsTrue}/${leads} (${pct(leadsTrue, leads)})`);
if (unmatched.length) console.log(`Unmatched items:           ${unmatched.length} (checklist text differs — check skill versions)`);
for (const { f, it } of missed) console.log(`  missed: ${f.skill} — ${f.checklistItem} @ ${f.file}:${f.line} (p=${it.p})`);
