// Kev engine restarts that wait for a person: the records setup-node.sh writes, and the update job's
// one post for each held change (held-restarts.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { heldPost, parseHeld, readHeld, tellHeld } from "./held-restarts.mjs";

const WANT = "0123456789abcdef";

test("a record holds a Kev engine's name, the wanted unit's fingerprint and the parts that would change", () => {
  assert.deepEqual(parseHeld("kev-engine", `want=${WANT}\nwhat=command,settings\n`), { service: "kev-engine", want: WANT, what: ["command", "settings"] });
  assert.deepEqual(parseHeld("kev-engine-small", `want=${WANT}\nwhat=other\n`), { service: "kev-engine-small", want: WANT, what: ["other"] });
  assert.equal(parseHeld("jobd", `want=${WANT}\nwhat=command\n`), null, "only a Kev engine is held");
  assert.equal(parseHeld("kev-engine", "want=short\nwhat=command\n"), null);
  assert.equal(parseHeld("kev-engine", `want=${WANT}\nwhat=command,anything else\n`), null, "a part the kit doesn't name");
  assert.equal(parseHeld("kev-engine", `want=${WANT}\n`), null);
});

test("the job reads each record in the folder, and skips a link, a hard link, a large file and a name that isn't a Kev engine", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "held-"));
  const dir = path.join(home, ".recursica-kit/held-restarts"), other = path.join(home, "other");
  assert.deepEqual(readHeld(dir), [], "no folder: no record");
  fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(other);
  fs.writeFileSync(path.join(dir, "kev-engine"), `want=${WANT}\nwhat=settings\n`);
  fs.writeFileSync(path.join(other, "record"), `want=${WANT}\nwhat=command\n`);
  fs.symlinkSync(path.join(other, "record"), path.join(dir, "kev-engine-linked"));
  fs.linkSync(path.join(other, "record"), path.join(dir, "kev-engine-hard"));
  fs.writeFileSync(path.join(dir, "kev-engine-big"), `want=${WANT}\nwhat=command\n${"x".repeat(2048)}\n`);
  fs.writeFileSync(path.join(dir, "jobd"), `want=${WANT}\nwhat=command\n`);
  fs.writeFileSync(path.join(dir, "kev-engine-bad"), "what=command\n");
  assert.deepEqual(readHeld(dir), [{ service: "kev-engine", want: WANT, what: ["settings"] }]);
});

test("the post names the computer, what would change and the command a person runs", () => {
  const text = heldPost({ computer: "machine-1", kit: "/home/owner/recursica-knowledge/", held: { service: "kev-engine", want: WANT, what: ["command", "settings"] } });
  assert.equal(text, ":warning: kev-engine on machine-1 waits for a person: the unit of kev-engine would change (the command and the secrets file the engine reads), and kev-engine keeps running with the old unit. The kit never stops a Kev engine on its own. To restart kev-engine with the change, run `KIT_RESTART_KEV=1 /home/owner/recursica-knowledge/circlechat/setup-node.sh machine-1` on machine-1, as the owner, when the engine is idle. The engine stops while the engine loads the model again.");
});

test("a held change posts once, again for a new change or after 24 hours, and a cleared record clears the notice", async () => {
  const posts = [];
  let ok = true;
  const post = async (text) => { posts.push(text); return { ok }; };
  const state = {};
  const t = Date.parse("2026-11-23T10:00:00Z");
  const tell = (held, h) => tellHeld({ computer: "machine-1", kit: "/kit", held, state, post, now: t + h * 3600_000 });
  const held = [{ service: "kev-engine", want: WANT, what: ["settings"] }];
  assert.deepEqual(await tell(held, 0), ["kev-engine"]);
  for (const h of [1, 12, 23]) assert.deepEqual(await tell(held, h), [], `${h} hours later`);
  assert.equal(posts.length, 1);
  assert.match(posts[0], /`KIT_RESTART_KEV=1 \/kit\/circlechat\/setup-node\.sh machine-1`/);
  // A new change posts at once.
  const newer = [{ service: "kev-engine", want: "fedcba9876543210", what: ["command", "settings"] }];
  assert.deepEqual(await tell(newer, 23.5), ["kev-engine"]);
  assert.match(posts[1], /\(the command and the secrets file the engine reads\)/);
  // The same change 24 hours after the last post posts again.
  assert.deepEqual(await tell(newer, 47.5), ["kev-engine"]);
  // A person applied the change: the record is gone, and the notice clears.
  assert.deepEqual(await tell([], 48), []);
  assert.equal(state.heldRestarts, undefined);
  assert.deepEqual(await tell(newer, 49), ["kev-engine"], "a later hold posts at once");
  // A failed post records nothing, so the next hour tries again.
  await tell([], 50);
  ok = false;
  assert.deepEqual(await tell(held, 51), []);
  ok = true;
  assert.deepEqual(await tell(held, 52), ["kev-engine"]);
  assert.equal(posts.length, 6);
});
