// Where a model request's time goes (waits.mjs): the lanes that estimate a request's wait at its
// model server, and the spend log's wait fields. Pure functions; nothing here reaches a server.
import assert from "node:assert/strict";
import test from "node:test";
import { createLanes, waitFields } from "./waits.mjs";

test("a model with free slots starts a request at once; a full one queues it, oldest first", () => {
  const lanes = createLanes((m) => (m === "m1/ollama/large" ? 2 : null));
  const a = lanes.enter("m1/ollama/large", 0);
  const b = lanes.enter("m1/ollama/large", 10);
  const c = lanes.enter("m1/ollama/large", 20);
  const d = lanes.enter("m1/ollama/large", 30);
  assert.deepEqual([a.slotAt, b.slotAt, c.slotAt, d.slotAt], [0, 10, null, null]);
  assert.deepEqual([c.ahead, d.ahead], [1, 2], "how many requests were waiting, this one included");
  assert.deepEqual(lanes.state("m1/ollama/large"), { busy: 2, waiting: 2 });
  lanes.leave(b, 500);
  assert.deepEqual([c.slotAt, d.slotAt], [500, null], "the oldest waiting request takes the freed slot");
  lanes.leave(a, 700);
  assert.equal(d.slotAt, 700);
  assert.deepEqual(lanes.state("m1/ollama/large"), { busy: 2, waiting: 0 });
});

test("a request that ends while still waiting leaves the queue without taking a slot, and leaving twice counts once", () => {
  const lanes = createLanes(() => 1);
  const a = lanes.enter("m", 0);
  const b = lanes.enter("m", 5);
  const c = lanes.enter("m", 6);
  lanes.leave(b, 50);   // the caller went away, or the try failed, before a slot came
  assert.deepEqual(lanes.state("m"), { busy: 1, waiting: 1 });
  lanes.leave(a, 100);
  lanes.leave(a, 120);
  assert.equal(c.slotAt, 100);
  assert.deepEqual(lanes.state("m"), { busy: 1, waiting: 0 });
});

test("a model whose server sets no parallel in site.json has no lane: no wait is estimated", () => {
  const lanes = createLanes(() => null);
  const ts = [0, 1, 2].map((at) => lanes.enter("m", at));
  assert.deepEqual(ts.map((t) => [t.slotAt, t.ahead]), [[0, 0], [1, 0], [2, 0]]);
  assert.deepEqual(lanes.state("m"), { busy: 0, waiting: 0 });
});

test("the spend log's wait fields: the gateway's wait, the server's estimated wait, the upstream time and the tries", () => {
  assert.deepEqual(waitFields({ receivedAt: 1000, sentAt: 1040, endAt: 9040, tries: 3 }),
    { gateway_wait_ms: 40, upstream_ms: 8000, tries: 3 }, "a cloud request, or a model with no lane: no server wait");
  assert.deepEqual(waitFields({ receivedAt: 0, sentAt: 10, endAt: 5000, ticket: { slotAt: 10, ahead: 0 }, tries: 1 }),
    { gateway_wait_ms: 10, upstream_ms: 4990, tries: 1, server_wait_ms: 0 });
  assert.deepEqual(waitFields({ receivedAt: 0, sentAt: 10, endAt: 5000, ticket: { slotAt: 3010, ahead: 2 }, tries: 1 }),
    { gateway_wait_ms: 10, upstream_ms: 4990, tries: 1, server_wait_ms: 3000, ahead: 2 });
  assert.equal(waitFields({ receivedAt: 0, sentAt: 10, endAt: 900, ticket: { slotAt: null, ahead: 1 } }).server_wait_ms, 890,
    "a request that ended still waiting waited its whole time upstream");
});
