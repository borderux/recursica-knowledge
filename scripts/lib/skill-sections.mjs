/**
 * The headings of a component skill, and how to find each section.
 *
 * Most headings are fixed words: "Variants", "Rules", "Related skills". Two name the component —
 * "When to use a button", "When not to use a button" — so they are matched by shape.
 */

export const LOAD_HEADING = "Related skills";
export const IF_USED_HEADING = "### Only if used on the same screen";
export const UNCOVERED_HEADING = "Open questions";
export const CHECKLIST_HEADING = "Pre-flight checklist";

/** The nine sections of a component skill, in order. */
export const COMPONENT_ROLES = [
  {
    role: "use",
    label: "When to use <a component>",
    match: (t) => /^When to use .+/.test(t),
  },
  {
    role: "avoid",
    label: "When not to use <a component>",
    match: (t) => /^When not to use .+/.test(t),
  },
  {
    role: "inventory",
    label: "Variants",
    match: (t) => t === "Variants",
  },
  {
    role: "rules",
    label: "Rules",
    match: (t) => t === "Rules",
  },
  {
    role: "accessibility",
    label: "Accessibility",
    match: (t) => t === "Accessibility",
  },
  {
    role: "styling",
    label: "Styling set by tokens",
    match: (t) => t === "Styling set by tokens",
  },
  { role: "load", label: LOAD_HEADING, match: (t) => t === LOAD_HEADING },
  {
    role: "uncovered",
    label: UNCOVERED_HEADING,
    match: (t) => t === UNCOVERED_HEADING,
  },
  {
    role: "checklist",
    label: CHECKLIST_HEADING,
    match: (t) => t === CHECKLIST_HEADING,
  },
];

/** Every `## ` heading outside fenced code: `{ title, line, index }`, line 1-based, index in text. */
export function h2s(text) {
  const out = [];
  let fenced = false;
  let index = 0;
  text.split("\n").forEach((l, i) => {
    if (/^\s*```/.test(l)) fenced = !fenced;
    const m = !fenced && l.match(/^## (.+?)\s*$/);
    if (m) out.push({ title: m[1], line: i + 1, index });
    index += l.length + 1;
  });
  return out;
}

/** The heading that plays `role` in a component skill, or undefined. */
export function headingFor(text, role) {
  const heads = h2s(text);
  const r = COMPONENT_ROLES.find((x) => x.role === role);
  return heads.find((h) => r.match(h.title));
}

/** The body of the section that plays `role`, without its heading, or "" if there is none. */
export function sectionBody(text, role) {
  const heads = h2s(text);
  const h = headingFor(text, role);
  if (!h) return "";
  const next = heads.find((x) => x.index > h.index);
  const start = text.indexOf("\n", h.index) + 1;
  return text.slice(start, next ? next.index : text.length);
}
