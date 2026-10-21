import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, parseAptUpgradable, cvesInChangelog, parseSoftwareUpdate, SOAK_MS } from "./updates.mjs";

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

import { chooseDigests } from "./images.mjs";
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
