// Several Kev-engines, best first. A request goes to the first engine that answers. An engine that
// can't be reached (refused, DNS, timeout, 5xx) is skipped for the rest of this run, so a computer
// that is down costs one failed request, not one per question.
//
// An engine that refuses the key (401) is skipped too. During a key rotation
// (circlechat/deploy/rotate-tokens.sh), one engine holds the new key while the next one still
// holds the old key, so Kev moves on to the engine that still takes its key.
//
//   failover(clients): clients is [{ url, c }], where c.systemOne(req) asks one engine.
export function failover(clients, { log = (m) => console.error(m) } = {}) {
  const down = new Set();
  const status = (e) => Number(e?.status ?? e?.statusCode ?? 0);
  const unreachable = (e) => {
    const s = status(e);
    return !s || s >= 500 || /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|fetch failed|timed out/i.test(String(e?.message ?? e));
  };
  return {
    async systemOne(req) {
      let last;
      for (const { url, c } of clients) {
        if (down.has(url)) continue;
        try { return await c.systemOne(req); }
        catch (e) {
          const refused = status(e) === 401;
          if (!refused && !unreachable(e)) throw e;   // a real answer, such as a bad request: don't hide it
          down.add(url); last = e;
          log(refused ? `kev: engine ${url} refused the key, trying the next one` : `kev: engine ${url} unreachable, trying the next one`);
        }
      }
      throw last ?? new Error("no Kev-engine configured");
    },
  };
}
