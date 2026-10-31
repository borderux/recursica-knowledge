#!/usr/bin/env node
// Barb's Hermes limits, from agents/barb/runtime/hermes.md, the one place the values are written.
// setup-agent.sh barb runs this on each run, so the limits hold even though Hermes's own default
// config.yaml already has a delegation block.
//
//   node barb-limits.mjs config < config.yaml     prints the config with each limit set
//   node barb-limits.mjs timeout <CircleChat .env>   prints "HERMES_TIMEOUT ok", or the value
//                                                    HERMES_TIMEOUT should have; nothing else
//
// config: each key from the YAML block in hermes.md is set inside the config's own block, and every
// other key stays, such as delegation.default_toolsets. A missing block is added at the top level.
// The caller reads and writes config.yaml through kit/safe-files.mjs, which never follows a
// symlink. The changes go to stderr.
//
// Exit: 0 with the new text or the timeout line, 1 when the config has a shape this cannot edit
// safely, such as a block written on one line, or tool_loop_guardrails under another key, where
// Hermes ignores it. 2 on usage.
import fs from "node:fs";
import path from "node:path";
import { setKeys } from "./yaml-keys.mjs";

const SPEC = path.join(path.dirname(new URL(import.meta.url).pathname), "../../agents/barb/runtime/hermes.md");

// The limits in hermes.md's first ```yaml block: [["delegation", "oneshot_max_children"], "0"], ...
export function limitsFrom(md) {
  const block = /```yaml\n([\s\S]*?)```/.exec(md);
  if (!block) throw new Error("hermes.md has no yaml block with Barb's limits.");
  const out = [], stack = [];
  for (const raw of block[1].split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    const m = /^( *)([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const depth = m[1].length / 2;
    stack.length = depth;
    stack.push(m[2]);
    if (m[3] !== "") out.push([[...stack], m[3]]);
  }
  if (!out.length) throw new Error("hermes.md's yaml block names no limits.");
  return out;
}

// The HERMES_TIMEOUT hermes.md asks for, in seconds.
export function timeoutFrom(md) {
  const m = /^HERMES_TIMEOUT=(\d+)\s*$/m.exec(md);
  if (!m) throw new Error("hermes.md names no HERMES_TIMEOUT.");
  return Number(m[1]);
}

// Each limit is set inside the config's own block by kit/yaml-keys.mjs, which every agent's settings
// share. The notes name each change with its old and new value.
export function setLimits(text, limits) {
  const { text: out, notes } = setKeys(text, limits);
  return { text: out, notes };
}

// "HERMES_TIMEOUT ok", or the value HERMES_TIMEOUT should have. Nothing else from the .env is
// printed: the file holds secrets.
export function timeoutLine(envText, want) {
  let have = NaN;
  for (const line of envText.split("\n")) {
    const m = /^HERMES_TIMEOUT=["']?(\d+)["']?\s*$/.exec(line);
    if (m) have = Number(m[1]);
  }
  return have >= want ? "HERMES_TIMEOUT ok" : `HERMES_TIMEOUT should be ${want} or more (agents/barb/runtime/hermes.md).`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, file] = process.argv.slice(2);
  try {
    const md = fs.readFileSync(process.env.BARB_HERMES_MD ?? SPEC, "utf8");
    if (cmd === "config") {
      const { text, notes } = setLimits(fs.readFileSync(0, "utf8"), limitsFrom(md));
      for (const n of notes) console.error(`Barb's config.yaml: ${n}`);
      process.stdout.write(text);
    } else if (cmd === "timeout" && file) {
      let env = "";
      try { env = fs.readFileSync(file, "utf8"); } catch {}
      console.log(timeoutLine(env, timeoutFrom(md)));
    } else {
      console.error("usage: barb-limits.mjs config < config.yaml | barb-limits.mjs timeout <.env>");
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
