import fs from "node:fs";

// Two component headings name the component — "When to use a button" — and are matched by shape;
// the rest are fixed words, as in scripts/lib/skill-sections.mjs. Kev runs on its own and does not
// import from scripts/, so the headings are repeated here.
export const UNCOVERED_HEADING = "Open questions";
// The inventory is the section headed "Variants".
export const INVENTORY = Symbol("inventory");

const titles = (text) => [...text.matchAll(/^## (.+?)[ \t]*$/gm)].map((m) => m[1]);

// The heading `want` names in this skill: an exact title, a RegExp, or INVENTORY.
export function findHeading(text, want) {
  const all = titles(text);
  if (want === INVENTORY) return all.includes("Variants") ? "Variants" : null;
  if (want instanceof RegExp) return all.find((t) => want.test(t)) ?? null;
  return all.includes(want) ? want : null;
}

// Same section rule as the manifest script, so both read a skill the same way. `heading` is
// anything findHeading takes.
export function section(text, heading) {
  const title = findHeading(text, heading);
  if (title === null) return null;
  const start = text.indexOf(`\n## ${title}\n`);
  if (start === -1) return null;
  const from = start + title.length + 5;
  const next = text.indexOf("\n## ", from);
  return next === -1 ? text.slice(from) : text.slice(from, next);
}

// Checklist items are "- [ ] ..." with indented continuation lines.
export function checklistItems(text) {
  const body = section(text, "Pre-flight checklist");
  if (!body) return [];
  const items = [];
  for (const line of body.split("\n")) {
    if (/^- \[ \]\s/.test(line)) items.push(line.replace(/^- \[ \]\s+/, "").trim());
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += " " + line.trim();
  }
  return items;
}

// A compact version of the skill for per-chunk questions.
export function brief(text, sections, cap) {
  const parts = [];
  for (const h of sections) {
    const body = section(text, h);
    if (body) parts.push(`## ${findHeading(text, h)}\n${body.trim()}`);
  }
  const out = parts.length ? parts.join("\n\n") : text;
  return out.length > cap ? out.slice(0, cap) + "\n…(truncated)" : out;
}

export function loadSkill({ slug, path }) {
  const text = fs.readFileSync(path, "utf8");
  const uncovered = section(text, UNCOVERED_HEADING);
  const desc = (text.match(/^description:\s*(.+)$/m) ?? [])[1] ?? slug;
  return {
    slug,
    path,
    text,
    description: desc.trim(),
    items: checklistItems(text),
    uncovered: uncovered ? uncovered.trim() : null,
  };
}
