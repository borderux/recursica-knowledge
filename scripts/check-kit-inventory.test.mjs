/**
 * Tests for the kit inventory check.
 *
 * Two behaviours here were wrong in the first draft and looked right. Reading only the kit's
 * top-level `variants` called the chip skill wrong for listing an `error` state the kit nests
 * inside each selection state; and without the shared-axis rule, a tab set's `styles` — written
 * once in the skill, repeated on `tabs-item` in the kit — read as missing. The last test runs the
 * check on the real skills against the pinned release, which is what makes drift fail CI.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readInventory,
  kitAxes,
  compare,
  checkAll,
  KNOWN,
} from "./check-kit-inventory.mjs";

const leaf = { color: { $type: "color", $value: "#000" } };
const KIT = {
  chip: {
    variants: {
      "selection-states": {
        selected: { variants: { states: { error: leaf } } },
        unselected: leaf,
      },
    },
  },
  tabs: { variants: { styles: { default: leaf, pills: leaf } } },
  "tabs-item": { variants: { styles: { default: leaf, pills: leaf } } },
  modal: { properties: leaf },
};
const names = new Set(Object.keys(KIT));

const skill = (whatExists) =>
  `# X\n\n## When not to use a widget\n\nText.\n\n## Variants\n\n${whatExists}\n\n## Rules\n\nText.\n`;

test("kitAxes collects axes at every depth", () => {
  assert.deepEqual(Object.keys(kitAxes(KIT.chip)).sort(), [
    "selection-states",
    "states",
  ]);
  assert.deepEqual(Object.keys(kitAxes(KIT.chip).states), ["error"]);
});

test("readInventory reads the Axis | Options | React prop shape against the component the section names", () => {
  const inv = readInventory(
    skill(
      "Taken from `recursica_ui-kit.json` → `ui-kit.components.chip`.\n\n| Axis | Options | React prop |\n| --- | --- | --- |\n| `selection-states` | `selected`, `unselected` | |\n| `states` | `error` | |",
    ),
    names,
  );
  assert.deepEqual([...inv.components], ["chip"]);
  assert.deepEqual(inv.axes.get("chip").get("states"), ["error"]);
});

test("readInventory reads a Component | Axis | Options table and a 'no axes' row", () => {
  const inv = readInventory(
    skill(
      "Taken from `recursica_ui-kit.json`.\n\n| Spec | Axis | Options |\n| --- | --- | --- |\n| `modal` | (none) | — |\n| `tabs` | `styles` | `default`, `pills` |",
    ),
    names,
  );
  assert.deepEqual([...inv.components].sort(), ["modal", "tabs"]);
  assert.equal(inv.axes.get("modal").size, 0);
});

test("a table with no Axis column is not read as an inventory", () => {
  const inv = readInventory(
    skill(
      "Taken from `ui-kit.components.modal`.\n\n| Choice | Options |\n| --- | --- |\n| Style | Elevation |",
    ),
    names,
  );
  assert.equal(inv.axes.get("modal"), undefined);
});

test("a nested axis the skill lists is correct, and one it leaves out is reported", () => {
  const listed = readInventory(
    skill(
      "`ui-kit.components.chip`\n\n| Axis | Options |\n| --- | --- |\n| `selection-states` | `selected`, `unselected` |\n| `states` | `error` |",
    ),
    names,
  );
  assert.deepEqual(compare(listed, KIT), []);
  const missing = readInventory(
    skill(
      "`ui-kit.components.chip`\n\n| Axis | Options |\n| --- | --- |\n| `selection-states` | `selected`, `unselected` |",
    ),
    names,
  );
  assert.deepEqual(
    compare(missing, KIT).map((p) => p.key),
    ["chip.states"],
  );
});

test("an axis written once for a component's parts counts for every part that shares it", () => {
  const inv = readInventory(
    skill(
      "Taken from `recursica_ui-kit.json` → `ui-kit.components.tabs` and `tabs-item`.\n\n| Axis | Options |\n| --- | --- |\n| `styles` | `default`, `pills` |",
    ),
    names,
  );
  assert.deepEqual([...inv.components].sort(), ["tabs", "tabs-item"]);
  assert.deepEqual(compare(inv, KIT), []);
});

test("an option the kit lacks and an option the skill leaves out are both reported", () => {
  const inv = readInventory(
    skill(
      "`ui-kit.components.tabs`\n\n| Axis | Options |\n| --- | --- |\n| `styles` | `default`, `ghost` |",
    ),
    names,
  );
  assert.deepEqual(
    compare(inv, KIT)
      .map((p) => p.key)
      .sort(),
    ["tabs.styles.ghost", "tabs.styles.pills"],
  );
});

test("a KNOWN entry the skill and kit no longer disagree about fails, so the list cannot go stale", () => {
  const kit = { version: "test", components: KIT };
  const { problems } = checkAll({
    kit,
    known: { "nothing.here": "resolved long ago" },
  });
  assert.ok(
    problems.some(
      (p) => p.key === "nothing.here" && /now agree/.test(p.message),
    ),
  );
});

test("every component skill's inventory matches the pinned kit, apart from the logged mismatches", () => {
  const { compared, problems, acknowledged } = checkAll();
  assert.ok(
    compared >= 39,
    `expected every component skill to name a kit spec, compared ${compared}`,
  );
  assert.deepEqual(
    problems.map((p) => `${p.file}: ${p.message}`),
    [],
  );
  assert.equal(
    acknowledged.length,
    Object.keys(KNOWN).length,
    "each KNOWN entry should match exactly one mismatch",
  );
});
