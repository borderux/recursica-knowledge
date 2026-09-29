import fs from "node:fs";

// Same section rule as the manifest script, so both read a skill the same way.
export function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) return null;
  const from = start + heading.length + 5;
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
    if (body) parts.push(`## ${h}\n${body.trim()}`);
  }
  const out = parts.length ? parts.join("\n\n") : text;
  return out.length > cap ? out.slice(0, cap) + "\n…(truncated)" : out;
}

export function loadSkill({ slug, path }) {
  const text = fs.readFileSync(path, "utf8");
  const uncovered = section(text, "Uncovered — ask, do not invent");
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
