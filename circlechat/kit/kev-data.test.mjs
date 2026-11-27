// Kev's review data (kev-data.mjs, kev-labels.mjs, push-data.sh, pull-kev-notes.sh): the labels and
// notes go only to a private repo, on a new branch with a pull request, and Kev's training reads
// only what is on main. Only real-review labels go: an eval run's labels never feed Kev.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { checkRepo, openPull, repoOf } from "./kev-data.mjs";
import { filter, labelProblem, merge } from "./kev-labels.mjs";
import { rcServiceErrors } from "./render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);

// A stand-in for GitHub's API: answers with the given repo, and records each request.
function fakeFetch(repo) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push(`${init.method ?? "GET"} ${new URL(url).pathname}${new URL(url).search}`);
    const json = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });
    if (/\/repos\/[^/]+\/[^/]+$/.test(url)) return repo ? json(repo) : json({}, 404);
    if (init.method === "POST" && url.endsWith("/pulls")) return json({ number: 9, html_url: "https://github.com/acme/kev-data/pull/9" }, 201);
    if (url.includes("/pulls?state=open")) return json([
      { number: 7, head: { ref: "kev-notes/20260101-000000", repo: { full_name: "acme/kev-data" } } },
      { number: 8, head: { ref: "fix-readme", repo: { full_name: "acme/kev-data" } } },
      { number: 9, head: { ref: "kev-notes/20260102-000000", repo: { full_name: "acme/kev-data" } } },
    ]);
    return json({});
  };
  return { fetch, calls };
}
const KB = "https://github.com/acme/kb";

test("reads owner/name from a GitHub address", () => {
  assert.equal(repoOf("https://github.com/Acme/KB.git"), "acme/kb");
  assert.equal(repoOf("git@github.com:acme/kb"), "acme/kb");
  assert.equal(repoOf("https://example.com/kb.git"), "");
});

test("passes a private repo only, and refuses a public, internal, missing or knowledge repo", async () => {
  const ok = fakeFetch({ full_name: "acme/kev-data", private: true, visibility: "private" });
  await checkRepo({ repo: "acme/kev-data", knowledge: KB, token: "t", fetch: ok.fetch });
  assert.deepEqual(ok.calls, ["GET /repos/acme/kev-data"]);
  const refused = async (repo, answer, re, token = "t") =>
    assert.rejects(checkRepo({ repo, knowledge: KB, token, fetch: fakeFetch(answer).fetch }), re);
  await refused("acme/kev-data", { full_name: "acme/kev-data", private: false, visibility: "public" }, /is public/);
  await refused("acme/kev-data", { full_name: "acme/kev-data", private: false }, /is public/);
  await refused("acme/kev-data", { full_name: "acme/kev-data", private: true, visibility: "internal" }, /is internal/);
  await refused("acme/kev-data", null, /GitHub answered 404/);
  await refused("acme/KB", { full_name: "acme/kb", private: true }, /is the knowledge repo/);
  // A repo renamed or moved to the knowledge repo's name.
  await refused("acme/old-name", { full_name: "acme/kb", private: true, visibility: "private" }, /is the knowledge repo/);
  await refused("acme/kev-data", { private: true }, /no KEV_DATA_GITHUB_TOKEN/, "");
  await refused("https://github.com/acme/kev-data", { private: true }, /must be owner\/name/);
});

test("opens a pull request into main, and closes only the older notes pull requests", async () => {
  const f = fakeFetch(null);
  const url = await openPull({ repo: "acme/kev-data", branch: "kev-notes/20260102-000000", token: "t", fetch: f.fetch });
  assert.equal(url, "https://github.com/acme/kev-data/pull/9");
  assert.deepEqual(f.calls, [
    "POST /repos/acme/kev-data/pulls",
    "GET /repos/acme/kev-data/pulls?state=open&base=main&per_page=100",
    "POST /repos/acme/kev-data/issues/7/comments",
    "PATCH /repos/acme/kev-data/pulls/7",
  ]);
});

// The scripts, with a stand-in for git and a fake GitHub API in a process of its own.
function sandbox({ visibility = "private" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kev-data-"));
  const cc = path.join(root, "circlechat"), ws = path.join(root, "workspace"), bin = path.join(root, "bin");
  for (const d of [cc, path.join(ws, "reviews"), bin]) fs.mkdirSync(d, { recursive: true });
  const setServices = (services) => fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ repos: { knowledge: KB }, data: { repo: "acme/kev-data" }, ...(services ? { recursicachat: { services } } : {}) }));
  setServices();
  fs.writeFileSync(path.join(ws, "reviews/kev-disagreements.md"), "Barb's notes\n");
  const answer = path.join(root, "answer.json"), apiLog = path.join(root, "api.log"), gitLog = path.join(root, "git.log");
  // The labels on the private repo's main branch: none until a test sets them.
  const mainLabels = path.join(root, "main-labels.jsonl");
  const setMainLabels = (text) => (text === null ? fs.rmSync(mainLabels, { force: true }) : fs.writeFileSync(mainLabels, text));
  const setVisibility = (v) => fs.writeFileSync(answer, JSON.stringify({ full_name: "acme/kev-data", private: v === "private", visibility: v }));
  setVisibility(visibility);
  // git: the clone makes the folder; main has no notes yet; git show prints the reviewed notes, and
  // main's labels when a test set them. hash-object gives a sum of the text, as git's does.
  fs.writeFileSync(path.join(bin, "git"), `#!/usr/bin/env bash
echo "git $* AUTH=\${GIT_CONFIG_VALUE_1:+set}" >> "${gitLog}"
[ "$1" = -C ] && shift 2
case "$1" in
  clone) mkdir -p "\${@: -1}/.git" ;;
  rev-parse) case "$*" in *origin/main:*) exit 1 ;; *) echo 1111 ;; esac ;;
  hash-object) cksum | awk '{print $1}' ;;
  commit) echo "commit by \$GIT_AUTHOR_NAME <\$GIT_AUTHOR_EMAIL>, committed by \$GIT_COMMITTER_NAME" >> "${gitLog}" ;;
  show) case "$*" in *kev-labels.jsonl*) [ -f "${mainLabels}" ] || exit 128; cat "${mainLabels}" ;; *) printf 'reviewed notes from main\\n' ;; esac ;;
esac
exit 0
`, { mode: 0o755 });
  const server = path.join(root, "server.mjs");
  fs.writeFileSync(server, `import http from "node:http"; import fs from "node:fs";
http.createServer((req, res) => {
  fs.appendFileSync(${JSON.stringify(apiLog)}, req.method + " " + req.url + " " + (req.headers.authorization ?? "") + "\\n");
  res.setHeader("content-type", "application/json");
  if (req.url === "/repos/acme/kev-data") return res.end(fs.readFileSync(${JSON.stringify(answer)}));
  if (req.method === "POST" && req.url.endsWith("/pulls")) { res.statusCode = 201; return res.end(JSON.stringify({ number: 1, html_url: "https://github.com/acme/kev-data/pull/1" })); }
  res.end("[]");
}).listen(0, "127.0.0.1", function () { console.log(this.address().port); });
`);
  return { root, cc, ws, bin, gitLog, apiLog, setVisibility, setServices, setMainLabels, server,
    git: () => (fs.existsSync(gitLog) ? fs.readFileSync(gitLog, "utf8") : ""),
    api: () => (fs.existsSync(apiLog) ? fs.readFileSync(apiLog, "utf8") : "") };
}

async function withApi(s, fn) {
  const p = spawn(process.execPath, [s.server], { stdio: ["ignore", "pipe", "inherit"] });
  const port = await new Promise((resolve) => p.stdout.once("data", (d) => resolve(String(d).trim())));
  const env = { ...process.env, PATH: `${s.bin}:${process.env.PATH}`, CC_DIR: s.cc, WS: s.ws, GITHUB_API: `http://127.0.0.1:${port}` };
  for (const k of ["SITE", "KEV_DATA_GITHUB_TOKEN"]) delete env[k];
  const run = (script) => new Promise((resolve) => {
    const c = spawn("bash", [path.join(here, script)], { env, cwd: s.root });
    let out = ""; c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (out += d));
    c.on("close", (status) => resolve({ status, out }));
  });
  try { await fn(run); } finally { p.kill(); }
}

test("the push refuses with no token, and refuses a public repo before any git step", async () => {
  const s = sandbox({ visibility: "public" });
  await withApi(s, async (run) => {
    let r = await run("push-data.sh");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Refused: no KEV_DATA_GITHUB_TOKEN/);
    fs.writeFileSync(path.join(s.cc, "kev-data.env"), "KEV_DATA_GITHUB_TOKEN=ghp_test\n");
    r = await run("push-data.sh");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Refused: acme\/kev-data is public/);
    assert.equal(s.git(), "", "git never ran");
    assert.match(s.api(), /^GET \/repos\/acme\/kev-data Bearer ghp_test$/m);
  });
});

test("the push sends new notes to a new branch of the private repo, opens a pull request, and never pushes main", async () => {
  const s = sandbox();
  // The token service's file: the app's token and the app's bot identity.
  const bot = "acme-kev-data[bot]", mail = "61+acme-kev-data[bot]@users.noreply.github.com";
  fs.writeFileSync(path.join(s.cc, "kev-data.env"), `KEV_DATA_GITHUB_TOKEN=ghp_test\nGIT_AUTHOR_NAME=${bot}\nGIT_AUTHOR_EMAIL=${mail}\nGIT_COMMITTER_NAME=${bot}\nGIT_COMMITTER_EMAIL=${mail}\n`);
  await withApi(s, async (run) => {
    const r = await run("push-data.sh");
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /pull\/1/);
    assert.equal(fs.readFileSync(path.join(s.cc, "kev-data-private/kev-disagreements.md"), "utf8"), "Barb's notes\n");
    const git = s.git();
    assert.match(git, /^git clone -q https:\/\/github\.com\/acme\/kev-data\.git /m);
    assert.match(git, /^git push -q origin HEAD:refs\/heads\/kev-notes\/\d{8}-\d{6} AUTH=set$/m);
    assert.equal((git.match(/^git push/gm) ?? []).length, 1);
    assert.doesNotMatch(git, /ghp_test/, "the token never sits in a command line");
    assert.ok(git.includes(`commit by ${bot} <${mail}>, committed by ${bot}`), "the notes commit uses the app's bot identity");
    // Two visibility checks: one before the clone, one right before the push.
    assert.equal((s.api().match(/^GET \/repos\/acme\/kev-data /gm) ?? []).length, 2);
    assert.match(s.api(), /^POST \/repos\/acme\/kev-data\/pulls /m);
    // The same notes again: nothing new to push.
    const again = await run("push-data.sh");
    assert.equal(again.status, 0, again.out);
    assert.equal((s.git().match(/^git push/gm) ?? []).length, 1);
  });
});

test("the push stays off with no data.repo", async () => {
  const s = sandbox();
  fs.writeFileSync(path.join(s.cc, "site.json"), JSON.stringify({ repos: { knowledge: KB }, data: { repo: "" } }));
  await withApi(s, async (run) => {
    for (const script of ["push-data.sh", "pull-kev-notes.sh"]) {
      const r = await run(script);
      assert.equal(r.status, 0, r.out);
    }
    assert.equal(s.git() + s.api(), "");
  });
});

test("Kev's nightly training reads the reviewed notes from the private repo's main branch only", async () => {
  const s = sandbox();
  fs.writeFileSync(path.join(s.cc, "kev-data.env"), "KEV_DATA_GITHUB_TOKEN=ghp_test\n");
  await withApi(s, async (run) => {
    const r = await run("pull-kev-notes.sh");
    assert.equal(r.status, 0, r.out);
    assert.equal(fs.readFileSync(path.join(s.cc, "kev-reviewed/kev-disagreements.md"), "utf8"), "reviewed notes from main\n");
    assert.match(s.git(), /fetch -q origin main /);
    assert.match(s.git(), /show origin\/main:kev-disagreements\.md /);
    assert.doesNotMatch(s.git(), /checkout|kev-notes\//);
    // A repo made public: nothing is read.
    s.setVisibility("public");
    fs.rmSync(path.join(s.cc, "kev-reviewed"), { recursive: true });
    const pub = await run("pull-kev-notes.sh");
    assert.equal(pub.status, 1, pub.out);
    assert.ok(!fs.existsSync(path.join(s.cc, "kev-reviewed")));
  });
});

test("setup-host.sh installs both Kev data jobs only with data.repo", () => {
  const text = fs.readFileSync(path.join(here, "..", "setup-host.sh"), "utf8");
  const block = text.slice(text.indexOf('if [ -n "$(site_get data.repo)" ]'), text.indexOf("fi\n", text.indexOf('if [ -n "$(site_get data.repo)" ]')));
  assert.match(block, /install_unit "kev-data-push\$SUFFIX" .*push-data\.sh/);
  assert.match(block, /install_unit "kev-notes-pull\$SUFFIX" .*pull-kev-notes\.sh/);
  assert.match(block, /else\n\s+uninstall_unit "kev-data-push\$SUFFIX"/);
  assert.doesNotMatch(text, /kev_disagreements_branch/);
  assert.equal(spawnSync("bash", ["-n", path.join(here, "push-data.sh")]).status, 0);
});

// Kev labels, version 1 (circlechat/README.md, "Kev's review data").
const ME = os.userInfo().username;
const label = (n, extra = {}) => JSON.stringify({
  v: 1, run: "review", id: `r1/${n}`, at: "2026-11-27T12:00:00Z", agent: "barb", review: "r1", repo: "acme/example-app",
  commit: "0123456789abcdef0123456789abcdef01234567", file: "src/screens/orders.tsx", lines: [12, 30], skill: "example-skill-table",
  item: "Each column has a header", kev: { said: "lead", score: 0.81 }, outcome: "confirmed", evidence: null,
  feisty: { reason: "The header is missing", correction: null }, person: null, ...extra,
});
// A label folder as a harness's installer makes it: the service's account's own, 0750, files 0640.
function labelDir(s, name, files, { mode = 0o750 } = {}) {
  const dir = path.join(s.root, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, lines] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, f), lines.map((l) => `${l}\n`).join(""));
    fs.chmodSync(path.join(dir, f), 0o640);
  }
  fs.chmodSync(dir, mode);
  return dir;
}
const service = (name, dir, account = ME) => ({ name, agents: [name], account, file: `/opt/${name}/token`, kev_labels: dir });
const tokenFile = (s) => fs.writeFileSync(path.join(s.cc, "kev-data.env"), "KEV_DATA_GITHUB_TOKEN=ghp_test\n");
const branchLabels = (s) => fs.readFileSync(path.join(s.cc, "kev-data-private/kev-labels.jsonl"), "utf8");
const pushes = (s) => (s.git().match(/^git push/gm) ?? []).length;

test("a Kev label: every field of version 1, and the merge keeps main's lines, then each new line once", () => {
  assert.equal(labelProblem(JSON.parse(label(1))), null);
  assert.equal(labelProblem(JSON.parse(label(1, { lines: null, person: { verdict: "wrong", by: "person-a", at: "2026-11-27T13:00:00Z", note: null } }))), null);
  const { outcome, ...noOutcome } = JSON.parse(label(1));
  assert.match(labelProblem(noOutcome), /no outcome/);
  assert.match(labelProblem(JSON.parse(label(1, { v: 2 }))), /not 1/);
  assert.match(labelProblem(JSON.parse(label(1, { outcome: "missed" }))), /outcome must be/);
  assert.match(labelProblem(JSON.parse(label(1, { kev: { said: "maybe", score: null } }))), /kev.said/);
  assert.equal(labelProblem(JSON.parse(label(1, { kev: { said: "none", score: null } }))), null, "an item Kev set aside says none");
  const main = `${label(0)}\n`;
  assert.equal(merge(main, `${label(0)}\n`), main, "nothing new: main's file, unchanged");
  assert.equal(merge(label(0), `${label(1)}\n${label(1)}\n`), `${label(0)}\n${label(1)}\n`);
  const decided = label(1, { person: { verdict: "right", by: "person-a", at: "2026-11-27T13:00:00Z", note: null } });
  assert.equal(merge(main, `${label(1)}\n${decided}\n`), `${label(0)}\n${label(1)}\n${decided}\n`, "a person's decision stays after the earlier line");
  const f = filter(`${label(1)}\n${label(2, { run: "eval" })}\nnot json\n\n`);
  assert.deepEqual([f.text, f.kept, f.notReview, f.broken], [`${label(1)}\n`, 1, 1, 1]);
});

test("the push sends the labels of every service's label folder, after main's labels, each line once", async () => {
  const s = sandbox();
  tokenFile(s);
  const decided = label(1, { person: { verdict: "wrong", by: "person-a", at: "2026-11-27T13:00:00Z", note: null } });
  const other = label(1, { id: "r2/1", review: "r2", agent: "betty" });
  const a = labelDir(s, "labels-a", { "r1.jsonl": [label(0), label(1), decided], "r1-more.jsonl": [label(2)] });
  const b = labelDir(s, "labels-b", { "r2.jsonl": [other] });
  s.setServices([service("review-a", a), service("review-b", b)]);
  s.setMainLabels(`${label(0)}\n`);
  await withApi(s, async (run) => {
    const r = await run("push-data.sh");
    assert.equal(r.status, 0, r.out);
    assert.equal(branchLabels(s), [label(0), label(1), decided, label(2), other].map((l) => `${l}\n`).join(""));
    assert.equal(pushes(s), 1);
    assert.equal((s.api().match(/^GET \/repos\/acme\/kev-data /gm) ?? []).length, 2, "the visibility check before the clone and before the push");
    assert.match(s.api(), /^POST \/repos\/acme\/kev-data\/pulls /m);
    // The same labels again: nothing new to push.
    const again = await run("push-data.sh");
    assert.equal(again.status, 0, again.out);
    assert.equal(pushes(s), 1);
    // A new label: a new branch and pull request, with every label.
    fs.chmodSync(b, 0o755);
    fs.writeFileSync(path.join(b, "r3.jsonl"), `${label(1, { id: "r3/1", review: "r3" })}\n`, { mode: 0o640 });
    fs.chmodSync(b, 0o750);
    const more = await run("push-data.sh");
    assert.equal(more.status, 0, more.out);
    assert.equal(pushes(s), 2);
    assert.match(branchLabels(s), /"id":"r3\/1"/);
  });
});

test("a file with an eval label, or a line that isn't a label, is refused whole, and the other files still go", async () => {
  const s = sandbox();
  tokenFile(s);
  const a = labelDir(s, "labels-a", {
    "good.jsonl": [label(1)],
    "mixed.jsonl": [label(2), label(3, { run: "eval" }), label(4, { run: "eval" })],
    "broken.jsonl": [label(5), "{not json"],
  });
  const b = labelDir(s, "labels-b", { "b.jsonl": [label(6)] });
  s.setServices([service("review-a", a), service("review-b", b)]);
  await withApi(s, async (run) => {
    const r = await run("push-data.sh");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Refused: \S+\/mixed\.jsonl has 2 lines whose run isn't "review".* Nothing from it was pushed\./);
    assert.match(r.out, /Refused: \S+\/broken\.jsonl has 1 line that isn't a Kev label/);
    assert.equal(branchLabels(s), `${label(1)}\n${label(6)}\n`, "nothing from a refused file, not even its review lines");
    assert.equal(pushes(s), 1);
  });
});

test("a label folder that's a symlink, another account's, writable by its group or in a checkout is refused, and the others still go", async () => {
  const s = sandbox();
  tokenFile(s);
  const real = labelDir(s, "real", { "x.jsonl": [label(1)] });
  fs.symlinkSync(real, path.join(s.root, "linked"));
  const loose = labelDir(s, "loose", { "x.jsonl": [label(2)] }, { mode: 0o770 });
  const others = labelDir(s, "others", { "x.jsonl": [label(3)] });
  const unknown = labelDir(s, "unknown", { "x.jsonl": [label(4)] });
  fs.mkdirSync(path.join(s.root, "checkout/.git"), { recursive: true });
  const inCheckout = labelDir(s, "checkout/labels", { "x.jsonl": [label(5)] });
  const good = labelDir(s, "good", { "x.jsonl": [label(6)] });
  s.setServices([
    service("linked", path.join(s.root, "linked")), service("loose", loose), service("others", others, "nobody"),
    service("unknown", unknown, "_no-such-account"), service("in-checkout", inCheckout), service("missing", path.join(s.root, "missing")),
    service("good", good),
  ]);
  await withApi(s, async (run) => {
    const r = await run("push-data.sh");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Refused: \S+\/linked is a symlink/);
    assert.match(r.out, /Refused: \S+\/loose is writable by its group or others \(mode 0770\)/);
    assert.match(r.out, /Refused: \S+\/others belongs to user id \d+, not to nobody/);
    assert.match(r.out, /Refused: \S+\/unknown: the service's account "_no-such-account" is not on this computer/);
    assert.match(r.out, /Refused: \S+\/checkout\/labels is inside the git checkout/);
    assert.match(r.out, /No Kev labels yet: \S+\/missing is missing\./);
    assert.equal(branchLabels(s), `${label(6)}\n`);
  });
});

test("a label file that's a symlink, a second hard link or writable by its group is refused", async () => {
  const s = sandbox();
  tokenFile(s);
  const dir = labelDir(s, "labels", { "good.jsonl": [label(1)], "loose.jsonl": [label(2)] });
  fs.chmodSync(dir, 0o755);
  fs.chmodSync(path.join(dir, "loose.jsonl"), 0o660);
  fs.writeFileSync(path.join(s.root, "outside-1.jsonl"), `${label(3)}\n`);
  fs.symlinkSync(path.join(s.root, "outside-1.jsonl"), path.join(dir, "linked.jsonl"));
  fs.writeFileSync(path.join(s.root, "outside-2.jsonl"), `${label(4)}\n`, { mode: 0o640 });
  fs.linkSync(path.join(s.root, "outside-2.jsonl"), path.join(dir, "hard.jsonl"));
  fs.chmodSync(dir, 0o750);
  s.setServices([service("review-a", dir)]);
  await withApi(s, async (run) => {
    const r = await run("push-data.sh");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Refused: \S+\/linked\.jsonl is a symlink/);
    assert.match(r.out, /Refused: \S+\/hard\.jsonl has 2 hard links/);
    assert.match(r.out, /Refused: \S+\/loose\.jsonl is writable by its group or others/);
    assert.equal(branchLabels(s), `${label(1)}\n`);
  });
});

test("with nothing new the push sends nothing, and with no notes and no labels git never runs", async () => {
  const s = sandbox();
  tokenFile(s);
  fs.rmSync(path.join(s.ws, "reviews/kev-disagreements.md"));
  const empty = labelDir(s, "empty", {});
  s.setServices([service("review-a", empty)]);
  await withApi(s, async (run) => {
    let r = await run("push-data.sh");
    assert.equal(r.status, 0, r.out);
    assert.equal(s.git() + s.api(), "");
    // Labels that already sit on main.
    const a = labelDir(s, "labels-a", { "r1.jsonl": [label(1)] });
    s.setServices([service("review-a", a)]);
    s.setMainLabels(`${label(0)}\n${label(1)}\n`);
    r = await run("push-data.sh");
    assert.equal(r.status, 0, r.out);
    assert.equal(pushes(s), 0);
  });
});

test("Kev's nightly training reads only the real-review labels on main", async () => {
  const s = sandbox();
  tokenFile(s);
  s.setMainLabels(`${label(1)}\n${label(2, { run: "eval" })}\n{"v":1,"run":"review"}\n${label(3)}\n`);
  await withApi(s, async (run) => {
    const r = await run("pull-kev-notes.sh");
    assert.equal(r.status, 0, r.out);
    const out = path.join(s.cc, "kev-reviewed/kev-labels.jsonl");
    assert.equal(fs.readFileSync(out, "utf8"), `${label(1)}\n${label(3)}\n`);
    assert.match(r.out, /kept 2 real-review labels from main, dropped 2 \(1 whose run isn't "review", 1 that aren't Kev labels, version 1\)/);
    assert.match(s.git(), /show origin\/main:kev-labels\.jsonl /);
    // No labels on main: an empty file.
    s.setMainLabels(null);
    const none = await run("pull-kev-notes.sh");
    assert.equal(none.status, 0, none.out);
    assert.equal(fs.readFileSync(out, "utf8"), "");
  });
});

test("the config check takes kev_labels only as a full path, on the cluster's own stack with data.repo, outside every checkout", () => {
  const entry = { name: "example-service", agents: ["designer"], account: "_program", file: "/opt/program/run/token", kev_labels: "/opt/program/kev-labels" };
  const site = { data: { repo: "acme/kev-data" } };
  const errs = (e, st = site) => rcServiceErrors({ services: [{ ...entry, ...e }] }, st);
  assert.deepEqual(errs({}), []);
  const bad = (e, re, st) => assert.ok(errs(e, st).some((x) => re.test(x)), `${JSON.stringify(e)}: ${errs(e, st).join("; ")}`);
  bad({ kev_labels: "kev-labels" }, /kev_labels must be the full path/);
  bad({ kev_labels: "/opt/program/../../etc" }, /kev_labels must be the full path/);
  bad({ kev_labels: "/opt/my labels" }, /kev_labels must be the full path/);
  bad({ kev_labels: 7 }, /kev_labels must be the full path/);
  bad({}, /kev_labels needs data\.repo/, {});
  bad({}, /for the cluster's own stack only/, { site: { tenant: "acme" }, data: { repo: "acme/kev-data" } });
  bad({}, /for the cluster's own stack only/, { site: { kind: "demo" }, data: { repo: "acme/kev-data" } });
  bad({ kev_labels: "/opt/recursicachat/data/labels" }, /outside the server's folders/);
  bad({ kev_labels: "/Users/you/recursica-knowledge/labels" }, /outside every checkout and stack folder/);
  bad({ kev_labels: "/Users/you/recursica-stack/kev-labels" }, /outside every checkout and stack folder/);
  bad({ kev_labels: "/Users/you/recursica-workspace/reviews" }, /outside every checkout and stack folder/);
  bad({ kev_labels: "/opt/program/app/.git/labels" }, /outside every checkout and stack folder/);
  bad({ job: "io.example.program", state: "/opt/program/state", kev_labels: "/opt/program/state/labels" }, /apart from state/);
  const two = rcServiceErrors({ services: [entry, { ...entry, name: "other-service", agents: ["writer"], file: "/opt/other/token", kev_labels: "/opt/program/kev-labels/" }] }, site);
  assert.ok(two.some((x) => /another entry's folder/.test(x)), two.join("; "));
});
