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
 * Loki's instructions name no platform, because Loki runs on several: every target builds the same
 * text from SKILL.md. The one fragment, "languages", is empty on CircleChat: only RecursicaChat 2.0's
 * harness writes interviews in Spanish as well as English, so only its instructions say so. On CircleChat, a step-by-step
 * procedure for writing, checking and attaching files failed on gpt-oss: Loki wrote the tool calls
 * as action entries, called a tool that does not exist, and never wrote a file. So the instructions
 * say the transcript is the reply, make only what the request asks for, keep the synthetic banner
 * and the made-up-names rule, and ask only when a detail is truly open. Checked in the built files,
 * not the source.
 */
const LOKI_BUILDS = [
  ["portable", "circlechat", "agents", "loki", "SOUL.md"],
  ["portable", "recursicachat", "agents", "loki", "INSTRUCTIONS.md"],
];
const lokiBuilds = () => LOKI_BUILDS.map((p) => [p.join("/"), fs.readFileSync(path.join(repoRoot, ...p), "utf8")]);

test("Loki's instructions are the same on every platform apart from RecursicaChat's languages, and name no platform", () => {
  const [[, soul], [, instructions]] = lokiBuilds();
  const at = instructions.indexOf("\n## Languages\n");
  assert.ok(at > 0, "RecursicaChat's instructions end with the languages passage");
  assert.equal(instructions.slice(0, at).trimEnd(), soul.trimEnd(), "the rest is the same on both");
  assert.doesNotMatch(soul, /## Languages|Spanish/, "CircleChat's persona has no languages passage");
  for (const [file, text] of lokiBuilds()) {
    assert.doesNotMatch(text, /CircleChat|RecursicaChat|Claude|OpenCode|Buzz|Hermes|reply\.md|share_to_task|actions block|Blocked sites/i, file);
  }
});

test("Loki's RecursicaChat instructions say interviews can be in English or Spanish, and what Loki says when asked what he can do", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "recursicachat", "agents", "loki", "INSTRUCTIONS.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /An interview can be in English or Spanish\./);
  assert.match(text, /"in Spanish" or "two in English and one in Spanish", and so can a persona file's "Interview language" line\./);
  assert.match(text, /One set can mix the two languages\./);
  assert.match(text, /the interview is in English: never ask which language\./);
  assert.match(text, /When someone asks what Loki can do, say, as part of the usual answer, that interviews can be in English or Spanish/);
  assert.match(text, /Say that other languages are not supported yet\./);
});

test("Loki's instructions deliver each transcript as an attached plain-text file, one per turn, with a one-line reply", () => {
  for (const [file, raw] of lokiBuilds()) {
    const text = raw.replace(/\s+/g, " ");
    assert.match(text, /## Each transcript is an attached file/, file);
    assert.match(text, /Deliver each transcript as a file attached with the attach tool, never as the text of a reply\./, file);
    assert.match(text, /Name each file from the title line\.\*\* .*end the name with `\.txt`, such as `seal-trainer-interview-1-of-3\.txt`/, file);
    assert.match(text, /\*\*Attach each transcript once, as the file's text\.\*\*/, file);
    assert.match(text, /Write the transcript as plain text\./, file);
    assert.match(text, /Never write a transcript with a file tool or a terminal\./, file);
    assert.match(text, /Never paste a transcript into a reply or a code block\./, file);
    assert.match(text, /\*\*One transcript per turn\.\*\*/, file);
    assert.match(text, /\*\*Zip a set on a task\.\*\* .*The zip holds every transcript file already attached to the task\./, file);
    assert.match(text, /\*\*After attaching a file, reply in one line\*\* that names what is attached/, file);
    assert.match(text, /A transcript is the one kind of text Loki writes at full length\. Keep every reply short\./, file);
    assert.match(text, /mark the task ready for review after the task's last transcript, and after the zip when the set has one\. Change no other task\./, file);
    // PR #198's procedure is gone: no step writes a file in the container, checks it or attaches it by action.
    assert.doesNotMatch(text, /Write the file with the `write_file` tool|Check that the file exists|"type":"share_to_task"|emit one `create_task` action|\/workspace\/loki|create_folder|list_files/, file);
  }
});

test("Loki's instructions make only what is asked: no study plan or answer key unless asked", () => {
  for (const [file, raw] of lokiBuilds()) {
    const text = raw.replace(/\s+/g, " ");
    assert.match(text, /## Make exactly what the request asks for/, file);
    assert.match(text, /Write no study plan, no answer key, no roster and no extra transcript unless the request asks for one\./, file);
    assert.match(text, /Write down what was planted only when the request asks for an answer key\./, file);
    // The Buzz layout, which always wrote a plan and a key, is gone.
    assert.doesNotMatch(text, /00_STUDY_PLAN|99_ANSWER_KEY|Finish with the answer key/, file);
  }
});

test("Loki's instructions keep the synthetic banner, the made-up-names rule and the dataset refusal", () => {
  for (const [file, raw] of lokiBuilds()) {
    assert.ok(
      raw.includes("⚠️ SYNTHETIC — generated by Loki. Not real research.\nNo real person said any of this. Do not analyze as client data.\n"),
      `the banner's two lines, verbatim: ${file}`,
    );
    const text = raw.replace(/\s+/g, " ");
    assert.match(text, /The banner's two lines, then a title line in the same paragraph/, file);
    assert.match(text, /Put nothing before the banner/, file);
    assert.match(text, /Never use a real person's name, a real company, a real product, or any part of what a real participant said\./, file);
    assert.match(text, /to add a transcript to a real or client dataset, .*Say no to each of those requests, and explain why\./, file);
  }
});

test("Loki's instructions ask only when a detail is truly open", () => {
  for (const [file, raw] of lokiBuilds()) {
    const text = raw.replace(/\s+/g, " ");
    assert.match(text, /## Questions only for a truly open detail/, file);
    assert.match(text, /Choose a sensible value for each detail the request leaves out/, file);
    assert.match(text, /Ask a question only when the request leaves open a detail Loki cannot reasonably choose/, file);
    assert.match(text, /Never ask to confirm a value Loki can choose\. Never echo a spec back and wait for a yes\./, file);
    // The Buzz intake asked four questions and waited for a yes.
    assert.doesNotMatch(text, /## Intake|Ask for four things|wait for a yes\. A ten-participant/, file);
  }
});

/**
 * How every agent reads a request lives in CircleChat's prompt for every agent, not in a persona
 * (REQUEST_RULES in the fork's api/hermes-multi-bridge.mjs): the person's newest comment is the
 * request and the title is a label; a request that names its deliverable is clear; ask once, then
 * wait. Loki's persona must not contradict them with a step that asks before making a named
 * deliverable, or that asks again.
 */
test("Loki's CircleChat persona does not contradict CircleChat's request rules", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "loki", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /Then ask that one question, in one short message, and nothing else\./);
  assert.doesNotMatch(text, /\bask\b[^.]{0,80}\bbefore (?:writing|making|starting|you write|he writes)/i);
  assert.doesNotMatch(text, /\bconfirm\b[^.]{0,60}\bbefore\b/i);
  assert.doesNotMatch(text, /\bask\b[^.]{0,40}\bagain\b/i);
  assert.doesNotMatch(text, /\b(?:remind|follow up|waiting for)\b/i);
  assert.doesNotMatch(text, /the (?:task's )?title is the request/i);
});

/**
 * On CircleChat, a page Betty built in the prototype repository imported its components from
 * `@mantine/core`, skipped the `<Prototype>` wrapper, and looked like stock Mantine. Her file tools
 * could not write to the workspace either, and her handoff pushed a branch and opened a pull
 * request. The persona that ships therefore names the adapter, the lookup, the wrapper, the path
 * and the write tool, never pushes a prototype, replies with the preview route, and still puts the
 * interview and the brief first. Checked in the built SOUL.md, not the source.
 */
test("Betty's CircleChat persona builds prototypes with Recursica's adapter, never pushes, and still interviews first", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "betty", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /\*\*Import every UI component from `@recursica\/adapter-mantine-v8`\.\*\* Never import a component from `@mantine\/core`\./);
  assert.match(text, /\*\*Look up each component with the knowledge server's `component_api` tool\*\*/);
  assert.match(text, /\*\*Wrap each page in `<Prototype>`\*\* from `\.\.\/\.\.\/Prototype`, the way `src\/routes\/prototypes\/demo\/index\.tsx` does\./);
  assert.match(text, /\*\*Put each page at `src\/routes\/prototypes\/<slug>\/index\.tsx`\.\*\*/);
  assert.match(text, /\*\*Write each file with the `write_file` tool,\*\*/);
  assert.match(text, /\*\*A prototype in `@APP_REPO@` is never pushed\.\*\* .* Do not push a branch, and do not open a pull request/);
  assert.match(text, /Then reply with the preview route first/);
  // The interview and the brief still come before building.
  assert.match(text, /The interview and the brief still come first\./);
  assert.match(text, /However the request arrives, get answers to the six questions below before building/);
  assert.match(text, /Post the brief in the thread, and wait for agreement before building\./);
  // The rules come after the interview and brief stages are named, and before the build.
  assert.ok(text.indexOf("Import every UI component from") < text.indexOf("## Stage 3"), "the build rules come before Stage 3");
});

/**
 * CircleChat's reply guard refuses a reply that is pasted code, so a person who asked for a page got
 * no reply at all. After a build, Betty's CircleChat reply is the preview address and at most two
 * sentences.
 */
test("Betty's CircleChat persona replies after a build with the preview address and two sentences at most, never code", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "betty", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /After building, reply with the page's preview address and at most two sentences, never code\./);
});

/**
 * Hermes put CircleChat's tools behind its tool search, and Betty called delegate_task eight times
 * to move a card. Her CircleChat persona names the two tools, and rules delegate_task out.
 */
test("Betty's CircleChat persona reports with task_comment and moves the card with update_task, never delegate_task", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "betty", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.match(text, /Report on a task with the `task_comment` tool, and move the task's card with the `update_task` tool\. Never use `delegate_task` for either/);
});

/**
 * Betty's persona used to ask "a few questions at a time". Every built Betty now asks exactly one
 * question per message and waits for the answer, keeps her six intake questions, asked one by one,
 * and never batches questions.
 */
test("every built Betty asks one question per message, and asks her six intake questions one by one", () => {
  const built = [
    ["buzz-agents", "agents", "betty", "SYSTEM_PROMPT.md"],
    ["portable", "circlechat", "agents", "betty", "SOUL.md"],
    ["portable", "claude-code", "agents", "betty.md"],
    ["portable", "grok", "agents", "betty.md"],
  ];
  for (const parts of built) {
    const file = parts.join("/");
    const text = fs.readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\s+/g, " ");
    assert.match(text, /\*\*Ask exactly one question in each message, and wait for the answer before asking the next one\.\*\*/, file);
    assert.match(text, /Each question is one or two plain sentences, with an example answer when an example helps\./, file);
    assert.match(text, /Never open with a greeting, never number or list questions with "First" or "Also", never recap what Betty will do next, and never add a sign-off\./, file);
    assert.match(text, /Ask them one by one, in this order, and skip each question the request already answers:/, file);
    assert.match(text, /one question per message\./, `${file}: the platform's interview line`);
    // The six intake questions are all still there.
    for (const q of ["What object is the screen about", "The domain model", "The status lifecycle, including the off-path states", "The interactions that must work", "The edge states that matter", "For a prototype, the amount and spread of mock data"]) {
      assert.ok(text.includes(q), `${file}: ${q}`);
    }
    assert.doesNotMatch(text, /a few questions at a time|in one batch|ask three good questions|one long message full of questions/i, file);
  }
});

/**
 * Betty skipped each intake question the request already answered, so a detailed request got a
 * prototype with no question at all. Every built Betty now asks at least one question before
 * building a prototype and waits for the answer, unless the request says "no questions".
 */
test("every built Betty asks at least one question before building a prototype, unless the request says \"no questions\"", () => {
  const built = [
    ["buzz-agents", "agents", "betty", "SYSTEM_PROMPT.md"],
    ["portable", "circlechat", "agents", "betty", "SOUL.md"],
    ["portable", "claude-code", "agents", "betty.md"],
    ["portable", "grok", "agents", "betty.md"],
  ];
  for (const parts of built) {
    const file = parts.join("/");
    const text = fs.readFileSync(path.join(repoRoot, ...parts), "utf8").replace(/\s+/g, " ");
    assert.match(text, /\*\*Always ask at least one question before building a prototype, and wait for the answer\.\*\*/, file);
    assert.match(text, /This holds even when the request answers all six questions below\./, file);
    assert.match(text, /The only exception is a request that says "no questions"\./, file);
    // The one-question-per-message rule still stands beside it.
    assert.match(text, /\*\*Ask exactly one question in each message, and wait for the answer before asking the next one\.\*\*/, file);
    // The rule comes before the six intake questions, whose skip rule it overrides.
    assert.ok(
      text.indexOf("Always ask at least one question before building a prototype") <
        text.indexOf("skip each question the request already answers"),
      `${file}: the rule comes before the intake skip rule`,
    );
  }
});

/**
 * On CircleChat, Betty was assigned a one-line prototype request and wrote the page two minutes
 * into her turn, without a question. Her CircleChat fragment said "a plain request is enough"
 * just before the build rules, and the ask-first rule sat far away in the middle of her persona.
 * She also ran `npm run type-check`, a script the prototype repository does not have. The built
 * SOUL.md now puts the ask-first rule beside the build rules and names the real check scripts.
 */
test("Betty's CircleChat persona asks first beside the build rules, and names the prototype repository's check scripts", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "betty", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.doesNotMatch(text, /a plain request is enough/);
  const rule = "**On a new prototype, the turn's reply is one question and nothing else, and Betty writes no files in that turn.**";
  assert.ok(text.includes(rule), "the ask-first rule");
  assert.match(text, /Build in a later turn, after the answer\. The only exception is a request that says "no questions"\./);
  // Right next to the build rules: in the same paragraph, just before them.
  const at = text.indexOf(rule);
  const buildRules = text.indexOf("Then build by these rules:");
  assert.ok(at > 0 && buildRules > at && buildRules - at < 450, "the rule sits just before the build rules");
  assert.ok(buildRules < text.indexOf("**Import every UI component from `@recursica/adapter-mantine-v8`.**"));
  // The prototype repository's real check scripts, by name.
  assert.match(text, /\*\*Check the page with `npm run check-types` and `npm run lint`,\*\* run in `\/workspace\/@APP_REPO@`\./);
  assert.match(text, /The repository has no `type-check` script\./);
  assert.doesNotMatch(text, /npm run type-check/);
  // The interview and the brief still come first, and the persona-wide rule is still there.
  assert.match(text, /The interview and the brief still come first\./);
  assert.match(text, /\*\*Always ask at least one question before building a prototype, and wait for the answer\.\*\*/);
});

/**
 * On CircleChat, Betty's reply to a prototype request opened with "Now I'll examine the components
 * available for building this pricing page." and held nothing else a person could read, so the
 * reply check refused it as reasoning, and she asked nothing. The built SOUL.md now says to start
 * the reply with the question itself, right after the ask-first rule.
 */
test("Betty's CircleChat persona starts her reply with the question itself, right after the ask-first rule", () => {
  const text = fs
    .readFileSync(path.join(repoRoot, "portable", "circlechat", "agents", "betty", "SOUL.md"), "utf8")
    .replace(/\s+/g, " ");
  const rule = "**On a new prototype, the turn's reply is one question and nothing else, and Betty writes no files in that turn.**";
  const line = "Start the reply with the question itself: no line about what Betty will do, check or read first.";
  assert.ok(text.includes(line), "the question-first line");
  assert.ok(text.includes(`${rule} ${line}`), "it follows the ask-first rule directly");
  assert.ok(text.indexOf(line) < text.indexOf("Then build by these rules:"), "before the build rules");
  assert.equal(text.split(line).length - 1, 1, "once");
});

test("Loki is built for CircleChat and RecursicaChat 2.0 only", () => {
  assert.ok(!fs.existsSync(path.join(artifactDir, "loki.md")), "no claude-code artifact");
  assert.ok(!fs.existsSync(path.join(repoRoot, "buzz-agents", "agents", "loki")), "no Buzz agent");
  assert.match(
    fs.readFileSync(path.join(agentsDir, "loki", "SKILL.md"), "utf8"),
    /^targets: circlechat, recursicachat$/m,
  );
  assert.ok(fs.existsSync(path.join(repoRoot, "portable", "recursicachat", "agents", "loki", "INSTRUCTIONS.md")), "the RecursicaChat 2.0 instructions");
});

/**
 * Claire on RecursicaChat 2.0 works on a research repo, not on BigQuery and Drive, so her
 * instructions there come from SKILL.recursicachat.md. Built from SKILL.md, they would tell her to
 * check BigQuery tables and read Drive folders she has no tool for.
 */
test("Claire's RecursicaChat instructions come from SKILL.recursicachat.md, with her repo tools and nothing of BigQuery", () => {
  const built = fs.readFileSync(path.join(repoRoot, "portable", "recursicachat", "agents", "claire", "INSTRUCTIONS.md"), "utf8");
  const own = fs.readFileSync(path.join(agentsDir, "claire", "SKILL.recursicachat.md"), "utf8");
  assert.ok(built.startsWith(own.split("<!-- platform:")[0]), "the body is SKILL.recursicachat.md's");
  assert.doesNotMatch(built, /BigQuery|bq-|Drive folder|execute_sql|\{\{|@[A-Z_]+@/, "nothing of her other targets, and no token: rc-sync refuses a token");
  assert.ok(built.length <= 20_000, "rc-sync's MAX_INSTRUCTIONS");
  for (const tool of ["list_files", "read_file", "propose_changes", "list_proposals"]) assert.match(built, new RegExp(`claire_repos__${tool}`), tool);
  assert.match(built, /one transcript and one pass at a time/i);
  const buzz = fs.readFileSync(path.join(repoRoot, "buzz-agents", "agents", "claire", "SYSTEM_PROMPT.md"), "utf8");
  assert.doesNotMatch(buzz, /claire_repos__/, "her Buzz prompt is still SKILL.md's");
  const runtime = JSON.parse(fs.readFileSync(path.join(agentsDir, "claire", "runtime", "recursicachat.json"), "utf8"));
  assert.deepEqual([runtime.autonomy, runtime.sandbox], ["ask", "docker"]);
});

/**
 * In the research repo, a term in lexicon/lexicon.json has no evidence field: its schema allows no
 * other key. A term's evidence is the quotes that list it in `terms`, so Claire's RecursicaChat
 * instructions say so, and never carry the Lexicon subagent's rule that each term carries an
 * evidence array.
 */
test("Claire's RecursicaChat instructions take a term's evidence from the quotes pass, not an evidence field", () => {
  const built = fs
    .readFileSync(path.join(repoRoot, "portable", "recursicachat", "agents", "claire", "INSTRUCTIONS.md"), "utf8")
    .replace(/\s+/g, " ");
  assert.ok(built.includes("**A term's evidence comes from the quotes pass,** where each quote lists the terms it shows in its `terms`."), "the quotes-pass evidence rule");
  assert.ok(built.includes("A term in the lexicon has no `evidence` field"), "no evidence field on a term");
  assert.ok(built.includes("at least one quote in that study's `quotes.json` lists it in `terms`"), "every added term is quoted");
  assert.ok(built.includes("Add a term only when Claire has a line to quote for it."), "a term only with a line to quote");
  assert.ok(built.includes("Each term the terms pass added from this interview needs at least one quote that lists it."), "the quotes pass quotes each new term");
  assert.doesNotMatch(built, /carries `evidence`|Drop any proposal that has no evidence|evidence array/i, "not the Lexicon subagent's evidence rule");
});
