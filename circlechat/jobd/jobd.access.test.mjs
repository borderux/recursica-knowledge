// On Linux, jobd stops at the start when jobd's account can open Docker's own socket, unless the
// job runner is a client or demo stack's job runner (JOBD_DOCKER_DIRECT=allowed).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { startJobd } from "./test-jobd.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const linux = process.platform === "linux";

test("jobd stops when jobd's account can open Docker's own socket", { skip: !linux && "Linux only" }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobd-access-"));
  const sock = path.join(tmp, "docker.sock");
  fs.writeFileSync(sock, "");
  const r = spawnSync(process.execPath, [path.join(here, "jobd.mjs")], { encoding: "utf8", timeout: 10_000,
    env: { ...process.env, JOBD_TOKEN: "t", JOBD_DIR: path.join(tmp, "jobs"), JOBD_DIRECT_SOCKET: sock, JOBD_PORT: "0", JOBD_DOCKER_DIRECT: "" } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /jobd runs as (root|an account that can open .*docker\.sock)\. On Linux, jobd runs as recursica-jobd and reaches Docker through jobd's Docker filter\. Run setup-node\.sh on this computer\./);
});

test("a client or demo stack's jobd keeps direct Docker access", { skip: !linux && "Linux only" }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "jobd-access-"));
  const sock = path.join(tmp, "docker.sock");
  fs.writeFileSync(sock, "");
  const { proc } = await startJobd(path.join(here, "jobd.mjs"), { ...process.env, JOBD_TOKEN: "t", JOBD_DIR: path.join(tmp, "jobs"), JOBD_DIRECT_SOCKET: sock, JOBD_DOCKER_DIRECT: "allowed" });
  proc.kill();
});
