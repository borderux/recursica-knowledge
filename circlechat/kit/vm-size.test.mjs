// The Docker VM's size on a Mac (kit/lib.sh check_vm_size): a warning when the VM is bigger than its
// jobs at their caps plus 8 GB for the stack's containers. Run with a stand-in for docker.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const GiB = 1073741824;

function check(slots, gb, memBytes, osName = "Darwin") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vm-size-"));
  fs.writeFileSync(path.join(dir, "docker"), `#!/usr/bin/env bash
[ "$1 $2" = "info --format" ] && echo "${memBytes}"
exit 0
`, { mode: 0o755 });
  return spawnSync("bash", ["-c", `. "${here}/lib.sh"; check_vm_size ${slots} ${gb}`], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, VM_SIZE_OS: osName }, encoding: "utf8",
  });
}

test("a VM bigger than its jobs at their caps plus 8 GB gets a warning, and the setup goes on", () => {
  const r = check(2, 16, Math.round(62.67 * GiB));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^Warning: the Docker VM has 63 GiB, more than its jobs need: 2 job\(s\) at 16 GB each, plus 8 GB for the stack's containers, is 40 GB\..*Shrink it to 40 GiB/);
});

test("a VM of that size or smaller passes quietly: Docker reports a little less than the VM's size", () => {
  assert.equal(check(2, 16, Math.round(39.2 * GiB)).stdout, "");
  assert.equal(check(1, 2.5, Math.round(10.4 * GiB)).stdout, "", "a fractional job size");
  assert.match(check(1, 2.5, 12 * GiB).stdout, /is 10.5 GB/);
});

test("Linux, with Docker on the host, and a docker that does not answer are not checked", () => {
  assert.equal(check(2, 16, 200 * GiB, "Linux").stdout, "");
  assert.equal(check(2, 16, "").stdout, "");
});
