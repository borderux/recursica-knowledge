/**
 * Tests for the screen → skills manifest.
 *
 * Two of these exist because the behaviour they assert was wrong in the first draft and looked
 * right: the cross-link parser returned empty for every skill, and a route that renders a table
 * through a shared wrapper resolved to no table skill at all. Both failed silently — no throw, no
 * empty output, just a shorter list than it should have been. Those are the two tests to keep if
 * anything here is ever trimmed.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { adapterImports, resolveImport, manifest, localGraph, skillFor } from "./screen-skill-manifest.mjs";

test("adapterImports reads a multi-line import and ignores other packages", () => {
  const source = `
import { useState } from 'react'
import {
  Badge, Button,
  TextField,
} from '@recursica/mantine-adapter'
import { Link as RouterLink } from 'react-router'
`;
  assert.deepEqual(adapterImports(source), ["Badge", "Button", "TextField"]);
});

test("adapterImports keeps the imported name, not the local alias", () => {
  const source = `import { Link as AdapterLink, Text } from "@recursica/mantine-adapter"`;
  assert.deepEqual(adapterImports(source), ["Link", "Text"]);
});

test("a component whose skill slug matches its name resolves straight through", () => {
  assert.deepEqual(resolveImport("Badge"), {
    name: "Badge", kind: "component", skills: ["recursica-skill-badge"], match: "exact",
  });
});

test("TextArea resolves to recursica-skill-textarea, not recursica-skill-text-area", () => {
  // The kebab-case guess is `text-area` and there is no such skill. Resolved by normalising both
  // sides rather than by an alias entry — the same off-by-one spelling was written into app source
  // and only a failing build caught it, whereas a missing skill would have failed silently.
  const r = resolveImport("TextArea");
  assert.equal(r.kind, "component");
  assert.deepEqual(r.skills, ["recursica-skill-textarea"]);
  assert.equal(skillFor("TextArea").match, "exact");
});

test("Radio, HoverCard and Popover resolve by matching, with no alias table", () => {
  // Each of these differs from its skill's slug by more than punctuation, and all three resolve
  // without an entry anywhere. The assertion that matters is `match: "partial"` — it is the proof
  // that comparison did the work, so re-adding a hardcoded alias would fail this test.
  assert.deepEqual(resolveImport("Radio").skills, ["recursica-skill-radio-button"]);
  assert.equal(skillFor("Radio").match, "partial");

  assert.deepEqual(resolveImport("HoverCard").skills, ["recursica-skill-hover-card-popover"]);
  assert.deepEqual(resolveImport("Popover").skills, ["recursica-skill-hover-card-popover"]);
  assert.equal(skillFor("Popover").match, "partial", "matches the tail of the slug");
});

test("an ambiguous name is reported rather than guessed at", () => {
  // `Text` is a substring of both `textarea` and `text-field`. Picking either would be wrong in a
  // way nothing downstream could detect, so matching refuses and a route answers it instead.
  const m = skillFor("Text");
  assert.equal(m.match, "ambiguous");
  assert.ok(m.slugs.length > 1, "more than one candidate");

  // And the route is what resolves it, to neither candidate.
  const r = resolveImport("Text");
  assert.equal(r.kind, "design");
  assert.deepEqual(r.skills, ["recursica-skill-typography-semantics"]);
});

test("a name matching nothing and having no route surfaces in uncovered", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  const file = path.join(dir, "Screen.jsx");
  fs.writeFileSync(file, `import { Zzyzx } from '@recursica/mantine-adapter'\n`);
  assert.deepEqual(manifest([file]).uncovered.unmappedImports, ["Zzyzx"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a layout primitive resolves to a design-rules skill rather than being dropped", () => {
  const r = resolveImport("Stack");
  assert.equal(r.kind, "design");
  assert.deepEqual(r.skills, ["recursica-skill-screen-scaffolding"]);
});

test("an unknown import is reported as unmapped, never silently skipped", () => {
  const r = resolveImport("NotAComponent");
  assert.equal(r.kind, "unmapped");
  assert.deepEqual(r.skills, []);
});

test("cross-links parse to a non-empty list for a component skill", () => {
  // The regression test for the silent-empty parser. `recursica-skill-badge` names
  // `recursica-skill-badges-chips` first in its `## Load these too`, so a screen importing Badge
  // must reach the badges design rules. The broken version returned [] here and threw nothing.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  const file = path.join(dir, "Screen.jsx");
  fs.writeFileSync(file, `import { Badge } from '@recursica/mantine-adapter'\n`);
  const slugs = manifest([file]).skills.map((s) => s.slug);
  assert.ok(slugs.includes("recursica-skill-badge"), "the component skill");
  assert.ok(slugs.includes("recursica-skill-badges-chips"), "reached only through ## Load these too");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a table rendered through a local wrapper still reaches the tables skill", () => {
  // The other silent failure. The screen imports no adapter Table; the wrapper it renders does.
  // Scanning the screen alone yields no table component and no tables rules.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  fs.writeFileSync(path.join(dir, "DataTable.jsx"),
    `import { Table } from '@recursica/mantine-adapter'\nexport function DataTable() {}\n`);
  const screen = path.join(dir, "Screen.jsx");
  fs.writeFileSync(screen,
    `import { Text } from '@recursica/mantine-adapter'\nimport { DataTable } from './DataTable.jsx'\n`);

  const slugs = manifest([screen]).skills.map((s) => s.slug);
  assert.ok(slugs.includes("recursica-skill-table"), "component skill via the wrapper");
  assert.ok(slugs.includes("recursica-skill-tables"), "design rules via the wrapper");

  // And the narrow claim, so a future refactor cannot pass this test by widening ALWAYS instead.
  assert.deepEqual(adapterImports(fs.readFileSync(screen, "utf8")), ["Text"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("localGraph follows relative imports transitively and stops at packages", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  fs.writeFileSync(path.join(dir, "c.jsx"), `export const c = 1\n`);
  fs.writeFileSync(path.join(dir, "b.jsx"), `import { c } from './c.jsx'\n`);
  const a = path.join(dir, "a.jsx");
  fs.writeFileSync(a, `import { b } from './b.jsx'\nimport React from 'react'\n`);

  const files = [...localGraph(a)].map((f) => path.basename(f)).sort();
  assert.deepEqual(files, ["a.jsx", "b.jsx", "c.jsx"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("localGraph survives a cycle", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  fs.writeFileSync(path.join(dir, "x.jsx"), `import { y } from './y.jsx'\n`);
  fs.writeFileSync(path.join(dir, "y.jsx"), `import { x } from './x.jsx'\n`);
  const files = [...localGraph(path.join(dir, "x.jsx"))];
  assert.equal(files.length, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the always-on skills are present even for a screen importing nothing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  const file = path.join(dir, "Empty.jsx");
  fs.writeFileSync(file, `export function Empty() { return null }\n`);
  const slugs = manifest([file]).skills.map((s) => s.slug);
  // These are the rules about the screen itself, which no import can ever signal.
  for (const s of ["recursica-skill-screen-scaffolding", "recursica-skill-screen-priority"]) {
    assert.ok(slugs.includes(s), s);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test("every skill in a manifest carries a resolvable path", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "barb-"));
  const file = path.join(dir, "Screen.jsx");
  fs.writeFileSync(file, `import { Table, Modal } from '@recursica/mantine-adapter'\n`);
  for (const s of manifest([file]).skills) {
    assert.ok(s.path, `${s.slug} has no path`);
    assert.ok(fs.existsSync(s.path), `${s.path} does not exist`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});
