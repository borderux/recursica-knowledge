// Where a model request's time goes, for the spend log: waiting at the gateway, waiting at the model
// server, and the server's own work.
//
// The gateway's wait is measured: from the request's arrival to the send of the try that answers it,
// so it holds every retry, back-off and wait for a busy cluster or for the task's own wait. The model
// server's wait is estimated, because LiteLLM's answer drops Ollama's own timings: the gateway sees
// every request it sends to each cluster model, and a server with `parallel` slots for a model starts
// them in the order they came, so a request sent while every slot is busy waits until the oldest
// request ahead of it ends. Requests that reach the server some other way (a bench, a person's curl)
// don't count, so the estimate is a floor.

/**
 * The lanes of the cluster's models: one per model, with its slots (`parallel`) taken and the requests
 * waiting for one. `parallelOf(model)` is the server's parallel setting for the model, or null when
 * site.json leaves it to the server, and then no wait is estimated.
 */
export function createLanes(parallelOf) {
  const lanes = new Map();
  const lane = (model) => {
    if (!lanes.has(model)) lanes.set(model, { busy: 0, waiting: [] });
    return lanes.get(model);
  };
  return {
    /** A request sent to `model` at `at`: its ticket, with slotAt set now when a slot is free. */
    enter(model, at) {
      const t = { model, sentAt: at, slotAt: null, ahead: 0 };
      const p = parallelOf(model);
      const l = lane(model);
      if (!p) {
        t.slotAt = at;
        return t;
      }
      if (l.busy < p) {
        l.busy++;
        t.slotAt = at;
      } else {
        t.ahead = l.waiting.length + 1;
        l.waiting.push(t);
      }
      return t;
    },
    /** The request ended at `at`: its slot passes to the oldest request waiting for one. */
    leave(t, at) {
      const p = parallelOf(t.model);
      if (!p || t.left) return;
      t.left = true;
      const l = lane(t.model);
      if (t.slotAt === null) {
        l.waiting = l.waiting.filter((x) => x !== t);
        return;
      }
      l.busy--;
      while (l.waiting.length && l.busy < p) {
        const next = l.waiting.shift();
        next.slotAt = at;
        l.busy++;
      }
    },
    /** For the tests and a health line: each model's slots taken and requests waiting. */
    state: (model) => ({ busy: lane(model).busy, waiting: lane(model).waiting.length }),
  };
}

/**
 * A request's wait fields for its spend log line, in milliseconds: gateway_wait_ms, then for a
 * cluster model server_wait_ms (estimated, as above), and upstream_ms, from the send of the
 * answering try to the answer's end; tries is how many tries the gateway sent.
 */
export function waitFields({ receivedAt, sentAt, endAt, ticket = null, tries = 1 }) {
  const out = { gateway_wait_ms: Math.max(0, sentAt - receivedAt), upstream_ms: Math.max(0, endAt - sentAt), tries };
  if (ticket) {
    out.server_wait_ms = Math.max(0, (ticket.slotAt ?? endAt) - sentAt);
    if (ticket.ahead) out.ahead = ticket.ahead;
  }
  return out;
}
