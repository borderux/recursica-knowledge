import { test } from "node:test";
import assert from "node:assert/strict";
import { HERMES_TAG, RETIRED_PINS, WAITING, pinsToRefresh, waitingMoves } from "./images.mjs";

const lock = Object.fromEntries(["caddy:2", "postgres:16", "redis:7-alpine", "cgr.dev/chainguard/minio:latest", HERMES_TAG, ...RETIRED_PINS].map((t) => [t, { ref: `${t}@sha256:x` }]));

test("every pin moves while CircleChat 1.x runs", () => {
  assert.deepEqual(pinsToRefresh(lock, false), Object.keys(lock));
});

test("with CircleChat 1.x retired, only the pins of the gateway's images and node:22 move: no CircleChat image and no Hermes image is pulled", () => {
  assert.deepEqual(pinsToRefresh(lock, true), RETIRED_PINS);
  assert.ok(!pinsToRefresh(lock, true).includes(HERMES_TAG));
});

test("pin moves wait only when the update job found RecursicaChat busy; run by hand, they move as before", () => {
  const moves = [{ tag: "node:22-alpine", use: "x", changed: true }];
  assert.deepEqual(waitingMoves(moves, "no"), moves);
  assert.deepEqual(waitingMoves(moves, "yes"), []);
  assert.deepEqual(waitingMoves(moves, undefined), []);
  assert.equal(WAITING, 75);
});
