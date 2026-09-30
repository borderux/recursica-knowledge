import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canonicalAgentName,
  portableAgentName,
  installQualifier,
  matchAgents,
  sameAgent,
} from "./agent-names.mjs";

/**
 * The repository's own agent list. What it contains is the whole mechanism: it is what
 * decides whether the bracketed half of a name is the agent or the qualifier.
 */
const KNOWN = ["claire", "stu", "barb", "janice", "alan", "loki", "betty"];

test("the owner-suffix form is unchanged by the inverted-form support", () => {
  assert.equal(canonicalAgentName("Claire (Alex)"), "Claire");
  assert.equal(portableAgentName("Claire (Alex)", KNOWN), "Claire");
  assert.equal(portableAgentName("Claire", KNOWN), "Claire");
  assert.equal(portableAgentName("claire", KNOWN), "claire");
});

test("a qualifier outside the brackets resolves to the agent inside", () => {
  assert.equal(portableAgentName("acme (Claire)", KNOWN), "Claire");
  assert.equal(portableAgentName("Some.Client (Stu)", KNOWN), "Stu");
});

test("the outer half wins when it names an agent the repo holds", () => {
  // Both halves are agents here. Reading it inside-out would file Stu's install under
  // barb, and a draft-update would then send Barb's prompt to Stu.
  assert.equal(portableAgentName("Stu (Barb)", KNOWN), "Stu");
});

test("with no list, nothing is read inside-out", () => {
  // A guess that invents a match is worse than no match: the caller's next move is a
  // draft-update against whatever it resolved.
  assert.equal(portableAgentName("acme (Claire)"), "acme");
  assert.equal(portableAgentName("acme (Claire)", []), "acme");
});

test("a name matching nothing either way keeps its outer half", () => {
  assert.equal(portableAgentName("acme (Nobody)", KNOWN), "acme");
  assert.equal(portableAgentName("Unknown", KNOWN), "Unknown");
});

test("a name that is nothing but brackets is not reduced away", () => {
  assert.equal(portableAgentName("(Claire)", KNOWN), "Claire");
  assert.equal(portableAgentName("(Nobody)", KNOWN), "(Nobody)");
});

test("the qualifier is whichever half is not the agent", () => {
  assert.equal(installQualifier("acme (Claire)", "claire"), "acme");
  assert.equal(installQualifier("Claire (Alex)", "claire"), "Alex");
  assert.equal(installQualifier("Claire", "claire"), null);
});

test("every install of one agent is returned, in both naming forms", () => {
  const personas = [
    { name: "Claire (Alex)", display_name: "Claire (Alex)" },
    { name: "acme (Claire)", display_name: "acme (Claire)" },
    { name: "other-client (Claire)", display_name: "other-client (Claire)" },
    { name: "Stu (Alex)", display_name: "Stu (Alex)" },
  ];
  const matched = matchAgents(personas, { name: "Claire" }, KNOWN);
  assert.deepEqual(
    matched.map((p) => p.name),
    ["Claire (Alex)", "acme (Claire)", "other-client (Claire)"],
  );
});

test("an exact match no longer hides the other installs", () => {
  // It used to win outright, on the reasoning that the operator had said which Claire
  // was meant. With one install per client they all are, and the ones it hid were the
  // fenced ones — so they drifted with nothing reporting it.
  const personas = [
    { name: "Claire", display_name: "Claire" },
    { name: "acme (Claire)", display_name: "acme (Claire)" },
  ];
  assert.equal(matchAgents(personas, { name: "Claire" }, KNOWN).length, 2);
});

test("matching without a list still finds the owner-suffix form", () => {
  const personas = [
    { name: "Claire (Alex)", display_name: "Claire (Alex)" },
    { name: "acme (Claire)", display_name: "acme (Claire)" },
  ];
  assert.deepEqual(
    matchAgents(personas, { name: "Claire" }).map((p) => p.name),
    ["Claire (Alex)"],
  );
});

test("sameAgent is untouched", () => {
  assert.ok(sameAgent("Claire (Alex)", "Claire"));
  assert.ok(!sameAgent("acme (Claire)", "Claire"));
  assert.ok(!sameAgent("", "Claire"));
});
