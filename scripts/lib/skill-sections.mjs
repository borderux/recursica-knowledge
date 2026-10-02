/**
 * The headings of a component skill, and how to find each section.
 *
 * A component skill's headings name the component — "When to use a button", "Rules for buttons" —
 * so a heading cannot be matched as a fixed string. Each section has a role, and the role is
 * matched by the heading's shape. The inventory section has no fixed shape at all ("Button styles,
 * sizes and states", "Modal parts"), so it is found by position: the section right before
 * "Rules for …", which comes after "When not to use …". Most skills put it straight after "When not
 * to use …", but the card skill has two sections of its own in between, so "right before the
 * rules" is the position every skill shares.
 */

export const LOAD_HEADING = "Skills to read with this one";
export const IF_USED_HEADING =
  "### Only if the screen also uses those components";
export const UNCOVERED_HEADING = "Open questions: ask, do not decide";
export const CHECKLIST_HEADING = "Pre-flight checklist";

/** The nine sections of a component skill, in order. `match` is null for the inventory. */
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
    label: "<Component> parts, styles, sizes or states",
    match: null,
  },
  {
    role: "rules",
    label: "Rules for <components>",
    match: (t) => /^Rules for .+/.test(t),
  },
  {
    role: "accessibility",
    label: "Accessibility",
    match: (t) => t === "Accessibility",
  },
  {
    role: "styling",
    label: "Styling the <component> sets itself",
    match: (t) => /^Styling the .+ sets itself$/.test(t),
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
  if (role === "inventory") {
    const avoid = heads.findIndex((h) => /^When not to use .+/.test(h.title));
    const rules = heads.findIndex((h) => /^Rules for .+/.test(h.title));
    if (avoid < 0) return undefined;
    if (rules < 0) return heads[avoid + 1];
    return rules - 1 > avoid ? heads[rules - 1] : undefined;
  }
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
