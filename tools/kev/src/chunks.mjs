import fs from "node:fs";
import path from "node:path";

const numbered = (lines, start) =>
  lines.map((l, i) => `${String(start + i).padStart(4)}| ${l}`).join("\n");

export function readScreen(files, root) {
  return files.map((abs) => {
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    return { abs, rel: path.relative(root, abs) || abs, lines };
  });
}

// Overlapping, line-numbered windows. Kev-engine cannot cite a line, so the chunk is the citation:
// a lead points at a line range, and full Barb pins it to a line.
export function chunk(screen, size, overlap) {
  const out = [];
  const step = Math.max(1, size - overlap);
  for (const f of screen) {
    for (let s = 0; s < f.lines.length; s += step) {
      const slice = f.lines.slice(s, s + size);
      out.push({ file: f.rel, from: s + 1, to: s + slice.length, text: numbered(slice, s + 1) });
      if (s + size >= f.lines.length) break;
    }
  }
  return out;
}

export function whole(screen) {
  return screen.map((f) => ({ file: f.rel, text: numbered(f.lines, 1) }));
}

export const lineCount = (screen) => screen.reduce((n, f) => n + f.lines.length, 0);

// Review units: a whole file when it fits, overlapping chunks when it doesn't. Fewer, larger
// units mean fewer chances for one noisy score to become a lead.
export function units(screen, fileMax, size, overlap) {
  const out = [];
  for (const f of screen) {
    if (f.lines.length <= fileMax) out.push({ file: f.rel, from: 1, to: f.lines.length, text: numbered(f.lines, 1) });
    else out.push(...chunk([f], size, overlap));
  }
  return out;
}
