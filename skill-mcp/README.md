# recursica-skill-mcp

Stdio MCP server that serves this repository's skill library to agents under a tight
context budget.

The library is 64 skills, ~200k tokens. Injecting it whole fills a local model's entire
KV cache before the conversation starts, and a task typically needs 20–100 of the skills.
So agents get it in tiers instead:

- **`list_skills`** — compact catalog, ~2.4k tokens (64 skills, one line each)
- **`search_skills`** — keyword search over the full frontmatter descriptions, which carry
  the trigger phrases
- **`get_rule_cards`** — condensed ~300-token rule cards, batched in one call. This is the
  default for build work.
- **`get_skill`** — full ~3k-token skill text, for review passes and ambiguous rules
- **`refresh_index`** — re-scan after a `git pull`
- **`_PostCompact`** — buzz lifecycle hook: re-injects the catalog after context
  compaction, so an agent does not forget what exists

Requires Node 20+. Mac or PC — stdio MCP is just a local child process.

## Install

The server reads the skills out of the checkout it lives in, so there is nothing to
clone separately and no path to configure:

```bash
cd skill-mcp
npm install
npm link        # exposes recursica-skill-mcp + recursica-build-cards on PATH
```

`RECURSICA_SKILLS_DIR` overrides the location if you want one installation to serve a
different clone.

## Build the rule cards (one-time, re-run after skills change)

Cards are written to `.rule-cards/` at the repo root — generated output, and gitignored.
Unchanged skills are skipped via a content hash. Until cards exist, `get_rule_cards`
falls back to serving full skill text, so the server is useful before this step.

```bash
# via Anthropic (recommended for quality)
CARDS_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... recursica-build-cards

# or via a local FreeToken / any OpenAI-compatible endpoint
CARDS_PROVIDER=openai OPENAI_BASE_URL=http://localhost:8080/v1 \
  OPENAI_MODEL=qwen3.6-35b recursica-build-cards
```

## Wire into buzz

buzz-acp passes one stdio MCP server to every agent session:

```bash
export BUZZ_ACP_MCP_COMMAND="$(which recursica-skill-mcp)"
# enable the _PostCompact hook (off by default in buzz)
export MCP_HOOK_SERVERS="recursica-skill-mcp"
buzz-acp
```

Two constraints this design is built around, both verified against buzz:

- **stdio only.** buzz-agent declares `"mcpCapabilities":{"http":false,"sse":false}`, so a
  single shared HTTP server on localhost is not an option for it. Each session spawns its
  own instance instead — which is fine, because the server is stateless: all shared state
  is the checkout on disk.
- **One `BUZZ_ACP_MCP_COMMAND` slot.** buzz-acp builds a single MCP server from that env
  var. Anything else has to go through a harness's own MCP config, or be folded into this
  server.

Harnesses with their own MCP config (Claude Code `.mcp.json`, Goose config) can add the
server directly — same command. Keep the checkout fresh with a cron
`git -C <checkout> pull`; agents can call `refresh_index` to pick up the change without a
restart.

## Suggested agent prompt snippet

> Call `list_skills` once at task start. For each subtask, `get_rule_cards` with ALL
> relevant short names in one call. Fetch `get_skill` only when a rule card is ambiguous
> or during final review. Never load more skills than the current subtask needs.

## Env reference

| Var                    | Default                    |                                               |
| ---------------------- | -------------------------- | --------------------------------------------- |
| `RECURSICA_SKILLS_DIR` | this repo's `skills/`      | path to the skills folder to serve            |
| `RECURSICA_CARDS_DIR`  | `<skills>/../.rule-cards`  | where rule cards are written and read         |
| `CARDS_PROVIDER`       | `anthropic`                | `anthropic` or `openai` (build script)        |
| `CARDS_MODEL`          | `claude-sonnet-4-6`        | Anthropic model for card building             |
| `OPENAI_BASE_URL`      | `http://localhost:8080/v1` | local endpoint for card building              |
| `OPENAI_MODEL`         | `local`                    | model name for the OpenAI-compatible endpoint |
| `CARDS_CONCURRENCY`    | `3`                        | parallel card builds                          |

## Not built yet

The plan this came from continues past the server: a coordinator agent (cost-based model
routing, a concurrency semaphore below the local model's slot count, `session_id` +
~200-token state summaries between agents), an isolated repair sub-agent for failures, and
BigQuery for cold recall and skill co-occurrence analytics. None of that is here.
