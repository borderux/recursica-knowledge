// The carry step (kit/carry-storage.sh): CircleChat's stored files move from the old api and worker
// containers onto the storage volume once, before compose recreates the containers. Run with a
// stand-in for docker that keeps each container's /app/storage and each volume as a folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const VOLUME = "cc-acme_storage";
const WITH_VOLUME = { name: "cc-acme", volumes: { pgdata: {}, storage: { name: VOLUME } } };
const WITHOUT_VOLUME = { name: "cc-acme", volumes: { pgdata: {} } };

// The stand-in's state, in <fake>:
//   config.json                          what `docker compose config --format json` prints
//   containers/<service>/<id>/storage/   a container's /app/storage (no folder: none in the image)
//   containers/<service>/<id>/cp-fails   docker cp out of that container fails
//   mounts/<id>                          the volumes a container mounts
//   volumes/<name>/                      a volume
function sandbox({ config = WITH_VOLUME } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "carry-storage-"));
  const bin = path.join(dir, "bin"), fake = path.join(dir, "fake"), cc = path.join(dir, "circlechat"), log = path.join(dir, "calls.log");
  for (const d of [bin, cc, path.join(fake, "containers"), path.join(fake, "mounts"), path.join(fake, "volumes")]) fs.mkdirSync(d, { recursive: true });
  if (config) fs.writeFileSync(path.join(fake, "config.json"), JSON.stringify(config));
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash
echo "docker $*" >> "${log}"
F="${fake}"
case "$1 $2" in
  "compose config") cat "$F/config.json" 2>/dev/null ;;
  "compose ps") ls "$F/containers/\${@: -1}" 2>/dev/null ;;
  "inspect -f") cat "$F/mounts/\${@: -1}" 2>/dev/null; echo ;;
  "volume inspect") [ -d "$F/volumes/$3" ] ;;
  "volume create") mkdir -p "$F/volumes/\${@: -1}" ;;
  cp\\ *)
    id="\${2%%:*}"; d="$(ls -d "$F"/containers/*/"$id")"
    [ -e "$d/cp-fails" ] && { echo "Error response from daemon: permission denied" >&2; exit 1; }
    [ -d "$d/storage" ] || { echo "Error response from daemon: Could not find the file /app/storage in container $id" >&2; exit 1; }
    cp -Rp "$d/storage/." "$3" ;;
  run\\ *)
    for a in "$@"; do case "$a" in *:/v:ro) vol="\${a%%:/v:ro}" ;; *:/dst) vol="\${a%%:/dst}" ;; esac; done
    case " $* " in
      *" -i "*) mkdir -p "$F/volumes/$vol"; tar xf - -C "$F/volumes/$vol" ;;
      *) ls -A "$F/volumes/$vol" 2>/dev/null ;;
    esac ;;
esac
`, { mode: 0o755 });
  const container = (service, id, files = {}, { mounts = "", times = {} } = {}) => {
    const root = path.join(fake, "containers", service, id);
    fs.mkdirSync(root, { recursive: true });
    if (files) {
      fs.mkdirSync(path.join(root, "storage"));
      for (const [key, body] of Object.entries(files)) {
        const f = path.join(root, "storage", key);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, body);
        if (times[key]) fs.utimesSync(f, times[key], times[key]);
      }
    }
    fs.writeFileSync(path.join(fake, "mounts", id), mounts);
    return root;
  };
  const volume = (files = {}) => {
    const v = path.join(fake, "volumes", VOLUME);
    fs.mkdirSync(v, { recursive: true });
    for (const [key, body] of Object.entries(files)) fs.writeFileSync(path.join(v, key), body);
    return v;
  };
  const run = () => spawnSync("bash", [path.join(here, "carry-storage.sh")], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CC_DIR: cc, TMPDIR: dir }, encoding: "utf8" });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  const stored = () => {
    const v = path.join(fake, "volumes", VOLUME);
    if (!fs.existsSync(v)) return null;
    const out = {};
    const walk = (d, pre) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p, `${pre}${n}/`); else out[`${pre}${n}`] = fs.readFileSync(p, "utf8"); } };
    walk(v, "");
    return out;
  };
  return { dir, container, volume, run, calls, stored };
}

const t0 = new Date("2026-10-01T00:00:00Z"), t1 = new Date("2026-10-02T00:00:00Z");

test("merges the api's and the worker's files onto a new volume, and the newer copy of a key wins", () => {
  const s = sandbox();
  s.container("api", "a1", { "uploads/photo.png": "upload", "tasks/t1/reply.md": "api's older copy", "tasks/t2/notes.md": "api's newer copy" }, { times: { "tasks/t1/reply.md": t0, "tasks/t2/notes.md": t1 } });
  s.container("worker", "w1", { "tasks/t1/reply.md": "worker's newer copy", "tasks/t2/notes.md": "worker's older copy", "tasks/t3/plan.md": "deliverable" }, { times: { "tasks/t1/reply.md": t1, "tasks/t2/notes.md": t0 } });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(s.stored(), {
    "uploads/photo.png": "upload",
    "tasks/t1/reply.md": "worker's newer copy",
    "tasks/t2/notes.md": "api's newer copy",
    "tasks/t3/plan.md": "deliverable",
  });
  assert.match(s.calls(), /^docker volume create --label com\.docker\.compose\.project=cc-acme --label com\.docker\.compose\.volume=storage cc-acme_storage$/m, "the volume carries compose's labels");
  assert.match(s.calls(), /^docker cp a1:\/app\/storage\/\. /m);
  assert.match(s.calls(), /^docker cp w1:\/app\/storage\/\. /m);
  assert.match(r.stdout, /carried 4 file\(s\) from the old containers onto volume cc-acme_storage/);
  assert.deepEqual(fs.readdirSync(s.dir).filter((n) => n.startsWith("carry-storage.")), [], "the temporary copy is removed");
});

test("a second run changes nothing: the volume already holds files", () => {
  const s = sandbox();
  s.container("api", "a1", { "uploads/photo.png": "upload" });
  s.container("worker", "w1", { "tasks/t3/plan.md": "deliverable" });
  assert.equal(s.run().status, 0);
  const before = s.stored();
  const cps = (s.calls().match(/^docker cp /gm) ?? []).length;
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /volume cc-acme_storage already holds files\. Nothing to carry\./);
  assert.equal((s.calls().match(/^docker cp /gm) ?? []).length, cps, "no second copy");
  assert.deepEqual(s.stored(), before);
});

test("a volume that already holds files is left as it is", () => {
  const s = sandbox();
  s.volume({ "kept.md": "already on the volume" });
  s.container("api", "a1", { "kept.md": "old container's copy", "uploads/photo.png": "upload" });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /already holds files/);
  assert.deepEqual(s.stored(), { "kept.md": "already on the volume" });
  assert.doesNotMatch(s.calls(), /^docker (cp|volume create)/m);
});

test("an empty volume that already exists is filled, and not created again", () => {
  const s = sandbox();
  s.volume();
  s.container("worker", "w1", { "tasks/t3/plan.md": "deliverable" });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(s.stored(), { "tasks/t3/plan.md": "deliverable" });
  assert.doesNotMatch(s.calls(), /^docker volume create/m);
});

test("does nothing when no old container is left", () => {
  const s = sandbox();
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /no old api or worker container\. Nothing to carry\./);
  assert.equal(s.stored(), null, "no volume is created");
  assert.doesNotMatch(s.calls(), /^docker (cp|run|volume create)/m);
});

test("a container that already mounts the volume is not an old container", () => {
  const s = sandbox();
  s.container("api", "a2", { ".probe/api": "id" }, { mounts: `${VOLUME} ` });
  s.container("worker", "w2", { ".probe/worker": "id" }, { mounts: `other_volume ${VOLUME} ` });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /no old api or worker container/);
  assert.doesNotMatch(s.calls(), /^docker cp /m);
});

test("does nothing while compose names no storage volume", () => {
  for (const config of [WITHOUT_VOLUME, null]) {
    const s = sandbox({ config });
    s.container("api", "a1", { "uploads/photo.png": "upload" });
    const r = s.run();
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /compose names no storage volume yet/);
    assert.doesNotMatch(s.calls(), /^docker (cp|run|volume create|compose ps)/m);
  }
});

test("a container without /app/storage is skipped, and the other's files are carried", () => {
  const s = sandbox();
  s.container("api", "a1", null);
  s.container("worker", "w1", { "tasks/t3/plan.md": "deliverable" });
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /the api container \(a1\) has no \/app\/storage/);
  assert.deepEqual(s.stored(), { "tasks/t3/plan.md": "deliverable" });
});

test("old containers with no stored files leave the volume uncreated", () => {
  const s = sandbox();
  s.container("api", "a1", {});
  s.container("worker", "w1", {});
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /the old containers hold no stored files/);
  assert.equal(s.stored(), null);
});

test("a failed copy out of a container stops with an error, and writes nothing onto the volume", () => {
  const s = sandbox();
  s.container("api", "a1", { "uploads/photo.png": "upload" });
  const w = s.container("worker", "w1", { "tasks/t3/plan.md": "deliverable" });
  fs.writeFileSync(path.join(w, "cp-fails"), "");
  const r = s.run();
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /could not copy \/app\/storage out of the worker container \(w1\)\. Nothing was recreated\./);
  assert.equal(s.stored(), null);
});

test("never removes a container, a volume or a stored file", () => {
  const s = sandbox();
  s.container("api", "a1", { "uploads/photo.png": "upload" });
  s.container("worker", "w1", { "tasks/t3/plan.md": "deliverable" });
  assert.equal(s.run().status, 0);
  s.run();
  assert.doesNotMatch(s.calls(), /^docker (rm|volume rm|container rm|compose (down|rm|up))/m);
});
