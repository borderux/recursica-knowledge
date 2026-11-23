import { test } from "node:test";
import assert from "node:assert/strict";
import { KIT_PINS, WAITING, pinsToRefresh, waitingMoves } from "./images.mjs";

const OLD_PINS = ["caddy:2", "postgres:16", "redis:7-alpine", "cgr.dev/chainguard/minio:latest", "nousresearch/hermes-agent:latest"];

test("only the pins of the kit's own images move: no image of CircleChat 1.x is pulled", () => {
  const lock = Object.fromEntries([...OLD_PINS, "ghcr.io/berriai/litellm:main-stable", "node:22-alpine", "node:22"].map((t) => [t, { ref: `${t}@sha256:x` }]));
  assert.deepEqual(pinsToRefresh(lock), ["ghcr.io/berriai/litellm:main-stable", "node:22-alpine", "node:22"]);
  for (const t of OLD_PINS) assert.ok(!KIT_PINS.includes(t), t);
});

test("Presidio's pins move with the kit's other pins, when the stack masks personal details", () => {
  const lock = { "mcr.microsoft.com/presidio-analyzer:latest": { ref: "a" }, "mcr.microsoft.com/presidio-anonymizer:latest": { ref: "b" } };
  assert.deepEqual(pinsToRefresh(lock), Object.keys(lock));
});

test("pin moves wait only when the update job found RecursicaChat busy; run by hand, they move as before", () => {
  const moves = [{ tag: "node:22-alpine", use: "x", changed: true }];
  assert.deepEqual(waitingMoves(moves, "no"), moves);
  assert.deepEqual(waitingMoves(moves, "yes"), []);
  assert.deepEqual(waitingMoves(moves, undefined), []);
  assert.equal(WAITING, 75);
});
