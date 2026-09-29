# The knowledge MCP server

Serves this repository's skills to the agents that build and review against them — Betty, Barb,
ALAN — so none of them has to hold the corpus in context. There are 64 skill files totalling
roughly a quarter of a million tokens, which does not fit alongside an application.

**It holds no copy of the skills.** It reads `skills/` in the checkout it runs from. An earlier
server duplicated the knowledge into its own published package, and the two drifted: an agent's
answer depended on which copy it had reached, and nothing said which. That is the failure this
one is shaped to avoid, and it is why the server is not installed into `~/.buzz` — see the note
in `nest/nest-manifest.json`.

## The rule it enforces

**`skill_family` never returns a single skill.** It returns the skill plus everything its
`## Load these too` section says it needs, transitively. Links listed under "Only if the screen
also uses it" are alternatives — a table points at cards — and are returned as `seeAlso`, not
loaded. Following them used to pull six unused skills, about 25,000 tokens, into an ordinary
form-and-table screen. The parser is `crossLinks` in `scripts/screen-skill-manifest.mjs`, shared
with `skills_for_screen` so the two cannot disagree.

That is the point of the server rather than a feature of it. A component skill tells you what a
component is; a design-rules skill tells you whether it belongs on the screen. Working from the
first alone is the most common way to produce something individually correct and collectively
wrong, and it is what a "find me the closest matching skill" endpoint would do every time while
looking like it helped. **There is deliberately no search tool here.**

## Tools

| Tool | What it answers |
| --- | --- |
| `router` | The decision order, the precedence when rules collide, and when to stop and ask. Call it first. |
| `skills_for_screen` | Which skills apply to real files, computed from their adapter imports rather than judged. |
| `skill_family` | The rules themselves — always as a family. `detail: "contract"` returns only each skill's checklist, uncovered list and, for a component, its inventory and "Do not use it when" table: every rule in checkable form, at about a quarter of the size. |
| `skill_section` | One section of one skill, for the reasoning behind a contract item. |
| `list_skills` | Slugs, categories and one-line descriptions, for when there are no files to compute from. |
| `component_api` | Real prop types from the adapter version a given project installs. |

`skills_for_screen` **imports** `scripts/screen-skill-manifest.mjs` rather than reimplementing
it. That is a correctness requirement: Barb computes applicability with the same module, and a
second implementation would drift from hers silently — a review that checked the wrong set of
skills reads exactly like a review that found nothing.

## Contract first

An ordinary ten-component screen needs 31 skills. In full that is about 120,000 tokens, more than
most models can hold beside the application. As contracts it is about 30,000. The router tells
agents to build from the contract and fetch a section when an item is unclear, when two items
seem to conflict, or before deciding something a skill may cover.

The default is still `full`, so nothing changes for a caller that does not ask. **Whether
contract-first builds are as accurate as full-text builds has not been measured yet**: the test
is to build the same screen both ways and have Barb review each. Make `contract` the default only
after that.

Responses carry no frontmatter. The description is for choosing a skill, and repeating it for
every skill in a family cost 6% of the response. `list_skills` still returns it.

## Registering it

The server needs no arguments when it runs from the checkout. Use an absolute path.

```json
{
  "mcpServers": {
    "recursica-knowledge": {
      "command": "node",
      "args": ["/absolute/path/to/recursica-knowledge/nest/mcp/knowledge/server.mjs"]
    }
  }
}
```

Set `KNOWLEDGE_ROOT` only if you are running the file from somewhere other than the checkout it
belongs to. It exits non-zero when it cannot find `skills/`, rather than starting up and serving
an empty corpus.

## Two failure shapes it refuses

Both were chosen because they produce an answer that looks like a good one:

- **A screen path that is not on disk is an error, not an empty manifest.** An empty skill set is
  indistinguishable from a screen with nothing on it, and it is how an unreviewed screen gets a
  clean review.
- **A component with no declaration in the installed adapter is reported as absent**, with the
  adapters that were searched. A prop documented in a skill and missing from the installed
  package is a problem to find before building on it.
