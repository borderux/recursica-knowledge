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
| Subagent dispatch | `barb-checker` and `barb-refuter` must be registered, and the platform must support one agent spawning another. |

Nothing else. There is no credential to provision and nothing to fence.

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
2. **Subagents inherit nothing automatically.** `barb-checker` and `barb-refuter` carry their own
   `tools:` lines, and those lines are the boundary. If your platform ignores per-subagent tools and
   grants them the parent's set, or the session's, they can write. Check rather than assume.

## What breaks quietly

**The manifest is version-coupled to the adapter.** `ADAPTER_COMPONENTS` in the script is a copy of
`RECURSICA_COMPONENTS` from `@recursica/adapter-common`. A new component in a newer adapter is not in
that list, so nothing maps it and nothing complains — it is simply absent from the review. Run
`node scripts/screen-skill-manifest.mjs --self-check` after any adapter upgrade; it verifies every
component resolves to a skill that exists on disk, every override names a real export, and every
skill has a checklist.

**The override table is coupled to skill names.** Fifteen adapter exports do not map to
`recursica-skill-<kebab-case>`, and one of them is a trap worth repeating: `TextArea` maps to
`recursica-skill-textarea`, with no hyphen, so a kebab-case guess finds nothing. Renaming a skill
breaks the table, and `--self-check` is what catches it.

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
