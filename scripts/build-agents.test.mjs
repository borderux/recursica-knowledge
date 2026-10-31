/**
 * What the built agent artifacts have to be true of, checked against the files on disk.
 *
 * These assert properties of the committed output rather than of the composer, because the
 * output is what gets installed. `npm run agents:build:check` already reports drift between
 * source and artifact; this covers the things that are still wrong when there is no drift.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentsDir = path.join(repoRoot, "agents");
const artifactDir = path.join(repoRoot, "portable", "claude-code", "agents");

const frontmatter = (file) => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(fs.readFileSync(file, "utf8"));
  assert.ok(m, `${path.relative(repoRoot, file)} has no front matter`);
  return Object.fromEntries(
    m[1]
      .split("\n")
      .map((l) => /^([a-z_]+):\s*(.*)$/.exec(l))
      .filter(Boolean)
      .map((kv) => [kv[1], kv[2]]),
  );
};

const toolsOf = (file) =>
  (frontmatter(file).tools ?? "").split(/,\s*/).filter(Boolean);

const agentNames = fs
  .readdirSync(agentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

/**
 * A file in .claude/agents/ with no `tools:` line inherits the session's tools. That is a
 * documentation gap for most agents and a broken safety property for Barb, so the allowlist
 * has to reach the artifact rather than living only in runtime/claude-code.json where a human
 * is trusted to read it.
 */
test("every claude-code artifact carries its runtime tool allowlist", () => {
  for (const name of agentNames) {
    const runtimeFile = path.join(
      agentsDir,
      name,
      "runtime",
      "claude-code.json",
    );
    const artifact = path.join(artifactDir, `${name}.md`);
    if (!fs.existsSync(runtimeFile) || !fs.existsSync(artifact)) continue;
    const runtime = JSON.parse(fs.readFileSync(runtimeFile, "utf8"));
    assert.deepEqual(
      toolsOf(artifact),
      runtime.tools ?? [],
      `${name}.md tools differ from runtime/claude-code.json`,
    );
    assert.equal(
      frontmatter(artifact).model,
      runtime.model,
      `${name}.md model differs from runtime/claude-code.json`,
    );
  }
});

/**
 * Barb's one guarantee. A reviewer that can edit the code under review can make a finding
 * disappear instead of reporting it, and one that can edit skills/ can resolve a violation by
 * softening the rule. Both are silent, which is why this is a test and not a comment.
 *
 * Her two checkers are here for the same reason: they read one skill and one screen, and a
 * write tool on either is a fix applied by the thing that found it.
 */
test("Barb and her checkers hold no write tool", () => {
  for (const name of ["barb", "checker", "feisty"]) {
    const artifact = path.join(artifactDir, `${name}.md`);
    const tools = toolsOf(artifact);
    assert.ok(
      tools.length > 0,
      `${name}.md declares no tools — it would inherit the session's`,
    );
    for (const forbidden of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) {
      assert.ok(!tools.includes(forbidden), `${name}.md holds ${forbidden}`);
    }
  }
});

/**
 * The same assertion, generalised, because the missing-allowlist bug was found by reading one
 * file rather than by anything checking. A subagent's front matter is written by hand rather
 * than rendered, so nothing has ever guaranteed the `tools:` line is in it — and a subagent
 * without one holds whatever the session holds, which for the ones here means a client's data.
 */
test("every subagent artifact declares a tool allowlist", () => {
  const subagentDirs = agentNames.flatMap((name) => {
    const dir = path.join(agentsDir, name, "subagents");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  });
  assert.ok(
    subagentDirs.length > 0,
    "found no subagents — this test is checking nothing",
  );
  for (const sub of subagentDirs) {
    const artifact = path.join(artifactDir, `${sub}.md`);
    if (!fs.existsSync(artifact)) continue; // narrowed by `targets:` — the drift test covers that
    assert.ok(
      toolsOf(artifact).length > 0,
      `${sub}.md declares no tools — it would inherit the session's`,
    );
  }
});

/**
 * Betty dispatches Barb, so she needs Task; Barb dispatches checker and feisty, so she needs it
 * too. Without it Barb can only read the corpus one context at a time, which is a skim.
 */
test("the Betty-to-Barb dispatch chain has Task at every hop", () => {
  assert.ok(
    toolsOf(path.join(artifactDir, "betty.md")).includes("Task"),
    "betty.md cannot dispatch Barb",
  );
  assert.ok(
    toolsOf(path.join(artifactDir, "barb.md")).includes("Task"),
    "barb.md cannot fan out to its checkers",
  );
});

/**
 * The nest installs all three or Barb runs without her fan-out, which fails silently and
 * looks like a clean review.
 */
/**
 * Edie's comparer checks a rewrite for lost rules. A comparer with a write tool could edit the file
 * it checks and make a lost rule disappear instead of reporting it.
 */
test("Edie's comparer holds no write tool, and Edie can dispatch it", () => {
  const tools = toolsOf(path.join(artifactDir, "comparer.md"));
  assert.ok(
    tools.length > 0,
    "comparer.md declares no tools — it would inherit the session's",
  );
  for (const forbidden of [
    "Write",
    "Edit",
    "MultiEdit",
    "NotebookEdit",
    "Bash",
  ]) {
    assert.ok(!tools.includes(forbidden), `comparer.md holds ${forbidden}`);
  }
  assert.ok(
    toolsOf(path.join(artifactDir, "edie.md")).includes("Task"),
    "edie.md cannot dispatch the comparer",
  );
});

test("the nest manifest installs Barb with both of her checkers", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "nest", "nest-manifest.json"), "utf8"),
  );
  for (const name of ["barb", "checker", "feisty"]) {
    const entry = manifest.files.find(
      (f) => f.to === `.claude/agents/${name}.md`,
    );
    assert.ok(entry, `${name} is not installed into .claude/agents/`);
    assert.equal(
      entry.fromRoot,
      true,
      `${name} is read from nest/, where its artifact does not live`,
    );
  }
});

/**
 * The committed artifacts must match what their sources compose to.
 *
 * `npm run agents:build:check` has always reported this, and it runs nowhere automatically —
 * not in CI, not in a hook, not in `npm test`. Which makes it a step somebody has to remember
 * at the moment nobody is thinking about it, and the failure is silent in the direction that
 * matters: an artifact is a build output, so the obvious way to resolve a merge conflict in
 * one is to pick a side. Pick the wrong side and the other side's change is gone, with a green
 * test run over the top of it. Verified before writing this: mangling a description in a built
 * artifact passes all other tests here.
 *
 * The other tests in this file assert properties of an artifact. This one asserts it is the
 * artifact its source produces, which is the only thing that catches a change reverted rather
 * than a rule broken.
 */
test("no committed artifact has drifted from its source", () => {
  const out = execFileSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "build-agents.mjs"), "--check"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  // --check writes nothing, so a failure here is a report, never a repair.
  assert.match(
    out.replace(/\x1b\[[0-9;]*m/g, ""),
    /--check complete\. 0 changes pending\./,
    "artifacts differ from what their sources compose to — run `npm run agents:build`",
  );
});

/** A manifest entry naming a file that is not there installs nothing and says so only at run time. */
test("every manifest source exists where the manifest says it does", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "nest", "nest-manifest.json"), "utf8"),
  );
  for (const f of manifest.files) {
    const src = path.join(
      f.fromRoot ? repoRoot : path.join(repoRoot, "nest"),
      f.from,
    );
    assert.ok(
      fs.existsSync(src),
      `${f.from} is missing from ${f.fromRoot ? "the repository root" : "nest/"}`,
    );
  }
});

// ---------------------------------------------------------------- the Grok plugin

const grokDir = path.join(repoRoot, "portable", "grok", "agents");
const grokFiles = () =>
  fs.readdirSync(grokDir).filter((f) => f.endsWith(".md"));

/**
 * The names Grok Build resolves in a `tools:` allowlist, copied from Grok's own table in
 * xai-org/grok-build, crates/codegen/xai-grok-tools/src/types/claude_alias.rs (checked against
 * Grok 1.0.52). `Agent` and `Task` are spawn directives, and any `mcp__` name is always allowed.
 *
 * The list matters because Grok fails open: one name Grok does not recognize makes Grok keep
 * the agent's whole toolset, Write and Edit included. A typo in Barb's tool list would hand the
 * reviewer write access with no warning anywhere, so an unknown name fails this test instead.
 * When Grok adds a name, add it here from that file.
 */
const GROK_TOOL_NAMES = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Bash",
  "PowerShell",
  "Grep",
  "Glob",
  "LS",
  "LSP",
  "WebSearch",
  "WebFetch",
  "DeployApp",
  "TodoWrite",
  "AskUserQuestion",
  "TaskOutput",
  "BashOutput",
  "BashOutputTool",
  "AgentOutputTool",
  "TaskStop",
  "KillShell",
  "KillBash",
  "Skill",
  "ToolSearch",
  "Agent",
  "Task",
]);
const WRITE_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

test("the Grok plugin holds exactly Betty, Barb and Barb's two checkers", () => {
  // The grok target is opt-in, so an agent with no targets line, such as Alan, or one of
  // Claire's client subagents, never reaches the public plugin by default.
  assert.deepEqual(grokFiles().sort(), [
    "barb.md",
    "betty.md",
    "checker.md",
    "feisty.md",
  ]);
});

test("every name in a Grok agent's tool list is one Grok resolves", () => {
  for (const file of grokFiles()) {
    const tools = toolsOf(path.join(grokDir, file));
    assert.ok(
      tools.length,
      `${file} has no tools line, so Grok would give it every tool`,
    );
    const unknown = tools.filter(
      (t) => !t.startsWith("mcp__") && !GROK_TOOL_NAMES.has(t),
    );
    assert.deepEqual(
      unknown,
      [],
      `${file}: Grok does not resolve ${unknown.join(", ")}, so Grok would give the agent every tool`,
    );
  }
});

test("Barb and her checkers hold no write tool on Grok", () => {
  for (const name of ["barb", "checker", "feisty"]) {
    const tools = toolsOf(path.join(grokDir, `${name}.md`));
    assert.deepEqual(
      tools.filter((t) => WRITE_TOOLS.includes(t)),
      [],
      `${name} holds a write tool on Grok`,
    );
  }
});

test("the Grok plugin manifest points at every skill folder, the agents and the knowledge MCP server", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".grok-plugin", "plugin.json"), "utf8"),
  );
  const categories = fs
    .readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `./skills/${d.name}`)
    .sort();
  assert.deepEqual(
    [...manifest.skills].sort(),
    categories,
    "a skills category folder is missing from .grok-plugin/plugin.json",
  );
  assert.ok(
    fs.existsSync(path.join(repoRoot, manifest.agents)),
    `${manifest.agents} does not exist`,
  );
  const knowledge = manifest.mcpServers["recursica-knowledge"];
  const server = knowledge.args[0].replace("${GROK_PLUGIN_ROOT}", repoRoot);
  assert.ok(
    fs.existsSync(server),
    `the knowledge server ${knowledge.args[0]} does not exist`,
  );
  assert.deepEqual(
    Object.keys(manifest.mcpServers),
    ["recursica-knowledge"],
    "the plugin starts the knowledge server and nothing else; Barb's and Betty's tool lists name only it",
  );
});

test("the Grok marketplace lists the plugin by this repository's git URL", () => {
  // Grok refuses an index entry that points at the marketplace's own root ("./"), so the entry
  // points back at this repository by URL and Grok clones the repository as the plugin.
  const index = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, ".grok-plugin", "marketplace.json"),
      "utf8",
    ),
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, ".grok-plugin", "plugin.json"), "utf8"),
  );
  const entry = index.plugins.find((p) => p.name === manifest.name);
  assert.ok(entry, `the marketplace has no entry named ${manifest.name}`);
  assert.equal(entry.source.source, "url");
  assert.equal(
    entry.source.url,
    "https://github.com/borderux/recursica-knowledge.git",
  );
  assert.equal(entry.source.ref, "main");
});

/**
 * On CircleChat, a step-by-step procedure for writing, checking and attaching files failed on
 * gpt-oss: Loki wrote the tool calls as action entries, called a tool that does not exist, and
 * never wrote a file. His CircleChat agent has the deliverables-only setting, so CircleChat saves a
 * long reply as a file by itself. The persona that ships therefore says the transcript is the
 * reply, makes only what the request asks for, keeps the synthetic banner and the made-up-names
 * rule, and asks only when something is truly open. Checked in the built SOUL.md, not the source.
 */
test("Loki's CircleChat persona delivers each transcript as the reply, with no file step", () => {
  const soul = fs.readFileSync(
    path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"),
    "utf8",
  );
  const text = soul.replace(/\s+/g, " ");
  assert.match(text, /## The transcript is the reply/);
  assert.match(text, /Write each transcript as the text of the reply\. That is the whole delivery\./);
  assert.match(text, /Never call `write_file`, `read_file`, a terminal or any other tool to deliver a transcript\./);
  assert.match(text, /Never write an actions block or a `share_to_task` action for it\./);
  assert.match(text, /\*\*One transcript per reply\.\*\*/);
  // PR #198's procedure is gone: no step tells him to write, check or attach a file.
  assert.doesNotMatch(text, /Write the file with the `write_file` tool/);
  assert.doesNotMatch(text, /Check that the file exists/);
  assert.doesNotMatch(text, /"type":"share_to_task"/);
  assert.doesNotMatch(text, /emit one `create_task` action/);
  assert.doesNotMatch(text, /\/workspace\/loki/);
  assert.doesNotMatch(text, /create_folder|list_files/);
});

test("Loki's CircleChat persona makes only what is asked: no study plan or answer key unless asked", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /## Make exactly what the request asks for/);
  assert.match(text, /Write no study plan, no answer key, no roster and no extra transcript unless the request asks for one\./);
  assert.match(text, /Write down what was planted only when the request asks for an answer key\./);
  // The Buzz layout, which always wrote a plan and a key, is gone.
  assert.doesNotMatch(text, /00_STUDY_PLAN|99_ANSWER_KEY|Finish with the answer key/);
});

test("Loki's CircleChat persona keeps the synthetic banner, the made-up-names rule and the dataset refusal", () => {
  const soul = fs.readFileSync(
    path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"),
    "utf8",
  );
  assert.ok(
    soul.includes("⚠️ SYNTHETIC — generated by Loki. Not real research.\nNo real person said any of this. Do not analyze as client data.\n"),
    "the banner's two lines, verbatim",
  );
  const text = soul.replace(/\s+/g, " ");
  assert.match(text, /The banner's two lines, then a title line in the same paragraph/);
  assert.match(text, /Put nothing before the banner/);
  assert.match(text, /Never use a real person's name, a real company, a real product, or anything a real participant said\./);
  assert.match(text, /to add a transcript to a real or client dataset, .*say no and explain why\./);
  assert.match(text, /## Blocked sites/);
});

test("Loki's CircleChat persona asks only when something is truly open", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /## Ask only when something is truly open/);
  assert.match(text, /Choose sensible values for anything the request leaves out, and go/);
  assert.match(text, /Ask a question only when the request leaves open something Loki cannot reasonably choose himself/);
  assert.match(text, /Never ask to confirm a value Loki can choose\. Never echo a spec back and wait for a yes\./);
  // The Buzz intake asked four questions and waited for a yes.
  assert.doesNotMatch(text, /## Intake|Ask for four things|wait for a yes\. A ten-participant/);
});

/**
 * In a test on CircleChat, a person created a task titled "loki test 3" with no description and
 * commented "@loki One fake 15-minute transcript, 2 speakers, a product demo at Acme Corp. Made-up
 * names only." Loki's first turn saw only the title. He asked whether the deliverable was a
 * synthetic transcript, an answer key or another artifact, and then asked the same question five
 * more times over three hours. Most of the cause was in CircleChat; these rules make the persona
 * side explicit. Checked in the built SOUL.md, not the source.
 */
const lokiTestComment =
  "@loki One fake 15-minute transcript, 2 speakers, a product demo at Acme Corp. Made-up names only.";
const lokiTestTitle = "loki test 3";

function lokiCircleChatSoul() {
  return fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
}

test("Loki's CircleChat persona treats a request that names its deliverable as never unclear", () => {
  const text = lokiCircleChatSoul();
  // The comment from the test names its deliverable.
  assert.match(lokiTestComment, /transcript/);
  assert.match(text, /\*\*A request that names its deliverable is never unclear\.\*\*/);
  assert.match(text, /"One fake 15-minute transcript, 2 speakers, a product demo" names what to make, how long, who speaks and the subject\. Write it\./);
  assert.match(text, /When a request says "transcript", never ask whether it means a transcript, an answer key or something else\./);
});

test("Loki's CircleChat persona reads the task title as a label and the person's comment as the request", () => {
  const text = lokiCircleChatSoul();
  assert.match(text, /\*\*A task's title is a label, not the request\.\*\*/);
  assert.ok(text.includes(`A title such as "${lokiTestTitle}" says nothing about what to make.`));
  assert.match(text, /The request is a person's comment on the task, and the newest one wins\./);
  assert.match(text, /When a person has commented, read the comment before deciding that anything is open\./);
});

test("Loki's CircleChat persona asks a question once and waits, with no repeats and no waiting notes", () => {
  const text = lokiCircleChatSoul();
  assert.match(text, /\*\*Ask a question once\.\*\* Then wait for a person's answer\./);
  assert.match(text, /Never ask it again, reword it, post a "waiting for" note, or set the task to blocked just to repeat it\./);
  assert.match(text, /A person's reply ends the wait\./);
});

test("Loki is built for CircleChat only", () => {
  assert.ok(!fs.existsSync(path.join(artifactDir, "loki.md")), "no claude-code artifact");
  assert.ok(!fs.existsSync(path.join(repoRoot, "buzz-agents", "agents", "loki")), "no Buzz agent");
  assert.match(
    fs.readFileSync(path.join(agentsDir, "loki", "SKILL.md"), "utf8"),
    /^targets: circlechat$/m,
  );
});
