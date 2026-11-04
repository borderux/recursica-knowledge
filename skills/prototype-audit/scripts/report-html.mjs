#!/usr/bin/env node
// Turns an audit report (Markdown) into a styled HTML page next to it.
// Usage: node report-html.mjs <report.md> [--out report.html]
//
// It handles the Markdown the report template uses: headings, paragraphs, bold,
// italics, code, links, lists, tables, quotes, code blocks and rules. Scores in
// headings and in a table's "Score" column become coloured badges: a check's 1 or 0,
// a dimension's "4/6", "Unsure" or "Not scored". A table row whose score is Unsure or
// Not scored is flagged, so checks left out of the score stand out.
// No dependencies, and the page has no external files, so it opens anywhere.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const input = args.find((a, i) => !a.startsWith("--") && (outIdx < 0 || i !== outIdx + 1));
if (!input) {
  console.error("Usage: node report-html.mjs <report.md> [--out report.html]");
  process.exit(1);
}
const outFile = outIdx >= 0 ? args[outIdx + 1] : input.replace(/\.md$/, "") + ".html";

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function badge(text) {
  const t = text.trim();
  let level = null;
  if (t === "1") level = "pass";
  else if (t === "0") level = "fail";
  else if (/^not scored$/i.test(t)) level = "na";
  else if (/^unsure$/i.test(t)) level = "unsure";
  else {
    // A fraction such as "4/6": green when every check passed, red when none did.
    const f = t.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (f) {
      const [n, d] = [Number(f[1]), Number(f[2])];
      level = d === 0 ? "na" : n === d ? "pass" : n === 0 ? "fail" : n * 2 >= d ? "most" : "some";
    }
  }
  const flag = level === "unsure" || level === "na" ? "⚑ " : "";
  return level ? `<span class="badge ${level}">${flag}${escape(t)}</span>` : null;
}

function inline(raw) {
  // Code spans first, so nothing inside them is formatted.
  const codes = [];
  let s = raw.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = escape(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escape(codes[Number(i)])}</code>`);
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function table(lines) {
  const head = cells(lines[0]);
  const scoreCol = head.findIndex((h) => /^score$/i.test(h.replace(/\*/g, "")));
  const body = lines.slice(2).map(cells);
  const td = (c, i, tag) => {
    const b = i === scoreCol && tag === "td" ? badge(c.replace(/\*/g, "")) : null;
    return `<${tag}>${b ?? inline(c)}</${tag}>`;
  };
  const left = (r) => scoreCol >= 0 && /^(unsure|not scored)$/i.test((r[scoreCol] ?? "").replace(/\*/g, "").trim());
  return (
    `<div class="table"><table><thead><tr>${head.map((c, i) => td(c, i, "th")).join("")}</tr></thead>` +
    `<tbody>${body.map((r) => `<tr${left(r) ? ' class="left-out"' : ""}>${r.map((c, i) => td(c, i, "td")).join("")}</tr>`).join("")}</tbody></table></div>`
  );
}

function render(md) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      // "## 3. Own components only where Recursica has none: 2/3" gets a badge for the score.
      const m = h[2].match(/^(.*?):\s*(\d+\s*\/\s*\d+|[01]|Not scored|Unsure)\s*$/i);
      const b = m ? badge(m[2]) : null;
      out.push(`<h${level}>${b ? `${inline(m[1])} ${b}` : inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }
    if (line.trim().startsWith("|") && lines[i + 1] && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      out.push(table(rows));
      continue;
    }
    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      // A blank quote line starts a new paragraph inside the quote.
      const paras = quote.join("\n").split(/\n\s*\n/).map((q) => `<p>${inline(q.replace(/\n/g, " "))}</p>`);
      out.push(`<blockquote>${paras.join("")}</blockquote>`);
      continue;
    }
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (m) items.push(m[3]);
        else if (/^\s+\S/.test(lines[i]) && items.length) items[items.length - 1] += ` ${lines[i].trim()}`;
        else break;
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|>|\s*\||\s*([-*]|\d+\.)\s|\s*-{3,}\s*$)/.test(lines[i])
    ) {
      para.push(lines[i++].trim());
    }
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    else i++;
  }
  return out.join("\n");
}

const md = fs.readFileSync(input, "utf8");
const title = (md.match(/^#\s+(.*)$/m)?.[1] ?? path.basename(input, ".md")).replace(/[`*]/g, "");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
:root {
  --bg: #ffffff; --text: #1d2125; --muted: #5d6770; --line: #dde1e5; --soft: #f4f6f8;
  --link: #0b5cad; --code: #eef1f4;
  --pass: #1f7a3f; --passbg: #e3f4e8; --most: #1d5fa8; --mostbg: #e2edf9;
  --some: #8a5a00; --somebg: #fbefd6; --fail: #b3261e; --failbg: #fbe4e2; --na: #5d6770; --nabg: #eceff2;
  --unsure: #7a4d00; --unsurebg: #fde7b0; --leftout: #fff8e6;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #15181b; --text: #e6e8ea; --muted: #a0a8b0; --line: #30363c; --soft: #1d2125;
    --link: #79b4f2; --code: #242a30;
    --pass: #7fd49a; --passbg: #173a24; --most: #8fbdf0; --mostbg: #172f4a;
    --some: #f0c26e; --somebg: #3d2f12; --fail: #f19a93; --failbg: #45201d; --na: #a0a8b0; --nabg: #2a3036;
    --unsure: #f5cf7a; --unsurebg: #4a3510; --leftout: #2a2418;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
main { max-width: 980px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 1.9rem; line-height: 1.25; margin: 0 0 8px; }
h2 { font-size: 1.35rem; margin: 40px 0 12px; padding-top: 8px; border-top: 1px solid var(--line); }
h3 { font-size: 1.1rem; margin: 28px 0 8px; }
h1 + p { color: var(--muted); margin-top: 0; }
p, ul, ol { margin: 0 0 14px; }
li { margin: 4px 0; }
a { color: var(--link); }
code { font: 0.9em ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--code); padding: 1px 5px; border-radius: 4px; }
pre { background: var(--code); padding: 12px 14px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote p:last-child { margin-bottom: 0; }
blockquote { margin: 0 0 14px; padding: 8px 14px; border-left: 3px solid var(--line); color: var(--muted); }
hr { border: 0; border-top: 1px solid var(--line); margin: 32px 0; }
hr + h2 { border-top: 0; padding-top: 0; margin-top: 0; }
.table { overflow-x: auto; margin: 0 0 18px; border: 1px solid var(--line); border-radius: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
th, td { text-align: left; vertical-align: top; padding: 8px 12px; border-bottom: 1px solid var(--line); }
th { background: var(--soft); font-weight: 600; white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
.badge {
  display: inline-block; min-width: 1.9em; padding: 1px 9px; border-radius: 999px;
  font-size: 0.85em; font-weight: 700; text-align: center; vertical-align: middle;
}
h2 .badge, h3 .badge { margin-left: 6px; font-size: 0.8em; }
.pass { color: var(--pass); background: var(--passbg); }
.most { color: var(--most); background: var(--mostbg); }
.some { color: var(--some); background: var(--somebg); }
.fail { color: var(--fail); background: var(--failbg); }
.na { color: var(--na); background: var(--nabg); font-weight: 600; }
.unsure { color: var(--unsure); background: var(--unsurebg); }
tr.left-out td { background: var(--leftout); }
footer { margin-top: 48px; color: var(--muted); font-size: 0.85rem; }
</style>
</head>
<body>
<main>
${render(md)}
<footer>Generated from <code>${escape(path.basename(input))}</code> by the prototype-audit skill.</footer>
</main>
</body>
</html>
`;

fs.writeFileSync(outFile, html);
console.log(outFile);
