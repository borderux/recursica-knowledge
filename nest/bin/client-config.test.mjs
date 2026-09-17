import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseBlock,
  parseChannel,
  parseCommunity,
  mergeConfig,
  formatBlock,
} from "./lib/client-config.mjs";

const COMMUNITY = `
# Client configuration

## client: acme

- slug: acme
- bq_project: a-project
- bq_dataset: acme_dataset
- drive_folder: FOLDERID
- tag_sheet: SHEETID

## client: other

- slug: other
- bq_project: a-project
- bq_dataset: other_dataset
- drive_folder: OTHERFOLDER
`;

test("a channel naming no client is unconfigured, not empty", () => {
  // Six of seven channels in a real community are in this state, and it is the fence:
  // an agent in one of them cannot reach any client's data.
  assert.equal(parseChannel("").client, null);
  assert.equal(parseChannel("## General\n\nnotes about nothing\n").client, null);
});

test("a key present but blank is still unconfigured", () => {
  // Documentation pasted into a canvas contains an empty example block. Reading the key as
  // present would turn "not set up" into "set up with nothing in it".
  const canvas = "## Claire config\n\n- slug:\n- drive_folder:\n";
  assert.equal(parseChannel(canvas).client, null);
});

test("the one-line form names the client and nothing else", () => {
  const { client, values } = parseChannel("## Claire config\n\n- client: acme\n");
  assert.equal(client, "acme");
  assert.equal(values.slug, "acme");
  assert.equal(values.drive_folder, undefined);
});

test("today's whole-block form still works and still wins", () => {
  const canvas =
    "## Claire config\n\n- slug: acme\n- bq_project: p\n- bq_dataset: d\n- drive_folder: f\n";
  const { client, values } = parseChannel(canvas);
  assert.equal(client, "acme");
  assert.equal(values.bq_dataset, "d");
});

test("a block ends at the next heading", () => {
  const canvas =
    "## Claire config\n\n- slug: acme\n\n## Janice routing\n\n- claire_channel: UUID\n";
  const parsed = parseBlock(canvas, "Claire config");
  assert.equal(parsed.slug, "acme");
  assert.equal(parsed.claire_channel, undefined);
});

test("the community answers for the client asked about, never another", () => {
  assert.equal(parseCommunity(COMMUNITY, "acme").bq_dataset, "acme_dataset");
  assert.equal(parseCommunity(COMMUNITY, "other").bq_dataset, "other_dataset");
});

test("an unlabelled community block is not handed to a different client", () => {
  // The failure this prevents is the whole design: one client's channel reading another
  // client's dataset because the note happened to be the only one present.
  const single = "## Claire config\n\n- slug: acme\n- bq_dataset: acme_dataset\n";
  assert.equal(parseCommunity(single, "acme").bq_dataset, "acme_dataset");
  assert.deepEqual(parseCommunity(single, "other"), {});
});

test("an unlabelled block with no slug is taken at face value", () => {
  // The one-client community that never wrote the slug down. Nothing says it is the wrong
  // client, so it is used; the caller still refuses if a fence key is missing.
  const single = "## Claire config\n\n- bq_project: p\n- bq_dataset: d\n- drive_folder: f\n";
  assert.equal(parseCommunity(single, "acme").bq_dataset, "d");
});

test("the channel fills in over the community", () => {
  const { values, conflicts } = mergeConfig(
    { slug: "acme", tag_sheet: "CHANNELSHEET" },
    { slug: "acme", bq_dataset: "acme_dataset", drive_folder: "F", tag_sheet: "OLD" },
  );
  assert.equal(conflicts.length, 0);
  assert.equal(values.bq_dataset, "acme_dataset");
  assert.equal(values.tag_sheet, "CHANNELSHEET");
});

test("disagreement about the fence is refused, never resolved", () => {
  // "The channel wins" is fine for a tag sheet and unsafe for a dataset: the two sources
  // disagreeing means one is pointed at a different client, and preferring either silently
  // is a fence that fails open.
  const { conflicts } = mergeConfig(
    { slug: "acme", bq_dataset: "acme_dataset" },
    { slug: "acme", bq_dataset: "other_dataset" },
  );
  assert.deepEqual(conflicts, ["bq_dataset"]);
});

test("a tag sheet disagreeing is not a conflict", () => {
  const { conflicts, values } = mergeConfig(
    { slug: "acme", tag_sheet: "A" },
    { slug: "acme", tag_sheet: "B" },
  );
  assert.deepEqual(conflicts, []);
  assert.equal(values.tag_sheet, "A");
});

test("a half-answered config is reported as incomplete", () => {
  const { missing } = mergeConfig({ slug: "acme" }, {});
  assert.deepEqual(missing.sort(), ["bq_dataset", "drive_folder"]);
});

test("the resolved block round-trips through the parser", () => {
  const values = {
    slug: "acme",
    bq_project: "p",
    bq_dataset: "d",
    drive_folder: "f",
    tag_sheet: "s",
  };
  const parsed = parseChannel(formatBlock(values));
  assert.equal(parsed.client, "acme");
  for (const [k, v] of Object.entries(values)) assert.equal(parsed.values[k], v, k);
});

test("keys are matched exactly, not loosely", () => {
  // `project:` and `dataset:` are named in the prompt as the same class of failure as an
  // empty block. Reading around them is how a channel ends up half-configured.
  const canvas = "## Claire config\n\n- slug: acme\n- project: p\n- dataset: d\n";
  const { values } = parseChannel(canvas);
  assert.equal(values.bq_project, undefined);
  assert.equal(values.bq_dataset, undefined);
});
