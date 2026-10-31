// Sets keys in a Hermes config.yaml's text, inside the blocks the file already has, and keeps every
// other line, comments included. Used by kit/barb-limits.mjs and kit/hermes-lookups.mjs; the caller
// reads and writes config.yaml through kit/safe-files.mjs, which never follows a symlink.
//
// setKeys(text, [[["block", "key"], "value"], ...]) -> { text, notes, changed }
//   notes: one line per change, with the old and new value ("block.key: 1 -> 0", "block.key: 0 (added)")
//   changed: the dotted name of each key that changed, and nothing else
// A missing block is added at the top level. A shape this cannot edit safely throws, and the caller
// writes nothing: a block written on one line, a key that is a block, or a top-level block that
// sits under another key, where Hermes ignores it.

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

export function setKeys(text, settings) {
  const lines = text.replace(/\n$/, "").split("\n");
  // Hermes reads these blocks at the top level only; one under another key is silently ignored.
  for (const top of new Set(settings.map(([keys]) => keys[0]))) {
    const nested = lines.findIndex((l) => isContent(l) && indentOf(l) > 0 && KEY(indentOf(l), top).test(l));
    if (nested >= 0) throw new Error(`config.yaml has ${top} under another key, at line ${nested + 1}, where Hermes ignores it. Move it to the top level, then rerun.`);
  }
  const notes = [], changed = [];
  for (const [keys, value] of settings) {
    const note = setKey(lines, keys, value);
    if (note) { notes.push(note); changed.push(keys.join(".")); }
  }
  return { text: lines.join("\n") + "\n", notes, changed };
}
