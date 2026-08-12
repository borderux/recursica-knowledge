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
