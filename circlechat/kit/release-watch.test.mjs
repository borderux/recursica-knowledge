import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

let tag = "v1.0.0";
const hooks = [];
const srv = http.createServer((q, s) => {
  if (q.url.startsWith("/repos/")) { s.setHeader("content-type", "application/json"); return s.end(JSON.stringify({ tag_name: tag, html_url: `https://x/${tag}` })); }
  let b = ""; q.on("data", (d) => (b += d)); q.on("end", () => { hooks.push({ h: q.headers, b }); s.end("ok"); });
});
await new Promise((r) => srv.listen(0, r));
process.env.GITHUB_API = `http://127.0.0.1:${srv.address().port}`;
const { check, sign } = await import("./release-watch.mjs");
const env = { PORTER_HOOK_URL: `http://127.0.0.1:${srv.address().port}/hook`, PORTER_HOOK_SECRET: "sec" };
const watches = [{ repo: "acme/golden", hook: "PORTER" }];
test.after(() => srv.close());

test("first run records the release and announces nothing", async () => {
  const state = {};
  assert.deepEqual(await check(watches, state, env), []);
  assert.equal(state["acme/golden"], "v1.0.0");
});

test("a new release is announced once, signed", async () => {
  const state = { "acme/golden": "v1.0.0" };
  tag = "v1.1.0";
  assert.deepEqual(await check(watches, state, env), ["acme/golden@v1.1.0"]);
  assert.deepEqual(await check(watches, state, env), []);
  const { h, b } = hooks.at(-1);
  assert.equal(h["x-circlechat-delivery"], "acme/golden@v1.1.0");
  assert.equal(h["x-circlechat-signature"], sign("sec", h["x-circlechat-timestamp"], b));
  assert.equal(JSON.parse(b).event, "release");
});

test("without a webhook configured, the release stays unannounced for the next run", async () => {
  const state = { "acme/golden": "v1.1.0" };
  tag = "v1.2.0";
  assert.deepEqual(await check(watches, state, {}), []);
  assert.equal(state["acme/golden"], "v1.1.0");
});
