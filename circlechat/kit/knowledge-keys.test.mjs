// kit/knowledge-keys.mjs in a folder of its own, as the account running the test: that account
// stands in for root, and every caller's account is the same account. Nothing here reaches a service.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { holdsKey, loadRecords, makeKeys, parseCallers } from "./knowledge-keys.mjs";

const me = os.userInfo();
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
let n = 0;
const keyOf = () => `ckm_${String(++n).padStart(48, "0")}`;

function folder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-keys-"));
  const state = path.join(dir, "state"), run = path.join(dir, "run");
  for (const d of [state, run]) { fs.mkdirSync(d); fs.chmodSync(d, 0o755); }
  const make = (lines, rotate = "") => makeKeys({ callers: parseCallers(lines), group: "server", rotate, dir: state, rootUid: me.uid, uidOf: () => me.uid, gidOf: () => me.gid, keyOf });
  return { dir, state, run, make, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const mode = (f) => fs.statSync(f).mode & 0o777;

test("each caller gets a key in each of its files, and the server gets only the hashes", () => {
  const f = folder();
  try {
    const lines = `example-harness\t_example\t${f.run}/harness.key\nkev\t_a\t${f.run}/kev-a.key\nkev\t_b\t${f.run}/kev-b.key\nrecursicachat\t-\t-\n`;
    const r = f.make(lines);
    assert.equal(r.failed, false, r.lines.join("\n"));
    const records = loadRecords(path.join(f.state, "keys.json"));
    assert.deepEqual(Object.keys(records).sort(), ["example-harness", "kev", "recursicachat"]);
    const kevA = fs.readFileSync(`${f.run}/kev-a.key`, "utf8");
    assert.equal(kevA, fs.readFileSync(`${f.run}/kev-b.key`, "utf8"), "one key per caller, in each of its files");
    assert.equal(records.kev.sha256, sha(kevA.trim()));
    assert.ok(holdsKey(path.join(f.state, "recursicachat.key"), records.recursicachat.sha256));
    for (const file of [`${f.run}/harness.key`, `${f.run}/kev-a.key`, path.join(f.state, "recursicachat.key")]) assert.equal(mode(file), 0o400, file);
    assert.equal(mode(path.join(f.state, "keys.json")), 0o440);
    const text = fs.readFileSync(path.join(f.state, "keys.json"), "utf8");
    assert.ok(!text.includes(kevA.trim()), "keys.json holds a key");
    assert.ok(!r.lines.join("\n").includes("ckm_"), "a key reached an output line");

    // A rerun keeps every key.
    const again = f.make(lines);
    assert.deepEqual(loadRecords(path.join(f.state, "keys.json")), records);
    assert.match(again.lines.join("\n"), /^kev: the key is current$/m);

    // --rotate, a file that lost its key, and a caller no longer listed.
    fs.chmodSync(`${f.run}/harness.key`, 0o600);
    fs.writeFileSync(`${f.run}/harness.key`, "something else\n");
    const third = f.make(lines.split("\n").filter((l) => !l.startsWith("recursicachat")).join("\n"), "kev");
    const now = loadRecords(path.join(f.state, "keys.json"));
    assert.notEqual(now.kev.sha256, records.kev.sha256, "--rotate makes a new key");
    assert.notEqual(now["example-harness"].sha256, records["example-harness"].sha256, "a file that lost its key gets a new one");
    assert.equal(now.recursicachat, undefined);
    assert.match(third.lines.join("\n"), /recursicachat: no longer in site\.json, so its key no longer works/);
  } finally { f.done(); }
});

test("a caller whose folder isn't root's, or is missing, keeps the key it has, and the run fails", () => {
  const f = folder();
  try {
    assert.equal(f.make(`example-harness\t_example\t${f.run}/harness.key\n`).failed, false);
    const before = loadRecords(path.join(f.state, "keys.json"));
    fs.chmodSync(f.run, 0o777);
    const r = f.make(`example-harness\t_example\t${f.run}/harness.key\nkev\t_a\t${f.dir}/missing/kev.key\n`);
    assert.equal(r.failed, true);
    assert.match(r.lines.join("\n"), /example-harness: .* must belong to root, with no write for the group or others\. The caller keeps its key/);
    assert.match(r.lines.join("\n"), /kev: the folder .*missing is missing\. The caller keeps no key/);
    assert.deepEqual(loadRecords(path.join(f.state, "keys.json")), before);
  } finally { f.done(); }
});

test("a key file that is a link is never read or written through", () => {
  const f = folder();
  try {
    const target = path.join(f.dir, "elsewhere");
    fs.writeFileSync(target, "keep\n");
    fs.symlinkSync(target, `${f.run}/harness.key`);
    assert.equal(f.make(`example-harness\t_example\t${f.run}/harness.key\n`).failed, false);
    assert.equal(fs.readFileSync(target, "utf8"), "keep\n", "root wrote through the link");
    assert.ok(!fs.lstatSync(`${f.run}/harness.key`).isSymbolicLink(), "the link was not replaced by a file");
  } finally { f.done(); }
});
