# Porting Edie

Edie rewrites the Recursica knowledge to follow `WRITING.md` and opens a pull request. Edie touches no client data. **Edie needs a checkout of this repository, a credential that can push a branch and open a pull request, and a platform that lets one agent dispatch another.**

## What Edie needs

| | |
|---|---|
| A checkout of this repository | Edie edits files in the checkout and runs `npm run writing:check`, `writing:flags`, `skills:check` and `agents:build`. Node 20 or newer, and `npm install` run once. |
| Git and `gh` | To push a branch and open a pull request. The credential needs no merge rights. |
| The comparer | `comparer` must be installed beside Edie, and the platform must let one agent dispatch another. |

## What is provided

| File | For |
| --- | --- |
| `portable/claude-code/agents/edie.md` | Claude Code: copy into `.claude/agents/`, or run `npm run agents:install` |
| `portable/claude-code/agents/comparer.md` | The comparer, in the same folder |
| `agents/edie/runtime/claude-code.json` | The model and the tool list, and the reason for each |

`node scripts/build-agents.mjs` generates both prompt files from `agents/edie/`. Edit the source in `agents/edie/`, not the generated files.

## The property that has to survive a port

**The comparer has no write tools.** A comparer that can edit the file the comparer checks can make a lost rule disappear instead of reporting the lost rule. On Claude Code, the `tools:` line in the comparer's front matter keeps the comparer read-only. On a platform without a per-agent tool list, the property rests on the prompt alone.

**Edie never merges.** Give Edie a credential with no merge rights. Edie's instructions say to never merge, and only the credential makes that true.

## Only on Claude Code for now

Edie has no Buzz or CircleChat version yet. Each surface needs a separate set of platform fragments in `agents/edie/platform/` and a target in the front matter of `agents/edie/SKILL.md`.
