#!/usr/bin/env node
/**
 * Install the agent nest into ~/.buzz on this machine.
 *
 * The Buzz agent definitions in buzz-agents/ are only half of what an agent needs.
 * The other half — the scripts it runs, the fenced MCP servers it calls, the guides it
 * reads at runtime — lives in nest/ and lands in ~/.buzz. This script puts it there.
 *
 *   node scripts/bootstrap-nest.mjs --check     what would change, touching nothing
 *   node scripts/bootstrap-nest.mjs             install
 *
 * Re-runnable and idempotent, the same way export-agents.mjs is: run it again after
 * pulling the branch and it updates what changed and leaves the rest alone.
 *
 * It deliberately does NOT create Google Cloud resources, register MCP servers, or
 * create agents. Those are separate, later, and each has its own script — see
 * nest/GUIDES/CLAIRE_ZERO_TO_RUNNING.md.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { loadValues, detokenize, deriveValues, localValuesPath } from "../buzz-agents/lib/placeholders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const nestSrc = path.join(repoRoot, "nest");
const manifestPath = path.join(nestSrc, "nest-manifest.json");

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const CHECK = has("--check") || has("--dry-run");
const NEST = path.resolve(opt("nest", process.env.BUZZ_HOME || path.join(os.homedir(), ".buzz")));
if (NEST === repoRoot || NEST.startsWith(repoRoot + path.sep)) {
  console.error(`Refusing to install nest inside repository checkout: ${NEST}`);
  process.exit(1);
}

if (has("--help") || has("-h")) {
  console.log(`Install the agent nest into ~/.buzz.

  --check                      Report what would change; write nothing.
  --nest <dir>                 Target nest (default: $BUZZ_HOME or ~/.buzz).
  --values <file>              Values file (default: buzz-agents/local-values.json).
  --help

Values come from buzz-agents/local-values.json. Copy local-values.example.json and fill
it in; this script names every value it still needs.`);
  process.exit(0);
}

/* ── reporting ─────────────────────────────────────────────────────────────── */

let changed = 0;
let failed = 0;
const notes = [];

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const wrote = (m) => {
  changed++;
  console.log(`  \x1b[36m${CHECK ? "would write" : "wrote"}\x1b[0m ${m}`);
};
const warn = (m) => {
  notes.push(m);
  console.log(`  \x1b[33m!\x1b[0m ${m}`);
};
const bad = (m) => {
  failed++;
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
};
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

/* ── 0. manifest ───────────────────────────────────────────────────────────── */

if (!fs.existsSync(manifestPath)) {
  console.error(`No manifest at ${manifestPath}. Is this the recursica-knowledge checkout?`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

console.log(`\n\x1b[1mBootstrapping nest\x1b[0m → ${NEST}${CHECK ? "   (--check: nothing will be written)" : ""}`);

/* ── 1. prerequisites ──────────────────────────────────────────────────────── */

section("Prerequisites");

const which = (cmd) => {
  try {
    // sh -c directly, rather than shell:true, which is deprecated as of DEP0190 and
    // printed a scary security warning on every run of the very first script an
    // operator runs. cmd values come from the manifest, not from user input.
    return execFileSync("/bin/sh", ["-c", `command -v "${cmd}"`], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

for (const p of manifest.prerequisites ?? []) {
  const found = p.kind === "file" ? (fs.existsSync(p.check) ? p.check : null) : which(p.check);
  if (found) {
    ok(`${p.name} — ${found}`);
  } else if (p.optional) {
    warn(`${p.name} not found (optional). ${p.why} → ${p.fix}`);
  } else {
    bad(`${p.name} not found. ${p.why}\n      → ${p.fix}`);
  }
}

if (failed) {
  console.log(
    `\n\x1b[31mStopping.\x1b[0m ${failed} required prerequisite${failed > 1 ? "s" : ""} missing — ` +
      `installing the nest without them would produce an agent that cannot run.\n`,
  );
  process.exit(1);
}

/* ── 2. commit-message name check ──────────────────────────────────────────── */

/**
 * Wire the commit hook in the checkout this script was run from.
 *
 * `.husky/commit-msg` refuses a commit message that names a client or a participant, and
 * this repository is public. But `core.hooksPath` is per-clone and unset by default, so a
 * fresh clone has no hook at all and says nothing about it — which is how a client
 * identifier reached a commit message here, on a machine where the guard was installed and
 * simply never invoked.
 *
 * `npm install` normally sets this through the `prepare` script. A new operator does not
 * run it: the deploy clones the repository and runs this script, and nothing in that path
 * installs dependencies. This script is the one thing guaranteed to execute inside their
 * clone, so it is where the hook gets turned on.
 *
 * Safe without dependencies: commit-msg is plain node against files already in the tree,
 * and pre-commit skips formatting with an explanation when node_modules is absent rather
 * than failing the commit. An operator who set hooksPath somewhere else on purpose keeps
 * it — this reports rather than overrides.
 */
section("Commit-message name check");

const insideRepo = (() => {
  try {
    return (
      execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() === "true"
    );
  } catch {
    return false;
  }
})();

if (!insideRepo) {
  warn(
    `not a git checkout, so the commit-message name check cannot be wired here.\n` +
      `      Nothing is wrong if you installed the nest from an unpacked copy — but if you\n` +
      `      intend to commit to this repository, clone it instead.`,
  );
} else {
  let hooksPath = "";
  try {
    hooksPath = execFileSync("git", ["config", "core.hooksPath"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    hooksPath = ""; // unset: git exits 1, which execFileSync throws on
  }

  if (hooksPath === ".husky") {
    ok("commit-message name check is wired (core.hooksPath = .husky)");
  } else if (hooksPath) {
    warn(
      `core.hooksPath is set to "${hooksPath}", not .husky, so the commit-message name\n` +
        `      check is not running. Left alone in case that is deliberate. To enable it:\n` +
        `        git -C ${repoRoot} config core.hooksPath .husky`,
    );
  } else if (CHECK) {
    wrote("core.hooksPath = .husky (enables the commit-message name check)");
  } else {
    try {
      execFileSync("git", ["config", "core.hooksPath", ".husky"], {
        cwd: repoRoot,
        stdio: "ignore",
      });
      wrote("core.hooksPath = .husky — commit messages are now checked for names");
    } catch {
      bad(
        `could not set core.hooksPath, so commit messages are NOT checked for client or\n` +
          `      participant names. Set it by hand before you commit:\n` +
          `        git -C ${repoRoot} config core.hooksPath .husky`,
      );
    }
  }
}

/* ── 3. values ─────────────────────────────────────────────────────────────── */

section("Values");

const valuesFile = path.resolve(opt("values", localValuesPath));
let values = loadValues(valuesFile);
if (!values) {
  console.log(`  \x1b[31m✗\x1b[0m No ${path.relative(repoRoot, valuesFile) || valuesFile}.

      cp buzz-agents/local-values.example.json buzz-agents/local-values.json

      Then fill it in — buzz-agents/placeholders.json says what each value is and
      where to find it. Re-run and this script will name anything still missing.\n`);
  process.exit(1);
}

// TRANSCRIPT_DIR and BUZZ_HOME follow from the nest path, so nobody looks them up. The
// derivation lives in lib/placeholders.mjs because restore-agents.mjs needs the identical
// result — Janice's prompt carries {{TRANSCRIPT_DIR}} and it reads local-values.json
// itself, so a derivation only this script knew about stopped it at the next step.
const hadTranscriptDir = Boolean(values.TRANSCRIPT_DIR);
values = deriveValues(values, NEST);
if (!hadTranscriptDir) ok(`TRANSCRIPT_DIR derived → ${values.TRANSCRIPT_DIR}`);
// bin/stu reads the app out of this checkout rather than a copy in the nest, so say which
// checkout it was pointed at. Moving the clone breaks the launcher until bootstrap re-runs.
ok(`STU_APP derived → ${values.STU_APP}`);

const provided = Object.entries(values).filter(([k, v]) => !k.startsWith("$") && v).length;
ok(`${provided} value${provided === 1 ? "" : "s"} loaded from ${path.relative(repoRoot, valuesFile) || valuesFile}`);

/* ── 4. directories ────────────────────────────────────────────────────────── */

section("Directories");

for (const d of manifest.directories ?? []) {
  const target = path.join(NEST, d.path);
  const mode = parseInt(d.mode, 8);
  if (fs.existsSync(target)) {
    const cur = fs.statSync(target).mode & 0o777;
    if (cur !== mode) {
      if (!CHECK) fs.chmodSync(target, mode);
      wrote(`${d.path}/ mode ${cur.toString(8)} → ${d.mode}`);
    } else {
      ok(`${d.path}/`);
    }
  } else {
    if (!CHECK) fs.mkdirSync(target, { recursive: true, mode });
    wrote(`${d.path}/ (mode ${d.mode})`);
  }
}

/* ── 5. files ──────────────────────────────────────────────────────────────── */

section("Files");

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const unresolvedByFile = new Map();

for (const f of manifest.files ?? []) {
  /**
   * `fromRoot` reads the source from the repository root instead of nest/.
   *
   * It exists for the portable agent artifacts. `portable/claude-code/agents/*.md` is already
   * exactly what a Claude Code install needs — front matter, tool allowlist, prompt — and it is
   * a build output of `scripts/build-agents.mjs`. Copying those into nest/ so the manifest could
   * reach them would fork the tree the first time somebody edited the copy, which is the same
   * reason Stu's app is deliberately not in this manifest.
   */
  const srcRoot = f.fromRoot ? repoRoot : nestSrc;
  const src = path.join(srcRoot, f.from);
  const dst = path.join(NEST, f.to);

  if (!fs.existsSync(src)) {
    bad(`${f.from} missing from ${f.fromRoot ? "the repository root" : "nest/"} — manifest and tree disagree${f.fromRoot ? ". If it is a build output, run `npm run agents:build` first" : ""}`);
    continue;
  }

  let body = fs.readFileSync(src, "utf8");

  if (f.resolve) {
    const { text, missing } = detokenize(body, values);
    body = text;
    if (missing.length) unresolvedByFile.set(f.to, missing);
  }

  const mode = parseInt(f.mode, 8);
  const exists = fs.existsSync(dst);
  const same = exists && sha(fs.readFileSync(dst)) === sha(Buffer.from(body, "utf8"));
  const modeOk = exists && (fs.statSync(dst).mode & 0o777) === mode;

  if (same && modeOk) {
    ok(f.to);
    continue;
  }

  // An operator's own file. Create it if they have none; never overwrite one they may
  // have edited. Report the drift and let them merge it.
  if (f.ifAbsent && exists) {
    if (same) {
      ok(f.to);
    } else {
      warn(
        `${f.to} differs from this branch, and is yours to edit — leaving it alone.\n` +
          `      If you did not change it deliberately, you may be missing something added\n` +
          `      upstream. Compare against the source ({{TOKEN}}s show unresolved there):\n` +
          `        diff ${dst} ${src}`,
      );
    }
    continue;
  }
  if (!CHECK) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, body, "utf8");
    fs.chmodSync(dst, mode);
  }
  wrote(`${f.to}${!exists ? " (new)" : same ? " (mode)" : ""}`);
}

/* Installing a hook script is not registering it. Every guard in nest/bin/ is invoked from
   .claude/settings.json, and that file is `ifAbsent` in the manifest — an operator who
   already has one never receives the registration, and the branch above deliberately leaves
   it alone. The result is a guard that is present, executable and current, and never called.
   Auditing coverage with `ls bin/` concludes it is on. AGENT.md documents this for the
   credential-store guard specifically; the check below is what makes it apply to every hook
   without anyone having to remember.

   An artifact that looks installed and does nothing is the exact shape that left the
   commit-msg hook switched off for months, so say it out loud and print what to paste.

   Deliberately a warning, not fatal: the operator's settings.json is theirs to edit, and a
   bootstrap that dies on it cannot be re-run to fix anything else. */
{
  const settingsRel = ".claude/settings.json";
  const declared = manifest.files?.find((f) => f.to === settingsRel);
  const installedPath = path.join(NEST, settingsRel);

  /* Keyed on event + matcher + command, not on the command alone and not on the whole hook
     object. The command alone is not enough: guard-stale-checkout.mjs and
     guard-credential-store.mjs are each registered twice, under `Bash` and again under
     `Read|Grep|Glob`, so a settings.json holding only the Bash half would pass a
     command-only comparison while half the guard was unregistered. The whole object is too
     much — it reports drift for a reordered key or an added timeout. Where a hook fires is
     the property being checked, so the key is exactly that. */
  const key = (event, matcher, command) => `${event} ${matcher ?? ""} ${command}`;
  const commandsIn = (settings) => {
    const found = [];
    for (const [event, groups] of Object.entries(settings?.hooks ?? {})) {
      for (const group of groups ?? []) {
        for (const hook of group.hooks ?? []) {
          if (hook.command) found.push({ event, matcher: group.matcher, hook });
        }
      }
    }
    return found;
  };

  if (declared && fs.existsSync(installedPath)) {
    try {
      const source = JSON.parse(
        detokenize(fs.readFileSync(path.join(nestSrc, declared.from), "utf8"), values).text,
      );
      const installed = JSON.parse(fs.readFileSync(installedPath, "utf8"));
      const have = new Set(
        commandsIn(installed).map((c) => key(c.event, c.matcher, c.hook.command)),
      );
      const missing = [];
      const seen = new Set();
      for (const c of commandsIn(source)) {
        const k = key(c.event, c.matcher, c.hook.command);
        // The source registers guard-published-text.mjs several times under one matcher.
        // Those are the same registration, so report it once rather than four times.
        if (have.has(k) || seen.has(k)) continue;
        seen.add(k);
        missing.push(c);
      }

      if (missing.length) {
        warn(
          `${settingsRel} is missing ${missing.length} hook registration${missing.length > 1 ? "s" : ""}.\n` +
            `      The script${missing.length > 1 ? "s are" : " is"} installed and will never be called.\n` +
            `      Add the following to ${installedPath}, under the event named for each:\n\n` +
            missing
              .map(
                (c) =>
                  `        ${c.event}${c.matcher ? ` / matcher "${c.matcher}"` : ""}\n` +
                  JSON.stringify(c.hook, null, 2)
                    .split("\n")
                    .map((l) => `        ${l}`)
                    .join("\n"),
              )
              .join("\n\n"),
        );
      } else {
        ok(`${settingsRel} registers every hook this branch ships`);
      }
    } catch (e) {
      warn(`${settingsRel} could not be compared against the branch: ${e.message}`);
    }
  }
}

/* Unresolved tokens are fatal. A script carrying a literal {{BQ_PROJECT}} goes looking
   for a project by that name; Janice's routing table carrying one posts findings into a
   channel that does not exist. Same fail-closed rule restore-agents.mjs uses on prompts. */
if (unresolvedByFile.size) {
  const all = [...new Set([...unresolvedByFile.values()].flat())].sort();
  console.log(
    `\n\x1b[31m✗ Unresolved tokens.\x1b[0m ` +
      (CHECK
        ? `These files would install with placeholders still in them:\n`
        : `These files were written with placeholders still in them:\n`),
  );
  for (const [file, missing] of unresolvedByFile) {
    console.log(`      ${file}\n        ${missing.join(", ")}`);
  }
  console.log(`\n      Add to buzz-agents/local-values.json, then re-run:\n`);
  for (const t of all) console.log(`        "${t}": ""`);
  console.log(`\n      buzz-agents/placeholders.json says where to find each value.\n`);
  failed++;
}

/* ── 6. toolbox ────────────────────────────────────────────────────────────── */

section("BigQuery toolbox");

const tb = manifest.toolbox ?? {};
const tbPath = path.join(NEST, tb.installTo ?? "bin/toolbox");
const platform = `${process.platform}/${process.arch}`;
const wantSha = tb.checksums?.[`${tb.referenceVersion}/${platform}`];
const tbUrl = tb.sourceUrlTemplate
  ?.replace("{version}", tb.referenceVersion)
  .replace("{os}", process.platform)
  .replace("{arch}", process.arch);

const installedSha = fs.existsSync(tbPath) ? sha(fs.readFileSync(tbPath)) : null;

if (installedSha && installedSha === wantSha) {
  ok(`toolbox ${tb.referenceVersion} present and checksum matches`);
} else if (installedSha) {
  warn(
    `toolbox present but is NOT the reference ${tb.referenceVersion} build.\n` +
      `      installed sha256 ${installedSha.slice(0, 16)}…\n` +
      `      expected  sha256 ${(wantSha ?? "unknown").slice(0, 16)}…\n` +
      `      Leaving it alone. Verify with: ${tbPath} --version`,
  );
} else if (tbUrl && wantSha) {
  if (CHECK) {
    wrote(`toolbox would download from ${tbUrl}`);
  } else {
    process.stdout.write(`  downloading toolbox ${tb.referenceVersion} (154 MB) … `);
    const res = await fetch(tbUrl);
    if (!res.ok) {
      console.log("");
      bad(`download failed: HTTP ${res.status}`);
    } else {
      const buf = Buffer.from(await res.arrayBuffer());
      const got = sha(buf);
      if (wantSha && got !== wantSha) {
        console.log("");
        bad(`checksum mismatch — refusing to install.\n      got ${got}\n      want ${wantSha}`);
      } else {
        fs.mkdirSync(path.dirname(tbPath), { recursive: true });
        fs.writeFileSync(tbPath, buf);
        fs.chmodSync(tbPath, parseInt(tb.mode ?? "0755", 8));
        console.log("");
        wrote(`bin/toolbox (${tb.referenceVersion}, checksum verified)`);
      }
    }
  }
} else if (!wantSha) {
  bad(
    `no toolbox checksum recorded for ${platform}, so there is nothing to verify a\n` +
      `      download against, and this script will not install an unverified copy of the\n` +
      `      binary that enforces the dataset fence.\n\n` +
      `      Only darwin/arm64 is pinned, because buzz and buzz-acp ship exclusively as\n` +
      `      arm64 Mach-O inside Buzz.app — the rest of this stack does not run on\n` +
      `      ${platform} either. If that has changed, download the build for this\n` +
      `      platform, verify the dataset fence still holds, and add its sha256 to\n` +
      `      "checksums" in nest/nest-manifest.json.`,
  );
} else {
  bad(
    `toolbox is not installed and nest/nest-manifest.json has no sourceUrlTemplate,\n` +
      `      so there is no verified source to fetch it from. Restore the template, or\n` +
      `      copy the binary from a machine that has a working nest:\n\n` +
      `        scp othermac:~/.buzz/bin/toolbox ${tbPath}\n` +
      `        chmod 755 ${tbPath}\n\n` +
      `      Then re-run; the checksum is verified either way.`,
  );
}

/* ── 7. what this script does not do ───────────────────────────────────────── */

section("Not done by this script");
console.log(`  These are separate steps, each with its own tool:

    Google Cloud resources     nest/GUIDES/CLAIRE_ZERO_TO_RUNNING.md steps 1–6
    Dataset + MCP registration bin/deploy-claire-channel.sh
    Prove the IAM fence        bin/verify-channel-isolation.py
    Create the agents          node buzz-agents/scripts/restore-agents.mjs --channel <uuid>
    ANTHROPIC_API_KEY          your own; never shared between operators`);

/* ── summary ───────────────────────────────────────────────────────────────── */

console.log("");
if (failed) {
  console.log(`\x1b[31m✗ ${failed} problem${failed > 1 ? "s" : ""}.\x1b[0m Fix the above and re-run — this script is idempotent.\n`);
  process.exit(1);
}
console.log(
  CHECK
    ? `\x1b[1m--check complete.\x1b[0m ${changed} change${changed === 1 ? "" : "s"} pending. Re-run without --check to apply.\n`
    : `\x1b[32m✓ Nest ready\x1b[0m at ${NEST}. ${changed} change${changed === 1 ? "" : "s"}.\n`,
);
if (notes.length) console.log(`  ${notes.length} warning${notes.length > 1 ? "s" : ""} above worth reading.\n`);
