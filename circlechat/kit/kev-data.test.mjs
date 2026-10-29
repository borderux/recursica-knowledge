// Kev's review data (kev-data.mjs, push-data.sh, pull-kev-notes.sh): the notes go only to a private
// repo, on a new branch with a pull request, and Kev's training reads only the notes on main.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { checkRepo, openPull, repoOf } from "./kev-data.mjs";

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
  await refused("acme/kev-data", { private: true }, /no KEV_DATA_GITHUB_PAT/, "");
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
  fs.writeFileSync(path.join(cc, "site.json"), JSON.stringify({ repos: { knowledge: KB }, data: { repo: "acme/kev-data" } }));
  fs.writeFileSync(path.join(ws, "reviews/kev-disagreements.md"), "Barb's notes\n");
  const answer = path.join(root, "answer.json"), apiLog = path.join(root, "api.log"), gitLog = path.join(root, "git.log");
  const setVisibility = (v) => fs.writeFileSync(answer, JSON.stringify({ full_name: "acme/kev-data", private: v === "private", visibility: v }));
  setVisibility(visibility);
  // git: the clone makes the folder; main has no notes yet; git show prints the reviewed notes.
  fs.writeFileSync(path.join(bin, "git"), `#!/usr/bin/env bash
echo "git $* AUTH=\${GIT_CONFIG_VALUE_1:+set}" >> "${gitLog}"
[ "$1" = -C ] && shift 2
case "$1" in
  clone) mkdir -p "\${@: -1}/.git" ;;
  rev-parse) case "$*" in *origin/main:*) exit 1 ;; *) echo 1111 ;; esac ;;
  hash-object) cat >/dev/null; echo 2222 ;;
  show) printf 'reviewed notes from main\\n' ;;
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
  return { root, cc, ws, bin, gitLog, apiLog, setVisibility, server,
    git: () => (fs.existsSync(gitLog) ? fs.readFileSync(gitLog, "utf8") : ""),
    api: () => (fs.existsSync(apiLog) ? fs.readFileSync(apiLog, "utf8") : "") };
}

async function withApi(s, fn) {
  const p = spawn(process.execPath, [s.server], { stdio: ["ignore", "pipe", "inherit"] });
  const port = await new Promise((resolve) => p.stdout.once("data", (d) => resolve(String(d).trim())));
  const env = { ...process.env, PATH: `${s.bin}:${process.env.PATH}`, CC_DIR: s.cc, WS: s.ws, GITHUB_API: `http://127.0.0.1:${port}` };
  for (const k of ["SITE", "KEV_DATA_GITHUB_PAT"]) delete env[k];
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
    assert.match(r.out, /Refused: no KEV_DATA_GITHUB_PAT/);
    fs.writeFileSync(path.join(s.cc, "kev-data.env"), "KEV_DATA_GITHUB_PAT=ghp_test\n");
    r = await run("push-data.sh");
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /Refused: acme\/kev-data is public/);
    assert.equal(s.git(), "", "git never ran");
    assert.match(s.api(), /^GET \/repos\/acme\/kev-data Bearer ghp_test$/m);
  });
});

test("the push sends new notes to a new branch of the private repo, opens a pull request, and never pushes main", async () => {
  const s = sandbox();
  fs.writeFileSync(path.join(s.cc, "kev-data.env"), "KEV_DATA_GITHUB_PAT=ghp_test\n");
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
  fs.writeFileSync(path.join(s.cc, "kev-data.env"), "KEV_DATA_GITHUB_PAT=ghp_test\n");
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
