// kit/safe-files.mjs: every write into a place an agent can change, with a symlink planted at each
// kind of destination. No file outside the place may change.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chmodTree, copy, makeDir, ownFile, ownHome, readFile, Refused, writeFile } from "./safe-files.mjs";

// A place, and a folder outside it with one file the place's symlinks name.
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "safe-files-"));
  const place = path.join(root, "place"), outside = path.join(root, "outside");
  fs.mkdirSync(place); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "file.txt"), "outside\n", { mode: 0o600 });
  return { root, place, outside };
}
// Every file outside the place: its path, text and mode.
const snapshot = (dir) => fs.readdirSync(dir, { recursive: true }).sort().map((f) => {
  const p = path.join(dir, f), st = fs.lstatSync(p);
  return [f, st.isFile() ? fs.readFileSync(p, "utf8") : "", st.mode];
});

test("a write replaces a symlink at the file's own name, and the file the symlink names keeps its text", () => {
  const { place, outside } = setup();
  const before = snapshot(outside);
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(place, "SOUL.md"));
  writeFile(place, path.join(place, "SOUL.md"), "persona\n");
  assert.ok(!fs.lstatSync(path.join(place, "SOUL.md")).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(place, "SOUL.md"), "utf8"), "persona\n");
  assert.deepEqual(snapshot(outside), before);
});

test("a symlinked folder on the way to a file is refused, and nothing is written", () => {
  const { place, outside } = setup();
  const before = snapshot(outside);
  fs.symlinkSync(outside, path.join(place, "skills"));
  assert.throws(() => writeFile(place, path.join(place, "skills/x/SKILL.md"), "x", { createDirs: true }), Refused);
  assert.throws(() => makeDir(place, path.join(place, "skills/x")), Refused);
  assert.throws(() => copy(place, fs.mkdtempSync(path.join(os.tmpdir(), "src-")), path.join(place, "skills")), Refused);
  assert.deepEqual(snapshot(outside), before);
  // The place itself as a symlink.
  const other = path.join(path.dirname(place), "link");
  fs.symlinkSync(outside, other);
  assert.throws(() => writeFile(other, path.join(other, "f"), "x"), Refused);
  assert.deepEqual(snapshot(outside), before);
});

test("a read refuses a symlink, so no file outside reaches the place", () => {
  const { place, outside } = setup();
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(place, ".env"));
  assert.throws(() => readFile(place, path.join(place, ".env")), Refused);
  assert.equal(readFile(place, path.join(place, "missing")), null);
});

test("a path outside the place is refused", () => {
  const { place, outside } = setup();
  assert.throws(() => writeFile(place, path.join(outside, "file.txt"), "x"), Refused);
  assert.throws(() => writeFile(place, path.join(place, "../outside/file.txt"), "x"), Refused);
  assert.equal(fs.readFileSync(path.join(outside, "file.txt"), "utf8"), "outside\n");
});

test("a copy takes only real files from the source, and replaces a symlinked file at the destination", () => {
  const { root, place, outside } = setup();
  const before = snapshot(outside);
  const src = path.join(root, "kit-skill");
  fs.mkdirSync(path.join(src, "references"), { recursive: true });
  fs.writeFileSync(path.join(src, "SKILL.md"), "from the kit\n");
  fs.writeFileSync(path.join(src, "references/a.md"), "a\n");
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(src, "leak.md"));
  fs.mkdirSync(path.join(src, "node_modules"));
  fs.mkdirSync(path.join(place, "skill"));
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(place, "skill/SKILL.md"));
  copy(place, src, path.join(place, "skill"));
  assert.equal(fs.readFileSync(path.join(place, "skill/SKILL.md"), "utf8"), "from the kit\n");
  assert.equal(fs.readFileSync(path.join(place, "skill/references/a.md"), "utf8"), "a\n");
  assert.ok(!fs.existsSync(path.join(place, "skill/leak.md")), "a symlink in the source is left out");
  assert.ok(!fs.existsSync(path.join(place, "skill/node_modules")));
  assert.deepEqual(snapshot(outside), before);
});

test("a chmod of a folder leaves the file a symlink names alone", () => {
  const { place, outside } = setup();
  const before = snapshot(outside);
  fs.mkdirSync(path.join(place, "skills"));
  fs.writeFileSync(path.join(place, "skills/a.md"), "a");
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(place, "skills/link"));
  fs.symlinkSync(outside, path.join(place, "dirlink"));
  chmodTree(place, place, 0o777);
  assert.equal(fs.statSync(path.join(place, "skills/a.md")).mode & 0o777, 0o777);
  assert.deepEqual(snapshot(outside), before);
});

test("a replaced file keeps the old file's mode, and leaves no half-written file", () => {
  const { place } = setup();
  fs.writeFileSync(path.join(place, ".env"), "A=1\n", { mode: 0o600 });
  writeFile(place, path.join(place, ".env"), "A=2\n");
  assert.equal(fs.statSync(path.join(place, ".env")).mode & 0o777, 0o600);
  assert.deepEqual(fs.readdirSync(place), [".env"]);
});

test("a home given to the agent's account: the home 700, .env and auth.json 600, no write for others inside, and a symlink's file left alone", () => {
  const { place, outside } = setup();
  fs.chmodSync(path.join(outside, "file.txt"), 0o666);
  const before = snapshot(outside);
  const mode = (f) => fs.lstatSync(path.join(place, f)).mode & 0o7777;
  fs.chmodSync(place, 0o777);
  fs.mkdirSync(path.join(place, "skills/a"), { recursive: true, mode: 0o777 });
  fs.chmodSync(path.join(place, "skills"), 0o777); fs.chmodSync(path.join(place, "skills/a"), 0o777);
  for (const [f, m] of [[".env", 0o644], ["auth.json", 0o777], ["config.yaml", 0o640], ["run.sh", 0o777], ["skills/a/SKILL.md", 0o666], ["skills/a/.env", 0o644]]) {
    fs.writeFileSync(path.join(place, f), "x"); fs.chmodSync(path.join(place, f), m);
  }
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(place, "link"));
  fs.symlinkSync(outside, path.join(place, "dirlink"));
  // The tests run as an account that cannot give a file away, so the account is the test's own.
  ownHome(place, place, process.getuid(), process.getgid());
  assert.equal(mode(""), 0o700);
  assert.equal(mode(".env"), 0o600);
  assert.equal(mode("auth.json"), 0o600);
  assert.equal(mode("config.yaml"), 0o640, "a mode with no write for others stays");
  assert.equal(mode("run.sh"), 0o755);
  assert.equal(mode("skills"), 0o755);
  assert.equal(mode("skills/a"), 0o755);
  assert.equal(mode("skills/a/SKILL.md"), 0o644);
  assert.equal(mode("skills/a/.env"), 0o644, "only the home's own .env is a secrets file");
  assert.ok(fs.lstatSync(path.join(place, "link")).isSymbolicLink());
  assert.deepEqual(snapshot(outside), before, "the files a symlink names keep their modes");
  // The home itself as a symlink.
  const other = path.join(path.dirname(place), "home-link");
  fs.symlinkSync(outside, other);
  assert.throws(() => ownHome(other, other, process.getuid(), process.getgid()), Refused);
  assert.deepEqual(snapshot(outside), before);
});

test("one file given an owner and a mode, never through a symlink", () => {
  const { place, outside } = setup();
  fs.chmodSync(path.join(outside, "file.txt"), 0o666);
  const before = snapshot(outside);
  fs.writeFileSync(path.join(place, "bridge-config.json"), "[]", { mode: 0o666 });
  fs.chmodSync(path.join(place, "bridge-config.json"), 0o777);
  ownFile(place, path.join(place, "bridge-config.json"), process.getuid(), process.getgid(), 0o600);
  assert.equal(fs.statSync(path.join(place, "bridge-config.json")).mode & 0o7777, 0o600);
  assert.equal(fs.readFileSync(path.join(place, "bridge-config.json"), "utf8"), "[]", "the text stays");
  fs.symlinkSync(path.join(outside, "file.txt"), path.join(place, "link.json"));
  assert.throws(() => ownFile(place, path.join(place, "link.json"), process.getuid(), process.getgid(), 0o600), Refused);
  fs.mkdirSync(path.join(place, "dir.json"));
  assert.throws(() => ownFile(place, path.join(place, "dir.json"), process.getuid(), process.getgid(), 0o600), Refused);
  assert.throws(() => ownFile(place, path.join(outside, "file.txt"), process.getuid(), process.getgid(), 0o600), Refused);
  assert.deepEqual(snapshot(outside), before);
});
