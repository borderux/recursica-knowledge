# Porting Barb

Barb reviews a screen built on Recursica against the design system's own rules. Of the agents in
this repository she is the easiest to port, because she is the only one that touches no client
data: no dataset, no Drive folder, no relay, no service account. **She needs two directories and a
read-only tool set.**

## What she needs

| | |
|---|---|
| The skills corpus | `skills/` from this repository — 62 `SKILL.md` files. She reads them; she never writes them. |
| The manifest script | `scripts/screen-skill-manifest.mjs`, plus a Node 20+ runtime to run it. |
| The application | A checkout of the app being reviewed, built on `@recursica/mantine-adapter`. |
| Subagent dispatch | `checker` and `feisty` must be registered, and the platform must support one agent spawning another. |

Nothing else. There is no credential to provision and nothing to fence.

## Who calls her

Anyone building on Recursica. **ALAN calls her by default** — his Stage 3 dispatches her on
every screen before the designer sees it, fixes what she reports, and calls her again until she
goes quiet twice. Nothing about her is ALAN-specific; he is the first caller, not the owner.

Two properties of that arrangement are worth stating because they are easy to erode:

- **The builder does not get to narrow the review.** ALAN is told to hand her the files and
  nothing else — no summary of what changed, no list of skills he thinks apply. Her prompt
  now says to ignore such a hint and report that she got one, because a rule enforced on only
  one side of a hand-off is enforced nowhere.
- **She has no way to make a finding go away, and the builder has no way to make the rule go
  away.** She cannot write; ALAN cannot edit the knowledge repository. Neither half is
  sufficient alone.

On Buzz, `scripts/bootstrap-nest.mjs` installs all three files into `~/.buzz/.claude/agents/`
from `portable/claude-code/agents/` — statically, not rendered per client, because there is
nothing client-shaped in a design reviewer. Run `npm run agents:build` first if they are
missing; they are build outputs.

## The one property that has to survive the port

**She must not be able to write.**

Her tool list is `Read`, `Grep`, `Glob`, `Bash`, `Task` — no `Write`, no `Edit`. This is not a
preference and it is not about blast radius. A reviewer that can edit the code it reviews can make
a finding disappear instead of reporting it, and a reviewer that can edit `skills/` can resolve a
violation by softening the rule. Both are silent, and both destroy the only thing she produces.

**A prompt does not carry this.** The sentence "you never edit the application" in her prompt is a
statement of intent that a model can fail to honour under pressure — the absence of a write tool is
what makes it true. If the platform you are porting to has no per-agent tool allowlist, **she is
weaker there and you should say so out loud** rather than assume the prose holds. That is the same
reason Claire is not built for opencode.

**Two leaks to know about even on Claude Code:**

1. **`Bash` is a write path.** `sh -c 'echo x > file'` edits a file with no `Edit` tool anywhere in
   sight. She needs a shell for exactly one command — the manifest script — so narrow the permission
   to that script if your setup allows it. If it does not, the read-only property rests on the
   prompt after all, which is worth knowing rather than discovering.
2. **Subagents inherit nothing automatically.** `checker` and `feisty` carry their own
   `tools:` lines, and those lines are the boundary. If your platform ignores per-subagent tools and
   grants them the parent's set, or the session's, they can write. Check rather than assume.

## On Buzz, where there is no tool allowlist at all

She is deployable with the rest — `buzz-agents/agents/barb/` holds her prompt and settings, and
`restore-agents.mjs` opens her draft alongside Claire's and Stu's. She needs no credential, no
values file entry and no dataset, so there is nothing in the install that is hers alone.

**Her one property does not come with her, and three of the four ways to carry it do not work.**
A Buzz agent has no `tools:` line: it inherits whatever the session holds. Two mechanisms that
look like they would fix that are recorded as failures in
[`nest/GUIDES/LOKI_SANDBOX_SETUP.md`](../../nest/GUIDES/LOKI_SANDBOX_SETUP.md) — `agent_args` is
dropped before it reaches the CLI, and a per-agent `CLAUDE_CODE_EXECUTABLE` is overwritten by
Buzz after per-agent config, so a wrapper script silently loses. Neither says anything when it
fails.

**What works is `CLAUDE_CONFIG_DIR`,** which Buzz does not set. Point it at a directory of her
own holding a `settings.json` with:

```json
{ "permissions": { "deny": ["Write", "Edit", "NotebookEdit"] } }
```

Verified by asking a session through that settings file to write a file: it reports the tool as
unavailable and *"disabled for this session, in subagents as well as here"*, and no file appears.
That last clause matters — it closes the leak a front-matter allowlist leaves open, where a
general-purpose subagent comes with write tools the parent does not have. On this surface she is
better fenced than on the one she was designed for, not worse.

The same directory is where an empty MCP registry goes, and `disableClaudeAiConnectors: true`
with it. The registry is per machine, so by default a Buzz session sees every client's dataset
and Drive server, and the account-level Drive connector is unfenced regardless of the registry.
None of it is anything a design reviewer should be able to reach.

**The price is the operator's to weigh, not ours to hide.** An isolated config directory is not
read from the Keychain, so the login token has to be written into a file in that directory — the
same trade-off, and the same reasoning, as the Loki guide sets out. For an agent whose entire
risk is editing a git checkout, an operator may reasonably decide the prose fence plus code
review is the better deal.

**If they do decide that, her prompt is honest about it.** The Buzz fragment tells her she is
holding write tools, forbids the two paths that survive any fence (`Bash`, and dispatching a
general-purpose agent), and tells her to say so in her report if she can see `Write` — because
nobody else is positioned to notice, and an unenforced guarantee that everyone believes is
enforced is the worst of the three states.

## What breaks quietly

**The manifest is version-coupled to the adapter.** `ADAPTER_COMPONENTS` in the script is a copy of
`RECURSICA_COMPONENTS` from `@recursica/adapter-common`. A new component in a newer adapter is not in
that list, so nothing maps it and nothing complains — it is simply absent from the review. Run
`node scripts/screen-skill-manifest.mjs --self-check` after any adapter upgrade; it verifies every
component resolves to a skill that exists on disk, every route names a real export, and every skill
has a checklist.

**Names are matched, not tabulated — keep it that way.** A component and its skill are the same word
with different punctuation, so `skillFor` compares them with the punctuation stripped. That resolves
`TextArea` → `recursica-skill-textarea` (no hyphen, where a kebab-case guess yields the non-existent
`text-area`), `Radio` → `radio-button`, and both `HoverCard` and `Popover` → `hover-card-popover`,
with no entry for any of them. An earlier version hardcoded all four and that was the wrong instinct:
a hand-written alias list is a second source of truth that goes stale the first time a skill is
renamed, and it goes stale silently.

**`ROUTES` is the eleven components with no skill of their own** — layout primitives, type, form
scaffolding — and every entry is a judgment about which design rules govern them. That is not
derivable from a string, which is why it is written down. `--self-check` fails if a route names a
component that now has its own skill, so the table cannot quietly outlive its reason.

**Ambiguity is reported, never resolved by guessing.** `Text` matches both `textarea` and
`text-field` on a substring, and picking either would be wrong in a way nothing downstream could
detect. A name that matches more than one skill and has no route is an error in `--self-check` and
an `ambiguousImports` entry in a report.

**A screen is not one file.** She reviews a route *and* the local files it imports, because a route
rendering a table through a shared wrapper imports no adapter table itself. If you wire her to a
single file, the rules that matter most will be missing and the report will look clean.

## What she cannot do, wherever she runs

- **Judge rules only a rendered page can answer** — centring beyond the maximum width, a region
  overflowing by a layer's padding, what type style resolved. She needs a running instance and a way
  to drive it; without one, those items are *unchecked*, and she must report them as such rather than
  as passed. One of these defects arrived from a token default with no code change at all.
- **Tell you the rule is the right rule.** She checks conformance.
- **See what nobody has decided.** Several skills carry an `## Uncovered — ask, do not invent`
  list, and a checklist has no line for an unmade decision. Two of the defects that prompted her
  existence were sitting in one of those lists, and a screen violating them would pass her clean.

**A clean report means the screen breaks no written, source-checkable rule. It does not mean the
screen is right.** Port that sentence with her.
