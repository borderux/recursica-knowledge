#!/usr/bin/env node
/**
 * Detect the Buzz Desktop upgrade that silently reverts the nest's own rules.
 *
 * `AGENTS.md` is auto-loaded into every agent turn, so durable rules keep getting written
 * into it. It is not in `nest-manifest.json`, so `bootstrap-nest.mjs` leaves it alone, and
 * that makes it look safe. It is not. `refresh_agents_md_if_stale`
 * (`desktop/src-tauri/src/managed_agents/nest.rs`) keeps everything from the
 * `<!-- BEGIN BUZZ MANAGED` marker down and replaces everything above it with the template
 * embedded in the app binary. Replaced, not merged.
 *
 * The damage is not that the section goes blank — it is that the template's *older* wording
 * comes back. A rule fixed locally reverts to the version that caused the bug it fixed, in
 * the file agents read first, with no diff, no backup and nothing that looks broken. That is
 * the whole reason this script exists: the loss is silent, so something has to be watching.
 *
 * It is gated on one integer — `NEST_AGENTS_VERSION` in the binary versus
 * `~/.buzz/.nest-agents-version` — so it does not fire until a build bumps the constant, and
 * then it fires once, quietly, on launch.
 *
 * Two things are reported, and they answer different questions:
 *
 *   exposure  how many lines of the current above-marker section the shipped template does
 *             not have. This is what the next bump would take. Non-zero is normal and not a
 *             failure — it is the cost of keeping rules there at all.
 *   loss      lines that were in the section last run and are not in it now. This is the
 *             bump having already happened. It is a failure and it exits non-zero.
 *
 * The backup it diffs against lives outside `AGENTS.md`, because the refresh rewrites that
 * one file and nothing else — so a sibling in the nest survives the event it is there to
 * detect, and doubles as the copy you restore from.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BUZZ_HOME = process.env.BUZZ_HOME || path.join(os.homedir(), ".buzz");
const AGENTS_MD = path.join(BUZZ_HOME, "AGENTS.md");
const BACKUP = path.join(BUZZ_HOME, ".agents-md-above-marker.bak");
const VERSION_FILE = path.join(BUZZ_HOME, ".nest-agents-version");
const BINARY = "/Applications/Buzz.app/Contents/MacOS/buzz-desktop";
const BEGIN_MARKER = "<!-- BEGIN BUZZ MANAGED";

/** Everything above the managed marker — the part an upgrade replaces. */
function aboveMarker(text) {
  const i = text.indexOf(BEGIN_MARKER);
  return i === -1 ? text : text.slice(0, i);
}

/**
 * Pull the template out of the running app rather than a checkout, because the checkout is
 * whatever was last fetched and the binary is what will actually overwrite the file. The
 * template is one contiguous UTF-8 blob in the executable, so a byte-range match gets it
 * whole — `strings` would split it per line and lose the ordering that makes a diff mean
 * anything.
 */
function templateFromBinary() {
  if (!fs.existsSync(BINARY)) return null;
  const buf = fs.readFileSync(BINARY);
  // Byte-level search, not a regex over the decoded file. This runs on every turn end, and
  // decoding a 14 MB executable into a JS string to match against costs about a second —
  // Buffer.indexOf costs a few milliseconds. A check that makes every turn noticeably slower
  // is a check someone eventually unhooks.
  const start = buf.indexOf("# Buzz Nest\n");
  if (start === -1) return null;
  const end = buf.indexOf("<!-- END BUZZ MANAGED -->", start);
  if (end === -1 || end - start > 20000) return null;
  return aboveMarker(buf.toString("utf8", start, end));
}

/**
 * Lines of `a` not covered by `b`, counting duplicates — a multiset difference, not a set
 * one. The distinction is not academic: a `Set` treats every ``` fence as present because
 * the template happens to contain a fence somewhere, so adding a fenced code block locally
 * scores as costing nothing. That undercounts real exposure by exactly the lines most likely
 * to be added. Decrementing a tally instead makes the fourth fence count when the template
 * only has two.
 *
 * Order is still ignored, which is correct here: the refresh replaces the section wholesale
 * rather than rearranging it, so position carries no information a tally does not.
 */
function linesMissingFrom(a, b) {
  const budget = new Map();
  for (const l of b.split("\n")) budget.set(l, (budget.get(l) ?? 0) + 1);
  const missing = [];
  for (const l of a.split("\n")) {
    const left = budget.get(l) ?? 0;
    if (left > 0) budget.set(l, left - 1);
    else missing.push(l);
  }
  return missing;
}

function main() {
  if (!fs.existsSync(AGENTS_MD)) {
    console.error(`check-agents-md-drift: no ${AGENTS_MD}`);
    process.exit(0);
  }

  const current = aboveMarker(fs.readFileSync(AGENTS_MD, "utf8"));
  const version = fs.existsSync(VERSION_FILE)
    ? fs.readFileSync(VERSION_FILE, "utf8").trim()
    : "unknown";

  const template = templateFromBinary();
  const exposure =
    template === null ? null : linesMissingFrom(current, template);
  const exposedNonBlank =
    exposure === null ? null : exposure.filter((l) => l.trim() !== "").length;

  /*
   * No baseline means no comparison is possible, and saying "ok" here would be a lie of the
   * worst available kind: the run that discovers a missing baseline is exactly the run that
   * happens *after* a wipe, when someone finally checks. Reporting ok would then record the
   * post-wipe section as the baseline and permanently destroy the evidence.
   *
   * So this path never prints ok. It seeds and says what it could not check. When the section
   * is also byte-identical to the shipped template, that is called out separately — a fresh
   * nest and a just-wiped nest are genuinely indistinguishable from one file, and the right
   * move is to name the ambiguity rather than resolve it in the reassuring direction.
   */
  if (!fs.existsSync(BACKUP)) {
    fs.writeFileSync(BACKUP, current);
    console.log(
      `check-agents-md-drift: baseline seeded at ${BACKUP}. No prior state existed, so ` +
        `any replacement before now is undetectable — this run verified nothing.`,
    );
    if (exposedNonBlank === 0) {
      console.warn(
        `  warning: the section above the marker is identical to the template in the ` +
          `installed app. On a new nest that is expected. On a nest that had its own rules, ` +
          `it is what a completed refresh looks like (installed version: ${version}).`,
      );
    }
    process.exit(0);
  }

  // Loss is measured against our own last-known-good rather than against the template, so it
  // stays true whatever the app ships.
  const lost = linesMissingFrom(
    fs.readFileSync(BACKUP, "utf8"),
    current,
  ).filter((l) => l.trim() !== "");

  if (lost.length > 0) {
    console.error(
      `check-agents-md-drift: ${lost.length} non-blank line(s) present last run are GONE from ` +
        `${AGENTS_MD} above the managed marker.`,
    );
    console.error(
      `An upgrade likely replaced the section (installed nest-agents version: ${version}).`,
    );
    console.error(`Restore from: ${BACKUP}\n`);
    for (const l of lost.slice(0, 40)) console.error(`  - ${l}`);
    if (lost.length > 40) console.error(`  … and ${lost.length - 40} more`);
    // Deliberately NOT refreshing the backup here. Overwriting it now would destroy the only
    // copy of what was lost, in the one run where it matters.
    process.exit(1);
  }

  if (exposure === null) {
    console.log(
      `check-agents-md-drift: ok (no Buzz.app found; exposure not measured, baseline refreshed)`,
    );
  } else {
    console.log(
      `check-agents-md-drift: ok — ${exposure.length} line(s) above the marker ` +
        `(${exposedNonBlank} non-blank) exist only locally and would be lost on the next ` +
        `NEST_AGENTS_VERSION bump. Installed version: ${version}.`,
    );
  }

  fs.writeFileSync(BACKUP, current);
}

main();
