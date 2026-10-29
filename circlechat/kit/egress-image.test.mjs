// The outgoing filter's image (kit/lib.sh egress_image, refresh_egress): built once for each
// version of circlechat/egress, and each filter container on another image is recreated with the
// container's own settings. Run with a stand-in for docker.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);

// A docker that remembers the images built, and runs two filters: cc-egress on the new image, and
// cc-jobs-egress on an older one.
function fakeDocker() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "egress-image-"));
  const bin = path.join(dir, "bin"), log = path.join(dir, "calls.log"), built = path.join(dir, "built");
  fs.mkdirSync(bin);
  const jobs = [{
    Name: "/cc-jobs-egress", Id: "abc123def4567890",
    HostConfig: { RestartPolicy: { Name: "unless-stopped" }, ExtraHosts: ["host.docker.internal:host-gateway"], Binds: ["/jobs/conf:/etc/egress:ro", "/jobs/logs:/var/log/egress"] },
    NetworkSettings: { Networks: { bridge: { Aliases: null }, "jobs-egress": { Aliases: ["egress", "abc123def456"] } } },
  }];
  fs.writeFileSync(path.join(dir, "jobs.json"), JSON.stringify(jobs));
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash
echo "docker $*" >> "${log}"
case "$1 $2" in
  "image inspect") if [ "$3" = -f ]; then echo sha256:new; else grep -qx "$3" "${built}" 2>/dev/null || exit 1; fi ;;
  "build -q") echo "$4" >> "${built}"; echo sha256:new ;;
  "ps -a") printf 'cc-egress\\ncc-jobs-egress\\n' ;;
  "inspect -f") [ "$4" = cc-egress ] && echo sha256:new || echo sha256:old ;;
  "inspect cc-jobs-egress") cat "${path.join(dir, "jobs.json")}" ;;
esac
exit 0
`, { mode: 0o755 });
  const run = (script) => spawnSync("bash", ["-c", `. "${here}/lib.sh"; ${script}`], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: "utf8" });
  return { run, calls: () => fs.readFileSync(log, "utf8").trim().split("\n") };
}

test("the filter image is built once for each version of the egress folder, and both setups get the same tag", () => {
  const d = fakeDocker();
  const first = d.run("egress_image"), second = d.run("egress_image");
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /^recursica\/egress:[0-9a-f]{12}$/);
  assert.equal(second.stdout, first.stdout, "the same tag");
  assert.equal(d.calls().filter((c) => c.startsWith("docker build")).length, 1, "one build");
  assert.ok(d.calls().includes(`docker build -q -t ${first.stdout} ${path.resolve(here, "../egress")}`));
});

test("a filter container on another image is recreated with its own settings; one on the new image stays", () => {
  const d = fakeDocker();
  const r = d.run("refresh_egress recursica/egress:0123456789ab");
  assert.equal(r.status, 0, r.stderr);
  const calls = d.calls();
  assert.ok(!calls.some((c) => /^docker (rm|run).*cc-egress( |$)/.test(c)), "cc-egress runs the new image already");
  assert.deepEqual(calls.filter((c) => /^docker (rm|run|network)/.test(c)), [
    "docker rm -f cc-jobs-egress",
    "docker run -d --name cc-jobs-egress --restart unless-stopped --add-host host.docker.internal:host-gateway -v /jobs/conf:/etc/egress:ro -v /jobs/logs:/var/log/egress --network bridge recursica/egress:0123456789ab",
    "docker network connect --alias egress jobs-egress cc-jobs-egress",
  ]);
  assert.match(r.stdout, /Recreated cc-jobs-egress with the new filter image recursica\/egress:0123456789ab\./);
});
