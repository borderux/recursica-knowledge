import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { busyReason, disruptive, OPEN_RUN_MS, openWork, serverQuiet } from "./quiet.mjs";

test("the server is busy with agent work queued, with a service's run open, or with a database that can't be read", () => {
  assert.equal(busyReason({ turns: 0, runs: 0 }), "");
  assert.match(busyReason({ turns: 2, runs: 0 }), /^2 agent message\(s\) queued or in a turn$/);
  assert.match(busyReason({ turns: 0, runs: 1 }), /^1 service request\(s\) open for a driven agent$/);
  assert.match(busyReason({ turns: 1, runs: 1 }), /in a turn, and 1 service request/);
  assert.match(busyReason(null), /can't be read/);
});

test("only Tailscale, Ollama, Colima and Lima interrupt work among Homebrew's updates", () => {
  for (const n of ["tailscale", "ollama", "colima", "lima"]) assert.ok(disruptive(n), n);
  for (const n of ["gh", "node@22", "uv", "docker"]) assert.ok(!disruptive(n), n);
});

test("serverQuiet reads only the server's database; a computer with no server is always quiet", async () => {
  const site = { recursicachat: { data: "/srv/acme-data" } };
  let file = "";
  const q = await serverQuiet(site, { work: async (f) => { file = f; return { turns: 0, runs: 0 }; } });
  assert.deepEqual(q, { quiet: true, why: "" });
  assert.equal(file, "/srv/acme-data/circlechat.db");
  assert.equal((await serverQuiet(site, { work: async () => ({ turns: 1, runs: 0 }) })).quiet, false);
  assert.equal((await serverQuiet(site, { work: async () => ({ turns: 0, runs: 1 }) })).quiet, false);
  assert.deepEqual(await serverQuiet(site, { work: async () => null }), { quiet: false, why: "its database can't be read" });
  assert.deepEqual(await serverQuiet({}, { work: async () => { throw new Error("never read"); } }), { quiet: true, why: "" });
});

// A stand-in for the server's database, with the two tables the check reads.
function database(dir, { requests = true } = {}) {
  const file = path.join(dir, "circlechat.db");
  const db = new DatabaseSync(file);
  db.exec("CREATE TABLE deliveries (id TEXT PRIMARY KEY, state TEXT NOT NULL)");
  if (requests) db.exec("CREATE TABLE service_requests (id TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at INTEGER NOT NULL)");
  return { file, db };
}

test("openWork counts turns queued or running, and each service request still open", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quiet-"));
  try {
    const now = 1_000_000_000_000;
    const { file, db } = database(dir);
    assert.deepEqual(await openWork(file, now), { turns: 0, runs: 0 });
    const d = db.prepare("INSERT INTO deliveries VALUES (?, ?)");
    for (const [id, state] of [["d1", "queued"], ["d2", "injected"], ["d3", "answered"], ["d4", "failed"], ["d5", "dropped"]]) d.run(id, state);
    const r = db.prepare("INSERT INTO service_requests VALUES (?, ?, ?)");
    r.run("r1", "pending", now - 60_000);
    r.run("r2", "taken", now - 60_000);
    r.run("r3", "done", now - 60_000);
    r.run("r4", "declined", now - 60_000);
    // a request taken more than a day ago: its service never finished it, so it holds nothing
    r.run("r5", "taken", now - OPEN_RUN_MS - 1);
    db.close();
    assert.deepEqual(await openWork(file, now), { turns: 2, runs: 2 });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("openWork: a server with no service requests has no runs; a missing database is unread", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quiet-"));
  try {
    const { file, db } = database(dir, { requests: false });
    db.close();
    assert.deepEqual(await openWork(file), { turns: 0, runs: 0 });
    assert.equal(await openWork(path.join(dir, "none.db")), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
