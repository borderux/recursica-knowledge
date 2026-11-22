// kit/rc-gateway-key.mjs against a stand-in gateway: a fetch that answers GET /models with the routes
// given. Nothing here reaches Docker, a model, the tailnet or a real gateway. The key records live in
// a temporary folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { issueChecked, listed, main, recordedHash } from "./rc-gateway-key.mjs";
import { issue, loadKeys } from "../gateway/keys.mjs";

const URL = "http://127.0.0.1:4005/v1";
const state = () => fs.mkdtempSync(path.join(os.tmpdir(), "rc-gw-key-"));
// A stand-in gateway: lists `ids` for any key, or answers `status`. Records each request.
function gateway({ ids = ["local-large"], status = 200 } = {}) {
  const seen = [];
  const fetchImpl = async (url, opts) => {
    seen.push({ url, auth: opts.headers.authorization });
    return { ok: status === 200, status, json: async () => ({ object: "list", data: ids.map((id) => ({ id })) }) };
  };
  return { seen, fetchImpl };
}
const sink = () => { const s = { text: "", write: (t) => { s.text += t; } }; return s; };
const sha = (k) => crypto.createHash("sha256").update(k).digest("hex");

test("hash prints the recorded hash of the handle's key, or nothing", async () => {
  const dir = state();
  assert.equal(recordedHash(dir, "rc-standin"), "");
  const key = issue(dir, "rc-standin");
  assert.equal(recordedHash(dir, "rc-standin"), sha(key));
  const out = sink();
  assert.equal(await main(["hash", dir, "rc-standin"], { out }), 0);
  assert.equal(out.text, `${sha(key)}\n`);
  const none = sink();
  assert.equal(await main(["hash", dir, "rc-other"], { out: none }), 0);
  assert.equal(none.text, "");
});

test("issue checks the new key on the gateway, and prints the key only when the gateway gives the handle its model", async () => {
  const dir = state();
  const gw = gateway();
  const out = sink();
  assert.equal(await main(["issue", dir, "rc-standin", URL, "local-large", "local-large,local-small"], { out, fetchImpl: gw.fetchImpl, platform: "linux" }), 0);
  const key = out.text.trim();
  assert.match(key, /^ccg_[0-9a-f]{48}$/);
  assert.equal(loadKeys(dir)["rc-standin"].sha256, sha(key));
  assert.deepEqual(gw.seen, [{ url: `${URL}/models`, auth: `Bearer ${key}` }]);
});

test("a key the gateway does not serve is revoked, and nothing reaches stdout", async () => {
  for (const [gw, why] of [
    [gateway({ ids: [] }), /no route\. Rerun setup-host\.sh/],
    [gateway({ ids: ["local-small"] }), /gives rc-standin local-small, not local-large/],
    [gateway({ ids: ["local-large", "claude-sonnet-5-5"] }), /more than the agent's routes/],
    [gateway({ status: 401 }), /answered 401/],
  ]) {
    const dir = state();
    const out = sink();
    const err = sink();
    assert.equal(await main(["issue", dir, "rc-standin", URL, "local-large", "local-large"], { out, err, fetchImpl: gw.fetchImpl, platform: "linux" }), 1);
    assert.equal(out.text, "", "no key on stdout");
    assert.match(err.text, /failed the check, and is revoked/);
    assert.match(err.text, why);
    assert.equal(loadKeys(dir)["rc-standin"], undefined, "the new key is revoked");
  }
});

test("issue refuses a handle that is not rc-<handle>, and leaves the 1.x agent's key alone", async () => {
  const dir = state();
  const old = issue(dir, "standin");
  await assert.rejects(issueChecked({ dir, handle: "standin", url: URL, model: "local-large", routes: ["local-large"], fetchImpl: gateway().fetchImpl, platform: "linux" }), /not a RecursicaChat gateway handle/);
  assert.equal(loadKeys(dir).standin.sha256, sha(old));
  const gw = gateway();
  const key = await issueChecked({ dir, handle: "rc-standin", url: URL, model: "local-large", routes: ["local-large"], fetchImpl: gw.fetchImpl, platform: "linux" });
  assert.equal(loadKeys(dir).standin.sha256, sha(old), "rc-standin's key never ends standin's key");
  assert.notEqual(sha(key), sha(old));
});

test("on a Mac the key records go back to the folder's owner, as own_for_docker does", async () => {
  const dir = state();
  await issueChecked({ dir, handle: "rc-standin", url: URL, model: "local-large", routes: ["local-large"], fetchImpl: gateway().fetchImpl, platform: "darwin" });
  assert.equal(fs.statSync(path.join(dir, "agent-keys.json")).uid, fs.statSync(dir).uid);
});

test("listed reads the gateway's model list, and usage errors exit 2", async () => {
  assert.deepEqual(await listed(URL, "k", gateway({ ids: ["a", "b"] }).fetchImpl), { ids: ["a", "b"] });
  const err = sink();
  assert.equal(await main(["issue", "/tmp"], { err }), 2);
  assert.match(err.text, /usage/);
});

// A program's key, svc-<name> (circlechat/rc-service.sh): the gateway must list exactly the
// service's routes.
test("a service's key passes only when the gateway lists exactly the service's routes", async () => {
  const ok = state();
  const out = sink();
  assert.equal(await main(["issue", ok, "svc-example-service", URL, "judge", "judge"], { out, fetchImpl: gateway({ ids: ["judge"] }).fetchImpl, platform: "linux" }), 0);
  assert.equal(loadKeys(ok)["svc-example-service"].sha256, sha(out.text.trim()));
  for (const [gw, why] of [
    [gateway({ ids: ["judge", "local-large"] }), /more than the service's routes/],
    [gateway({ ids: ["judge"] }), /not every route of the service \(judge, local-small\)/],
    [gateway({ ids: [] }), /no route\. Rerun setup-host\.sh/],
  ]) {
    const dir = state();
    const bad = sink();
    const err = sink();
    assert.equal(await main(["issue", dir, "svc-example-service", URL, "judge", "judge,local-small"], { out: bad, err, fetchImpl: gw.fetchImpl, platform: "linux" }), 1);
    assert.equal(bad.text, "", "no key on stdout");
    assert.match(err.text, why);
    assert.equal(loadKeys(dir)["svc-example-service"], undefined, "the new key is revoked");
  }
});

test("current says whether a key file holds the recorded key, and prints nothing of the key", async () => {
  const dir = state();
  const file = path.join(dir, "example-service.gateway-key");
  const ask = async () => { const out = sink(); assert.equal(await main(["current", dir, "svc-example-service", file], { out }), 0); return out.text; };
  assert.equal(await ask(), "", "no key recorded and no file");
  const key = issue(dir, "svc-example-service");
  assert.equal(await ask(), "", "no file yet");
  fs.writeFileSync(file, `${key}\n`);
  assert.equal(await ask(), "current\n");
  fs.writeFileSync(file, "ccg_" + "0".repeat(48) + "\n");
  assert.equal(await ask(), "", "another key is not current");
  fs.rmSync(file);
  const real = path.join(dir, "real-key");
  fs.writeFileSync(real, `${key}\n`);
  fs.symlinkSync(real, file);
  assert.equal(await ask(), "", "a symlink is never followed");
});

test("revoke ends a service's key, and refuses a handle that is not rc- or svc-", async () => {
  const dir = state();
  const other = issue(dir, "standin");
  issue(dir, "svc-example-service");
  const out = sink();
  assert.equal(await main(["revoke", dir, "svc-example-service"], { out, platform: "linux" }), 0);
  assert.equal(out.text, "revoked\n");
  assert.equal(loadKeys(dir)["svc-example-service"], undefined);
  const again = sink();
  assert.equal(await main(["revoke", dir, "svc-example-service"], { out: again, platform: "linux" }), 0);
  assert.equal(again.text, "none\n");
  const err = sink();
  assert.equal(await main(["revoke", dir, "standin"], { err, platform: "linux" }), 1);
  assert.equal(loadKeys(dir).standin.sha256, sha(other), "a 1.x agent's key stays");
});
