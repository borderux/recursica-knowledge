#!/usr/bin/env node
// Kev labels: what each design review's harness learned about Kev's first pass, one JSON object per
// line ("Kev labels, version 1" in circlechat/README.md, "Kev's review data"). push-data.sh and
// pull-kev-notes.sh call this file. No dependencies.
//
// Every real review feeds Kev; no eval run ever can. Each line says which it came from, in "run":
// "review" or "eval". A file with any line that isn't a real-review label is refused whole, here at
// the push and again at the pull, so an eval label never reaches the notes repo or training, even
// if a person merged one.
//
//   node kev-labels.mjs gather <site.json>
//       Every real-review label in the label folders of recursicachat.services (kev_labels), on
//       stdout, one per line. One line on stderr for each refused folder or file: nothing from a
//       refused folder or file is printed, and every other one still is. Exit 3 when anything was
//       refused.
//   node kev-labels.mjs merge <main's kev-labels.jsonl>
//       Main's file, then each new label from stdin that isn't on main yet, in order, on stdout.
//       Lines are compared whole, so a later line with the same id (a person's decision) stays
//       after the earlier one. With nothing new, main's file comes out unchanged.
//   node kev-labels.mjs filter
//       Only the real-review labels from stdin, on stdout, and one line on stderr with the count
//       dropped.
//
// A label folder belongs to the service's own account, and no group or other account can write to
// it (the harness's installer makes it <account>:staff, 0750, and each file 0640, so this job,
// which runs as the stack's owner in group staff, can read it). The gather refuses a folder that
// is a symlink, belongs to another account, is writable by its group or others, or sits in a git
// checkout, and a file that is a symlink, has a second hard link, belongs to another account, or
// is writable by its group or others. Files are opened without following a symlink, as
// safe-files.mjs reads.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const { O_RDONLY, O_NOFOLLOW, O_NONBLOCK } = fs.constants;

export const LABELS_FILE = "kev-labels.jsonl";
export const FIELDS = ["v", "run", "id", "at", "agent", "review", "repo", "commit", "file", "lines", "skill", "item", "kev", "outcome", "evidence", "feisty", "person"];
const STRINGS = ["id", "at", "agent", "review", "repo", "commit", "file", "skill", "item"];
export const KEV_SAID = ["lead", "unsure", "clear", "none"];
export const OUTCOMES = ["confirmed", "refuted", "unsettled", "not-raised"];
const ACCOUNT = /^_?[a-z][a-z0-9_-]{0,31}$/;

const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

// Why <obj> is not a Kev label, version 1, or null when it is one. Says nothing about "run".
export function labelProblem(obj) {
  if (!isObject(obj)) return "not a JSON object";
  const missing = FIELDS.filter((k) => !Object.hasOwn(obj, k));
  if (missing.length) return `no ${missing.join(", ")}`;
  if (obj.v !== 1) return `v is ${JSON.stringify(obj.v)}, not 1`;
  for (const k of STRINGS) if (typeof obj[k] !== "string" || !obj[k]) return `${k} must be text`;
  if (obj.lines !== null && !(Array.isArray(obj.lines) && obj.lines.length === 2 && obj.lines.every(Number.isInteger))) return "lines must be [from, to] or null";
  if (!isObject(obj.kev) || !KEV_SAID.includes(obj.kev.said)) return `kev.said must be ${KEV_SAID.join(", ")}`;
  if (obj.kev.score !== null && typeof obj.kev.score !== "number") return "kev.score must be a number or null";
  if (!OUTCOMES.includes(obj.outcome)) return `outcome must be ${OUTCOMES.join(", ")}`;
  if (obj.evidence !== null && typeof obj.evidence !== "string") return "evidence must be text or null";
  if (obj.feisty !== null && !isObject(obj.feisty)) return "feisty must be an object or null";
  if (obj.person !== null && !(isObject(obj.person) && ["right", "wrong"].includes(obj.person.verdict))) return "person must be null or hold a verdict, right or wrong";
  return null;
}

// Sorts each non-empty line of <text>: a real-review label, a line whose run isn't "review", or a
// line that isn't a label at all. A trailing \r is dropped from each line.
export function sortLines(text) {
  const review = [], notReview = [], broken = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) return;
    let obj;
    try { obj = JSON.parse(line); } catch { return void broken.push({ n: i + 1, why: "not JSON" }); }
    if (!isObject(obj) || obj.run !== "review") return void notReview.push(i + 1);
    const why = labelProblem(obj);
    if (why) broken.push({ n: i + 1, why });
    else review.push(line);
  });
  return { review, notReview, broken };
}

// The account's user id on this computer, or null when there is no such account.
export function accountUid(account) {
  if (typeof account !== "string" || !ACCOUNT.test(account)) return null;
  const r = spawnSync("id", ["-u", account], { encoding: "utf8" });
  return r.status === 0 && /^\d+\s*$/.test(r.stdout) ? Number(r.stdout) : null;
}

// The nearest folder at or above <dir> that holds .git, or "".
export function checkoutOf(dir) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    try { fs.lstatSync(path.join(d, ".git")); return d; } catch {}
    if (d === path.dirname(d)) return "";
  }
}

const mode = (st) => (st.mode & 0o7777).toString(8).padStart(4, "0");
const utf8 = new TextDecoder("utf-8", { fatal: true });

// The labels of one file, or a reason it is refused.
function readLabelFile(file, uid) {
  let fd;
  try { fd = fs.openSync(file, O_RDONLY | O_NOFOLLOW | O_NONBLOCK); } catch (e) {
    if (e.code === "ELOOP" || e.code === "EMLINK") return { refused: `${file} is a symlink` };
    return { refused: `${file} could not be read (${e.code ?? e.message})` };
  }
  let text;
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) return { refused: `${file} is not a file` };
    if (st.nlink !== 1) return { refused: `${file} has ${st.nlink} hard links. A label file has one` };
    if (st.uid !== uid) return { refused: `${file} belongs to user id ${st.uid}, not to the service's account` };
    if (st.mode & 0o022) return { refused: `${file} is writable by its group or others (mode ${mode(st)})` };
    try { text = utf8.decode(fs.readFileSync(fd)); } catch { return { refused: `${file} is not UTF-8 text` }; }
  } finally { fs.closeSync(fd); }
  const { review, notReview, broken } = sortLines(text);
  const why = [];
  if (notReview.length) why.push(`${notReview.length} ${notReview.length === 1 ? "line whose" : "lines whose"} run isn't "review" (line ${notReview[0]}): an eval run's labels never feed Kev`);
  if (broken.length) why.push(`${broken.length} ${broken.length === 1 ? "line that isn't" : "lines that aren't"} a Kev label, version 1 (line ${broken[0].n}: ${broken[0].why})`);
  if (why.length) return { refused: `${file} has ${why.join(", and ")}` };
  return { lines: review };
}

// One service's label folder: its labels, and a line for each refused folder or file.
export function gatherFolder(dir, account, { uidOf = accountUid } = {}) {
  const refused = [], lines = [], notes = [];
  const no = (why) => ({ lines: [], refused: [why], notes });
  if (typeof dir !== "string" || !path.isAbsolute(dir)) return no(`kev_labels ${JSON.stringify(dir)} is not a full path`);
  let st;
  try { st = fs.lstatSync(dir); } catch (e) {
    if (e.code === "ENOENT") return { lines, refused, notes: [`No Kev labels yet: ${dir} is missing.`] };
    return no(`${dir} could not be read (${e.code ?? e.message})`);
  }
  if (st.isSymbolicLink()) return no(`${dir} is a symlink. Make it a real folder`);
  if (!st.isDirectory()) return no(`${dir} is not a folder`);
  const uid = uidOf(account);
  if (uid === null) return no(`${dir}: the service's account ${JSON.stringify(account)} is not on this computer`);
  if (st.uid !== uid) return no(`${dir} belongs to user id ${st.uid}, not to ${account}`);
  if (st.mode & 0o022) return no(`${dir} is writable by its group or others (mode ${mode(st)}). Make it 0750`);
  const top = checkoutOf(dir);
  if (top) return no(`${dir} is inside the git checkout ${top}`);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".jsonl") && !n.startsWith(".")).sort();
  for (const name of names) {
    const r = readLabelFile(path.join(dir, name), uid);
    if (r.refused) refused.push(r.refused);
    else lines.push(...r.lines);
  }
  // A folder swapped while it was read: nothing from it goes.
  let now;
  try { now = fs.lstatSync(dir); } catch { now = null; }
  if (!now || now.dev !== st.dev || now.ino !== st.ino) return no(`${dir} changed while the job read it`);
  return { lines, refused, notes };
}

// Every label folder in site.json's recursicachat.services.
export function gather(site, opts = {}) {
  const out = { lines: [], refused: [], notes: [] };
  const services = Array.isArray(site?.recursicachat?.services) ? site.recursicachat.services : [];
  const own = site?.site?.tenant === undefined && !["client", "demo"].includes(site?.site?.kind);
  for (const s of services) {
    if (!isObject(s) || s.kev_labels === undefined) continue;
    if (!own) { out.refused.push(`${s.kev_labels}: kev_labels is for the cluster's own stack only`); continue; }
    const r = gatherFolder(s.kev_labels, s.account, opts);
    out.lines.push(...r.lines); out.refused.push(...r.refused); out.notes.push(...r.notes);
  }
  return out;
}

// Main's text, then each new line not on main yet, in order. Main's text unchanged when nothing is new.
export function merge(main, incoming) {
  const seen = new Set(main.split("\n").map((l) => l.replace(/\r$/, "")));
  const add = [];
  for (const l of incoming.split("\n")) {
    const line = l.replace(/\r$/, "");
    if (!line.trim() || seen.has(line)) continue;
    seen.add(line); add.push(line);
  }
  if (!add.length) return main;
  return main + (main && !main.endsWith("\n") ? "\n" : "") + add.join("\n") + "\n";
}

// Only the real-review labels of <text>, and the counts dropped.
export function filter(text) {
  const { review, notReview, broken } = sortLines(text);
  return { text: review.length ? review.join("\n") + "\n" : "", kept: review.length, notReview: notReview.length, broken: broken.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === "gather" && arg) {
      const r = gather(JSON.parse(fs.readFileSync(arg, "utf8")));
      for (const n of r.notes) console.error(n);
      for (const why of r.refused) console.error(`Refused: ${why}. Nothing from it was pushed.`);
      process.stdout.write(r.lines.map((l) => l + "\n").join(""));
      process.exitCode = r.refused.length ? 3 : 0;
    } else if (cmd === "merge" && arg) {
      process.stdout.write(merge(fs.readFileSync(arg, "utf8"), fs.readFileSync(0, "utf8")));
    } else if (cmd === "filter") {
      const r = filter(fs.readFileSync(0, "utf8"));
      process.stdout.write(r.text);
      console.error(`${LABELS_FILE}: kept ${r.kept} real-review labels from main, dropped ${r.notReview + r.broken} (${r.notReview} whose run isn't "review", ${r.broken} that aren't Kev labels, version 1).`);
    } else { console.error("usage: kev-labels.mjs gather <site.json> | merge <main's file> | filter"); process.exit(2); }
  } catch (e) {
    console.error(`kev-labels ${cmd}: ${e.message}`);
    process.exit(1);
  }
}
