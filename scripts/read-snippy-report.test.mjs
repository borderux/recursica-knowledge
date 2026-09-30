/**
 * The fixture is built here, not copied from a real report: a real one carries a reviewer's name
 * and email and a page from a real product. Personal details are assembled at runtime so this file
 * passes the check it exercises.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseReport, pageLocation, makeScrub } from "./read-snippy-report.mjs";
import { findPersonalData } from "../buzz-agents/lib/personal-data.mjs";

const SCRIPT = path.join(import.meta.dirname, "read-snippy-report.mjs");
const EMAIL = ["jordan.p", "gmail.com"].join("@");
const PHONE = ["415", "867", "5309"].join("-");
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PAGE =
  "https://private-host.example.test:5173/prototypes/orders?status=Open&page=2";

const REPORT = `<!doctype html><html><head>
<meta name="snippy-session-id" content="session-1">
<meta name="snippy-version" content="0.2.0">
<meta name="snippy-os" content="macOS">
<meta name="snippy-time-zone" content="America/Los_Angeles">
</head><body>
<div class="report-header"><h1>Snippy report</h1>
<p class="report-meta">Reviewer: Person A</p>
<p class="report-meta">Email: ${EMAIL}</p>
<p class="report-meta">Details: Acme Corp pilot</p></div>
<div class="page-section" id="page-0">
<h2 class="page-url"><a href="${PAGE.replace(/&/g, "&amp;")}">${PAGE}</a></h2>
<p class="page-recursica" data-recursica="yes" data-forge-version="0.27.1" data-transform-version="1.3.3" data-theme-mode="light" data-layers="0">Recursica: yes</p>
<div class="comment" data-comment-id="1"><div class="comment-body"><p class="comment-id">Comment 1</p><p class="comment-text">Move the filter above the table.<br>Ask ${EMAIL} or ${PHONE} if unsure &amp; check.</p><p class="comment-context" data-viewport-width="1470" data-viewport-height="802" data-scroll-y="0" data-color-scheme="light">x</p></div></div>
<div class="comment" data-comment-id="2"><div class="comment-body"><p class="comment-id">Comment 2</p><p class="comment-text"></p><p class="comment-context" data-viewport-width="1470" data-viewport-height="802" data-scroll-y="299">x</p><div class="comment-element"><p class="element-label">Element</p><p class="element-selector"><code>#root &gt; table &gt; th</code></p><details class="element-html"><summary>HTML</summary><pre><code>&lt;th&gt;Owner: ${EMAIL}&lt;/th&gt;</code></pre></details><details class="element-styles"><summary>Styles</summary><pre><code>font-weight: 700;</code></pre></details></div></div><div class="comment-shots"><figure class="shot shot-annotated" data-annotation-count="3" data-dot-count="2"><a href="#shot-0" class="shot-thumb-link"><img class="shot-thumb" src="data:image/png;base64,${PIXEL}" /></a></figure><figure class="shot shot-clean"><a href="#shot-1" class="shot-thumb-link"><img class="shot-thumb" src="data:image/png;base64,${PIXEL}" /></a></figure></div></div>
</div>
<a href="#_" id="shot-0" class="lightbox"><img src="data:image/png;base64,${PIXEL}" alt="a" /></a>
<a href="#_" id="shot-1" class="lightbox"><img src="data:image/png;base64,${PIXEL}" alt="b" /></a>
</body></html>`;

const scrub = makeScrub([]);

test("comments, the captured element and screenshots are read", () => {
  const r = parseReport(REPORT, scrub);
  assert.equal(r.sessionId, "session-1");
  assert.equal(r.pages.length, 1);
  const [c1, c2] = r.pages[0].comments;
  assert.equal(c1.id, 1);
  assert.match(c1.text, /^Move the filter above the table\.\n/);
  assert.equal(c1.viewport, "1470x802");
  assert.equal(c2.text, "");
  assert.equal(c2.element.selector, "#root > table > th");
  assert.equal(c2.element.styles, "font-weight: 700;");
  assert.deepEqual(
    c2.shots.map((s) => [s.kind, s.ref]),
    [
      ["annotated", "shot-0"],
      ["clean", "shot-1"],
    ],
  );
  assert.equal(c2.shots[0].dots, 2);
  assert.equal(r.pages[0].forgeVersion, "0.27.1");
});

test("the page keeps its path and query, never its host", () => {
  assert.equal(pageLocation(PAGE), "/prototypes/orders?status=Open&page=2");
  assert.equal(
    parseReport(REPORT, scrub).pages[0].location,
    "/prototypes/orders?status=Open&page=2",
  );
});

test("personal details in comments and captured HTML are replaced", () => {
  const r = parseReport(REPORT, scrub);
  const [c1, c2] = r.pages[0].comments;
  assert.deepEqual(findPersonalData(c1.text), []);
  assert.match(c1.text, /\[email removed\] or \[phone removed\]/);
  assert.deepEqual(findPersonalData(c2.element.html), []);
});

test("a name on the local redaction list is replaced too", () => {
  const s = makeScrub([
    { pattern: "(?<![A-Za-z0-9])Acme(?![A-Za-z0-9])", label: "a client" },
  ]);
  assert.equal(s("the Acme order list"), "the [name removed] order list");
});

test("the written output has no reviewer, host, machine or Details line", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snippy-test-"));
  const file = path.join(dir, "report.html");
  fs.writeFileSync(file, REPORT);
  const out = path.join(dir, "out");
  execFileSync(process.execPath, [SCRIPT, file, "--out", out]);
  const written =
    fs.readFileSync(path.join(out, "summary.md"), "utf8") +
    fs.readFileSync(path.join(out, "report.json"), "utf8");
  for (const leak of [
    "Person A",
    "Acme Corp",
    "private-host",
    "macOS",
    "Los_Angeles",
  ]) {
    assert.ok(!written.includes(leak), `output contains ${leak}`);
  }
  assert.deepEqual(findPersonalData(written), []);
  assert.ok(fs.existsSync(path.join(out, "comment-2-annotated.png")));
  assert.ok(fs.existsSync(path.join(out, "comment-2-clean.png")));
});
