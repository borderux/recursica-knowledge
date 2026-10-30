import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, parseAptUpgradable, cvesInChangelog, parseSoftwareUpdate, SOAK_MS, toolVersion, vmToolLines, VM_TOOLS } from "./updates.mjs";

test("an update waits 7 days from first sight, then installs; a reboot update is held", () => {
  const seen = {}, t = 1_800_000_000_000;
  const ups = [{ key: "curl@1", name: "curl", reboot: false }, { key: "linux-image@2", name: "linux-image-6.8", reboot: true }];
  let d = decide(ups, seen, new Set(), t);
  assert.equal(d.wait.length, 2);
  d = decide(ups, seen, new Set(), t + SOAK_MS);
  assert.deepEqual(d.install.map((u) => u.name), ["curl"]);
  assert.deepEqual(d.hold.map((u) => u.name), ["linux-image-6.8"]);
});

test("a fix for an actively exploited flaw skips the wait", () => {
  const d = decide([{ key: "openssl@3", name: "openssl", reboot: false, cves: ["CVE-2026-0001"] }], {}, new Set(["CVE-2026-0001"]), 1);
  assert.equal(d.install.length, 1);
  assert.deepEqual(d.install[0].exploited, ["CVE-2026-0001"]);
});

test("reads only security-channel updates from apt", () => {
  const ups = parseAptUpgradable(`Listing...
curl/noble-security,noble-updates 8.5.0-2ubuntu10.5 amd64 [upgradable from: 8.5.0-2ubuntu10.4]
vim/noble-updates 2:9.1.0016-1ubuntu7.4 amd64 [upgradable from: 2:9.1.0016-1ubuntu7.3]
linux-image-generic/noble-security 6.8.0.50.50 amd64 [upgradable from: 6.8.0.49.49]`);
  assert.deepEqual(ups.map((u) => [u.name, u.reboot]), [["curl", false], ["linux-image-generic", true]]);
});

test("reads the CVE IDs of the newest changelog entry only", () => {
  const text = `curl (8.5.0-2ubuntu10.5) noble-security; urgency=medium

  * SECURITY UPDATE: CVE-2026-1111 and CVE-2026-2222

curl (8.5.0-2ubuntu10.4) noble-security; urgency=medium

  * SECURITY UPDATE: CVE-2025-9999`;
  assert.deepEqual(cvesInChangelog(text), ["CVE-2026-1111", "CVE-2026-2222"]);
});

test("skips a new major macOS version, and marks restarts and rapid responses", () => {
  const ups = parseSoftwareUpdate(`Software Update found the following new or updated software:
* Label: macOS Tahoe 26.1-25B78
\tTitle: macOS Tahoe 26.1, Version: 26.1, Size: 4000000KiB, Recommended: YES, Action: restart,
* Label: macOS 27 Beta-26A1
\tTitle: macOS 27, Version: 27.0, Size: 9000000KiB, Recommended: YES, Action: restart,
* Label: Safari26.1-26.1
\tTitle: Safari, Version: 26.1, Size: 200000KiB, Recommended: YES,`, 26);
  assert.deepEqual(ups.map((u) => [u.name, u.reboot]), [["macOS Tahoe 26.1", true], ["Safari", false]]);
});

import { chooseDigests, taggedServices } from "./images.mjs";
test("a new image version waits 7 days before a stack uses it", () => {
  const seen = {}, t = 1_800_000_000_000;
  const tags = [{ tag: "postgres:16", current: "sha256:old", pulled: "sha256:new" }, { tag: "redis:7", current: "sha256:same", pulled: "sha256:same" }];
  assert.deepEqual(chooseDigests(tags, seen, t).map((c) => [c.tag, c.use]), [["postgres:16", "sha256:old"], ["redis:7", "sha256:same"]]);
  assert.deepEqual(chooseDigests(tags, seen, t + SOAK_MS).map((c) => [c.tag, c.use, c.changed]), [["postgres:16", "sha256:new", true], ["redis:7", "sha256:same", false]]);
});

test("an image version marked as failed is never used, and a later version still can be", () => {
  const seen = { "postgres:16@sha256:bad": Number.MAX_SAFE_INTEGER };
  const t = 1_900_000_000_000;
  assert.equal(chooseDigests([{ tag: "postgres:16", current: "sha256:old", pulled: "sha256:bad" }], seen, t)[0].use, "sha256:old");
  assert.equal(chooseDigests([{ tag: "postgres:16", current: "sha256:old", pulled: "sha256:new" }], seen, t + SOAK_MS)[0].use, "sha256:old");
  assert.equal(chooseDigests([{ tag: "postgres:16", current: "sha256:old", pulled: "sha256:new" }], seen, t + 2 * SOAK_MS)[0].use, "sha256:new");
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hermesTurnFailures, agentHomes, HERMES_TAG } from "./images.mjs";
test("the Hermes pin moves only when each agent that answers on the current Hermes image also answers on the newer one", async () => {
  assert.equal(HERMES_TAG, "nousresearch/hermes-agent:latest", "the tag setup-host.sh pins");
  const calls = [];
  // betty answers on both, barb only on the current image, and loki on neither.
  const answers = { betty: ["old", "new"], barb: ["old"], loki: [] };
  const turn = async (home, image) => { calls.push(`${home} ${image}`); return answers[home].includes(image); };
  assert.deepEqual(await hermesTurnFailures(["betty", "barb", "loki"], "old", "new", turn), ["barb"]);
  assert.deepEqual(calls, ["betty old", "betty new", "barb old", "barb new", "loki old"], "an agent that fails on the current image is not tried on the newer one");
  assert.deepEqual(await hermesTurnFailures(["betty"], "old", "new", turn), [], "the pin moves");
  assert.deepEqual(await hermesTurnFailures([], "old", "new", turn), [], "with no agent installed, the pin moves as any other pin does");
});

test("the agents' homes for the Hermes test turn are the .hermes-<handle> folders with a config.yaml", () => {
  const cc = fs.mkdtempSync(path.join(os.tmpdir(), "images-"));
  assert.deepEqual(agentHomes(cc), [], "no hermes-homes folder yet");
  for (const d of [".hermes-betty", ".hermes-barb", ".hermes-new", "other"]) fs.mkdirSync(path.join(cc, "hermes-homes", d), { recursive: true });
  for (const d of [".hermes-betty", ".hermes-barb", "other"]) fs.writeFileSync(path.join(cc, "hermes-homes", d, "config.yaml"), "model: {}\n");
  fs.writeFileSync(path.join(cc, "hermes-homes/bridge-config.json"), "{}\n");
  assert.deepEqual(agentHomes(cc), [".hermes-barb", ".hermes-betty"].map((d) => path.join(cc, "hermes-homes", d)));
});

test("the weekly image job holds a tagged image for 7 days, and leaves a digest-pinned or built service to the pins and the build", () => {
  const services = { caddy: { image: "caddy:2@sha256:0123abcd" }, presidio: { image: "presidio:latest" }, api: { image: "cc-api", build: { context: "." } }, none: {} };
  assert.deepEqual(taggedServices(services).map(([svc]) => svc), ["presidio"]);
});

test("reads Lima's and Colima's versions, and a release tag", () => {
  assert.equal(toolVersion("colima version 0.10.3\ngit commit: abc\n"), "0.10.3");
  assert.equal(toolVersion("limactl version 2.2.1\n"), "2.2.1");
  assert.equal(toolVersion("v0.11.0"), "0.11.0");
  assert.equal(toolVersion(""), null);
  assert.deepEqual(VM_TOOLS.map((t) => [t.name, t.repo, t.pin]), [["Colima", "abiosoft/colima", "COLIMA_VERSION"], ["Lima", "lima-vm/lima", "LIMA_VERSION"]]);
});

test("a new Lima or Colima release posts once in Slack after 7 days, with the pin to move", () => {
  const seen = {}, t0 = 1_800_000_000_000;
  const found = [{ name: "Colima", pin: "COLIMA_VERSION", installed: "0.10.3", latest: "0.11.0" }, { name: "Lima", pin: "LIMA_VERSION", installed: "2.2.1", latest: "2.2.1" }];
  assert.deepEqual(vmToolLines(found, seen, t0), [], "the release waits 7 days");
  const lines = vmToolLines(found, seen, t0 + SOAK_MS);
  assert.deepEqual(lines, ["Colima 0.11.0 is out, and this computer runs 0.10.3. Move COLIMA_VERSION and its checksum in circlechat/tenant/setup-pc.sh to 0.11.0 by pull request, then rerun setup-pc.sh."]);
  assert.deepEqual(vmToolLines(found, seen, t0 + SOAK_MS + 3600_000), [], "once per release");
  assert.deepEqual(vmToolLines([{ name: "Lima", pin: "LIMA_VERSION", installed: "2.3.0", latest: "2.2.1" }], {}, t0 + SOAK_MS), [], "an older release is no update");
});
