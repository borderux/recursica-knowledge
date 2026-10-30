// Each agent's GitHub App (apps.mjs): the config check, the app's sign-in, the token and the manifest.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { appJwt, botIdentity, envLines, keySecretName, manifest, mintToken, setLines, tokenName, validateApps } from "./apps.mjs";
import { steps } from "./manifest.mjs";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" });
const app = { app_id: 11, installation_id: 22, slug: "acme-alan", repos: ["acme/knowledge", "acme/forge"], permissions: { contents: "write", pull_requests: "write", issues: "write" } };
const NOW = 1_800_000_000_000;

test("the config check takes a whole app, and names each mistake", () => {
  assert.deepEqual(validateApps({}), [], "no github_apps block: no push access, and no error");
  assert.deepEqual(validateApps({ github_apps: { alan: app } }), []);
  const errs = validateApps({ github_apps: {
    "Bad Name": app,
    betty: { app_id: 0, installation_id: "x", slug: "Betty App", repos: ["acme/a", "other/b"], permissions: { contents: "read", admin: "write" } },
  } });
  assert.ok(errs.some((e) => /"Bad Name" is not an agent handle/.test(e)));
  assert.ok(errs.some((e) => /github_apps.betty.app_id must be the app's number/.test(e)));
  assert.ok(errs.some((e) => /installation_id must be the app's number/.test(e)));
  assert.ok(errs.some((e) => /slug must be the app's slug/.test(e)));
  assert.ok(errs.some((e) => /repos must all belong to one owner/.test(e)));
  assert.ok(errs.some((e) => /permissions.admin: an app takes only contents, pull_requests, issues/.test(e)));
  assert.ok(errs.some((e) => /permissions.contents must be "write"/.test(e)));
  assert.ok(errs.some((e) => /permissions.pull_requests must be "write"/.test(e)));
});

test("the app signs in with a 9-minute token signed by the app's private key", () => {
  const [h, p, sig] = appJwt(11, pem, NOW).split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url")), { alg: "RS256", typ: "JWT" });
  const body = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(body.iss, "11");
  assert.equal(body.exp - body.iat, 600);
  assert.ok(crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), publicKey, Buffer.from(sig, "base64url")));
});

test("a token covers only the asked repos and the app's permissions, for at most one hour", async () => {
  const calls = [];
  const fetchFn = async (url, opts) => { calls.push({ url, opts }); return { ok: true, json: async () => ({ token: "ghs_x", expires_at: new Date(NOW + 2 * 3600_000).toISOString() }) }; };
  const t = await mintToken({ app, pem, repos: ["acme/forge"], fetchFn, now: NOW });
  assert.equal(calls[0].url, "https://api.github.com/app/installations/22/access_tokens");
  assert.deepEqual(JSON.parse(calls[0].opts.body), { repositories: ["forge"], permissions: app.permissions });
  assert.equal(t.token, "ghs_x");
  assert.equal(t.expiresAt, NOW + 3600_000, "never longer than one hour");
  await assert.rejects(mintToken({ app, pem, repos: ["acme/other"], fetchFn, now: NOW }), /a repo outside the app's repos/);
  await assert.rejects(mintToken({ app, pem, fetchFn: async () => ({ ok: false, status: 401 }), now: NOW }), /GitHub refused the token: 401/);
});

test("commits use the app's bot identity, with the bot's noreply email address", async () => {
  const who = await botIdentity({ slug: "acme-alan", token: "ghs_x", fetchFn: async (url) => { assert.match(url, /\/users\/acme-alan%5Bbot%5D$/); return { ok: true, json: async () => ({ id: 41 }) }; } });
  assert.deepEqual(who, { name: "acme-alan[bot]", email: "41+acme-alan[bot]@users.noreply.github.com" });
  assert.deepEqual(envLines("alan", "ghs_x", who), {
    ALAN_GITHUB_TOKEN: "ghs_x",
    GIT_AUTHOR_NAME: "acme-alan[bot]", GIT_AUTHOR_EMAIL: "41+acme-alan[bot]@users.noreply.github.com",
    GIT_COMMITTER_NAME: "acme-alan[bot]", GIT_COMMITTER_EMAIL: "41+acme-alan[bot]@users.noreply.github.com",
  });
  assert.equal(setLines("KEEP=1\nALAN_GITHUB_TOKEN=old\n", { ALAN_GITHUB_TOKEN: "new" }), "KEEP=1\nALAN_GITHUB_TOKEN=new\n");
  assert.equal(tokenName("otto"), "OTTO_GITHUB_TOKEN");
  assert.equal(keySecretName("betty"), "APP_KEY_BETTY");
});

test("each manifest names the app and the permissions, with no webhook; Alan's adds Issues", () => {
  const m = manifest("alan", { url: "https://example.com/kit" });
  assert.equal(m.name, "recursica-alan");
  assert.equal(m.hook_attributes, undefined);
  assert.deepEqual(m.default_events, []);
  assert.deepEqual(m.default_permissions, { metadata: "read", contents: "write", pull_requests: "write", issues: "write" });
  assert.deepEqual(manifest("porter", { url: "https://example.com/kit" }).default_permissions, { metadata: "read", contents: "write", pull_requests: "write" });
  const text = steps("alan", m);
  assert.match(text, /Under Webhook, clear Active/);
  assert.match(text, /Contents: Read and write, Pull requests: Read and write, Issues: Read and write/);
  assert.match(text, /APP_KEY_ALAN/);
});
