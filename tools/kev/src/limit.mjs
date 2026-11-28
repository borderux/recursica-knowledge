// Kev's one limit on engine requests, and the wait after a 429.
//
// Kev runs a pool over the skills and, inside each skill, a pool over the code's units. Each pool's
// width multiplies the other's, so the pools alone can send far more requests at once than the
// gateway key allows. `gate` holds every engine request under one limit, whatever the pools do.
//
// The gateway answers a request past the key's cap with 429 and a `retry-after` header. A 429 is a
// wait, not a failed question: `retrying` waits as the header says, then asks again.

/** A gate that lets at most `limit` calls run at once; the rest wait their turn, in order. */
export function gate(limit) {
  const max = Math.max(1, Math.floor(Number(limit) || 1));
  let running = 0;
  const waiting = [];
  const release = () => {
    running--;
    const next = waiting.shift();
    if (next) next();
  };
  return {
    get running() { return running; },
    async run(fn) {
      if (running >= max) await new Promise((resolve) => waiting.push(resolve));
      running++;
      try { return await fn(); }
      finally { release(); }
    },
  };
}

const statusOf = (e) => Number(e?.status ?? e?.statusCode ?? 0);

/** The wait a 429 asks for, in milliseconds, from its `retry-after-ms` or `retry-after` header. */
export function retryAfterMs(e) {
  const h = e?.headers;
  const get = (k) => (typeof h?.get === "function" ? h.get(k) : h?.[k]) ?? null;
  const ms = Number(get("retry-after-ms"));
  if (get("retry-after-ms") !== null && Number.isFinite(ms) && ms >= 0) return ms;
  const raw = get("retry-after");
  if (raw === null) return undefined;
  const s = Number(raw);
  if (Number.isFinite(s)) return s >= 0 ? s * 1000 : undefined;
  const at = Date.parse(raw);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

/** The waits after each 429 when the answer names none: 1, 2, 4, 8, 8 and 8 seconds. */
export const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 8_000, 8_000];
/** The longest wait Kev takes on a header's word. */
export const MAX_WAIT_MS = 30_000;

/**
 * Calls `fn`, and after a 429 waits and calls it again, at most `BACKOFF_MS.length` times. Any other
 * error is thrown at once. The last 429 is thrown when the tries run out.
 */
export async function retrying(fn, { sleep = (ms) => new Promise((r) => setTimeout(r, ms)), waits = BACKOFF_MS, log = () => {} } = {}) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (statusOf(e) !== 429 || i >= waits.length) throw e;
      const ms = Math.min(retryAfterMs(e) ?? waits[i], MAX_WAIT_MS);
      log(`kev: the gateway answered 429, too many requests at once; waiting ${ms} ms, then asking again`);
      await sleep(ms);
    }
  }
}
