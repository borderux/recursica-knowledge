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

const KEY = (indent, key) => new RegExp(`^ {${indent}}${key}:(.*)$`);
const isContent = (l) => l.trim() !== "" && !l.trimStart().startsWith("#");
const indentOf = (l) => l.length - l.trimStart().length;

// The lines of one mapping's children: [start, end) after the key's line at <indent>.
function childRange(lines, at, indent) {
  let end = at + 1;
  for (let i = at + 1; i < lines.length; i++) {
    if (!isContent(lines[i])) continue;
    if (indentOf(lines[i]) <= indent) break;
    end = i + 1;
  }
  return [at + 1, end];
}

// Sets <keys> to <value> in <lines>, keeping every other line. Returns a note of the change, or null.
function setKey(lines, keys, value) {
  let start = 0, end = lines.length, indent = 0;
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k], last = k === keys.length - 1;
    // Within a block, the children's indent is the first child's; an empty block gets two more.
    if (k > 0) { const first = lines.slice(start, end).find(isContent); indent = first ? indentOf(first) : indent + 2; }
    let at = -1;
    for (let i = start; i < end; i++) if (isContent(lines[i]) && indentOf(lines[i]) === indent && KEY(indent, key).test(lines[i])) { at = i; break; }
    if (at < 0) {
      // Missing: the rest of the path goes after the block's last line.
      const add = keys.slice(k).map((name, j) => `${" ".repeat(indent + 2 * j)}${name}:${j === keys.length - k - 1 ? ` ${value}` : ""}`);
      if (k === 0) lines.push(...(lines.length && lines[lines.length - 1].trim() !== "" ? [""] : []), ...add);
      else lines.splice(end, 0, ...add);
      return `${keys.join(".")}: ${value} (added)`;
    }
    const rest = KEY(indent, key).exec(lines[at])[1].replace(/\s+#.*$/, "").trim();
    const [cs, ce] = childRange(lines, at, indent);
    if (last) {
      if (rest === "" && ce > cs) throw new Error(`${keys.join(".")} is a block in config.yaml, not a value. Set it by hand to ${value}.`);
      if (rest === value) return null;
      lines[at] = `${" ".repeat(indent)}${key}: ${value}`;
      return `${keys.join(".")}: ${rest || "(empty)"} -> ${value}`;
    }
    if (rest !== "") throw new Error(`${keys.slice(0, k + 1).join(".")} in config.yaml is written on one line. Rewrite it as a block, then rerun.`);
    start = cs; end = ce;
  }
  return null;
}

export function setLimits(text, limits) {
  const lines = text.replace(/\n$/, "").split("\n");
  // Hermes reads these blocks at the top level only; one under another key is silently ignored.
  for (const top of new Set(limits.map(([keys]) => keys[0]))) {
    const nested = lines.findIndex((l) => isContent(l) && indentOf(l) > 0 && KEY(indentOf(l), top).test(l));
    if (nested >= 0) throw new Error(`config.yaml has ${top} under another key, at line ${nested + 1}, where Hermes ignores it. Move it to the top level, then rerun.`);
  }
  const notes = [];
  for (const [keys, value] of limits) { const note = setKey(lines, keys, value); if (note) notes.push(note); }
  return { text: lines.join("\n") + "\n", notes };
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
